-- ============================================
-- FIX PAYMENT RECORDING - DATABASE VERIFICATION & REPAIR
-- ============================================
-- Run this script in Supabase SQL Editor to verify and fix database triggers
-- This ensures payments are properly recorded and balances are updated

-- ============================================
-- STEP 1: Verify Trigger Existence
-- ============================================
-- Check if all required triggers exist
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table IN ('customer_transactions', 'account_transactions')
ORDER BY event_object_table, trigger_name;

-- Expected results:
-- 1. customer_balance_trigger on customer_transactions
-- 2. payment_processing_trigger on customer_transactions
-- 3. account_balance_trigger on account_transactions

-- ============================================
-- STEP 2: Verify Function Existence
-- ============================================
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'update_customer_balance',
    'handle_customer_payment',
    'update_account_balance'
  );

-- Expected results:
-- 1. update_customer_balance (FUNCTION)
-- 2. handle_customer_payment (FUNCTION)
-- 3. update_account_balance (FUNCTION)

-- ============================================
-- STEP 3: Recreate Functions (If Missing)
-- ============================================

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

-- Function 2: Update Account Balance
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Add funds increases balance, remove funds decreases balance
    IF NEW.type = 'add-funds' OR NEW.type = 'transfer-in' OR NEW.type = 'payment' THEN
      UPDATE accounts SET balance = balance + NEW.amount WHERE id = NEW.account_id;
    ELSE
      UPDATE accounts SET balance = balance - ABS(NEW.amount) WHERE id = NEW.account_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Reverse old transaction and apply new transaction
    IF OLD.type = 'add-funds' OR OLD.type = 'transfer-in' OR OLD.type = 'payment' THEN
      UPDATE accounts SET balance = balance - OLD.amount WHERE id = OLD.account_id;
    ELSE
      UPDATE accounts SET balance = balance + ABS(OLD.amount) WHERE id = OLD.account_id;
    END IF;

    IF NEW.type = 'add-funds' OR NEW.type = 'transfer-in' OR NEW.type = 'payment' THEN
      UPDATE accounts SET balance = balance + NEW.amount WHERE id = NEW.account_id;
    ELSE
      UPDATE accounts SET balance = balance - ABS(NEW.amount) WHERE id = NEW.account_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Reverse the transaction effect
    IF OLD.type = 'add-funds' OR OLD.type = 'transfer-in' OR OLD.type = 'payment' THEN
      UPDATE accounts SET balance = balance - OLD.amount WHERE id = OLD.account_id;
    ELSE
      UPDATE accounts SET balance = balance + ABS(OLD.amount) WHERE id = OLD.account_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function 3: Handle Customer Payment (Creates Account Transaction)
CREATE OR REPLACE FUNCTION handle_customer_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- When a customer transaction is payment type, also create corresponding account transaction
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
      ABS(NEW.amount),  -- Positive for account
      'Customer Payment - ₹' || ABS(NEW.amount)::text,
      NEW.notes,
      NEW.date,
      NEW.user_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 4: Recreate Triggers
-- ============================================

-- Trigger 1: Customer Balance Update
DROP TRIGGER IF EXISTS customer_balance_trigger ON customer_transactions;
CREATE TRIGGER customer_balance_trigger
  AFTER INSERT OR UPDATE OR DELETE ON customer_transactions
  FOR EACH ROW EXECUTE FUNCTION update_customer_balance();

-- Trigger 2: Account Balance Update
DROP TRIGGER IF EXISTS account_balance_trigger ON account_transactions;
CREATE TRIGGER account_balance_trigger
  AFTER INSERT OR UPDATE OR DELETE ON account_transactions
  FOR EACH ROW EXECUTE FUNCTION update_account_balance();

-- Trigger 3: Payment Processing (Customer Payment → Account Transaction)
DROP TRIGGER IF EXISTS payment_processing_trigger ON customer_transactions;
CREATE TRIGGER payment_processing_trigger
  AFTER INSERT ON customer_transactions
  FOR EACH ROW EXECUTE FUNCTION handle_customer_payment();

-- ============================================
-- STEP 5: Test the Setup
-- ============================================

-- Test 1: Check customer balance BEFORE payment
SELECT id, name, balance FROM customers WHERE name = 'FAIZAN';

-- Test 2: Check account balance BEFORE payment
SELECT id, name, balance FROM accounts WHERE name = 'ABDUL';

-- Test 3: Record a test payment (₹100)
-- IMPORTANT: Replace these IDs with actual IDs from your database
/*
INSERT INTO customer_transactions (
  customer_id,
  type,
  amount,
  account_id,
  notes
) VALUES (
  (SELECT id FROM customers WHERE name = 'FAIZAN' LIMIT 1),
  'payment',
  -100,  -- Negative reduces customer balance
  (SELECT id FROM accounts WHERE name = 'ABDUL' LIMIT 1),
  'Test payment to verify triggers'
);
*/

-- Test 4: Check customer balance AFTER payment
-- Customer balance should be REDUCED by 100
SELECT id, name, balance FROM customers WHERE name = 'FAIZAN';

-- Test 5: Check account balance AFTER payment
-- Account balance should be INCREASED by 100
SELECT id, name, balance FROM accounts WHERE name = 'ABDUL';

