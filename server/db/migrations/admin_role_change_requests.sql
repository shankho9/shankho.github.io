-- Admin role change OTP requests (email verification before role updates)
CREATE TABLE IF NOT EXISTS admin_role_change_requests (
  id SERIAL PRIMARY KEY,
  admin_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  new_role VARCHAR(20) NOT NULL CHECK (new_role IN ('visitor', 'admin')),
  otp_hash VARCHAR(255) NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_role_change_admin ON admin_role_change_requests(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_role_change_target ON admin_role_change_requests(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_role_change_expires ON admin_role_change_requests(expires_at);
