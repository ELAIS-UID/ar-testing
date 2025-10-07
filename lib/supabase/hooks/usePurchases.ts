import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../client'
import { Purchase } from '../types'

export interface UsePurchasesReturn {
  purchases: Purchase[]
  loading: boolean
  addPurchase: (purchaseData: {
    supplierId?: string
    productId: string
    quantity: number
    unit: string
    pricePerUnit: number
    originalPrice?: number
    category?: string
    accountId?: string
    notes?: string
    date?: string
  }) => Promise<Purchase>
  updatePurchase: (id: string, updates: Partial<Purchase>) => Promise<Purchase>
  deletePurchase: (id: string) => Promise<void>
  refreshPurchases: () => Promise<void>
}

export function usePurchases(): UsePurchasesReturn {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPurchases = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('purchases')
        .select(`
          *,
          supplier:products!supplier_id(name),
          product:products!product_id(name),
          account:accounts(name)
        `)
        .order('date', { ascending: false })

      if (error) throw error

      setPurchases(data || [])
    } catch (error) {
      console.error('Error fetching purchases:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const addPurchase = useCallback(async (purchaseData: {
    supplierId?: string
    productId: string
    quantity: number
    unit: string
    pricePerUnit: number
    originalPrice?: number
    category?: string
    accountId?: string
    notes?: string
    date?: string
  }): Promise<Purchase> => {
    try {
      const totalAmount = purchaseData.quantity * purchaseData.pricePerUnit

      const purchaseInsertData = {
        supplier_id: purchaseData.supplierId,
        product_id: purchaseData.productId,
        quantity: purchaseData.quantity,
        unit: purchaseData.unit,
        price_per_unit: purchaseData.pricePerUnit,
        original_price: purchaseData.originalPrice,
        total_amount: totalAmount,
        category: purchaseData.category,
        account_id: purchaseData.accountId,
        notes: purchaseData.notes,
        date: purchaseData.date
      }

      const { data: purchase, error } = await supabase
        .from('purchases')
        .insert(purchaseInsertData)
        .select()
        .single()

      if (error) throw error

      // If this is a real purchase (not a transaction card), potentially load stock
      // For transaction cards (price_per_unit = 0), don't load stock
      if (purchaseData.pricePerUnit > 0) {
        // This logic could be extended if you want automatic stock loading for purchases
        // Currently, stock loading is handled manually via the stock management UI
      }

      await fetchPurchases()
      return purchase
    } catch (error) {
      console.error('Error adding purchase:', error)
      throw error
    }
  }, [fetchPurchases])

  const updatePurchase = useCallback(async (id: string, updates: Partial<Purchase>): Promise<Purchase> => {
    const { data, error } = await supabase
      .from('purchases')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    setPurchases(prev => prev.map(p => p.id === id ? data : p))
    return data
  }, [])

  const deletePurchase = useCallback(async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('purchases')
      .delete()
      .eq('id', id)

    if (error) throw error

    setPurchases(prev => prev.filter(p => p.id !== id))
  }, [])

  const refreshPurchases = fetchPurchases

  useEffect(() => {
    fetchPurchases()
  }, [fetchPurchases])

  return {
    purchases,
    loading,
    addPurchase,
    updatePurchase,
    deletePurchase,
    refreshPurchases
  }
}
