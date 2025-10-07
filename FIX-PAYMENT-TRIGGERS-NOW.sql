-- ============================================
-- EMERGENCY FIX: Payment Recording Not Working
-- ============================================
-- Copy and paste this into Supabase SQL Editor
-- Run this IMMEDIATELY to fix payment recording

-- Function 1: Update Customer Balance
CREATE OR REPLACE FUNCTION update_customer_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE customers SET balance = balance + NEW.amount WHERE id = NEW.customer_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE customers SET balance = balance - OLD.amount + NEW.amount WHERE id = NEW.customer_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE customers SET balance = balance - OLD.amount WHERE id = OLD.customer_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function 2: Handle Customer Payment (Creates Account Transaction)
CREATE OR REPLACE FUNCTION handle_customer_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'payment' THEN
    INSERT INTO account_transactions (
      account_id,
      type,
      amount,
      description,
      notes,
      date,
      user_id
    ) VALUES (
      NEW.account_id,
      'payment',
      ABS(NEW.amount),
      'Customer Payment - ₹' || ABS(NEW.amount)::text,
      NEW.notes,
      NEW.date,
      NEW.user_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function 3: Update Account Balance
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.type IN ('add-funds', 'transfer-in', 'payment') THEN
      UPDATE accounts SET balance = balance + NEW.amount WHERE id = NEW.account_id;
    ELSE
      UPDATE accounts SET balance = balance - ABS(NEW.amount) WHERE id = NEW.account_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.type IN ('add-funds', 'transfer-in', 'payment') THEN
      UPDATE accounts SET balance = balance - OLD.amount WHERE id = OLD.account_id;
    ELSE
      UPDATE accounts SET balance = balance + ABS(OLD.amount) WHERE id = OLD.account_id;
    END IF;
    IF NEW.type IN ('add-funds', 'transfer-in', 'payment') THEN
      UPDATE accounts SET balance = balance + NEW.amount WHERE id = NEW.account_id;
    ELSE
      UPDATE accounts SET balance = balance - ABS(NEW.amount) WHERE id = NEW.account_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.type IN ('add-funds', 'transfer-in', 'payment') THEN
      UPDATE accounts SET balance = balance - OLD.amount WHERE id = OLD.account_id;
    ELSE
      UPDATE accounts SET balance = balance + ABS(OLD.amount) WHERE id = OLD.account_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create the triggers
DROP TRIGGER IF EXISTS customer_balance_trigger ON customer_transactions;
CREATE TRIGGER customer_balance_trigger
  AFTER INSERT OR UPDATE OR DELETE ON customer_transactions
  FOR EACH ROW EXECUTE FUNCTION update_customer_balance();

DROP TRIGGER IF EXISTS payment_processing_trigger ON customer_transactions;
CREATE TRIGGER payment_processing_trigger
  AFTER INSERT ON customer_transactions
  FOR EACH ROW EXECUTE FUNCTION handle_customer_payment();

DROP TRIGGER IF EXISTS account_balance_trigger ON account_transactions;
CREATE TRIGGER account_balance_trigger
  AFTER INSERT OR UPDATE OR DELETE ON account_transactions
  FOR EACH ROW EXECUTE FUNCTION update_account_balance();

-- Verify triggers were created
SELECT
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table IN ('customer_transactions', 'account_transactions')
ORDER BY event_object_table, trigger_name;

-- Expected output:
-- customer_balance_trigger | INSERT OR UPDATE OR DELETE | customer_transactions
-- payment_processing_trigger | INSERT | customer_transactions
-- account_balance_trigger | INSERT OR UPDATE OR DELETE | account_transactions
