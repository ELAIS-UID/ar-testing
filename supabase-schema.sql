-- Supabase Schema for Cement Business Management System
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  category TEXT DEFAULT 'Individual',
  balance DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT DEFAULT 'Cement',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Accounts table
CREATE TABLE IF NOT EXISTS accounts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  balance DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Stocks table
CREATE TABLE IF NOT EXISTS stocks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  location TEXT NOT NULL,
  quantity INTEGER DEFAULT 0,
  threshold INTEGER DEFAULT 100,
  product_id UUID REFERENCES products(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE(location)
);

-- Stock Events table (for tracking load/dump/transfer history)
CREATE TABLE IF NOT EXISTS stock_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  stock_id UUID REFERENCES stocks(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('load', 'dump', 'transfer')) NOT NULL,
  quantity INTEGER NOT NULL,
  from_location TEXT,
  to_location TEXT,
  product_id UUID REFERENCES products(id),
  sub_category TEXT,  -- Sub-category for dumps (Direct, G.V, G.L)
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Sales table
CREATE TABLE IF NOT EXISTS sales (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  stock_id UUID REFERENCES stocks(id),
  product_id UUID REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit TEXT DEFAULT 'bags',
  price_per_unit DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  sub_category TEXT,
  location TEXT,
  notes TEXT,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Purchases table
CREATE TABLE IF NOT EXISTS purchases (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  supplier_id UUID REFERENCES products(id), -- Using products as suppliers for simplicity
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  unit TEXT DEFAULT 'bags',
  price_per_unit DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2),
  total_amount DECIMAL(12,2) NOT NULL,
  category TEXT, -- Direct, G.V, G.L
  account_id UUID REFERENCES accounts(id),
  notes TEXT,
  date DATE DEFAULT CURRENT_DATE,
  is_dump BOOLEAN DEFAULT FALSE, -- Differentiates dump transactions from sale transaction cards
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Customer Transactions table
CREATE TABLE IF NOT EXISTS customer_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('sale', 'payment', 'discount')) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  bags INTEGER,
  location TEXT,
  sub_category TEXT,
  notes TEXT,
  account_id UUID REFERENCES accounts(id),
  related_sale_id UUID REFERENCES sales(id),
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Account Transactions table
CREATE TABLE IF NOT EXISTS account_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('add-funds', 'remove-funds', 'transfer-in', 'transfer-out', 'expense', 'payment')) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  description TEXT NOT NULL,
  notes TEXT,
  related_account_id UUID REFERENCES accounts(id), -- For transfers
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Reminders table
CREATE TABLE IF NOT EXISTS reminders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  reminder_date DATE NOT NULL,
  notes TEXT,
  status TEXT CHECK (status IN ('active', 'completed')) DEFAULT 'active',
  created_date TIMESTAMPTZ DEFAULT NOW(),
  completed_date TIMESTAMPTZ,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS customers_name_idx ON customers(name);
CREATE INDEX IF NOT EXISTS customers_user_id_idx ON customers(user_id);
CREATE INDEX IF NOT EXISTS sales_customer_id_idx ON sales(customer_id);
CREATE INDEX IF NOT EXISTS sales_date_idx ON sales(date);
CREATE INDEX IF NOT EXISTS purchases_date_idx ON purchases(date);
CREATE INDEX IF NOT EXISTS purchases_is_dump_idx ON purchases(is_dump);
CREATE INDEX IF NOT EXISTS customer_transactions_customer_id_idx ON customer_transactions(customer_id);
CREATE INDEX IF NOT EXISTS customer_transactions_date_idx ON customer_transactions(date);
CREATE INDEX IF NOT EXISTS account_transactions_account_id_idx ON account_transactions(account_id);
CREATE INDEX IF NOT EXISTS account_transactions_date_idx ON account_transactions(date);
CREATE INDEX IF NOT EXISTS stock_events_stock_id_idx ON stock_events(stock_id);

