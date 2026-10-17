-- A cell is only "done" for 30 days when the search found a full result; a thin one
-- (fewer than 5 candidates, e.g. a widened search that ran out of time) is retried after
-- a day. Remember the candidate count and the radius that produced it.
alter table discovery_cells add column if not exists candidates int not null default 0;
alter table discovery_cells add column if not exists radius_km int;
