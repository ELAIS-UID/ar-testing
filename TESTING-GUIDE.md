# Testing Guide - Supabase CRUD Operations

## Quick Start

### 1. Start Development Server
```powershell
npm run dev
```
Open http://localhost:3000

---

## Test Scenarios

### 🛒 Test 1: Add Sale (Basic)

**Steps:**
1. Go to Sales tab
2. Click "Add Sale"
3. Fill in:
   - Customer: Select existing customer
   - Quantity: 10
   - Price Per Unit: 500
   - Location: Select a stock location (e.g., "Shop A")
4. Click "Add Sale"

**Expected Results:**
- ✅ Sale appears in sales list
- ✅ Customer balance increases by 5,000
- ✅ Customer transactions show new sale
- ✅ Stock quantity decreases by 10 (if location is not Direct)
- ✅ No errors in console

**Database Verification:**
```sql
SELECT * FROM sales ORDER BY created_at DESC LIMIT 1;
SELECT * FROM customer_transactions ORDER BY created_at DESC LIMIT 1;
SELECT * FROM stocks WHERE location = 'Shop A';
```

---

### 🎯 Test 2: Direct Sale with Product (Purchase Card Creation)

**Steps:**
1. Go to Sales tab
2. Click "Add Sale"
3. Fill in:
   - Customer: Select existing customer
   - Quantity: 5
   - Price Per Unit: 600
   - Location: **"Direct"** or **"Company Goddam"** or **"none"**
   - Product Type: Select a brand (e.g., "Priya")
4. Click "Add Sale"

**Expected Results:**
- ✅ Sale created successfully
- ✅ Customer balance increases by 3,000
- ✅ **Purchase card automatically created** (check Purchases tab)
- ✅ Purchase record shows:
  - Supplier: Same as product (e.g., "Priya")
  - Quantity: 5
  - Price: As entered
