-- Checks for 0004_hardening.sql: grants/RLS as the anon role, persons integrity triggers,
-- AI cache invalidation, submission sanity and LIKE escaping. Run after roles.sql,
-- migrations and seed:
--   psql -v ON_ERROR_STOP=1 -f supabase/tests/hardening.sql
-- Everything runs in one transaction that is rolled back.
begin;

-- Fixtures, written as the owner.
insert into grave_submissions (name, death_year) values ('Skjult Indsendelse', 1900);
insert into rate_limits (bucket, window_start, hits) values ('hardening-test', now(), 1);
insert into person_answers (person_id, question_key, answer) values (1, 'hardening test', 'svar');
insert into era_stories (person_id, content) values (1, '{}') on conflict (person_id) do nothing;

-- ---------------------------------------------------------------------------
-- What the browser (anon key) can and cannot do
-- ---------------------------------------------------------------------------
set local role anon;
do $$
declare
  v_count int;
begin
  select count(*) into v_count from persons;
  assert v_count >= 20, format('anon: expected to read persons, got %s', v_count);
  perform 1 from timeline_events limit 1;
  perform 1 from person_sources limit 1;
  perform 1 from routes limit 1;
  perform 1 from cemeteries limit 1;
  select count(*) into v_count from era_stories;
  assert v_count >= 1, 'anon: expected to read cached era stories';

  select count(*) into v_count from search_persons('andersen', 5);
  assert v_count >= 1, 'anon: search_persons should work';
  select count(*) into v_count from nearby_persons(55.6905, 12.5494, 500, 50);
  assert v_count >= 1, 'anon: nearby_persons should work';

  insert into grave_submissions (name, birth_year, death_year, cemetery)
  values ('Anon Testesen', 1850, 1920, 'Assistens Kirkegård');

  begin
    insert into grave_submissions (name, status) values ('Selvgodkendt', 'approved');
    raise exception 'anon could insert an approved submission';
  exception when insufficient_privilege then null;
  end;

  select count(*) into v_count from grave_submissions;
  assert v_count = 0, format('anon: submissions must stay hidden, saw %s', v_count);

  begin
    update grave_submissions set status = 'approved';
    raise exception 'anon could update submissions';
  exception when insufficient_privilege then null;
  end;

  begin
    perform 1 from rate_limits;
    raise exception 'anon could read rate_limits';
  exception when insufficient_privilege then null;
  end;

  begin
    perform 1 from person_answers;
    raise exception 'anon could read person_answers';
  exception when insufficient_privilege then null;
  end;

  begin
    perform * from match_gravestone(array['H C Andersen'], 1805, 1875);
    raise exception 'anon could execute match_gravestone';
  exception when insufficient_privilege then null;
  end;

  begin
    perform mindsten_bump_rate_limit('anon', 1000, 60);
    raise exception 'anon could execute mindsten_bump_rate_limit';
  exception when insufficient_privilege then null;
  end;

  begin
    update persons set name = 'Overskrevet' where id = 1;
    raise exception 'anon could update persons';
  exception when insufficient_privilege then null;
  end;

  begin
    delete from era_stories;
    raise exception 'anon could delete era_stories';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

-- ---------------------------------------------------------------------------
-- Integrity rules (as the owner / service role)
-- ---------------------------------------------------------------------------
do $$
declare
  v_id bigint;
  v_count int;
  v_score int;
  v_person persons%rowtype;
