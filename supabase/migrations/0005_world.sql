-- MindSTEN works anywhere in the world: country codes on cemeteries and persons, lazy
-- Wikipedia enrichment bookkeeping (bio_lang / enriched_at), Wikidata sitelink counts for
-- ordering by notability, and the discovery_cells cache of on-demand Wikidata lookups.
-- Idempotent: safe to re-run (CI applies every migration twice).

set search_path = public, extensions;

-- ---------------------------------------------------------------------------
-- cemeteries: country
-- ---------------------------------------------------------------------------

-- ISO 3166-1 alpha-2, upper-case. Rows created by hand (the curated seed, approved
-- submissions) are Danish, hence the default; discovery/import set it explicitly, and
-- null means unknown.
alter table cemeteries add column if not exists country_code text default 'DK';
alter table cemeteries drop constraint if exists cemeteries_country_code_check;
alter table cemeteries add constraint cemeteries_country_code_check
  check (country_code is null or country_code ~ '^[A-Z]{2}$');
create index if not exists cemeteries_country_code_idx on cemeteries (country_code);

update cemeteries set country_code = 'DK' where country_code is null;

-- ---------------------------------------------------------------------------
-- persons: country, bio language, enrichment marker, notability
-- ---------------------------------------------------------------------------

alter table persons add column if not exists country_code text default 'DK';
alter table persons drop constraint if exists persons_country_code_check;
alter table persons add constraint persons_country_code_check
  check (country_code is null or country_code ~ '^[A-Z]{2}$');
-- ISO 639-1 of the Wikipedia the stored bio comes from; null = none / Wikidata description.
alter table persons add column if not exists bio_lang text;
-- When the Wikipedia bio was fetched (enrich-person); null = not fetched yet.
alter table persons add column if not exists enriched_at timestamptz;
-- Wikidata sitelink count = rough notability, for ordering discovered persons.
alter table persons add column if not exists sitelinks int not null default 0;

create index if not exists persons_country_code_idx on persons (country_code);
create index if not exists persons_sitelinks_idx on persons (sitelinks desc);

-- Backfill: everything that exists before this migration is Danish and (when it has a
-- bio) was written or imported from Danish Wikipedia.
update persons set country_code = 'DK' where country_code is null;
update persons
set bio_lang = 'da', enriched_at = now()
where enriched_at is null
  and (coalesce(full_bio, '') <> '' or coalesce(short_bio, '') <> '');

-- ---------------------------------------------------------------------------
-- discovery_cells: which 0.1° grid cells have been looked up on Wikidata, and when
-- ---------------------------------------------------------------------------

create table if not exists discovery_cells (
  cell          text primary key,
  lat           double precision not null,
  lng           double precision not null,
  discovered_at timestamptz not null default now(),
  persons_added int not null default 0
);

alter table discovery_cells enable row level security;
-- No policies: service role only.
revoke all on discovery_cells from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Curated rows are hand-written (in Danish) and protected by persons_before_write: there is
-- never a Wikipedia bio to fetch for them, so they always count as enriched — also when the
-- seed is applied after this migration (fresh databases, CI).
-- ---------------------------------------------------------------------------

create or replace function public.mindsten_persons_mark_curated_enriched()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.curated and new.enriched_at is null then
    new.enriched_at := now();
    if new.bio_lang is null
       and (coalesce(new.full_bio, '') <> '' or coalesce(new.short_bio, '') <> '') then
      new.bio_lang := 'da';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists persons_mark_curated_enriched on persons;
create trigger persons_mark_curated_enriched before insert or update on persons
  for each row execute function public.mindsten_persons_mark_curated_enriched();