-- Test 6: Verify account transaction was created automatically
SELECT * FROM account_transactions 
WHERE type = 'payment' 
  AND description LIKE '%Customer Payment%'
ORDER BY created_at DESC 
LIMIT 5;

-- Test 7: Verify customer transaction exists
SELECT * FROM customer_transactions 
WHERE type = 'payment'
ORDER BY created_at DESC 
LIMIT 5;

-- ============================================
-- STEP 6: Check Recent Transactions
-- ============================================

-- Last 5 customer payments
SELECT 
  ct.id,
  c.name as customer_name,
  ct.type,
  ct.amount as customer_amount,
  ct.date,
  a.name as account_name,
  ct.notes
FROM customer_transactions ct
JOIN customers c ON ct.customer_id = c.id
LEFT JOIN accounts a ON ct.account_id = a.id
WHERE ct.type = 'payment'
ORDER BY ct.created_at DESC
LIMIT 5;

-- Last 5 account transactions from payments
SELECT 
  at.id,
  a.name as account_name,
  at.type,
  at.amount as account_amount,
  at.date,
  at.description,
  at.notes
FROM account_transactions at
JOIN accounts a ON at.account_id = a.id
WHERE at.type = 'payment'
ORDER BY at.created_at DESC
LIMIT 5;

-- ============================================
-- STEP 7: Fix Orphaned Data (If Needed)
-- ============================================

-- Find customer payments without corresponding account transactions
SELECT 
  ct.id,
  c.name as customer_name,
  ct.amount,
  ct.date,
  a.name as account_name
FROM customer_transactions ct
JOIN customers c ON ct.customer_id = c.id
LEFT JOIN accounts a ON ct.account_id = a.id
LEFT JOIN account_transactions at ON (
  at.account_id = ct.account_id 
  AND at.type = 'payment'
  AND at.date = ct.date
  AND at.amount = ABS(ct.amount)
)
WHERE ct.type = 'payment'
  AND at.id IS NULL
ORDER BY ct.created_at DESC;

-- If orphaned payments found, you can manually create account transactions:
/*
INSERT INTO account_transactions (account_id, type, amount, description, date)
SELECT 
  ct.account_id,
  'payment',
  ABS(ct.amount),
  'Customer Payment - ₹' || ABS(ct.amount)::text,
  ct.date
FROM customer_transactions ct
LEFT JOIN account_transactions at ON (
  at.account_id = ct.account_id 
  AND at.type = 'payment'
  AND at.date = ct.date
  AND at.amount = ABS(ct.amount)
)
WHERE ct.type = 'payment'
  AND at.id IS NULL;
*/

-- ============================================
-- STEP 8: Verify Balances Are Correct
-- ============================================

-- Calculate what customer balance SHOULD be based on transactions
SELECT 
  c.id,
  c.name,
  c.balance as current_balance,
  COALESCE(SUM(ct.amount), 0) as calculated_balance,
  c.balance - COALESCE(SUM(ct.amount), 0) as difference
FROM customers c
LEFT JOIN customer_transactions ct ON c.id = ct.customer_id
GROUP BY c.id, c.name, c.balance
HAVING c.balance - COALESCE(SUM(ct.amount), 0) != 0
ORDER BY difference DESC;

-- Calculate what account balance SHOULD be based on transactions
SELECT 
  a.id,
  a.name,
  a.balance as current_balance,
  COALESCE(
    SUM(CASE 
      WHEN at.type IN ('add-funds', 'transfer-in', 'payment') THEN at.amount
      ELSE -ABS(at.amount)
    END), 
    0
  ) as calculated_balance,
  a.balance - COALESCE(
    SUM(CASE 
      WHEN at.type IN ('add-funds', 'transfer-in', 'payment') THEN at.amount
      ELSE -ABS(at.amount)
    END), 
    0
  ) as difference
FROM accounts a
LEFT JOIN account_transactions at ON a.id = at.account_id
GROUP BY a.id, a.name, a.balance
HAVING ABS(a.balance - COALESCE(
    SUM(CASE 
      WHEN at.type IN ('add-funds', 'transfer-in', 'payment') THEN at.amount
      ELSE -ABS(at.amount)
    END), 
    0
  )) > 0.01
ORDER BY difference DESC;

-- ============================================
-- TROUBLESHOOTING QUERIES
-- ============================================

-- Check if RLS policies are blocking triggers
SELECT tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('customer_transactions', 'account_transactions');

-- Check trigger status
SELECT 
  tgname as trigger_name,
  tgenabled as enabled_status,
  tgrelid::regclass as table_name
FROM pg_trigger 
WHERE tgname IN (
  'customer_balance_trigger',
  'payment_processing_trigger', 
  'account_balance_trigger'
);

-- Enabled status codes:
-- 'O' = Origin (enabled)
-- 'D' = Disabled
-- 'R' = Replica
-- 'A' = Always

-- ============================================
-- SUCCESS INDICATORS
-- ============================================
-- After running this script, you should see:
-- ✓ All 3 triggers exist and are enabled
-- ✓ All 3 functions exist
-- ✓ Test payment creates both customer_transaction and account_transaction
-- ✓ Customer balance reduces by payment amount
-- ✓ Account balance increases by payment amount
-- ✓ No orphaned payments
-- ✓ Calculated balances match current balances