begin
  -- Databeskyttelsesloven § 2, stk. 5: died at least 10 years ago.
  begin
    insert into persons (name, category, cemetery, death_date)
    values ('Nyligt Død', 'other', '', (current_date - interval '9 years')::date);
    raise exception 'persons: someone who died 9 years ago was accepted';
  exception when check_violation then null;
  end;
  begin
    insert into persons (name, category, cemetery, death_year)
    values ('Nyligt Død', 'other', '', extract(year from current_date)::int - 5);
    raise exception 'persons: a death year 5 years ago was accepted';
  exception when check_violation then null;
  end;
  begin
    insert into persons (name, category, cemetery) values ('Uden Dødsdato', 'other', '');
    raise exception 'persons: a row without death date/year was accepted';
  exception when check_violation then null;
  end;
  insert into persons (name, category, cemetery, death_date)
  values ('Præcis Ti År', 'other', '', (current_date - interval '10 years')::date)
  returning id into v_id;

  -- Years follow the dates, also when the date changes.
  update persons set birth_date = '1901-05-06', birth_year = 1700 where id = v_id;
  select * into v_person from persons where id = v_id;
  assert v_person.birth_year = 1901, format('birth_year should follow birth_date, got %s', v_person.birth_year);
  update persons set death_date = '1950-01-02' where id = v_id;
  select * into v_person from persons where id = v_id;
  assert v_person.death_year = 1950, format('death_year should follow death_date, got %s', v_person.death_year);
  begin
    update persons set death_date = current_date - 30 where id = v_id;
    raise exception 'persons: update to a recent death date was accepted';
  exception when check_violation then null;
  end;

  -- Curated rows can't be overwritten by writes with curated = false …
  update persons
  set curated = false, name = 'Overskrevet', short_bio = 'x', death_date = '1900-01-01',
      image_url = 'https://example.org/hca.jpg'
  where id = 1;
  select * into v_person from persons where id = 1;
  assert v_person.curated, 'curated flag was cleared';
  assert v_person.name = 'H.C. Andersen', format('curated name overwritten: %s', v_person.name);
  assert v_person.short_bio <> 'x', 'curated short_bio overwritten';
  assert v_person.death_year = 1875, 'curated death date overwritten';
  assert v_person.image_url = 'https://example.org/hca.jpg', 'image_url should still be updatable';
  -- … unless explicitly allowed.
  perform set_config('mindsten.allow_uncurate', 'on', true);
  update persons set curated = false where id = 1;
  assert not (select curated from persons where id = 1), 'allow_uncurate should allow un-curating';
  perform set_config('mindsten.allow_uncurate', '', true);

  -- AI caches are dropped when the texts they were generated from change.
  update persons set image_credit = 'Test' where id = 1;
  assert exists (select 1 from era_stories where person_id = 1), 'era story dropped on unrelated change';
  assert exists (select 1 from person_answers where person_id = 1), 'answers dropped on unrelated change';
  update persons set full_bio = full_bio || ' Rettet.' where id = 1;
  assert not exists (select 1 from era_stories where person_id = 1), 'era story not dropped after bio change';
  assert not exists (select 1 from person_answers where person_id = 1), 'answers not dropped after bio change';

  -- Submissions: obvious garbage is rejected, plausible rows are fine.
  begin
    insert into grave_submissions (name, death_year)
    values ('Fremtidig', extract(year from current_date)::int + 1);
    raise exception 'grave_submissions: future death year accepted';
  exception when check_violation then null;
  end;
  begin
    insert into grave_submissions (name, birth_year, death_year) values ('Baglæns', 1900, 1850);
    raise exception 'grave_submissions: birth after death accepted';
  exception when check_violation then null;
  end;
  insert into grave_submissions (name, death_year)
  values ('Nyligt Begravet', extract(year from current_date)::int);

  -- LIKE wildcards are matched literally.
  assert mindsten_like_escape(E'a%b_c\\d') = E'a\\%b\\_c\\\\d', 'mindsten_like_escape';
  select count(*) into v_count from search_persons('__', 100);
  assert v_count = 0, format('search_persons: "__" must not match everything (%s rows)', v_count);
  select count(*) into v_count from match_gravestone(array['%%']);
  assert v_count = 0, format('match_gravestone: "%%%%" must not match everything (%s rows)', v_count);

  -- Only the first 5 names are used.
  select score into v_score
  from match_gravestone(array['xq1', 'xq2', 'xq3', 'xq4', 'xq5', 'H C Andersen'], 1805, 1875)
  where person_id = 1;
  assert v_score <= 35, format('match_gravestone: 6th name should be ignored (score %s)', v_score);

  raise notice 'All hardening checks passed';
end;
$$;

rollback;
