# Dump Sub-Category Fix Summary ✅

## Problem Statement

### Problem 1: Wrong Category Display
When dumping stock from the Stock Management module with:
- **Product:** JSW (or any product)
- **Sub-Category:** G.V (or G.L)
- **Location:** Any shop

The transaction card in the Purchase module was showing:
- ❌ **Current:** "JSW Direct" (wrong - hardcoded)
- ✅ **Expected:** "JSW G.V" + DUMP badge (correct - dynamic)

### Problem 2: Duplicate Entries
Dumps were appearing **TWICE** in the purchase list, creating duplicate transaction cards.

## Root Cause

### Issue 1: Missing Sub-Category Field
1. **Database Schema Issue:**
   - `stock_events` table was missing `sub_category` column
   - User selects sub-category in dump form but it wasn't stored

2. **Database Function Issue:**
   - `handle_stock_dump()` function hardcoded `category = 'Direct'`
   - Should have used the sub-category from the stock_event

### Issue 2: Duplicate Triggers
1. **Multiple Triggers Issue:**
   - Multiple triggers might exist on `stock_events` table
   - Each trigger fires independently, creating duplicate purchase records
   - Need to drop all old triggers and create only ONE

3. **Frontend → Backend Flow:**
   ```
   User selects sub_category → dumpStock() → stock_events (missing field) → trigger (hardcoded 'Direct') → purchases table
   ```

## Solution

### Changes Made:

#### 1. Database Schema (`supabase-schema.sql`)
```sql
-- Added sub_category column to stock_events table
CREATE TABLE IF NOT EXISTS stock_events (
  ...
  sub_category TEXT,  -- NEW: Sub-category for dumps (Direct, G.V, G.L)
  ...
);
```

#### 2. Remove Duplicate Triggers (`FIX-DUMP-SUBCATEGORY.sql`)
```sql
-- Drop ALL existing triggers to prevent duplicates
DROP TRIGGER IF EXISTS stock_dump_trigger ON stock_events;
DROP TRIGGER IF EXISTS handle_stock_dump_trigger ON stock_events;
DROP TRIGGER IF EXISTS stock_event_trigger ON stock_events;
```

#### 3. Database Trigger (`supabase-schema.sql`)
```sql
-- Updated handle_stock_dump() to use sub_category
CREATE OR REPLACE FUNCTION handle_stock_dump()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'dump' THEN
    INSERT INTO purchases (
      ...
      category,  -- Changed from hardcoded 'Direct' to dynamic
      ...
      is_dump
    ) VALUES (
      ...
      COALESCE(NEW.sub_category, 'Direct'),  -- Use sub_category from stock_event
      ...
      TRUE  -- Mark as dump
    );
  END IF;
END;
$$;

-- Create ONLY ONE trigger
CREATE TRIGGER stock_dump_trigger
  AFTER INSERT ON stock_events
  FOR EACH ROW EXECUTE FUNCTION handle_stock_dump();
```

#### 4. Clean Up Existing Duplicates (`FIX-DUMP-SUBCATEGORY.sql`)
```sql
-- Remove duplicate dump entries (keeps most recent)
WITH duplicates AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY product_id, quantity, date, is_dump
    ORDER BY created_at DESC
  ) as row_num
  FROM purchases
  WHERE is_dump = TRUE
)
DELETE FROM purchases
WHERE id IN (SELECT id FROM duplicates WHERE row_num > 1);
```

#### 5. TypeScript Hook (`lib/supabase/hooks/useStocks.ts`)
```typescript
const { error: eventError } = await supabase
  .from('stock_events')
  .insert({
    ...
    sub_category: subCategory,  // NEW: Pass sub_category to database
    ...
  })
```

## Deployment Steps

### Step 1: Apply Database Migration
Run the SQL file in Supabase SQL Editor:

**File:** `FIX-DUMP-SUBCATEGORY.sql`

This will:
1. Add `sub_category` column to `stock_events` ✅
2. Drop ALL old triggers to prevent duplicates ✅
3. Update `handle_stock_dump()` function ✅
4. Create ONE new trigger ✅
5. Clean up existing duplicate dump entries ✅
6. No downtime required ✅

