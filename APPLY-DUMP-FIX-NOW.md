# 🚀 Quick Fix Guide - Apply Dump Sub-Category Fix

## What This Fixes

1. ✅ Dumps will show correct sub-category (G.V/G.L/Direct) instead of always "Direct"
2. ✅ Removes duplicate dump entries
3. ✅ Prevents future duplicates by cleaning up triggers

## How to Apply (3 Minutes)

### Step 1: Copy the SQL
Open file: `FIX-DUMP-SUBCATEGORY.sql`

### Step 2: Run in Supabase
1. Go to your Supabase Dashboard
2. Click "SQL Editor" in the left sidebar
3. Click "New Query"
4. Paste the entire content of `FIX-DUMP-SUBCATEGORY.sql`
5. Click "Run" (or press Ctrl+Enter)

### Step 3: Verify Success
You should see multiple "SUCCESS" messages for each step. The last queries will show:
- ✅ Trigger verification (should show only 1 trigger)
- ✅ Dump records with correct sub-categories
- ✅ No duplicates found

## Test After Applying

### Test 1: Create New Dump
1. Go to **Purchases** tab
2. Click **"Dump"** button
3. Fill form:
   - Product: JSW
   - Sub-Category: **G.V**
   - Quantity: 5
   - Location: Any shop
4. Click "Dump Stock"

**Expected Result:**
- ✅ Shows: "JSW G.V" (not "JSW Direct")
- ✅ Shows orange "DUMP" badge
- ✅ Appears ONLY ONCE (not twice)

### Test 2: Check Existing Dumps
1. Go to Purchases tab
2. Scroll through dump entries
3. **Expected:** 
   - ✅ Old duplicates are removed
   - ✅ Each dump appears only once

## If Something Goes Wrong

### Error: "column already exists"
**Solution:** This is fine! The column was already added. The script uses `IF NOT EXISTS` to be safe.

### Error: "trigger does not exist"
**Solution:** This is fine! The script drops old triggers before creating new ones.

### Dumps Still Show "Direct"
**Solution:** The old dumps will keep "Direct" category. Only NEW dumps (created after applying the fix) will show the correct sub-category.

### Still See Duplicates
**Solution:** Run this query manually in Supabase SQL Editor:
```sql
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY product_id, quantity, date, COALESCE(is_dump, FALSE)
      ORDER BY created_at DESC
    ) as row_num
  FROM purchases
  WHERE COALESCE(is_dump, FALSE) = TRUE
)
DELETE FROM purchases
WHERE id IN (
  SELECT id FROM duplicates WHERE row_num > 1
);
```

## Summary

- **Files Modified:** Database only (no code changes needed)
- **Downtime:** None
- **Breaking Changes:** None
- **Rollback:** Not needed (backward compatible)

---

✅ **Ready to apply!** Just copy `FIX-DUMP-SUBCATEGORY.sql` and run it in Supabase SQL Editor.
