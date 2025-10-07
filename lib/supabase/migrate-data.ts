import { supabase } from './client'
import { Customer, Sale, Purchase } from './types'

export async function migrateLocalDataToSupabase() {
  try {
    // This function generates SQL INSERT statements for your current data
    // Run the generated SQL in your Supabase SQL Editor

    console.log('🔄 Generating migration SQL for your current data...\n')

    // Sample data from your app (replace with actual localStorage data)
    const customers = [
      {
        name: "ABC Construction",
        phone: "+1234567890",
        category: "Engineer",
        balance: 15000
      },
      {
        name: "XYZ Builders",
        phone: "+1234567891",
        category: "Contractor",
        balance: -5000
      }
    ]

    // Generate customer INSERT statements
    const customerInserts = customers.map(customer =>
      `INSERT INTO customers (id, name, phone, category, balance) VALUES ` +
      `(gen_random_uuid(), '${customer.name}', '${customer.phone}', '${customer.category}', ${customer.balance});`
    )

    // Sample stock data
    const stocks = [
      { location: "Shop 1", quantity: 150, threshold: 100 },
      { location: "Shop 2", quantity: 75, threshold: 100 }
    ]

    const stockInserts = stocks.map(stock =>
      `INSERT INTO stocks (id, location, quantity, threshold) VALUES ` +
      `(gen_random_uuid(), '${stock.location}', ${stock.quantity}, ${stock.threshold});`
    )

    // Generate the complete migration SQL
    const migrationSQL = `
-- ===== MIGRATION SQL - Run this in Supabase SQL Editor =====

-- 1. Migrate Customers
${customerInserts.join('\n')}

-- 2. Migrate Stocks
${stockInserts.join('\n')}

-- Note: Add your sales, purchases, and transaction data here
-- Use similar INSERT statements for each table

COMMIT;
`

    console.log(migrationSQL)

    // Optional: Insert some sample data directly
    console.log('\n📝 To insert data directly via API, use the functions below...')

    return {
      success: true,
      migrationSQL,
      message: 'Migration SQL generated successfully. Copy and run in Supabase SQL Editor.'
    }

  } catch (error) {
    console.error('Migration failed:', error)
    return {
      success: false,
      message: 'Migration failed. Check console for details.'
    }
  }
}

// Helper function to test database connection
export async function testConnection() {
  try {
    console.log('🔍 Testing Supabase connection...')
    const { data, error } = await supabase.from('customers').select('count', { count: 'exact', head: true })

    if (error) {
      console.error('❌ Connection failed:', error.message)
      return { success: false, message: error.message }
    }

    console.log('✅ Connection successful! Database is accessible.')
    return { success: true, message: 'Connected to Supabase successfully' }

  } catch (error) {
    console.error('❌ Connection error:', error)
    return { success: false, message: 'Failed to connect to Supabase' }
  }
}

// Helper function to insert sample data for testing
export async function insertSampleData() {
  try {
    console.log('🧪 Inserting sample data for testing...')

    // Insert a sample customer
    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .insert({
        name: 'Test Customer',
        phone: '+91-9876543210',
        category: 'Individual',
        balance: 5000
      })
      .select()
      .single()

    if (customerError) {
      console.error('❌ Failed to insert customer:', customerError)
      return { success: false, message: customerError.message }
    }

    console.log('✅ Sample customer inserted:', customerData)

    // Insert a sample stock
    const { data: stockData, error: stockError } = await supabase
      .from('stocks')
      .insert({
        location: 'Test Shop',
        quantity: 100,
        threshold: 50
      })
      .select()
      .single()

    if (stockError) {
      console.error('❌ Failed to insert stock:', stockError)
      return { success: false, message: stockError.message }
    }

    console.log('✅ Sample stock inserted:', stockData)

    return {
      success: true,
      message: 'Sample data inserted successfully',
      data: { customer: customerData, stock: stockData }
    }

  } catch (error) {
    console.error('❌ Error inserting sample data:', error)
    return { success: false, message: 'Failed to insert sample data' }
  }
}