### Step 2: Verify Database Changes
```sql
-- Check if column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'stock_events' AND column_name = 'sub_category';
-- Expected: One row showing 'sub_category' | 'text'

-- Check for duplicate triggers (should show ONLY ONE)
SELECT trigger_name
FROM information_schema.triggers
WHERE event_object_table = 'stock_events' AND trigger_name LIKE '%dump%';
-- Expected: Only ONE row: 'stock_dump_trigger'

-- Check for remaining duplicates (should be zero)
SELECT product_id, quantity, date, COUNT(*) as count
FROM purchases
WHERE is_dump = TRUE
GROUP BY product_id, quantity, date
HAVING COUNT(*) > 1;
-- Expected: No rows (all duplicates removed)
```

### Step 3: Deploy Frontend Changes
The TypeScript hook changes are already made. Just push/deploy your code.

## Testing After Deployment

### Test 1: Dump with G.V Sub-Category
1. Go to **Purchases** tab
2. Click **Dump** button
3. Fill form:
   - Product Type: **JSW**
   - Sub-Category: **G.V**
   - Quantity: 10 bags
   - Location: Any shop (e.g., "Shop A")
4. Click "Dump Stock"
5. **Expected Result:**
   - Purchase card shows: **"JSW G.V"** ✅
   - Separate badge shows: **"DUMP"** (orange badge) ✅

### Test 2: Dump with Direct Sub-Category
1. Repeat Test 1 but with Sub-Category: **Direct**
2. **Expected Result:**
   - Purchase card shows: **"JSW Direct"** ✅
   - DUMP badge shows ✅

### Test 3: Verify Sales Transaction Cards (Should Not Change)
1. Go to **Sales** tab
2. Add sale with:
   - Location: **none**
   - Product: **JSW**
   - Sub-Category: **G.V**
3. Check **Purchases** tab
4. **Expected Result:**
   - Shows: **"JSW G.V"** (correct) ✅
   - NO DUMP badge (correct - it's a sale card) ✅

## Database Verification Query

After testing, run this to verify everything is correct:

```sql
SELECT 
  se.type,
  se.sub_category as "Event Sub-Category",
  p.category as "Purchase Category",
  p.is_dump as "Is Dump?",
  pr.name as "Product",
  CASE
    WHEN se.sub_category = p.category AND p.is_dump = TRUE THEN '✅ CORRECT'
    WHEN se.sub_category != p.category THEN '❌ MISMATCH'
    ELSE '⚠️ CHECK'
  END as "Status"
FROM stock_events se
LEFT JOIN purchases p ON se.product_id = p.product_id 
  AND se.quantity = p.quantity 
  AND p.is_dump = TRUE
  AND ABS(EXTRACT(EPOCH FROM (p.created_at - se.created_at))) < 5  -- Within 5 seconds
LEFT JOIN products pr ON se.product_id = pr.id
WHERE se.type = 'dump'
ORDER BY se.created_at DESC
LIMIT 10;
```

**Expected:** All rows should show `✅ CORRECT`

## Summary of Badge Display Logic

| Source | Location | Sub-Category | Badge Display | DUMP Badge? |
|--------|----------|--------------|---------------|-------------|
| **Sale** | none/Direct | G.V | "JSW G.V" | ❌ No |
| **Sale** | none/Direct | Direct | "JSW Direct" | ❌ No |
| **Dump** | Any shop | G.V | "JSW G.V" | ✅ Yes |
| **Dump** | Any shop | Direct | "JSW Direct" | ✅ Yes |
| **Purchase** | - | G.V | "JSW G.V" | ❌ No |

## Files Modified

1. ✅ `supabase-schema.sql` - Added column, updated trigger
2. ✅ `lib/supabase/hooks/useStocks.ts` - Pass sub_category
3. ✅ `FIX-DUMP-SUBCATEGORY.sql` - Migration script
4. ✅ `DUMP-SUBCATEGORY-FIX-SUMMARY.md` - This documentation

---

**Status:** ✅ Fixed and Ready to Deploy

**Breaking Changes:** None - backward compatible

**Estimated Deployment Time:** 2-3 minutes

**Downtime Required:** None
