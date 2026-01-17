-- Seed data for car manufacturers, models, and variants
-- 5 manufacturers × 2 cars × 2 variants = 20 variants

-- Insert Manufacturers
INSERT INTO car_manufacturers (name, country) VALUES
  ('Tata Motors', 'India'),
  ('Maruti Suzuki', 'India'),
  ('Hyundai', 'South Korea'),
  ('Mahindra', 'India'),
  ('Honda', 'Japan')
ON CONFLICT (name) DO NOTHING;

-- Insert Car Models
-- Tata Motors
INSERT INTO car_models (manufacturer_id, name, body_type, segment, launch_year) VALUES
  ((SELECT id FROM car_manufacturers WHERE name = 'Tata Motors'), 'Nexon', 'SUV', 'Compact', 2017),
  ((SELECT id FROM car_manufacturers WHERE name = 'Tata Motors'), 'Harrier', 'SUV', 'Mid-size', 2019)
ON CONFLICT (manufacturer_id, name) DO NOTHING;

-- Maruti Suzuki
INSERT INTO car_models (manufacturer_id, name, body_type, segment, launch_year) VALUES
  ((SELECT id FROM car_manufacturers WHERE name = 'Maruti Suzuki'), 'Swift', 'Hatchback', 'Compact', 2005),
  ((SELECT id FROM car_manufacturers WHERE name = 'Maruti Suzuki'), 'Brezza', 'SUV', 'Compact', 2016)
ON CONFLICT (manufacturer_id, name) DO NOTHING;

-- Hyundai
INSERT INTO car_models (manufacturer_id, name, body_type, segment, launch_year) VALUES
  ((SELECT id FROM car_manufacturers WHERE name = 'Hyundai'), 'Creta', 'SUV', 'Compact', 2015),
  ((SELECT id FROM car_manufacturers WHERE name = 'Hyundai'), 'Verna', 'Sedan', 'Mid-size', 2006)
ON CONFLICT (manufacturer_id, name) DO NOTHING;

-- Mahindra
INSERT INTO car_models (manufacturer_id, name, body_type, segment, launch_year) VALUES
  ((SELECT id FROM car_manufacturers WHERE name = 'Mahindra'), 'XUV700', 'SUV', 'Mid-size', 2021),
  ((SELECT id FROM car_manufacturers WHERE name = 'Mahindra'), 'Scorpio', 'SUV', 'Mid-size', 2002)
ON CONFLICT (manufacturer_id, name) DO NOTHING;

-- Honda
INSERT INTO car_models (manufacturer_id, name, body_type, segment, launch_year) VALUES
  ((SELECT id FROM car_manufacturers WHERE name = 'Honda'), 'City', 'Sedan', 'Mid-size', 1998),
  ((SELECT id FROM car_manufacturers WHERE name = 'Honda'), 'Amaze', 'Sedan', 'Compact', 2013)
ON CONFLICT (manufacturer_id, name) DO NOTHING;

-- Insert Car Variants
-- Tata Nexon Variants
INSERT INTO car_variants (
  model_id, variant_name, fuel_type, engine_displacement_cc, max_power_ps, max_torque_nm,
  transmission_type, transmission_speeds, mileage_kmpl, price_ex_showroom_inr,
  length_mm, width_mm, height_mm, wheelbase_mm, ground_clearance_mm, boot_space_liters, fuel_tank_capacity_liters
) VALUES
  (
    (SELECT id FROM car_models WHERE name = 'Nexon' AND manufacturer_id = (SELECT id FROM car_manufacturers WHERE name = 'Tata Motors')),
    'Pure Plus MT', 'Petrol', 1199, 120, 170, 'Manual', 6, 17.4, 950000,
    3995, 1804, 1620, 2498, 209, 382, 44
  ),
  (
    (SELECT id FROM car_models WHERE name = 'Nexon' AND manufacturer_id = (SELECT id FROM car_manufacturers WHERE name = 'Tata Motors')),
    'Fearless Plus AMT', 'Petrol', 1199, 120, 170, 'AMT', 6, 17.0, 1250000,
    3995, 1804, 1620, 2498, 209, 382, 44
  )
ON CONFLICT (model_id, variant_name) DO NOTHING;

-- Tata Harrier Variants
INSERT INTO car_variants (
  model_id, variant_name, fuel_type, engine_displacement_cc, max_power_ps, max_torque_nm,
  transmission_type, transmission_speeds, mileage_kmpl, price_ex_showroom_inr,
  length_mm, width_mm, height_mm, wheelbase_mm, ground_clearance_mm, boot_space_liters, fuel_tank_capacity_liters
) VALUES
  (
    (SELECT id FROM car_models WHERE name = 'Harrier' AND manufacturer_id = (SELECT id FROM car_manufacturers WHERE name = 'Tata Motors')),
    'XE MT', 'Diesel', 1956, 170, 350, 'Manual', 6, 16.35, 1499000,
    4598, 1894, 1706, 2741, 205, 425, 50
  ),
  (
    (SELECT id FROM car_models WHERE name = 'Harrier' AND manufacturer_id = (SELECT id FROM car_manufacturers WHERE name = 'Tata Motors')),
    'XZ Plus AT', 'Diesel', 1956, 170, 350, 'Automatic', 6, 14.6, 2199000,
    4598, 1894, 1706, 2741, 205, 425, 50
  )
