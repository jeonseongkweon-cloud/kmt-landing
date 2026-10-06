-- Restore the existing STAR postgres_changes subscription.
-- Applied to ojxarsfaewehwjidwgac; no student data, RLS, or storage changes.
ALTER PUBLICATION supabase_realtime ADD TABLE public.star_events;
