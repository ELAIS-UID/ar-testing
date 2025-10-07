-- FIXED: Function to handle sale updates (corrected column names)
CREATE OR REPLACE FUNCTION handle_sale_update()
RETURNS TRIGGER AS $$
DECLARE
  old_stock_record RECORD;
  new_stock_record RECORD;
  quantity_diff INTEGER;
  amount_diff NUMERIC;
BEGIN
  -- 1. Update related customer_transaction
  -- Note: customer_transactions uses "bags" not "quantity"
  UPDATE customer_transactions
  SET
    type = 'sale',
    amount = NEW.total_amount,
    bags = CASE WHEN NEW.unit = 'bags' THEN NEW.quantity ELSE NULL END,
    location = NEW.location,
    sub_category = NEW.sub_category,
    notes = NEW.notes,
    date = NEW.date,
    updated_at = NOW()
  WHERE related_sale_id = NEW.id;

  -- 2. Update customer balance with the DIFFERENCE
  amount_diff := NEW.total_amount - OLD.total_amount;
  
  IF amount_diff != 0 THEN
    UPDATE customers
    SET 
      balance = balance + amount_diff,
      updated_at = NOW()
    WHERE id = NEW.customer_id;
  END IF;

  -- 3. Handle stock adjustments if location changed
  IF OLD.location IS NOT NULL 
     AND OLD.location NOT IN ('Direct', 'Company Goddam', 'none') 
     AND OLD.location != NEW.location THEN
    
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

  IF NEW.location IS NOT NULL 
     AND NEW.location NOT IN ('Direct', 'Company Goddam', 'none') THEN
    
    SELECT * INTO new_stock_record 
    FROM stocks 
    WHERE location = NEW.location 
    LIMIT 1;
    
    IF FOUND THEN
      IF OLD.location = NEW.location THEN
        quantity_diff := NEW.quantity - OLD.quantity;
        UPDATE stocks 
        SET quantity = quantity - quantity_diff,
            updated_at = NOW()
        WHERE id = new_stock_record.id;
      ELSE
        UPDATE stocks 
        SET quantity = quantity - NEW.quantity,
            updated_at = NOW()
        WHERE id = new_stock_record.id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS sale_update_trigger ON sales;
CREATE TRIGGER sale_update_trigger
  AFTER UPDATE ON sales
  FOR EACH ROW
  EXECUTE FUNCTION handle_sale_update();

-- Verify trigger was created
SELECT trigger_name, event_manipulation 
FROM information_schema.triggers 
WHERE event_object_table = 'sales'
ORDER BY event_manipulation;