ON CONFLICT (model_id, variant_name) DO NOTHING;

-- Maruti Swift Variants
INSERT INTO car_variants (
  model_id, variant_name, fuel_type, engine_displacement_cc, max_power_ps, max_torque_nm,
  transmission_type, transmission_speeds, mileage_kmpl, price_ex_showroom_inr,
  length_mm, width_mm, height_mm, wheelbase_mm, ground_clearance_mm, boot_space_liters, fuel_tank_capacity_liters
) VALUES
  (
    (SELECT id FROM car_models WHERE name = 'Swift' AND manufacturer_id = (SELECT id FROM car_manufacturers WHERE name = 'Maruti Suzuki')),
    'LXI MT', 'Petrol', 1197, 82, 113, 'Manual', 5, 23.2, 599000,
    3840, 1735, 1530, 2450, 163, 268, 37
  ),
  (
    (SELECT id FROM car_models WHERE name = 'Swift' AND manufacturer_id = (SELECT id FROM car_manufacturers WHERE name = 'Maruti Suzuki')),
    'ZXI AMT', 'Petrol', 1197, 82, 113, 'AMT', 5, 23.2, 849000,
    3840, 1735, 1530, 2450, 163, 268, 37
  )
ON CONFLICT (model_id, variant_name) DO NOTHING;

-- Maruti Brezza Variants
INSERT INTO car_variants (
  model_id, variant_name, fuel_type, engine_displacement_cc, max_power_ps, max_torque_nm,
  transmission_type, transmission_speeds, mileage_kmpl, price_ex_showroom_inr,
  length_mm, width_mm, height_mm, wheelbase_mm, ground_clearance_mm, boot_space_liters, fuel_tank_capacity_liters
) VALUES
  (
    (SELECT id FROM car_models WHERE name = 'Brezza' AND manufacturer_id = (SELECT id FROM car_manufacturers WHERE name = 'Maruti Suzuki')),
    'LXI MT', 'Petrol', 1462, 103, 137, 'Manual', 5, 17.38, 799000,
    3995, 1790, 1685, 2500, 198, 328, 48
  ),
  (
    (SELECT id FROM car_models WHERE name = 'Brezza' AND manufacturer_id = (SELECT id FROM car_manufacturers WHERE name = 'Maruti Suzuki')),
    'ZXI Plus AT', 'Petrol', 1462, 103, 137, 'Automatic', 6, 19.8, 1299000,
    3995, 1790, 1685, 2500, 198, 328, 48
  )
ON CONFLICT (model_id, variant_name) DO NOTHING;

-- Hyundai Creta Variants
INSERT INTO car_variants (
  model_id, variant_name, fuel_type, engine_displacement_cc, max_power_ps, max_torque_nm,
  transmission_type, transmission_speeds, mileage_kmpl, price_ex_showroom_inr,
  length_mm, width_mm, height_mm, wheelbase_mm, ground_clearance_mm, boot_space_liters, fuel_tank_capacity_liters
) VALUES
  (
    (SELECT id FROM car_models WHERE name = 'Creta' AND manufacturer_id = (SELECT id FROM car_manufacturers WHERE name = 'Hyundai')),
    'E MT', 'Petrol', 1497, 115, 144, 'Manual', 6, 16.8, 1099000,
    4300, 1790, 1635, 2610, 190, 433, 50
  ),
  (
    (SELECT id FROM car_models WHERE name = 'Creta' AND manufacturer_id = (SELECT id FROM car_manufacturers WHERE name = 'Hyundai')),
    'SX CVT', 'Petrol', 1497, 115, 144, 'CVT', 0, 17.4, 1699000,
    4300, 1790, 1635, 2610, 190, 433, 50
  )
ON CONFLICT (model_id, variant_name) DO NOTHING;

-- Hyundai Verna Variants
INSERT INTO car_variants (
  model_id, variant_name, fuel_type, engine_displacement_cc, max_power_ps, max_torque_nm,
  transmission_type, transmission_speeds, mileage_kmpl, price_ex_showroom_inr,
  length_mm, width_mm, height_mm, wheelbase_mm, ground_clearance_mm, boot_space_liters, fuel_tank_capacity_liters
) VALUES
  (
    (SELECT id FROM car_models WHERE name = 'Verna' AND manufacturer_id = (SELECT id FROM car_manufacturers WHERE name = 'Hyundai')),
    'S MT', 'Petrol', 1497, 115, 144, 'Manual', 6, 17.7, 1049000,
    4535, 1765, 1475, 2670, 165, 480, 45
  ),
  (
    (SELECT id FROM car_models WHERE name = 'Verna' AND manufacturer_id = (SELECT id FROM car_manufacturers WHERE name = 'Hyundai')),
    'SX CVT', 'Petrol', 1497, 115, 144, 'CVT', 0, 17.7, 1399000,
    4535, 1765, 1475, 2670, 165, 480, 45
  )
