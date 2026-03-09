-- =============================================================
-- Barabula: Supabase schema
-- Run once in Supabase Dashboard → SQL Editor → New query
-- =============================================================

-- ---------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------

-- public.users
-- Mirrors auth.users; id is FK to auth.users so Supabase Auth owns
-- the auth record and this table holds the app profile.
CREATE TABLE public.users (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username     TEXT UNIQUE,
  email        TEXT NOT NULL,
  full_name    TEXT,
  avatar_url   TEXT,
  preferences  JSONB DEFAULT '{}',
  language     TEXT DEFAULT 'en',
  timezone     TEXT DEFAULT 'UTC',
  is_active    BOOLEAN DEFAULT true,
  is_verified  BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.itineraries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  destination TEXT,
  start_date  DATE,
  end_date    DATE,
  extra_data  JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.activities (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id  UUID NOT NULL REFERENCES public.itineraries(id) ON DELETE CASCADE,
  day_number    INTEGER NOT NULL,
  name          TEXT NOT NULL,
  time          TEXT,
  description   TEXT,
  location      TEXT,
  activity_type TEXT,
  extra_data    JSONB DEFAULT '{}'
);

CREATE TABLE public.chat_history (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Collaborators table: basic structure for Phase 4.
-- Per-user RLS only for now; full viewer/editor RLS added in Phase 4.
CREATE TABLE public.collaborators (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id UUID NOT NULL REFERENCES public.itineraries(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role         TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'editor')),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (itinerary_id, user_id)
);

-- ---------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itineraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;

-- Users: own profile only
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id);

-- Itineraries: user owns rows where user_id matches
CREATE POLICY "Users can manage own itineraries"
  ON public.itineraries FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Activities: access via itinerary ownership
CREATE POLICY "Users can manage own activities"
  ON public.activities FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.itineraries
      WHERE id = activities.itinerary_id
        AND user_id = (SELECT auth.uid())
    )
  );

-- Chat history: user owns own messages
CREATE POLICY "Users can manage own chat history"
  ON public.chat_history FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Collaborators: users can see their own collaborator rows
-- (Full Phase 4 RLS — access via itinerary ownership — added in Phase 4)
CREATE POLICY "Users can view own collaborator rows"
  ON public.collaborators FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ---------------------------------------------------------------
-- Trigger: populate public.users on auth.users INSERT
-- ---------------------------------------------------------------
-- SECURITY DEFINER: function runs as owner, not calling role
-- SET search_path = '': prevents search path injection
-- If this trigger throws, registration fails — all nullable columns
-- have DB defaults so only email is strictly required.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    full_name,
    avatar_url,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();
