-- Discovery now widens to 25 km when fewer than 5 persons are found within 10 km
-- (supabase/functions/_shared/discover.ts). Forget the cells recorded before that, so
-- every area gets the wider search once; re-discovery is one Wikidata query per cell.
delete from discovery_cells;
