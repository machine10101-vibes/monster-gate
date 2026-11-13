-- Hunt merge, signup, and email accounts live together.
-- Email hunts are public.hunter_accounts (20261109110000_email_accounts.sql).
-- Signup is the signup edge function. Roster merge is huntMerge.js in the hunter function,
-- which folds two account records before save_account_hunt writes the row.

comment on table public.hunter_accounts is
  'Email-account hunts. Signup is the signup edge function. The hunter function merges rosters with huntMerge.js before save_account_hunt.';

comment on function public.save_account_hunt(uuid, text, jsonb) is
  'Stores an email hunt. Incoming progress is already roster-merged by huntMerge.js.';
