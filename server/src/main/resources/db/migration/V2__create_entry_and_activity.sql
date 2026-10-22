CREATE TABLE entry (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_user(id),
    type VARCHAR(20) NOT NULL,
    title VARCHAR(200) NOT NULL,
    raw_text TEXT,
    content TEXT,
    occurred_at TIMESTAMPTZ NOT NULL,
    local_date DATE NOT NULL,
    source VARCHAR(20) NOT NULL,
    ai_allowed BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT ck_entry_type CHECK (type IN ('ACTIVITY', 'MEAL', 'IDEA', 'NOTE'))
);

CREATE TABLE activity_detail (
    entry_id UUID PRIMARY KEY REFERENCES entry(id) ON DELETE CASCADE,
    activity_type VARCHAR(20) NOT NULL,
    duration_min INTEGER,
    difficulty SMALLINT,
    obstacle TEXT,
    takeaway TEXT,
    CONSTRAINT ck_activity_duration CHECK (duration_min IS NULL OR duration_min BETWEEN 1 AND 1440),
    CONSTRAINT ck_activity_difficulty CHECK (difficulty IS NULL OR difficulty BETWEEN 1 AND 5)
);

CREATE INDEX idx_entry_user_local_date ON entry (user_id, local_date DESC, id DESC);
CREATE INDEX idx_entry_user_type_date ON entry (user_id, type, local_date DESC);

