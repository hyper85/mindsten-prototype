-- Cache for the "Spørg om personen" guide (ask-person Edge Function).
-- Only first questions without conversation history are cached, keyed by a
-- normalised question per person. Written/read with the service role only.
-- Idempotent: safe to re-run.

create table if not exists person_answers (
  person_id    bigint not null references persons(id) on delete cascade,
  question_key text   not null check (char_length(question_key) <= 600),
  answer       text   not null,
  model        text,
  created_at   timestamptz not null default now(),
  primary key (person_id, question_key)
);

alter table person_answers enable row level security;
-- No policies: not readable or writable with the anon key.
