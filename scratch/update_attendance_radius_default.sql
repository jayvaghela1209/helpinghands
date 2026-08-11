-- Update the default value for attendance_radius column in requirements table
-- This only affects NEW rows created after this change.
-- Existing rows remain unchanged.

ALTER TABLE requirements 
ALTER COLUMN attendance_radius SET DEFAULT 300;
