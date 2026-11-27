CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  username VARCHAR(255),
  email VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  consent_given BOOLEAN NOT NULL DEFAULT TRUE,
  consent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

CREATE TABLE IF NOT EXISTS newsletters (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content_blocks JSONB NOT NULL,
  items_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deliveries (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  newsletter_id INT NOT NULL REFERENCES newsletters(id) ON DELETE CASCADE,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  retry_count INT NOT NULL DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  last_error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, newsletter_id)
);

CREATE INDEX IF NOT EXISTS idx_deliveries_retry ON deliveries(status, next_retry_at);

CREATE TABLE IF NOT EXISTS system_events (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);