- ✅ Stock quantity unchanged (Direct sales don't affect stock)

**Database Verification:**
```sql
-- Check sale
SELECT * FROM sales WHERE location IN ('Direct', 'Company Goddam', 'none') 
ORDER BY created_at DESC LIMIT 1;

-- Check auto-generated purchase card
SELECT * FROM purchases WHERE is_from_sale = true 
ORDER BY created_at DESC LIMIT 1;
```

**This tests the critical `after_sale_insert` trigger!**

---

### 💰 Test 3: Customer Payment

**Steps:**
1. Go to Customers tab
2. Click on a customer with balance > 0
3. Click "Add Payment"
4. Fill in:
   - Amount: 1000
   - Account: Select account (e.g., "Cash")
   - Payment Method: "Cash" or "Bank Transfer"
5. Click "Add Payment"

**Expected Results:**
- ✅ Customer balance decreases by 1,000
- ✅ Payment appears in customer transactions
- ✅ Account transaction created in Accounts tab
- ✅ Account shows payment received

**Database Verification:**
```sql
SELECT * FROM customer_transactions WHERE type = 'payment' 
ORDER BY created_at DESC LIMIT 1;

SELECT * FROM account_transactions 
ORDER BY created_at DESC LIMIT 1;
```

---

### 📦 Test 4: Add New Shop (Stock Location)

**Steps:**
1. Go to Stock Management tab
2. Click "Add Shop" or "Add Location"
3. Fill in:
   - Name: "Shop C" (or any unique name)
   - Initial Quantity: 50
   - Threshold: 20
4. Click "Add Shop"

**Expected Results:**
- ✅ New stock location appears in stock list
- ✅ Location shows quantity of 50
- ✅ Status is "normal" (since 50 > 20 threshold)
- ✅ Stock event created for initial quantity
- ✅ Location saved in database

**Database Verification:**
```sql
-- Check new stock location
SELECT * FROM stocks WHERE location = 'Shop C';

-- Check initial stock event (if quantity > 0)
SELECT * FROM stock_events WHERE type = 'load' 
AND notes LIKE '%Initial stock quantity%'
ORDER BY created_at DESC LIMIT 1;
```

---

### 📦 Test 5: Load Stock

**Steps:**
1. Go to Stock Management tab
2. Click "Add Stock" or "Load Stock"
3. Fill in:
   - Location: Select location (e.g., "Shop B")
   - Quantity: 20
   - Date: Today's date
4. Click "Add Stock"

**Expected Results:**
- ✅ Stock quantity increases by 20
- ✅ Stock event recorded
- ✅ Status updates (low/normal) based on threshold

**Database Verification:**
```sql
SELECT * FROM stocks WHERE location = 'Shop B';
SELECT * FROM stock_events WHERE type = 'load' 
ORDER BY created_at DESC LIMIT 1;
```

---

### 🔄 Test 6: Transfer Stock Between Locations

**Steps:**
1. Go to Stock Management tab
2. Click "Transfer Stock"
3. Fill in:
   - From: "Shop A"
   - To: "Shop B"
   - Quantity: 10
4. Click "Transfer"

**Expected Results:**
- ✅ Shop A quantity decreases by 10
- ✅ Shop B quantity increases by 10
- ✅ Two stock events created:
  - Transfer-out event for Shop A
  - Transfer-in event for Shop B
- ✅ Both events linked

**Database Verification:**
```sql
-- Check both locations
SELECT location, quantity FROM stocks WHERE location IN ('Shop A', 'Shop B');

-- Check transfer events
SELECT * FROM stock_events WHERE type = 'transfer' 
ORDER BY created_at DESC LIMIT 2;
```

---

### 🔄 Test 7: Dump Stock (Auto Purchase Creation)

**Steps:**
1. Go to Stock Management tab
2. Find "Dump Stock" button
3. Fill in:
   - Brand: Select brand (e.g., "Ultratech")
   - Sub-Category: Select category
   - Quantity: 15
   - Location: Select stock location
4. Click "Dump Stock"

**Expected Results:**
- ✅ Stock quantity DECREASES by 15 (dumping removes from stock)
- ✅ **Purchase record automatically created** (check Purchases tab)
- ✅ Purchase shows:
  - Supplier: Selected brand
  - Quantity: 15
  - Price: 0 (dumps have no cost)
  - Category: Selected sub-category
- ✅ Stock event recorded as 'dump' type

**Database Verification:**
```sql
-- Check stock decreased
SELECT * FROM stocks WHERE location = 'your-location';

-- Check auto-generated purchase from dump
SELECT * FROM purchases WHERE price_per_unit = 0 
ORDER BY created_at DESC LIMIT 1;

-- Check stock event
SELECT * FROM stock_events WHERE type = 'dump' 
ORDER BY created_at DESC LIMIT 1;
```

**This tests the `handle_stock_dump()` trigger!**

---

### 📝 Test 6: Add Purchase Record

**Steps:**
1. Go to Purchases tab
2. Click supplier/brand button to select
3. Click "Add Purchase" or similar
4. Fill in:
   - Quantity: 100
   - Price Per Unit: 320
   - Date: Today
5. Submit

**Expected Results:**
- ✅ Purchase record created
- ✅ Appears in purchases list
- ✅ Total calculated correctly (100 × 320 = 32,000)

**Database Verification:**
```sql
SELECT * FROM purchases ORDER BY created_at DESC LIMIT 1;
```

---

### 💵 Test 7: Account Management

#### Test 7a: Add Funds
**Steps:**
1. Go to Accounts tab
2. Click "Add Funds"
3. Select account (e.g., "Bank")
4. Enter amount: 10,000
5. Submit

**Expected Results:**
- ✅ Transaction created with type 'add-funds'
- ✅ Amount is positive
- ✅ Account balance increases

#### Test 7b: Remove Funds
**Steps:**
1. Click "Remove Funds"
2. Select account
3. Enter amount: 2,000
4. Submit

**Expected Results:**
- ✅ Transaction created with type 'remove-funds'
- ✅ Amount is negative
- ✅ Account balance decreases

#### Test 7c: Transfer Between Accounts
**Steps:**
1. Click "Transfer Amount"
2. From Account: "Cash"
3. To Account: "Bank"
4. Amount: 5,000
5. Submit

**Expected Results:**
- ✅ Two transactions created:
  - Transfer-out (negative) in Cash
  - Transfer-in (positive) in Bank
- ✅ Both transactions linked via related_account_id
- ✅ Cash balance decreases by 5,000
- ✅ Bank balance increases by 5,000

**Database Verification:**
```sql
SELECT * FROM account_transactions 
WHERE type IN ('add-funds', 'remove-funds', 'transfer-out', 'transfer-in')
ORDER BY created_at DESC LIMIT 5;
```

---

## 🐛 Common Issues & Solutions

### Issue 1: "Customer not found"
**Cause:** Customer name doesn't match database
**Solution:** Ensure customer exists in database first, or check for typos

### Issue 2: "Stock location not found"
**Cause:** Stock location doesn't exist or name mismatch
**Solution:** Create stock location first in Stock Management

### Issue 3: "Supplier not found"
**Cause:** Product/brand doesn't exist in products table
**Solution:** Add the product/brand first

### Issue 4: Purchase card not created after Direct sale
**Cause:** Either location is not 'Direct/Company Goddam/none' OR product not selected
**Solution:** Ensure BOTH conditions are met:
- Location = Direct/Company Goddam/none
- Product/Brand is selected (not "none")

### Issue 5: Stock quantity not updating
**Cause:** Possible trigger error or location mismatch
**Solution:** Check console for errors, verify location name matches exactly

---

## 🔍 Database Debugging

### Check Trigger Status
```sql
-- View all triggers
SELECT trigger_name, event_object_table, action_statement 
FROM information_schema.triggers 
WHERE trigger_schema = 'public';

-- Check if triggers are enabled
SELECT tgname, tgenabled FROM pg_trigger 
WHERE tgname LIKE '%sale%' OR tgname LIKE '%dump%';
```

### View Recent Activity
```sql
-- Recent sales
SELECT s.*, c.name as customer_name, st.location 
FROM sales s
LEFT JOIN customers c ON s.customer_id = c.id
LEFT JOIN stocks st ON s.stock_id = st.id
ORDER BY s.created_at DESC LIMIT 10;

-- Recent customer transactions
SELECT ct.*, c.name as customer_name 
FROM customer_transactions ct
JOIN customers c ON ct.customer_id = c.id
ORDER BY ct.created_at DESC LIMIT 10;

-- Recent purchases (including auto-generated)
SELECT p.*, pr.name as product_name, s.name as supplier_name
FROM purchases p
LEFT JOIN products pr ON p.product_id = pr.id
LEFT JOIN products s ON p.supplier_id = s.id
ORDER BY p.created_at DESC LIMIT 10;
```

### Check Data Integrity
```sql
-- Verify customer balances match transactions
SELECT 
  c.name,
  c.balance as stored_balance,
  COALESCE(SUM(ct.amount), 0) as calculated_balance
FROM customers c
LEFT JOIN customer_transactions ct ON c.id = ct.customer_id
GROUP BY c.id, c.name, c.balance
HAVING c.balance != COALESCE(SUM(ct.amount), 0);
-- Should return 0 rows if everything is correct
```

---

## 📊 Success Metrics

After testing, verify:
- [ ] All sales create customer transactions ✅
- [ ] Direct sales with products create purchase cards ✅
- [ ] Payments update customer balance ✅
- [ ] Payments create account transactions ✅
- [ ] Stock loads increase quantity ✅
- [ ] Stock dumps create purchase records ✅
- [ ] Account operations create correct transactions ✅
- [ ] No console errors ✅
- [ ] No TypeScript errors ✅
- [ ] Data persists after page refresh ✅

---

## 🎉 When Everything Works

You should see:
1. **Zero console errors** during all operations
2. **Instant UI updates** after each operation
3. **Database triggers executing automatically** (check with SQL queries)
4. **Consistent data** across all views and tables
5. **Proper error messages** if something fails

---

## 🆘 If Tests Fail

1. **Check Console:** Look for error messages
2. **Check Network Tab:** Look for failed API calls to Supabase
3. **Check Database:** Run SQL queries to see if data was actually inserted
4. **Check Triggers:** Verify triggers are enabled and executing
5. **Check Schema:** Ensure all tables and columns exist as expected

---

## 📞 Support

If issues persist:
1. Check `PHASE4-CRUD-MIGRATIONS-COMPLETE.md` for implementation details
2. Review `supabase-schema.sql` for trigger definitions
3. Check Supabase logs in dashboard for backend errors
4. Verify environment variables are set correctly (`.env.local`)

---

**Happy Testing! 🚀**
