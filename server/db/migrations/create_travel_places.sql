CREATE TABLE IF NOT EXISTS travel_places (
  id SERIAL PRIMARY KEY,
  name VARCHAR(500) NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  description TEXT,
  blog_slug VARCHAR(500),
  year INTEGER,
  type VARCHAR(20) CHECK (type IS NULL OR type IN ('home', 'trip')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_travel_places_created_at ON travel_places(created_at);
CREATE INDEX IF NOT EXISTS idx_travel_places_type ON travel_places(type) WHERE type IS NOT NULL;

DROP TRIGGER IF EXISTS update_travel_places_updated_at ON travel_places;
CREATE TRIGGER update_travel_places_updated_at BEFORE UPDATE ON travel_places
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
