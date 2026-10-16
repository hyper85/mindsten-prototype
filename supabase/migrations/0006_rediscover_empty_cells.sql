-- Discovery cells that found nothing are now retried after a day instead of 30
-- (supabase/functions/_shared/discover.ts). Forget the empty cells recorded by the
-- first, slower query so those areas are searched again right away.
delete from discovery_cells where persons_added = 0;
