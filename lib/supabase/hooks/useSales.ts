import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../client'
import { Sale, CustomerTransaction, Product, Purchase } from '../types'

export interface UseSalesReturn {
  sales: Sale[]
  loading: boolean
  addSale: (saleData: {
    customerId: string
    stockId?: string
    productId?: string
    quantity: number
    unit: string
    pricePerUnit: number
    subCategory?: string
    location?: string
    notes?: string
    date?: string
  }) => Promise<Sale>
  updateSale: (id: string, updates: Partial<Sale>) => Promise<Sale>
  deleteSale: (id: string) => Promise<void>
  refreshSales: () => Promise<void>
}

export function useSales(): UseSalesReturn {
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSales = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          customers!inner(name),
          products(name)
        `)
        .order('date', { ascending: false })

      if (error) throw error

      setSales(data || [])
    } catch (error) {
      console.error('Error fetching sales:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const addSale = useCallback(async (saleData: {
    customerId: string
    stockId?: string
    productId?: string
    quantity: number
    unit: string
    pricePerUnit: number
    subCategory?: string
    location?: string
    notes?: string
    date?: string
  }): Promise<Sale> => {
    try {
      const totalAmount = saleData.quantity * saleData.pricePerUnit

      // Insert the sale into sales table
      // Database triggers will automatically handle:
      // - Creating customer transaction
      // - Creating transaction card in purchases (if applicable)
      // - Updating stock quantities
      const saleInsertData = {
        customer_id: saleData.customerId,
        stock_id: saleData.stockId,
        product_id: saleData.productId,
        quantity: saleData.quantity,
        unit: saleData.unit,
        price_per_unit: saleData.pricePerUnit,
        total_amount: totalAmount,
        sub_category: saleData.subCategory,
        location: saleData.location,
        notes: saleData.notes,
        date: saleData.date
      }

      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert(saleInsertData)
        .select()
        .single()

      if (saleError) throw saleError

      // Refresh the sales list
      await fetchSales()

      return sale
    } catch (error) {
      console.error('Error adding sale:', error)
      throw error
    }
  }, [fetchSales])

  const updateSale = useCallback(async (id: string, updates: Partial<Sale>): Promise<Sale> => {
    const { data, error } = await supabase
      .from('sales')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Don't update local state here - caller should use refreshSales() instead
    // This prevents duplicates when both optimistic update and refresh happen
    return data
  }, [])

  const deleteSale = useCallback(async (id: string): Promise<void> => {
    // Also delete related customer transaction
    const { error: transactionError } = await supabase
      .from('customer_transactions')
      .delete()
      .eq('related_sale_id', id)

    if (transactionError) throw transactionError

    const { error: saleError } = await supabase
      .from('sales')
      .delete()
      .eq('id', id)

    if (saleError) throw saleError

    setSales(prev => prev.filter(s => s.id !== id))
  }, [])

  const refreshSales = fetchSales

  useEffect(() => {
    fetchSales()
  }, [fetchSales])

  return {
    sales,
    loading,
    addSale,
    updateSale,
    deleteSale,
    refreshSales
  }
}
