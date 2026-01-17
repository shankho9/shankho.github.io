-- Add indexes for search optimization (case-insensitive)
-- These indexes improve search performance for manufacturer, model, and variant name searches

CREATE INDEX IF NOT EXISTS idx_car_manufacturers_name_lower ON car_manufacturers(LOWER(name));
CREATE INDEX IF NOT EXISTS idx_car_models_name_lower ON car_models(LOWER(name));
CREATE INDEX IF NOT EXISTS idx_car_variants_name_lower ON car_variants(LOWER(variant_name));
