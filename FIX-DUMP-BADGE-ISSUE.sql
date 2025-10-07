-- Fix DUMP Badge Issue - Differentiate between dump transactions and sale transaction cards
-- This ensures only actual dump transactions show the DUMP badge, not sales

-- Step 1: Ensure is_dump column exists (should already exist from previous migration)
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS is_dump BOOLEAN DEFAULT FALSE;

-- Step 2: Update existing records to set proper is_dump values
-- Mark dumps: purchases with price_per_unit = 0 AND no related sale
UPDATE purchases
SET is_dump = TRUE
WHERE price_per_unit = 0
  AND is_dump IS NULL
  AND notes LIKE '%dump%';  -- Dumps typically have "dump" in notes

-- Mark sale transaction cards: purchases with price_per_unit = 0 that are from sales
UPDATE purchases
SET is_dump = FALSE
WHERE price_per_unit = 0
  AND is_dump IS NULL
  AND (notes IS NULL OR notes NOT LIKE '%dump%');

-- Step 3: Set default for any remaining NULL values
UPDATE purchases
SET is_dump = FALSE
WHERE is_dump IS NULL;

-- Step 4: Ensure index exists for better performance
CREATE INDEX IF NOT EXISTS purchases_is_dump_idx ON purchases(is_dump);

-- Step 5: Update the handle_sale_complete function to set is_dump = FALSE for sale transaction cards
CREATE OR REPLACE FUNCTION handle_sale_complete()
RETURNS TRIGGER AS $$
DECLARE
  customer_record RECORD;
  stock_record RECORD;
  transaction_card_supplier_id UUID;
BEGIN
  -- 1. Create customer transaction
  SELECT * INTO customer_record FROM customers WHERE id = NEW.customer_id;
  
  IF FOUND THEN
    INSERT INTO customer_transactions (
      customer_id,
      type,
      amount,
      bags,
      location,
      sub_category,
      notes,
      related_sale_id,
      product_id,
      date
    ) VALUES (
      NEW.customer_id,
      'sale',
      NEW.total_amount,
      NEW.quantity,
      NEW.location,
      NEW.sub_category,
      NEW.notes,
      NEW.id,
      NEW.product_id,
      NEW.date
    );

    -- Update customer balance
    UPDATE customers SET balance = balance + NEW.total_amount WHERE id = NEW.customer_id;
  END IF;

  -- 2. Define transaction card logic
  -- If location is "Direct" or "none" or "Company Goddam" and product is selected,
  -- create transaction card in purchases
  IF NEW.product_id IS NOT NULL AND
     (NEW.location = 'Direct' OR NEW.location = 'none' OR NEW.location = 'Company Goddam') THEN

    -- Use product_id as supplier for transaction cards
    transaction_card_supplier_id := NEW.product_id;

    -- Create transaction card in purchases (no cost, category based on sub_category)
    INSERT INTO purchases (
      supplier_id,
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
      transaction_card_supplier_id,
      NEW.product_id,
      NEW.quantity,
      NEW.unit,
      0,  -- Transaction card has no cost
      0,  -- No total amount
      CASE
        WHEN NEW.sub_category IS NOT NULL THEN NEW.sub_category
        ELSE 'Direct'  -- Default category
      END,
      NEW.notes,
      NEW.date,
      FALSE  -- This is NOT a dump, it's a sale transaction card
    );
  END IF;

  -- 3. Handle stock decrement for physical sales
  -- Only decrement stock if location is not "Direct", "none", or "Company Goddam"
  IF NEW.location IS NOT NULL AND NEW.location NOT IN ('Direct', 'Company Goddam', 'none') THEN
    SELECT * INTO stock_record FROM stocks WHERE location = NEW.location LIMIT 1;

    IF FOUND THEN
      UPDATE stocks SET quantity = quantity - NEW.quantity WHERE id = stock_record.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Ensure the handle_stock_dump function sets is_dump = TRUE for dumps
CREATE OR REPLACE FUNCTION handle_stock_dump()
RETURNS TRIGGER AS $$
BEGIN
  -- When dumping stock, create a purchase marked as dump
  IF NEW.type = 'dump' THEN
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
      'bags',
      0,  -- No cost for dump
      0,
      NEW.to_location,  -- Destination shop location
      NEW.notes,
      CURRENT_DATE,
      TRUE  -- Mark as dump
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Verification Query
-- Run this to check that dumps and sale transaction cards are properly differentiated
SELECT 
  id,
  quantity,
  price_per_unit,
  category,
  notes,
  is_dump,
  CASE 
    WHEN is_dump = TRUE THEN '✅ DUMP (should show badge)'
    WHEN is_dump = FALSE AND price_per_unit = 0 THEN '✅ Sale Card (no badge)'
    WHEN is_dump = FALSE AND price_per_unit > 0 THEN '✅ Regular Purchase (no badge)'
    ELSE '❌ ISSUE: NULL is_dump value'
  END as status
FROM purchases
ORDER BY date DESC, created_at DESC
LIMIT 20;
