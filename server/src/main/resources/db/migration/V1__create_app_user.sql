CREATE TABLE app_user (
    id UUID PRIMARY KEY,
    email VARCHAR(320) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    zone_id VARCHAR(64) NOT NULL DEFAULT 'Asia/Shanghai',
    ai_opt_in BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO app_user (id, email, password_hash)
VALUES ('00000000-0000-0000-0000-000000000001', 'demo@lifeos.local', 'development-only');

