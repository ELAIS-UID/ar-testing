-- Migration: Add UPDATE trigger for sales table
-- This handles editing sales transactions and updating related records

-- Function to handle sale updates
CREATE OR REPLACE FUNCTION handle_sale_update()
RETURNS TRIGGER AS $$
DECLARE
  old_stock_record RECORD;
  new_stock_record RECORD;
  quantity_diff INTEGER;
  amount_diff NUMERIC;
BEGIN
  -- 1. Update related customer_transaction
  UPDATE customer_transactions
  SET
    type = 'sale',
    amount = NEW.total_amount,
    quantity = CASE WHEN NEW.unit = 'bags' THEN NEW.quantity ELSE NULL END,
    location = NEW.location,
    sub_category = NEW.sub_category,
    notes = NEW.notes,
    product_id = NEW.product_id,
    date = NEW.date,
    updated_at = NOW()
  WHERE related_sale_id = NEW.id;

  -- 2. Update customer balance with the DIFFERENCE
  -- Calculate the difference between new and old amounts
  amount_diff := NEW.total_amount - OLD.total_amount;
  
  IF amount_diff != 0 THEN
    UPDATE customers
    SET 
      balance = balance + amount_diff,
      updated_at = NOW()
    WHERE id = NEW.customer_id;
  END IF;

  -- 3. Handle stock adjustments if location changed or quantity changed
  -- If location changed from a physical location
  IF OLD.location IS NOT NULL 
     AND OLD.location NOT IN ('Direct', 'Company Goddam', 'none') 
     AND OLD.location != NEW.location THEN
    
    -- Return stock to old location
    SELECT * INTO old_stock_record 
    FROM stocks 
    WHERE location = OLD.location 
    LIMIT 1;
    
    IF FOUND THEN
      UPDATE stocks 
      SET quantity = quantity + OLD.quantity,
          updated_at = NOW()
      WHERE id = old_stock_record.id;
    END IF;
  END IF;

  -- If location changed to a physical location or quantity changed
  IF NEW.location IS NOT NULL 
     AND NEW.location NOT IN ('Direct', 'Company Goddam', 'none') THEN
    
    SELECT * INTO new_stock_record 
    FROM stocks 
    WHERE location = NEW.location 
    LIMIT 1;
    
    IF FOUND THEN
      -- If location is the same, adjust by the difference
      IF OLD.location = NEW.location THEN
        quantity_diff := NEW.quantity - OLD.quantity;
        UPDATE stocks 
        SET quantity = quantity - quantity_diff,
            updated_at = NOW()
        WHERE id = new_stock_record.id;
      ELSE
        -- If location changed, deduct the new quantity
        UPDATE stocks 
        SET quantity = quantity - NEW.quantity,
            updated_at = NOW()
        WHERE id = new_stock_record.id;
      END IF;
    END IF;
  END IF;

  -- 4. Handle transaction card updates for Direct sales
  -- Delete old transaction card if it exists and location changed away from Direct
  IF OLD.product_id IS NOT NULL 
     AND (OLD.location = 'Direct' OR OLD.location = 'none' OR OLD.location = 'Company Goddam')
     AND (NEW.location != 'Direct' AND NEW.location != 'none' AND NEW.location != 'Company Goddam') THEN
    
    -- Delete the old transaction card
    DELETE FROM purchases
    WHERE product_id = OLD.product_id
      AND date = OLD.date
      AND quantity = OLD.quantity
      AND total_amount = 0
      AND notes = OLD.notes;
  END IF;

  -- Create new transaction card if location is now Direct
  IF NEW.product_id IS NOT NULL 
     AND (NEW.location = 'Direct' OR NEW.location = 'none' OR NEW.location = 'Company Goddam')
     AND (OLD.location != 'Direct' AND OLD.location != 'none' AND OLD.location != 'Company Goddam') THEN
    
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
      NEW.product_id,
      NEW.product_id,
      NEW.quantity,
      NEW.unit,
      0,
      0,
      CASE
        WHEN NEW.sub_category IS NOT NULL THEN NEW.sub_category
        ELSE 'Direct'
      END,
      NEW.notes,
      NEW.date
    );
  
  -- Update existing transaction card if location is still Direct
  ELSIF NEW.product_id IS NOT NULL 
        AND (NEW.location = 'Direct' OR NEW.location = 'none' OR NEW.location = 'Company Goddam')
        AND (OLD.location = 'Direct' OR OLD.location = 'none' OR OLD.location = 'Company Goddam') THEN
    
    UPDATE purchases
    SET
      quantity = NEW.quantity,
      unit = NEW.unit,
      category = CASE
        WHEN NEW.sub_category IS NOT NULL THEN NEW.sub_category
        ELSE 'Direct'
      END,
      notes = NEW.notes,
      date = NEW.date,
      updated_at = NOW()
    WHERE product_id = OLD.product_id
      AND date = OLD.date
      AND quantity = OLD.quantity
      AND total_amount = 0;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS sale_update_trigger ON sales;

-- Create trigger for sale updates
CREATE TRIGGER sale_update_trigger
  AFTER UPDATE ON sales
  FOR EACH ROW
  EXECUTE FUNCTION handle_sale_update();

-- Also update the existing sale_complete_trigger to handle both INSERT and potential future needs
-- The existing trigger is fine for INSERT, we just add the UPDATE trigger separately

-- Verify triggers are set up
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('sales', 'customer_transactions', 'account_transactions')
ORDER BY event_object_table, event_manipulation;
