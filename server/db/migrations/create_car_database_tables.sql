-- Create car_manufacturers table
CREATE TABLE IF NOT EXISTS car_manufacturers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  country VARCHAR(100) DEFAULT 'India',
  logo_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create car_models table
CREATE TABLE IF NOT EXISTS car_models (
  id SERIAL PRIMARY KEY,
  manufacturer_id INTEGER NOT NULL REFERENCES car_manufacturers(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  body_type VARCHAR(100), -- SUV, Sedan, Hatchback, etc.
  segment VARCHAR(100), -- Compact, Mid-size, etc.
  launch_year INTEGER,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(manufacturer_id, name)
);

-- Create car_variants table
CREATE TABLE IF NOT EXISTS car_variants (
  id SERIAL PRIMARY KEY,
  model_id INTEGER NOT NULL REFERENCES car_models(id) ON DELETE CASCADE,
  variant_name VARCHAR(255) NOT NULL,
  fuel_type VARCHAR(50), -- Petrol, Diesel, CNG, Electric, Hybrid
  engine_displacement_cc INTEGER,
  max_power_ps INTEGER,
  max_torque_nm INTEGER,
  transmission_type VARCHAR(100), -- Manual, AMT, CVT, DCT, Automatic
  transmission_speeds INTEGER,
  mileage_kmpl DECIMAL(5, 2), -- City/Hwy average or ARAI certified
  seating_capacity INTEGER DEFAULT 5,
  price_ex_showroom_inr DECIMAL(12, 2),
  price_on_road_inr DECIMAL(12, 2),
  length_mm INTEGER,
  width_mm INTEGER,
  height_mm INTEGER,
  wheelbase_mm INTEGER,
  ground_clearance_mm INTEGER,
  boot_space_liters INTEGER,
  fuel_tank_capacity_liters INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(model_id, variant_name)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_car_models_manufacturer_id ON car_models(manufacturer_id);
CREATE INDEX IF NOT EXISTS idx_car_variants_model_id ON car_variants(model_id);
CREATE INDEX IF NOT EXISTS idx_car_models_name ON car_models(name);
CREATE INDEX IF NOT EXISTS idx_car_variants_fuel_type ON car_variants(fuel_type);

-- Create indexes for search optimization (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_car_manufacturers_name_lower ON car_manufacturers(LOWER(name));
CREATE INDEX IF NOT EXISTS idx_car_models_name_lower ON car_models(LOWER(name));
CREATE INDEX IF NOT EXISTS idx_car_variants_name_lower ON car_variants(LOWER(variant_name));

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION update_car_manufacturers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_car_manufacturers_updated_at ON car_manufacturers;
CREATE TRIGGER update_car_manufacturers_updated_at
  BEFORE UPDATE ON car_manufacturers
  FOR EACH ROW
  EXECUTE FUNCTION update_car_manufacturers_updated_at();

CREATE OR REPLACE FUNCTION update_car_models_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_car_models_updated_at ON car_models;
CREATE TRIGGER update_car_models_updated_at
  BEFORE UPDATE ON car_models
  FOR EACH ROW
  EXECUTE FUNCTION update_car_models_updated_at();

CREATE OR REPLACE FUNCTION update_car_variants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_car_variants_updated_at ON car_variants;
CREATE TRIGGER update_car_variants_updated_at
  BEFORE UPDATE ON car_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_car_variants_updated_at();
