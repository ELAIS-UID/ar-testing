-- Fix dump stock trigger to use destination location instead of hardcoded 'Direct'
-- This ensures dumps show correct shop name in transaction cards

CREATE OR REPLACE FUNCTION handle_stock_dump()
RETURNS TRIGGER AS $$
BEGIN
  -- When dumping stock, create a transaction card purchase
  IF NEW.type = 'dump' THEN
    INSERT INTO purchases (
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
      NEW.quantity,
      'bags',  -- Default unit
      0,  -- No cost for dump
      0,  -- No total
      COALESCE(NEW.to_location, 'Direct'),  -- Use destination location from stock_event
      COALESCE(NEW.notes, 'Stock dump'),
      CURRENT_DATE
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- No need to recreate trigger, just updating the function is enough
