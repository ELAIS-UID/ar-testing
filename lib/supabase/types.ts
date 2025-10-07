export interface Database {
  public: {
    Tables: {
      customers: {
        Row: {
          id: string
          name: string
          phone: string | null
          category: string | null
          balance: number
          created_at: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          id?: string
          name: string
          phone?: string | null
          category?: string | null
          balance?: number
          created_at?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          phone?: string | null
          category?: string | null
          balance?: number
          created_at?: string
          updated_at?: string
          user_id?: string | null
        }
      }
      products: {
        Row: {
          id: string
          name: string
          category: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          category?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          category?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      accounts: {
        Row: {
          id: string
          name: string
          balance: number
          created_at: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          id?: string
          name: string
          balance?: number
          created_at?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          balance?: number
          created_at?: string
          updated_at?: string
          user_id?: string | null
        }
      }
      stocks: {
        Row: {
          id: string
          location: string
          quantity: number
          threshold: number
          product_id: string | null
          created_at: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          id?: string
          location: string
          quantity?: number
          threshold?: number
          product_id?: string | null
          created_at?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          id?: string
          location?: string
          quantity?: number
          threshold?: number
          product_id?: string | null
          created_at?: string
          updated_at?: string
          user_id?: string | null
        }
      }
      stock_events: {
        Row: {
          id: string
          stock_id: string
          type: 'load' | 'dump' | 'transfer'
          quantity: number
          from_location: string | null
          to_location: string | null
          product_id: string | null
          notes: string | null
          created_at: string
          user_id: string | null
        }
        Insert: {
          id?: string
          stock_id: string
          type: 'load' | 'dump' | 'transfer'
          quantity: number
          from_location?: string | null
          to_location?: string | null
          product_id?: string | null
          notes?: string | null
          created_at?: string
          user_id?: string | null
        }
        Update: {
          id?: string
          stock_id?: string
          type?: 'load' | 'dump' | 'transfer'
          quantity?: number
          from_location?: string | null
          to_location?: string | null
          product_id?: string | null
          notes?: string | null
          created_at?: string
          user_id?: string | null
        }
      }
      sales: {
        Row: {
          id: string
          customer_id: string
          stock_id: string | null
          product_id: string | null
          quantity: number
          unit: string
          price_per_unit: number
          total_amount: number
          sub_category: string | null
          location: string | null
          notes: string | null
          date: string
          created_at: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          id?: string
          customer_id: string
          stock_id?: string | null
          product_id?: string | null
          quantity: number
          unit: string
          price_per_unit: number
          total_amount: number
          sub_category?: string | null
          location?: string | null
          notes?: string | null
          date?: string
          created_at?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          id?: string
          customer_id?: string
          stock_id?: string | null
          product_id?: string | null
          quantity?: number
          unit?: string
          price_per_unit?: number
          total_amount?: number
          sub_category?: string | null
          location?: string | null
          notes?: string | null
          date?: string
          created_at?: string
          updated_at?: string
          user_id?: string | null
        }
      }
      purchases: {
        Row: {
          id: string
          supplier_id: string | null
          product_id: string | null
          quantity: number
          unit: string
          price_per_unit: number
          original_price: number | null
          total_amount: number
          category: string | null
          account_id: string | null
          notes: string | null
          date: string
          is_dump: boolean | null
          created_at: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          id?: string
          supplier_id?: string | null
          product_id?: string | null
          quantity: number
          unit: string
          price_per_unit: number
          original_price?: number | null
          total_amount: number
          category?: string | null
          account_id?: string | null
          notes?: string | null
          date?: string
          is_dump?: boolean | null
          created_at?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          id?: string
          supplier_id?: string | null
          product_id?: string | null
          quantity?: number
          unit?: string
          price_per_unit?: number
          original_price?: number | null
          total_amount?: number
          category?: string | null
          account_id?: string | null
          notes?: string | null
          date?: string
          is_dump?: boolean | null
          created_at?: string
          updated_at?: string
          user_id?: string | null
        }
      }
      customer_transactions: {
        Row: {
          id: string
          customer_id: string
          type: 'sale' | 'payment' | 'discount'
          amount: number
          bags: number | null
          location: string | null
          sub_category: string | null
          notes: string | null
          account_id: string | null
          related_sale_id: string | null
          date: string
          created_at: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          id?: string
          customer_id: string
          type: 'sale' | 'payment' | 'discount'
          amount: number
          bags?: number | null
          location?: string | null
          sub_category?: string | null
          notes?: string | null
          account_id?: string | null
          related_sale_id?: string | null
          date?: string
          created_at?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          id?: string
          customer_id?: string
          type?: 'sale' | 'payment' | 'discount'
          amount?: number
          bags?: number | null
          location?: string | null
          sub_category?: string | null
          notes?: string | null
          account_id?: string | null
          related_sale_id?: string | null
          date?: string
          created_at?: string
          updated_at?: string
          user_id?: string | null
        }
      }
      account_transactions: {
        Row: {
          id: string
          account_id: string
          type: 'add-funds' | 'remove-funds' | 'transfer-in' | 'transfer-out' | 'expense' | 'payment'
          amount: number
          description: string
          notes: string | null
          related_account_id: string | null
          date: string
          created_at: string
          user_id: string | null
        }
        Insert: {
          id?: string
          account_id: string
          type: 'add-funds' | 'remove-funds' | 'transfer-in' | 'transfer-out' | 'expense' | 'payment'
          amount: number
          description: string
          notes?: string | null
          related_account_id?: string | null
          date?: string
          created_at?: string
          user_id?: string | null
        }
        Update: {
          id?: string
          account_id?: string
          type?: 'add-funds' | 'remove-funds' | 'transfer-in' | 'transfer-out' | 'expense' | 'payment'
          amount?: number
          description?: string
          notes?: string | null
          related_account_id?: string | null
          date?: string
          created_at?: string
          user_id?: string | null
        }
      }
      reminders: {
        Row: {
          id: string
          customer_id: string
          amount: number
          reminder_date: string
          notes: string | null
          status: 'active' | 'completed'
          created_date: string
          completed_date: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          customer_id: string
          amount: number
          reminder_date: string
          notes?: string | null
          status?: 'active' | 'completed'
          created_date?: string
          completed_date?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          customer_id?: string
          amount?: number
          reminder_date?: string
          notes?: string | null
          status?: 'active' | 'completed'
          created_date?: string
          completed_date?: string | null
          user_id?: string | null
        }
      }
      notes: {
        Row: {
          id: string
          title: string
          content: string | null
          created_at: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          id?: string
          title?: string
          content?: string | null
          created_at?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          id?: string
          title?: string
          content?: string | null
          created_at?: string
          updated_at?: string
          user_id?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Type helpers
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]

// Individual table types
export type Customer = Tables<'customers'>
export type Product = Tables<'products'>
export type Account = Tables<'accounts'>
export type Stock = Tables<'stocks'>
export type StockEvent = Tables<'stock_events'>
export type Sale = Tables<'sales'>
export type Purchase = Tables<'purchases'>
export type CustomerTransaction = Tables<'customer_transactions'>
export type AccountTransaction = Tables<'account_transactions'>
export type Reminder = Tables<'reminders'>
export type Note = Tables<'notes'>
