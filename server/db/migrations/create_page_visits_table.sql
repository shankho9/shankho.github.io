-- Create page_visits table to track page visits
CREATE TABLE IF NOT EXISTS page_visits (
  id SERIAL PRIMARY KEY,
  page VARCHAR(500) NOT NULL,
  user_agent TEXT,
  browser VARCHAR(255),
  referer TEXT,
  ip_address VARCHAR(45),
  country VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add created_at column if table exists but column is missing
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'page_visits') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'page_visits' AND column_name = 'created_at') THEN
      ALTER TABLE page_visits ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
      RAISE NOTICE 'Added created_at column to page_visits table';
    END IF;
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_page_visits_page ON page_visits(page);
CREATE INDEX IF NOT EXISTS idx_page_visits_created_at ON page_visits(created_at);
CREATE INDEX IF NOT EXISTS idx_page_visits_ip_address ON page_visits(ip_address);
CREATE INDEX IF NOT EXISTS idx_page_visits_country ON page_visits(country);

