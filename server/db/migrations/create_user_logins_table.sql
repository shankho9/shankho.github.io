-- Create user_logins table to track authentication events
CREATE TABLE IF NOT EXISTS user_logins (
  id SERIAL PRIMARY KEY,
  user_email VARCHAR(255) NOT NULL,
  user_name VARCHAR(255) NOT NULL,
  login_location VARCHAR(500) NOT NULL,
  user_agent TEXT,
  browser VARCHAR(255),
  ip_address VARCHAR(45),
  country VARCHAR(100),
  referer TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_logins_user_email ON user_logins(user_email);
CREATE INDEX IF NOT EXISTS idx_user_logins_created_at ON user_logins(created_at);
CREATE INDEX IF NOT EXISTS idx_user_logins_login_location ON user_logins(login_location);
CREATE INDEX IF NOT EXISTS idx_user_logins_country ON user_logins(country);

