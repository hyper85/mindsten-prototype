-- MindSTEN hardening: index-friendly + service-role-only scan matching, LIKE escaping,
-- cheaper rate-limit housekeeping, data-integrity triggers (10-year rule, curated rows,
-- AI cache invalidation, submission sanity) and explicit table grants.
-- Idempotent: safe to re-run (CI applies every migration twice).

set search_path = public, extensions;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Escapes LIKE wildcards so user input is matched literally (default escape char '\').
create or replace function public.mindsten_like_escape(input text)
returns text
language sql
immutable
parallel safe
as $$
  select replace(replace(replace(coalesce(input, ''), E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_')
$$;

-- ---------------------------------------------------------------------------
-- Rate limiting: index for housekeeping, cleanup on ~1% of calls instead of every call
-- ---------------------------------------------------------------------------

create index if not exists rate_limits_window_start_idx on rate_limits (window_start);

create or replace function public.mindsten_bump_rate_limit(
  p_bucket text, p_limit int, p_window_seconds int
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_seconds int := greatest(coalesce(p_window_seconds, 60), 1);
  v_window timestamptz := to_timestamp(
    floor(extract(epoch from now()) / v_window_seconds) * v_window_seconds
  );
  v_hits int;
begin
  insert into rate_limits (bucket, window_start, hits)
  values (left(p_bucket, 200), v_window, 1)
  on conflict (bucket, window_start) do update set hits = rate_limits.hits + 1
  returning hits into v_hits;
  if random() < 0.01 then
    delete from rate_limits where window_start < now() - interval '2 days';
  end if;
  return v_hits <= p_limit;
end;
$$;

revoke all on function public.mindsten_bump_rate_limit(text, int, int) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- search_persons: capped input, LIKE wildcards escaped (same signature/result)
-- ---------------------------------------------------------------------------

create or replace function public.search_persons(
  p_query text,
  p_limit int default 20
) returns table (person_id bigint, score real)
language sql
stable
set search_path = public, extensions
as $$
  with q as (
    select v, public.mindsten_like_escape(v) as pat
    from (select public.mindsten_normalize(left(p_query, 100)) as v) s
  )
  select p.id,
         greatest(word_similarity(q.v, p.search_name),
                  case when p.search_name like '%' || q.pat || '%' then 1.0 else 0 end)::real as s
  from persons p, q
  where char_length(q.v) >= 2
    and (p.search_name like '%' || q.pat || '%' or q.v <% p.search_name)
  order by s desc, p.curated desc, p.death_year desc nulls last
  limit least(greatest(p_limit, 1), 100)
$$;

-- ---------------------------------------------------------------------------
-- match_gravestone: same signature, result shape and scoring as 0002, but
--   * at most 5 names of at most 100 chars each,
--   * candidates come from index scans (trigram word similarity / escaped substring on
--     persons_search_trgm_idx, exact years on persons_years_idx) instead of a full scan,
--   * service role only (called by the scan-gravestone Edge Function).
-- score 0–100: name 0–60, years 0–30, distance 0–10.
-- ---------------------------------------------------------------------------

create or replace function public.match_gravestone(
  p_names text[],
  p_birth_year int default null,
  p_death_year int default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_limit int default 5
) returns table (person_id bigint, score int, distance_m double precision)
language sql
stable
set search_path = public, extensions
-- The planner can't estimate %> / LIKE for per-name values and then picks a seq scan,
-- evaluating word_similarity() on every row (~5x slower at 50k persons). Use the indexes.
set enable_seqscan = off
as $$
  with names as (
    select distinct public.mindsten_normalize(left(n, 100)) as v
    from unnest(coalesce(p_names[1:5], '{}')) as n
    where char_length(trim(n)) >= 2
  ),
  candidates as (
    select hit.id
    from names
    cross join lateral (
      -- names.v <% search_name, written with the indexed column on the left
      select p.id from persons p where p.search_name %> names.v
      union
      select p.id from persons p
      where p.search_name like '%' || public.mindsten_like_escape(names.v) || '%'
    ) hit
    union
    select p.id from persons p
    where p_death_year is not null and p_birth_year is not null
      and p.death_year = p_death_year and p.birth_year = p_birth_year
  ),
  scored as (
    select p.id,
      coalesce((select max(word_similarity(names.v, p.search_name)) from names), 0) as name_sim,
      case
        when p_birth_year is null or p.birth_year is null then 0
        when p.birth_year = p_birth_year then 15
        when abs(p.birth_year - p_birth_year) = 1 then 8
        else -10
      end +
      case
        when p_death_year is null or p.death_year is null then 0
        when p.death_year = p_death_year then 15
        when abs(p.death_year - p_death_year) = 1 then 8
        else -10
      end as year_pts,
      case
        when p_lat is null or p_lng is null or p.lat is null or p.lng is null then null
        else public.mindsten_distance_m(p_lat, p_lng, p.lat, p.lng)
      end as dist
    from candidates c
    join persons p on p.id = c.id
  )
  select id,
    greatest(0, least(100, round(
      name_sim * 60 + year_pts +
      case when dist is null then 0 when dist < 300 then 10 when dist < 3000 then 5 else 0 end
    )))::int as score,
    dist
  from scored
  order by score desc, dist asc nulls last
  limit least(greatest(p_limit, 1), 20)
$$;

revoke execute on function public.match_gravestone(text[], int, int, double precision, double precision, int)
  from public, anon, authenticated;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.match_gravestone(text[], int, int, double precision, double precision, int)
      to service_role;
    grant execute on function public.mindsten_bump_rate_limit(text, int, int) to service_role;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- persons: integrity rules on every insert/update
--   1. Curated rows stay curated: a write with curated = false keeps curated = true and
--      the curated content (imports only add wikidata_id / image / Wikipedia link).
--      Deliberately un-curating: `set local mindsten.allow_uncurate = 'on'` first.
--   2. birth_year / death_year always follow birth_date / death_date when a date is set.
--   3. Databeskyttelsesloven § 2, stk. 5: the person must have died at least 10 years ago.
-- ---------------------------------------------------------------------------

create or replace function public.mindsten_persons_before_write()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_cutoff date := (current_date - interval '10 years')::date;
begin
  if tg_op = 'UPDATE' and old.curated and not new.curated
     and coalesce(current_setting('mindsten.allow_uncurate', true), '') <> 'on' then
    new.curated            := true;
    new.name               := old.name;
    new.aliases            := old.aliases;
    new.born               := old.born;
    new.died               := old.died;
    new.birth_date         := old.birth_date;
    new.death_date         := old.death_date;
    new.birth_year         := old.birth_year;
    new.death_year         := old.death_year;
    new.birth_place        := old.birth_place;
    new.death_place        := old.death_place;
    new.profession         := old.profession;
    new.category           := old.category;
    new.short_bio          := old.short_bio;
    new.full_bio           := old.full_bio;
    new.era                := old.era;
    new.era_years          := old.era_years;
    new.time_window_title  := old.time_window_title;
    new.cemetery           := old.cemetery;
    new.cemetery_id        := old.cemetery_id;
    new.city               := old.city;
    new.lat                := old.lat;
    new.lng                := old.lng;
    new.location_precision := old.location_precision;
    new.confidence         := old.confidence;
  end if;

  if new.birth_date is not null then
    new.birth_year := extract(year from new.birth_date)::int;
  end if;
  if new.death_date is not null then
    new.death_year := extract(year from new.death_date)::int;
  end if;

  if new.death_date is null and new.death_year is null then
    raise exception 'persons: "%" has neither death_date nor death_year', new.name
      using errcode = 'check_violation',
            hint = 'Only people who died at least 10 years ago may be stored (databeskyttelsesloven § 2, stk. 5).';
  end if;
  if new.death_date is not null and new.death_date > v_cutoff then
    raise exception 'persons: "%" died % — less than 10 years ago', new.name, new.death_date
      using errcode = 'check_violation',
            hint = 'Only people who died at least 10 years ago may be stored (databeskyttelsesloven § 2, stk. 5).';
  end if;
  if new.death_date is null and new.death_year > extract(year from current_date)::int - 10 then
    raise exception 'persons: "%" died in % — less than 10 years ago', new.name, new.death_year
      using errcode = 'check_violation',
            hint = 'Only people who died at least 10 years ago may be stored (databeskyttelsesloven § 2, stk. 5).';
  end if;

  new.search_name := public.mindsten_normalize(
    new.name || ' ' || array_to_string(coalesce(new.aliases, '{}'), ' ')
  );
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists persons_before_write on persons;
create trigger persons_before_write before insert or update on persons
  for each row execute function public.mindsten_persons_before_write();

-- AI texts are generated from these fields: drop the cached era story and guide
-- answers when they change, so they are regenerated from the new data.
create or replace function public.mindsten_persons_purge_ai_cache()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from era_stories where person_id = new.id;
  delete from person_answers where person_id = new.id;
  return null;
end;
$$;

revoke all on function public.mindsten_persons_purge_ai_cache() from public, anon, authenticated;

drop trigger if exists persons_purge_ai_cache on persons;
create trigger persons_purge_ai_cache after update on persons
  for each row
  when ((old.name, old.born, old.died, old.birth_date, old.death_date, old.birth_year,
         old.death_year, old.birth_place, old.death_place, old.profession, old.cemetery,
         old.city, old.short_bio, old.full_bio)
        is distinct from
        (new.name, new.born, new.died, new.birth_date, new.death_date, new.birth_year,
         new.death_year, new.birth_place, new.death_place, new.profession, new.cemetery,
         new.city, new.short_bio, new.full_bio))
  execute function public.mindsten_persons_purge_ai_cache();

-- ---------------------------------------------------------------------------
-- grave_submissions: reject obvious garbage (lenient — the 10-year rule is applied
-- by the editor who approves a submission, see the add-person skill).
-- ---------------------------------------------------------------------------

create or replace function public.mindsten_grave_submissions_before_insert()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_year int := extract(year from current_date)::int;
begin
  if new.death_year > v_year or new.birth_year > v_year then
    raise exception 'grave_submissions: year in the future' using errcode = 'check_violation';
  end if;
  if new.birth_year > new.death_year then
    raise exception 'grave_submissions: birth_year after death_year' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists grave_submissions_before_insert on grave_submissions;
create trigger grave_submissions_before_insert before insert on grave_submissions
  for each row execute function public.mindsten_grave_submissions_before_insert();

-- ---------------------------------------------------------------------------
-- Explicit grants (don't rely on Supabase's default privileges; RLS still applies)
-- ---------------------------------------------------------------------------

-- Public-read content: select only.
revoke insert, update, delete, truncate, references, trigger
  on persons, timeline_events, person_sources, routes, cemeteries, era_stories
  from anon, authenticated;
grant select
  on persons, timeline_events, person_sources, routes, cemeteries, era_stories
  to anon, authenticated;

-- Submissions: insert only (RLS: status = 'pending'; no select policy, so rows stay hidden).
revoke update, delete, truncate, references, trigger on grave_submissions from anon, authenticated;
grant insert on grave_submissions to anon, authenticated;

-- Service role only.
revoke all on rate_limits, person_answers from anon, authenticated;
