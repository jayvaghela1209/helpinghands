# Attendance Radius Default Fix

## Problem
Newly created requirements were getting `attendance_radius = 100000` meters (100 km) instead of the desired 300 meters.

## Root Cause
1. Backend had `DEFAULT_ATTENDANCE_RADIUS = 100000.0` in `app/routers/requirements.py`
2. Database schema had `DEFAULT 50` in `schema.sql`
3. Backend explicitly sent 100000 which overrode the database default

## Fix Applied

### 1. Backend (app/routers/requirements.py)
Changed line 15 from:
```python
DEFAULT_ATTENDANCE_RADIUS = 100000.0
```
To:
```python
DEFAULT_ATTENDANCE_RADIUS = 300.0
```

### 2. Schema Template (schema.sql)
Updated requirements table definition from:
```sql
attendance_radius   NUMERIC(8,2) NOT NULL DEFAULT 50
```
To:
```sql
attendance_radius   NUMERIC(8,2) NOT NULL DEFAULT 300
```

### 3. Frontend (ManageRequirements.jsx)
Updated placeholder text from 100000 to 300 for consistency.

### 4. Database Migration Required

**Run this SQL to update the live database default:**

```sql
ALTER TABLE requirements 
ALTER COLUMN attendance_radius SET DEFAULT 300;
```

This only affects NEW requirements created after this change.
Existing requirements remain unchanged (you already updated them to 300).

## Verification

After applying the database migration:

1. ✅ Backend Pydantic schema defaults to 300.0
2. ✅ Database column defaults to 300
3. ✅ Frontend does not send attendance_radius on creation (uses backend default)
4. ✅ Frontend edit form shows correct 300m placeholder
5. ✅ attendance.py continues to read from database
6. ✅ No hardcoded 100000 remains in application code

## Testing

Create a new requirement through the frontend and verify in the database:
```sql
SELECT title, attendance_radius FROM requirements ORDER BY created_at DESC LIMIT 1;
```

Expected result: `attendance_radius = 300.00`
