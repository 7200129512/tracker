-- Gmail OAuth tokens per user
CREATE TABLE IF NOT EXISTS gmail_tokens (
    id              SERIAL PRIMARY KEY,
    user_id         UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    access_token    TEXT NOT NULL,
    refresh_token   TEXT,
    expires_at      TIMESTAMPTZ,
    connected       BOOLEAN NOT NULL DEFAULT TRUE,
    last_sync_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add gmail_message_id to daily_transactions to prevent duplicate imports
ALTER TABLE daily_transactions
ADD COLUMN IF NOT EXISTS gmail_message_id VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_transactions_gmail_msg
    ON daily_transactions(user_id, gmail_message_id)
    WHERE gmail_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gmail_tokens_user_id ON gmail_tokens(user_id);
