-- Rides table
CREATE TABLE IF NOT EXISTS rides (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  peloton_ride_id TEXT NOT NULL UNIQUE,
  title TEXT,
  instructor TEXT,
  class_type TEXT,
  duration_seconds INTEGER NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  total_output INTEGER NOT NULL DEFAULT 0,
  avg_cadence REAL,
  max_cadence REAL,
  avg_resistance REAL,
  max_resistance REAL,
  avg_heart_rate REAL,
  max_heart_rate REAL,
  calories REAL,
  distance REAL,
  avg_speed REAL,
  max_speed REAL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for time-range queries
CREATE INDEX IF NOT EXISTS idx_rides_started_at ON rides (started_at DESC);

-- Sync log table
CREATE TABLE IF NOT EXISTS sync_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('success', 'error')),
  rides_added INTEGER NOT NULL DEFAULT 0,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_sync_log_synced_at ON sync_log (synced_at DESC);
