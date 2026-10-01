-- Smoke tests for the SQL functions. Run after migrations + seed:
--   psql -v ON_ERROR_STOP=1 -f supabase/tests/functions.sql
do $$
declare
  v_id bigint;
  v_score int;
  v_count int;
begin
  select person_id, score into v_id, v_score
  from match_gravestone(array['H C ANDERSEN'], 1805, 1875, 55.69, 12.55, 3) limit 1;
  assert v_id = 1, format('match_gravestone: expected H.C. Andersen (1), got %s', v_id);
  assert v_score >= 90, format('match_gravestone: score too low: %s', v_score);

  select person_id into v_id from match_gravestone(array['Søren Kirkegaard'], null, 1855) limit 1;
  assert v_id = 2, format('match_gravestone: misspelled Kierkegaard should match, got %s', v_id);

  select person_id into v_id from search_persons('orsted', 5) limit 1;
  assert v_id = 5, format('search_persons: unaccented query should find Ørsted, got %s', v_id);

  select count(*) into v_count from nearby_persons(55.6905, 12.5494, 500, 50);
  assert v_count >= 10, format('nearby_persons: expected Assistens graves, got %s', v_count);

  select count(*) into v_count from nearby_persons(56.0, 9.0, 500, 50);
  assert v_count = 0, 'nearby_persons: expected nothing in the middle of Jutland';

  assert (select mindsten_bump_rate_limit('test', 2, 60)), 'rate limit 1';
  assert (select mindsten_bump_rate_limit('test', 2, 60)), 'rate limit 2';
  assert not (select mindsten_bump_rate_limit('test', 2, 60)), 'rate limit 3 should be blocked';

  raise notice 'All SQL function checks passed';
end;
$$;