-- Row Level Security (RLS) policies
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- For development: Allow all operations. In production, create more specific policies
CREATE POLICY "Enable all operations for customers" ON customers FOR ALL USING (true);
CREATE POLICY "Enable all operations for products" ON products FOR ALL USING (true);
CREATE POLICY "Enable all operations for accounts" ON accounts FOR ALL USING (true);
CREATE POLICY "Enable all operations for stocks" ON stocks FOR ALL USING (true);
CREATE POLICY "Enable all operations for stock_events" ON stock_events FOR ALL USING (true);
CREATE POLICY "Enable all operations for sales" ON sales FOR ALL USING (true);
CREATE POLICY "Enable all operations for purchases" ON purchases FOR ALL USING (true);
CREATE POLICY "Enable all operations for customer_transactions" ON customer_transactions FOR ALL USING (true);
CREATE POLICY "Enable all operations for account_transactions" ON account_transactions FOR ALL USING (true);
CREATE POLICY "Enable all operations for reminders" ON reminders FOR ALL USING (true);

-- Insert default data
INSERT INTO products (name, category) VALUES
('A.R', 'Other'),
('NEW A.R', 'Other'),
('ABDUL', 'Other'),
('SOHAIL', 'Other'),
('ABUBAKAR', 'Other'),
('JSW', 'Cement'),
('Ultra Tech', 'Cement'),
('Sri Cement', 'Cement'),
('Asian Paints', 'Paint'),
('Berger Paints', 'Paint'),
('Tata Steel', 'Steel'),
('JSW Steel', 'Steel')
ON CONFLICT (name) DO NOTHING;

-- Insert default accounts
INSERT INTO accounts (name, balance) VALUES
('A.R', 0),
('NEW A.R', 0),
('ABDUL', 0),
('SOHAIL', 0),
('ABUBAKAR', 0)
ON CONFLICT DO NOTHING;

-- Function to update customer balance
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

-- Function to update account balance
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

-- Triggers for balance updates
DROP TRIGGER IF EXISTS customer_balance_trigger ON customer_transactions;
CREATE TRIGGER customer_balance_trigger
  AFTER INSERT OR UPDATE OR DELETE ON customer_transactions
  FOR EACH ROW EXECUTE FUNCTION update_customer_balance();

DROP TRIGGER IF EXISTS account_balance_trigger ON account_transactions;
CREATE TRIGGER account_balance_trigger
  AFTER INSERT OR UPDATE OR DELETE ON account_transactions
  FOR EACH ROW EXECUTE FUNCTION update_account_balance();

-- Function for complete sales logic including transactions and stock
CREATE OR REPLACE FUNCTION handle_sale_complete()
RETURNS TRIGGER AS $$
DECLARE
  stock_record stocks;
  transaction_card_supplier_id UUID;
BEGIN
  -- 1. Create customer transaction for this sale
  INSERT INTO customer_transactions (
    customer_id,
    type,
    amount,
    bags,
    location,
    sub_category,
    notes,
    related_sale_id,
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

-- Trigger for complete sales handling
DROP TRIGGER IF EXISTS sale_complete_trigger ON sales;
CREATE TRIGGER sale_complete_trigger
  AFTER INSERT ON sales
  FOR EACH ROW EXECUTE FUNCTION handle_sale_complete();

-- Function for handling dumps (stock to transaction card in purchases)
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

-- Trigger for stock dump handling
DROP TRIGGER IF EXISTS stock_dump_trigger ON stock_events;
CREATE TRIGGER stock_dump_trigger
  AFTER INSERT ON stock_events
  FOR EACH ROW EXECUTE FUNCTION handle_stock_dump();

-- Function for payment handling (customer and account transactions)
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

-- Trigger for payment handling (additional to existing balance triggers)
DROP TRIGGER IF EXISTS payment_processing_trigger ON customer_transactions;
CREATE TRIGGER payment_processing_trigger
  AFTER INSERT ON customer_transactions
  FOR EACH ROW EXECUTE FUNCTION handle_customer_payment();
