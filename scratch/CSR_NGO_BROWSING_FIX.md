# CSR NGO Browsing Workflow - Implementation Summary

## Problem
Corporate users could not browse NGOs through the application because the `/api/csr/ngos` endpoint filtered by `verification_status = 'approved'`. This required manual database updates by a platform operator to approve each NGO before they appeared in the corporate browse list.

## Solution
Modified the CSR endpoints to allow browsing of **eligible NGOs** (those not suspended or rejected) rather than requiring explicit "approved" status.

## Changes Made

### 1. Backend: app/routers/csr.py

#### Line ~443: GET /api/csr/ngos endpoint
**Changed from:**
```python
WHERE np.verification_status = 'approved'
```

**Changed to:**
```python
WHERE np.verification_status NOT IN ('suspended', 'rejected')
```

This allows corporate users to browse NGOs with status: `pending` or `approved`.

#### Line ~478: GET /api/csr/ngos/{ngo_profile_id} endpoint
**Changed from:**
```python
WHERE np.id = :ngo_profile_id AND np.verification_status = 'approved'
```

**Changed to:**
```python
WHERE np.id = :ngo_profile_id AND np.verification_status NOT IN ('suspended', 'rejected')
```

**Error message changed from:**
```python
detail="NGO profile not found or not approved"
```

**To:**
```python
detail="NGO profile not found or not accessible"
```

### 2. Frontend: frontend/src/pages/BrowseNgos.jsx

#### Minor comment/text updates for clarity:
- Line 46: Comment changed from "Fetch Approved NGOs" to "Fetch Eligible NGOs"
- Line 218: Error message changed from "No approved NGOs" to "No eligible NGOs"

These are cosmetic changes only - the frontend logic remains unchanged.

## NGO Eligibility Logic

### Current Behavior:
- **Accessible NGOs**: `pending` or `approved` status
- **Hidden NGOs**: `suspended` or `rejected` status

### Rationale:
This approach provides:
1. **Immediate Visibility**: Newly registered NGOs appear in corporate browse immediately
2. **Safety Mechanism**: Platform can still `suspend` or `reject` problematic NGOs
3. **No Manual Approval Required**: Corporate users can browse without operator intervention
4. **Backwards Compatible**: Previously "approved" NGOs remain accessible

## Database Schema

No database changes required. The `ngo_profiles` table structure remains:

```sql
verification_status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'approved', 'rejected', 'suspended'))
```

**Default status**: `pending` (newly registered NGOs)

## Security & Authorization

**Preserved:**
- ✅ Corporate role authentication required (`require_role([UserRole.corporate])`)
- ✅ JWT token validation
- ✅ User role enforcement
- ✅ NGO profile ID validation
- ✅ Unauthenticated users blocked
- ✅ Non-corporate users blocked

**Changed:**
- ❌ Manual "approved" status no longer required for browsing

## API Endpoints Affected

### GET /api/csr/ngos
**Before**: Returned only `verification_status = 'approved'` NGOs  
**After**: Returns NGOs with `verification_status NOT IN ('suspended', 'rejected')`

**Response structure**: Unchanged  
**Authentication**: Unchanged (corporate users only)

### GET /api/csr/ngos/{ngo_profile_id}
**Before**: Required `verification_status = 'approved'`  
**After**: Requires `verification_status NOT IN ('suspended', 'rejected')`

**Response structure**: Unchanged  
**Authentication**: Unchanged (corporate users only)

## Functionality Preserved

The following remain unchanged:
- ✅ Corporate authentication & role protection
- ✅ NGO ratings aggregation
- ✅ Active requirements count
- ✅ NGO detail modal
- ✅ Search and filter functionality
- ✅ Focus area filtering
- ✅ CSR pledge creation
- ✅ Requirement sponsorship
- ✅ Volunteer reviews display
- ✅ All location/attendance logic
- ✅ Certificate generation
- ✅ Check-in/check-out system
- ✅ Geoapify integration

## Testing Checklist

### Backend Testing:
1. ✅ Start backend: `cd scratch && source venv/bin/activate && uvicorn app.main:app --reload`
2. ✅ Verify authentication: Unauthenticated request returns `{"detail":"Not authenticated"}`
3. 🔲 Test with corporate user token: `curl -H "Authorization: Bearer <TOKEN>" http://localhost:8000/api/csr/ngos`
4. 🔲 Verify NGOs with `pending` status are returned
5. 🔲 Verify NGOs with `approved` status are returned
6. 🔲 Verify NGOs with `suspended` status are NOT returned
7. 🔲 Verify NGOs with `rejected` status are NOT returned
8. 🔲 Test NGO details endpoint with valid NGO ID
9. 🔲 Verify non-corporate users receive authorization error

### Frontend Testing:
1. 🔲 Start frontend: `cd scratch/frontend && npm run dev`
2. 🔲 Login as corporate user
3. 🔲 Navigate to "Browse Verified NGOs"
4. 🔲 Verify NGO cards are displayed
5. 🔲 Test search functionality
6. 🔲 Test focus area filtering
7. 🔲 Click an NGO card to open details modal
8. 🔲 Verify NGO details, reviews, requirements are displayed
9. 🔲 Test "CSR Pledge" button navigation
10. 🔲 Test "Sponsor Requirement" button navigation
11. 🔲 Verify no console errors

### Integration Testing:
1. 🔲 Register a new NGO account
2. 🔲 Verify it appears in corporate browse immediately (without manual approval)
3. 🔲 Manually set NGO `verification_status = 'suspended'` in database
4. 🔲 Verify it disappears from corporate browse
5. 🔲 Set back to `pending`
6. 🔲 Verify it reappears

## Risks & Considerations

### Low Risk:
- NGOs with `pending` status are now visible to corporate users
- This is acceptable because:
  - NGO registration requires authentication
  - NGOs cannot create malicious content in the browse view
  - Platform operators can `suspend` or `reject` at any time

### Mitigation:
- Platform operators should monitor new NGO registrations
- Implement admin dashboard to review new NGOs (future enhancement)
- Add email notifications for new NGO registrations (future enhancement)

### Future Enhancements (Optional):
1. Admin panel to review/approve/reject NGOs
2. Email notifications for new NGO registrations
3. NGO verification workflow with document upload
4. Badge system to distinguish "verified" vs "new" NGOs in UI
5. Reporting system for corporate users to flag problematic NGOs

## Rollback Plan

If issues arise, revert to previous commit:
```bash
git checkout <previous-commit-hash>
```

Previous commit message: "feat: mark NGOs approved for CSR browsing"

## Files Changed Summary

1. **app/routers/csr.py** - 2 endpoint filters updated
2. **frontend/src/pages/BrowseNgos.jsx** - 2 minor text updates (cosmetic)

**Total files changed**: 2  
**Lines changed**: ~6 lines

## Deployment Notes

- No database migrations required
- No environment variable changes required
- Backend restart required to load new code
- Frontend rebuild required: `npm run build`
- Existing "approved" NGOs remain accessible
- No user data affected
