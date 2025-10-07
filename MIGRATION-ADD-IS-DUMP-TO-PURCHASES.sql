-- SIMPLER APPROACH: Add is_dump column to purchases table
-- This marks which purchases are dump transactions

-- Add is_dump column to purchases table
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS is_dump BOOLEAN DEFAULT FALSE;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS purchases_is_dump_idx ON purchases(is_dump);

-- Update trigger to mark dumps with is_dump = true
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

-- Trigger already exists, just updating the function is enough
