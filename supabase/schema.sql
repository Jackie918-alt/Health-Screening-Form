-- We Kongsi Agent Voice Survey — response storage.
--
-- Run once in the Supabase SQL editor, then set SUPABASE_URL and
-- SUPABASE_SERVICE_ROLE_KEY in the Vercel project. The app switches from local
-- file storage to Supabase on the next deploy with no code change.

create table if not exists public.survey_responses (
  id           uuid primary key default gen_random_uuid(),
  survey_id    text        not null,
  version      text        not null,
  language     text        not null default 'en',
  -- Clock of the submitting device; can be wrong if the device is.
  submitted_at timestamptz not null,
  -- Server clock. Authoritative — everything sorts and filters on this.
  received_at  timestamptz not null default now(),
  -- Answers keyed by question id. JSONB rather than a column per question, so
  -- adding or rewording a question never needs a migration and never
  -- invalidates responses already collected.
  answers      jsonb       not null default '{}'::jsonb
);

-- The admin list is always "newest first", optionally filtered by language.
create index if not exists survey_responses_received_at_idx
  on public.survey_responses (received_at desc);
create index if not exists survey_responses_language_idx
  on public.survey_responses (language);

-- One response per NRIC.
--
-- The app stores NRICs digits-only (030405-10-1234 and 030405101234 are the
-- same person, and the form accepts both spellings), so this is a plain unique
-- index over the stored value.
--
-- The app checks for an existing NRIC before inserting, to give a clear
-- message. This index is what actually prevents a double submission, because
-- only the database can stop two requests racing — a double-click, or the same
-- agent on two devices.
--
-- Partial, so responses with no NRIC do not collide with each other on null.
create unique index if not exists survey_responses_nric_unique
  on public.survey_responses ((answers->>'nric'))
  where answers->>'nric' is not null;

-- Row Level Security ON with no policies: the anon and authenticated keys can
-- do nothing at all. The app reaches this table only through the service-role
-- key, which is server-side and bypasses RLS. That is what keeps responses
-- unreadable even if the public Supabase URL and anon key are discovered.
alter table public.survey_responses enable row level security;
