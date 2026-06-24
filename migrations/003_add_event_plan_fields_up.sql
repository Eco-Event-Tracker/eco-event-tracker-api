-- Store the planning inputs (format, attendance, power source, reach, catering,
-- waste, days, etc.) as a JSON snapshot, plus the computed total for fast listing.
-- The breakdown is recomputed from `plan` by the estimation engine on read.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS plan JSONB;

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS estimated_co2 DOUBLE PRECISION NOT NULL DEFAULT 0;
