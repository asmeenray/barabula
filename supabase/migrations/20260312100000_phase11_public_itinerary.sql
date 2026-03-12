-- Phase 11: Add is_public column for shareable itinerary links
ALTER TABLE public.itineraries
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

-- Allow unauthenticated (anon) users to read public itineraries
CREATE POLICY "Public itineraries are viewable by anyone"
  ON public.itineraries
  FOR SELECT
  TO anon
  USING (is_public = true);

-- Allow unauthenticated (anon) users to read activities of public itineraries
CREATE POLICY "Activities of public itineraries are viewable by anyone"
  ON public.activities
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.itineraries
      WHERE itineraries.id = activities.itinerary_id
        AND itineraries.is_public = true
    )
  );
