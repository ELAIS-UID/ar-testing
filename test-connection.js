import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testConnection() {
  try {
    console.log('🔍 Testing Supabase connection...')
    const { data, error } = await supabase.from('customers').select('count', { count: 'exact', head: true })

    if (error) {
      console.error('❌ Connection failed:', error.message)
      return { success: false, message: error.message }
    }

    console.log('✅ Connection successful! Database is accessible.')
    console.log('📊 Customer count (should be number):', data)
    return { success: true, message: 'Connected to Supabase successfully' }

  } catch (error) {
    console.error('❌ Connection error:', error)
    return { success: false, message: 'Failed to connect to Supabase' }
  }
}

testConnection()
