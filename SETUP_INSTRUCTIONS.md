# PayNow Setup Instructions

## 1. Create Orders Table

Run the SQL migration in your Supabase SQL editor:

```bash
# Copy and paste the contents of create-orders-table.sql into Supabase SQL editor
cat create-orders-table.sql
```

Or run it directly in Supabase dashboard → SQL Editor → New Query → paste the contents of `create-orders-table.sql`.

## 2. Configure PayNow Methods

Go to Settings in the merchant dashboard and add:

### For Business PayNow (UEN):
- **Valid test UEN**: `201234567A` 
- **Format**: 8-10 digits + 1 letter
- **Other valid examples**: `12345678B`, `T05LL1103B`

### For Individual PayNow (Mobile):
- **Valid test mobile**: `91234567`
- **Format**: 8 digits (without +65 prefix)
- **Will be displayed as**: `+6591234567`

## 3. Test QR Generation

1. Go to POS System
2. Both PayNow methods should now be visible
3. Select a configured method (will be enabled)
4. Enter amount and description
5. Click "Generate QR Code"

## Common Issues

### "UEN must be in valid Singapore format"
- Replace current UEN with `201234567A`
- Ensure format is: digits + letter (no spaces/dashes)

### "Could not find table 'public.orders'"
- Run the SQL migration from `create-orders-table.sql`
- Refresh the page after running migration

### PayNow options disabled
- Go to Settings → Add UEN (201234567A) or Mobile (91234567)
- Save settings and return to POS System