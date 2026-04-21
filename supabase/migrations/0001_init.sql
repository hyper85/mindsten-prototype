-- MindSTEN initial schema
-- Idempotent: safe to re-run on a fresh database.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Core content tables
-- ---------------------------------------------------------------------------

create table if not exists persons (
  id                 bigint primary key,
  name               text   not null,
  born               text   not null,
  died               text   not null,
  profession         text   not null,
  cemetery           text   not null,
  city               text   not null,
  confidence         int    not null check (confidence between 0 and 100),
  short_bio          text   not null,
  full_bio           text   not null,
  era                text   not null,
  era_years          text   not null,
  time_window_title  text   not null,
  category           text   not null check (category in ('writers','naval','science','royals')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists persons_category_idx on persons (category);
create index if not exists persons_cemetery_idx on persons (cemetery);

create table if not exists timeline_events (
  id         uuid primary key default gen_random_uuid(),
  person_id  bigint not null references persons(id) on delete cascade,
  year       int    not null,
  event      text   not null,
  sort_order int    not null default 0
);

create index if not exists timeline_events_person_idx
  on timeline_events (person_id, sort_order);

create table if not exists person_sources (
  id         uuid primary key default gen_random_uuid(),
  person_id  bigint not null references persons(id) on delete cascade,
  label      text   not null,
  url        text,
  sort_order int    not null default 0
);

create index if not exists person_sources_person_idx
  on person_sources (person_id, sort_order);

create table if not exists routes (
  id         bigint primary key,
  title      text not null,
  subtitle   text not null,
  stops      int  not null,
  duration   text not null,
  distance   text not null,
  category   text not null check (category in ('writers','naval','science','royals')),
  emoji      text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security: content is world-readable, writes require service role
-- ---------------------------------------------------------------------------

alter table persons          enable row level security;
alter table timeline_events  enable row level security;
alter table person_sources   enable row level security;
alter table routes           enable row level security;

drop policy if exists persons_public_read on persons;
create policy persons_public_read
  on persons for select using (true);

drop policy if exists timeline_events_public_read on timeline_events;
create policy timeline_events_public_read
  on timeline_events for select using (true);

drop policy if exists person_sources_public_read on person_sources;
create policy person_sources_public_read
  on person_sources for select using (true);

drop policy if exists routes_public_read on routes;
create policy routes_public_read
  on routes for select using (true);
