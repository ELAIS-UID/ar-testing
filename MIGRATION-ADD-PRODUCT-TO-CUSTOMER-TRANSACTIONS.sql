-- Migration: Add product_id to customer_transactions table
-- This will allow tracking which product was involved in each transaction

-- Step 1: Add product_id column to customer_transactions
ALTER TABLE customer_transactions 
ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id);

-- Step 2: Add index for better performance
CREATE INDEX IF NOT EXISTS customer_transactions_product_id_idx ON customer_transactions(product_id);

-- Step 3: Update the handle_sale_complete() function to include product_id
CREATE OR REPLACE FUNCTION handle_sale_complete()
RETURNS TRIGGER AS $$
DECLARE
  stock_record stocks;
  transaction_card_supplier_id UUID;
BEGIN
  -- 1. Create customer transaction for this sale (NOW WITH PRODUCT_ID)
  INSERT INTO customer_transactions (
    customer_id,
    type,
    amount,
    bags,
    location,
    sub_category,
    notes,
    related_sale_id,
    product_id,  -- NEW FIELD
    date
  ) VALUES (
    NEW.customer_id,
    'sale',
    NEW.total_amount,
    CASE WHEN NEW.unit = 'bags' THEN NEW.quantity ELSE NULL END,
    NEW.location,
    NEW.sub_category,
    NEW.notes,
    NEW.id,
    NEW.product_id,  -- NEW FIELD
    NEW.date
  );

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
      date
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
      NEW.date
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

-- Step 4: Optionally update existing records with product_id from related sales
-- (Run this only if you want to backfill existing data)
UPDATE customer_transactions ct
SET product_id = s.product_id
FROM sales s
WHERE ct.related_sale_id = s.id
  AND ct.product_id IS NULL
  AND s.product_id IS NOT NULL;

-- Verification queries
-- Check if column was added successfully
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'customer_transactions' 
  AND column_name = 'product_id';

-- Check if trigger function was updated
SELECT routine_name, created 
FROM information_schema.routines 
WHERE routine_name = 'handle_sale_complete';

-- Sample query to see product names in customer transactions
SELECT 
  ct.id,
  ct.type,
  ct.amount,
  ct.bags,
  ct.location,
  ct.sub_category,
  p.name as product_name,
  ct.date
FROM customer_transactions ct
LEFT JOIN products p ON ct.product_id = p.id
ORDER BY ct.created_at DESC
LIMIT 10;
