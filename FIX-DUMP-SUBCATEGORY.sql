-- Fix Dump Sub-Category Issue
-- Problem 1: Dumps always show "Direct" category instead of actual sub-category (G.V/G.L/Direct)
-- Problem 2: Dumps appearing twice (duplicate entries)
-- Solution: Add sub_category to stock_events, update trigger, and ensure no duplicate triggers

-- Step 1: Add required columns if they don't exist
ALTER TABLE stock_events ADD COLUMN IF NOT EXISTS sub_category TEXT;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS is_dump BOOLEAN DEFAULT FALSE;

-- Create index for faster filtering on is_dump
CREATE INDEX IF NOT EXISTS purchases_is_dump_idx ON purchases(is_dump);

-- Step 2: Drop ALL existing triggers on stock_events to prevent duplicates
DROP TRIGGER IF EXISTS stock_dump_trigger ON stock_events;
DROP TRIGGER IF EXISTS handle_stock_dump_trigger ON stock_events;
DROP TRIGGER IF EXISTS stock_event_trigger ON stock_events;

-- Step 3: Update handle_stock_dump function to use sub_category from stock_events
CREATE OR REPLACE FUNCTION handle_stock_dump()
RETURNS TRIGGER AS $$
DECLARE
  dump_date DATE;
BEGIN
  -- When dumping stock, create a transaction card purchase
  IF NEW.type = 'dump' THEN
    -- Extract date from notes if it contains date info, otherwise use created_at date
    -- Notes format: "Stock dump: JSW - G.V to shop1 on 2025-10-06"
    IF NEW.notes LIKE '%on 20__-__-__%' THEN
      -- Extract date from notes (format: "on YYYY-MM-DD")
      dump_date := CAST(SUBSTRING(NEW.notes FROM 'on (\d{4}-\d{2}-\d{2})') AS DATE);
    ELSE
      dump_date := CAST(NEW.created_at AS DATE);
    END IF;
    
    INSERT INTO purchases (
      product_id,
      quantity,
      unit,
      price_per_unit,
      total_amount,
      category,
      notes,
      date,
      is_dump
    ) VALUES (
      NEW.product_id,
      NEW.quantity,
      'bags',  -- Default unit
      0,  -- No cost for dump
      0,  -- No total
      COALESCE(NEW.sub_category, 'Direct'),  -- Use sub_category from stock_event, default to 'Direct'
      NEW.notes,
      COALESCE(dump_date, CURRENT_DATE),  -- Use extracted date or fallback to current date
      TRUE  -- Mark as dump
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create ONE trigger (and only one) for stock dump handling
CREATE TRIGGER stock_dump_trigger
  AFTER INSERT ON stock_events
  FOR EACH ROW EXECUTE FUNCTION handle_stock_dump();

-- Step 5: Mark existing dump records (where price_per_unit = 0 and likely from dumps)
-- First, identify and mark probable dumps before cleanup
UPDATE purchases
SET is_dump = TRUE
WHERE price_per_unit = 0 
  AND (notes LIKE '%dump%' OR notes LIKE '%Stock dump%')
  AND (is_dump IS NULL OR is_dump = FALSE);

-- Step 6: Check for and remove duplicate dump entries (if any exist)
-- This identifies duplicates based on product_id, quantity, date, and is_dump=true
WITH duplicates AS (
  SELECT 
    id,
    product_id,
    quantity,
    date,
    is_dump,
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

-- Step 7: Verify triggers (should only show ONE trigger on stock_events)
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'stock_events'
  AND trigger_name LIKE '%dump%';

-- Expected: Only 1 row showing 'stock_dump_trigger'

-- Verification Query - Check dump records after applying fix
SELECT 
  se.id as "Event ID",
  se.type,
  se.quantity,
  se.sub_category as "Event Sub-Category",
  se.to_location as "Destination Shop",
  p.id as "Purchase ID",
  p.category as "Purchase Category",
  COALESCE(p.is_dump, FALSE) as "Is Dump?",
  p.quantity as "Purchase Bags",
  pr.name as "Product Name",
  p.created_at as "Created At"
FROM stock_events se
LEFT JOIN purchases p ON se.product_id = p.product_id 
  AND se.quantity = p.quantity 
  AND COALESCE(p.is_dump, FALSE) = TRUE
  AND ABS(EXTRACT(EPOCH FROM (p.created_at - se.created_at))) < 5  -- Within 5 seconds
LEFT JOIN products pr ON se.product_id = pr.id
WHERE se.type = 'dump'
ORDER BY se.created_at DESC
LIMIT 10;

-- Expected Result:
-- - Stock Event Sub-Category should match Purchase Category
-- - For example: If you dump with sub_category="G.V", purchase category should be "G.V"
-- - Each stock_event should have ONLY ONE matching purchase record (no duplicates)

-- Additional check: Count duplicates (should be zero after cleanup)
SELECT 
  product_id, 
  quantity, 
  date, 
  COUNT(*) as duplicate_count
FROM purchases
WHERE COALESCE(is_dump, FALSE) = TRUE
GROUP BY product_id, quantity, date
HAVING COUNT(*) > 1;

-- Expected: No rows (all duplicates removed)
