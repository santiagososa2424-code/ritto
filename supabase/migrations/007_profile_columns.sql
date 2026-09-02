-- Add columns that the app uses but were never in a migration
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_complete boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS excel_mapping jsonb,
  ADD COLUMN IF NOT EXISTS google_sheet_id text,
  ADD COLUMN IF NOT EXISTS google_access_token text,
  ADD COLUMN IF NOT EXISTS google_email text,
  ADD COLUMN IF NOT EXISTS mp_subscription_id text;

-- Mark existing users with data as onboarding complete so they don't get stuck
UPDATE profiles
SET onboarding_complete = true
WHERE (nombre IS NOT NULL AND nombre != '')
  AND (onboarding_complete IS NULL OR onboarding_complete = false);
