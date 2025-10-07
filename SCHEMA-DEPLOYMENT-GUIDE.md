# Supabase Schema Deployment Guide

## Step 1: Access Your Supabase Project

1. Go to https://supabase.com/dashboard
2. Sign in to your account
3. Select your project: `lxeugxbbyzkyvzinwqhy`

## Step 2: Open SQL Editor

1. Click on **"SQL Editor"** in the left sidebar
2. Click **"New Query"** button

## Step 3: Deploy the Schema

1. Open the `supabase-schema.sql` file in this project
2. Copy **ALL** the contents of the file
3. Paste it into the SQL Editor
4. Click **"Run"** button (or press Ctrl+Enter)

## Step 4: Verify Deployment

After running the schema, verify these tables exist:

### Tables Created:
- ✅ `customers` - Customer information
- ✅ `customer_transactions` - Customer sales and payments
- ✅ `sales` - All sales records
- ✅ `purchases` - Purchase/transaction cards
- ✅ `stocks` - Stock locations and inventory
- ✅ `stock_events` - Stock load/dump history
- ✅ `products` - Product types and brands
- ✅ `accounts` - Account management
- ✅ `account_transactions` - Account fund movements
- ✅ `expenses` - Business expenses
- ✅ `reminders` - Payment reminders

### Functions Created:
- ✅ `update_updated_at_column()` - Auto-update timestamps
- ✅ `calculate_customer_balance()` - Calculate customer balances
- ✅ `create_customer_transaction_from_sale()` - Auto-create transaction from sale
- ✅ `create_purchase_card_from_sale()` - Auto-create purchase card for Direct sales
- ✅ `update_stock_from_sale()` - Auto-update stock quantities
- ✅ `create_purchase_from_stock_dump()` - Auto-create purchase from stock dump
- ✅ `update_balance_from_payment()` - Update customer balance on payment

### Triggers Created:
- ✅ Updated_at triggers on all tables
- ✅ Sale → Customer Transaction (automatic)
- ✅ Sale → Purchase Card (when location=Direct/Company Goddam/none + product)
- ✅ Sale → Stock Update (automatic quantity deduction)
- ✅ Stock Dump → Purchase Record (automatic)
- ✅ Payment → Balance Update (automatic)

## Step 5: Enable Row Level Security (RLS)

The schema already includes RLS policies that allow:
- ✅ Public read access (SELECT)
- ✅ Public write access (INSERT, UPDATE, DELETE)

**Note:** In production, you should restrict these to authenticated users only.

## Step 6: Test the Connection

Run the test connection script:
```bash
node test-connection.js
```

This will verify:
- ✅ Supabase connection works
- ✅ All tables are accessible
- ✅ Sample data can be inserted

## Expected Output

You should see output like:
```
✅ Successfully connected to Supabase
✅ Found X customers
✅ Found X sales
✅ Found X purchases
✅ Found X stocks
```

## Common Issues

### Issue 1: "relation already exists"
**Solution:** The table already exists. You can either:
- Drop the existing tables first (WARNING: deletes all data)
- Skip the CREATE TABLE statements for existing tables

### Issue 2: "permission denied"
**Solution:** Check your RLS policies are enabled correctly

### Issue 3: "function already exists"
**Solution:** The function already exists. Use `CREATE OR REPLACE FUNCTION` instead

## Next Steps

After successful deployment:
1. The frontend will automatically connect to Supabase
2. All data will persist in the database
3. Business logic triggers will work automatically
4. Test each module (customers, sales, purchases, etc.)

## Rollback (If Needed)

To remove all tables and start fresh:
```sql
-- WARNING: This will delete ALL data!
DROP TABLE IF EXISTS reminders CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS account_transactions CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS stock_events CASCADE;
DROP TABLE IF EXISTS purchases CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS customer_transactions CASCADE;
DROP TABLE IF EXISTS stocks CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS customers CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS calculate_customer_balance() CASCADE;
DROP FUNCTION IF EXISTS create_customer_transaction_from_sale() CASCADE;
DROP FUNCTION IF EXISTS create_purchase_card_from_sale() CASCADE;
DROP FUNCTION IF EXISTS update_stock_from_sale() CASCADE;
DROP FUNCTION IF EXISTS create_purchase_from_stock_dump() CASCADE;
DROP FUNCTION IF EXISTS update_balance_from_payment() CASCADE;
```

Then re-run the `supabase-schema.sql` file.
