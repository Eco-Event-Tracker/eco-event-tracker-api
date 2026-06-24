-- Optional descriptive metadata for an event (description, category, etc.).
-- Does not affect the emission estimate; the estimate is still computed from `plan`.
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS details JSONB;