ON CONFLICT (model_id, variant_name) DO NOTHING;

-- Mahindra XUV700 Variants
INSERT INTO car_variants (
  model_id, variant_name, fuel_type, engine_displacement_cc, max_power_ps, max_torque_nm,
  transmission_type, transmission_speeds, mileage_kmpl, price_ex_showroom_inr,
  length_mm, width_mm, height_mm, wheelbase_mm, ground_clearance_mm, boot_space_liters, fuel_tank_capacity_liters
) VALUES
  (
    (SELECT id FROM car_models WHERE name = 'XUV700' AND manufacturer_id = (SELECT id FROM car_manufacturers WHERE name = 'Mahindra')),
    'MX MT', 'Petrol', 1997, 200, 380, 'Manual', 6, 12.0, 1399000,
    4695, 1890, 1755, 2750, 200, 262, 60
  ),
  (
    (SELECT id FROM car_models WHERE name = 'XUV700' AND manufacturer_id = (SELECT id FROM car_manufacturers WHERE name = 'Mahindra')),
    'AX7 AT', 'Petrol', 1997, 200, 380, 'Automatic', 6, 11.0, 2299000,
    4695, 1890, 1755, 2750, 200, 262, 60
  )
ON CONFLICT (model_id, variant_name) DO NOTHING;

-- Mahindra Scorpio Variants
INSERT INTO car_variants (
  model_id, variant_name, fuel_type, engine_displacement_cc, max_power_ps, max_torque_nm,
  transmission_type, transmission_speeds, mileage_kmpl, price_ex_showroom_inr,
  length_mm, width_mm, height_mm, wheelbase_mm, ground_clearance_mm, boot_space_liters, fuel_tank_capacity_liters
) VALUES
  (
    (SELECT id FROM car_models WHERE name = 'Scorpio' AND manufacturer_id = (SELECT id FROM car_manufacturers WHERE name = 'Mahindra')),
    'S MT', 'Diesel', 2198, 130, 300, 'Manual', 6, 15.0, 1299000,
    4456, 1820, 1970, 2680, 200, 460, 60
  ),
  (
    (SELECT id FROM car_models WHERE name = 'Scorpio' AND manufacturer_id = (SELECT id FROM car_manufacturers WHERE name = 'Mahindra')),
    'Z8 AT', 'Diesel', 2198, 130, 300, 'Automatic', 6, 14.0, 1799000,
    4456, 1820, 1970, 2680, 200, 460, 60
  )
ON CONFLICT (model_id, variant_name) DO NOTHING;

-- Honda City Variants
INSERT INTO car_variants (
  model_id, variant_name, fuel_type, engine_displacement_cc, max_power_ps, max_torque_nm,
  transmission_type, transmission_speeds, mileage_kmpl, price_ex_showroom_inr,
  length_mm, width_mm, height_mm, wheelbase_mm, ground_clearance_mm, boot_space_liters, fuel_tank_capacity_liters
) VALUES
  (
    (SELECT id FROM car_models WHERE name = 'City' AND manufacturer_id = (SELECT id FROM car_manufacturers WHERE name = 'Honda')),
    'V MT', 'Petrol', 1498, 121, 145, 'Manual', 6, 17.4, 1249000,
    4549, 1748, 1489, 2600, 165, 506, 40
  ),
  (
    (SELECT id FROM car_models WHERE name = 'City' AND manufacturer_id = (SELECT id FROM car_manufacturers WHERE name = 'Honda')),
    'ZX CVT', 'Petrol', 1498, 121, 145, 'CVT', 0, 17.8, 1699000,
    4549, 1748, 1489, 2600, 165, 506, 40
  )
ON CONFLICT (model_id, variant_name) DO NOTHING;

-- Honda Amaze Variants
INSERT INTO car_variants (
  model_id, variant_name, fuel_type, engine_displacement_cc, max_power_ps, max_torque_nm,
  transmission_type, transmission_speeds, mileage_kmpl, price_ex_showroom_inr,
  length_mm, width_mm, height_mm, wheelbase_mm, ground_clearance_mm, boot_space_liters, fuel_tank_capacity_liters
) VALUES
  (
    (SELECT id FROM car_models WHERE name = 'Amaze' AND manufacturer_id = (SELECT id FROM car_manufacturers WHERE name = 'Honda')),
    'V MT', 'Petrol', 1199, 90, 110, 'Manual', 5, 18.6, 699000,
    3995, 1695, 1501, 2470, 165, 420, 35
  ),
  (
    (SELECT id FROM car_models WHERE name = 'Amaze' AND manufacturer_id = (SELECT id FROM car_manufacturers WHERE name = 'Honda')),
    'VX CVT', 'Petrol', 1199, 90, 110, 'CVT', 0, 19.5, 899000,
    3995, 1695, 1501, 2470, 165, 420, 35
  )
ON CONFLICT (model_id, variant_name) DO NOTHING;
