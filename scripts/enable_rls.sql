-- Enable Row Level Security on the transactions table
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
-- Drop existing policy if it exists to allow re-running this script
DROP POLICY IF EXISTS transaction_isolation ON transactions;
-- Create the isolation policy
-- logic: The row's uid must match the value of the configuration parameter 'app.current_user_id'.
-- The second argument 'true' to current_setting makes it return NULL if the variable is not set,
-- rather than raising an error. NULL != 'some_uid', so access is denied by default if context is missing.
CREATE POLICY transaction_isolation ON transactions FOR ALL USING (
    uid = current_setting('app.current_user_id', true)
);
-- Grant access to the database user (adjust if needed)
-- usually the owner has access. RLS applies to the owner too in Cloud SQL if not carefully managed,
-- but typically we want it to apply to the application connection.