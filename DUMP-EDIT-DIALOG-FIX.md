# ✅ Dump Edit Dialog Fix

## What Was Fixed

**Problem:** Clicking edit on a dump transaction card opened the "Add New Purchase" dialog instead of the dump dialog.

**Solution:** Now detects if the transaction is a dump and opens the appropriate dialog:
- **Regular Purchase** → Opens "Add New Purchase" dialog
- **Dump Transaction** → Opens "Dump Stock" dialog

## Changes Made

### 1. Added Editing State for Dumps
```tsx
const [editingDumpId, setEditingDumpId] = useState<string | null>(null)
```

### 2. Updated Edit Button Logic
The edit button now checks if the transaction is a dump:

```tsx
onClick={() => {
  const isDump = (purchase as any).is_dump
  
  if (isDump) {
    // Open dump dialog with pre-filled data
    setEditingDumpId(purchase.id)
    setDumpForm({
      brand: purchase.supplier,
      subCategory: purchase.category || "Direct",
      quantity: purchase.bags.toString(),
      date: purchase.date,
      location: ""
    })
    setShowDumpStock(true)
  } else {
    // Open purchase dialog with pre-filled data
    setEditingPurchaseId(purchase.id)
    setAddPurchaseForm({...})
    setShowAddPurchase(true)
  }
}}
```

### 3. Updated Dump Dialog Button
The dump dialog now handles both creating AND editing:

```tsx
<Button onClick={async () => {
  if (editingDumpId) {
    // UPDATE existing dump
    await updatePurchase(editingDumpId, {
      product_id: supplier.id,
      quantity: qty,
      category: dumpForm.subCategory,
      date: dumpForm.date,
      notes: `Stock dump: ...`
    })
    setEditingDumpId(null)
  } else {
    // CREATE new dump
    await dumpStock(...)
  }
}}>
  {editingDumpId ? 'Update Dump' : 'Dump Stock'}
</Button>
```

## How It Works Now

### Editing a Regular Purchase:
1. Click edit (✏️) on regular purchase card
2. **Opens:** "Add New Purchase" dialog
3. Pre-fills: Product, Sub-Category, Quantity, Price, Date
4. Button shows: "Save Purchase"
5. Click save → Updates purchase record

### Editing a Dump Transaction:
1. Click edit (✏️) on dump card (with DUMP badge)
2. **Opens:** "Dump Stock" dialog
3. Pre-fills: Brand, Sub-Category, Quantity, Date
4. Location field empty (needs to be selected again)
5. Button shows: "**Update Dump**" (not "Dump Stock")
6. Click save → Updates dump record

## Transaction Card Buttons

### Regular Purchase Card:
```
┌──────────────────────────────────┐
│ [JSW G.V]               [✏️] [🗑️] │
│ 300 bags × ₹500 = ₹150,000      │
│ 2025-10-07                       │
└──────────────────────────────────┘
```
- ✏️ → Opens "Add New Purchase" dialog
- 🗑️ → Deletes purchase

### Dump Transaction Card:
```
┌──────────────────────────────────┐
│ [JSW G.V] [DUMP]        [✏️] [🗑️] │
│ 30 bags × ₹0 = ₹0               │
│ 2025-10-06                       │
└──────────────────────────────────┘
```
- ✏️ → Opens "Dump Stock" dialog (with "Update Dump" button)
- 🗑️ → Deletes dump

## Testing

### Test 1: Edit Regular Purchase
1. Find a regular purchase (no DUMP badge)
2. Click edit (✏️)
3. **Expected:** "Add New Purchase" dialog opens
4. Change quantity to 500
5. Click "Save Purchase"
6. **Expected:** Purchase updates to 500 bags (no duplicate)

### Test 2: Edit Dump Transaction
1. Find a dump (has DUMP badge)
2. Click edit (✏️)
3. **Expected:** "Dump Stock" dialog opens
4. **Expected:** Brand, Sub-Category, Quantity, Date are pre-filled
5. **Expected:** Button says "**Update Dump**" (not "Dump Stock")
6. Change quantity to 50
7. Select location
8. Click "Update Dump"
9. **Expected:** Dump updates to 50 bags (no duplicate)
10. **Expected:** Still shows DUMP badge

### Test 3: DUMP Badge Preserved After Edit
1. Edit a dump transaction
2. Change quantity and save
3. **Expected:** 
   - ✅ Quantity updated
   - ✅ DUMP badge still visible
   - ✅ Sub-category preserved
   - ✅ No duplicate created

## Important Notes

### Why Location Needs to Be Re-selected
The `purchases` table doesn't store the shop location for dumps. The location is in the `stock_events` table. When editing a dump, the user must re-select the location. This is a limitation but acceptable since:
- The location doesn't change the purchase record
- It's only used for notes/reference
- Most edits will be for quantity/date, not location

### Dumps vs Regular Purchases
- **Dumps:** Created from stock movements, `price_per_unit = 0`, `is_dump = TRUE`
- **Regular Purchases:** Direct purchases from suppliers, `price_per_unit > 0`, `is_dump = FALSE`

Both can now be edited through their respective dialogs!

## Summary

| Action | Regular Purchase | Dump Transaction |
|--------|------------------|------------------|
| **Edit Button** | ✅ Opens purchase dialog | ✅ Opens dump dialog |
| **Dialog Title** | "Add New Purchase" | "Dump Stock to Shop" |
| **Button Text** | "Save Purchase" | "Update Dump" (when editing) |
| **Pre-filled Data** | All fields | All except location |
| **After Save** | Updates purchase | Updates dump, preserves DUMP badge |
| **Duplicates** | ✅ None | ✅ None |

---

**🎉 Fixed!** Now dumps open the correct dialog when editing!
