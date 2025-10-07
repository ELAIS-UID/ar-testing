import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../client'
import { Stock, StockEvent } from '../types'

export interface UseStocksReturn {
  stocks: Stock[]
  loading: boolean
  loadStock: (stockId: string, quantity: number, notes?: string) => Promise<void>
  dumpStock: (stockId: string, quantity: number, toLocation: string, productId?: string, subCategory?: string, notes?: string) => Promise<void>
  transferStock: (fromStockId: string, toStockId: string, quantity: number, notes?: string) => Promise<void>
  addStock: (location: string, threshold?: number) => Promise<Stock>
  deleteStock: (id: string) => Promise<void>
  getStockHistory: (stockId: string) => Promise<StockEvent[]>
  refreshStocks: () => Promise<void>
}

export function useStocks(): UseStocksReturn {
  const [stocks, setStocks] = useState<Stock[]>([])
  const [loading, setLoading] = useState(true)

  const fetchStocks = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('stocks')
        .select('*')
        .order('location')

      if (error) throw error

      setStocks(data || [])
    } catch (error) {
      console.error('Error fetching stocks:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadStock = useCallback(async (stockId: string, quantity: number, notes?: string): Promise<void> => {
    // Get current stock quantity first
    const { data: currentStock, error: fetchError } = await supabase
      .from('stocks')
      .select('quantity')
      .eq('id', stockId)
      .single()

    if (fetchError) throw fetchError

    const newQuantity = (currentStock.quantity || 0) + quantity

    // Insert stock event for tracking
    const { error: eventError } = await supabase
      .from('stock_events')
      .insert({
        stock_id: stockId,
        type: 'load',
        quantity: quantity,
        notes: notes
      })

    if (eventError) throw eventError

    // Update stock quantity
    const { error: stockError } = await supabase
      .from('stocks')
      .update({ quantity: newQuantity })
      .eq('id', stockId)

    if (stockError) throw stockError

    await fetchStocks()
  }, [fetchStocks])

  const dumpStock = useCallback(async (
    stockId: string,
    quantity: number,
    toLocation: string,
    productId?: string,
    subCategory?: string,
    notes?: string
  ): Promise<void> => {
    // Get current stock quantity first
    const { data: currentStock, error: fetchError } = await supabase
      .from('stocks')
      .select('quantity, product_id, location')
      .eq('id', stockId)
      .single()

    if (fetchError) throw fetchError

    // IMPORTANT: Find the destination stock (shop) by location
    const { data: destinationStock, error: destError } = await supabase
      .from('stocks')
      .select('id, quantity')
      .eq('location', toLocation)
      .single()

    if (destError) throw destError

    // ADD quantity to destination shop (not subtract from source)
    const newDestinationQuantity = (destinationStock.quantity || 0) + quantity

    // Insert stock event for tracking
    // This records the dump operation
    const { error: eventError } = await supabase
      .from('stock_events')
      .insert({
        stock_id: destinationStock.id,  // Use destination stock ID
        type: 'dump',
        quantity: quantity,
        from_location: currentStock.location,
        to_location: toLocation,
        product_id: productId || currentStock.product_id,
        sub_category: subCategory,  // Include sub_category for proper categorization
        notes: notes
      })

    if (eventError) throw eventError

    // Update destination stock quantity (ADD not subtract)
    const { error: updateError } = await supabase
      .from('stocks')
      .update({ quantity: newDestinationQuantity })
      .eq('id', destinationStock.id)

    if (updateError) throw updateError

    await fetchStocks()
  }, [fetchStocks])

  const transferStock = useCallback(async (fromStockId: string, toStockId: string, quantity: number, notes?: string): Promise<void> => {
    // Get location names first
    const { data: fromStock, error: fromError } = await supabase
      .from('stocks')
      .select('location, quantity')
      .eq('id', fromStockId)
      .single()

    const { data: toStock, error: toError } = await supabase
      .from('stocks')
      .select('location, quantity')
      .eq('id', toStockId)
      .single()

    if (fromError || toError) throw fromError || toError

    const newFromQuantity = (fromStock.quantity || 0) - quantity
    const newToQuantity = (toStock.quantity || 0) + quantity

    // Insert stock events for tracking
    const { error: eventOutError } = await supabase
      .from('stock_events')
      .insert({
        stock_id: fromStockId,
        type: 'transfer',
        quantity: quantity,
        to_location: toStock.location,
        notes: notes
      })

    if (eventOutError) throw eventOutError

    const { error: eventInError } = await supabase
      .from('stock_events')
      .insert({
        stock_id: toStockId,
        type: 'transfer',
        quantity: quantity,
        from_location: fromStock.location,
        notes: notes
      })

    if (eventInError) throw eventInError

    // Update quantities
    const { error: updateFromError } = await supabase
      .from('stocks')
      .update({ quantity: newFromQuantity })
      .eq('id', fromStockId)

    if (updateFromError) throw updateFromError

    const { error: updateToError } = await supabase
      .from('stocks')
      .update({ quantity: newToQuantity })
      .eq('id', toStockId)

    if (updateToError) throw updateToError

    await fetchStocks()
  }, [fetchStocks])

  const addStock = useCallback(async (location: string, threshold: number = 100): Promise<Stock> => {
    const { data, error } = await supabase
      .from('stocks')
      .insert({ location, threshold })
      .select()
      .single()

    if (error) throw error

    setStocks(prev => [...prev, data])
    return data
  }, [])

  const deleteStock = useCallback(async (id: string): Promise<void> => {
    // Check if stock has events before deleting
    const { count } = await supabase
      .from('stock_events')
      .select('*', { count: 'exact', head: true })
      .eq('stock_id', id)

    if (count && count > 0) {
      throw new Error('Cannot delete stock location that has transaction history')
    }

    const { error } = await supabase
      .from('stocks')
      .delete()
      .eq('id', id)

    if (error) throw error

    setStocks(prev => prev.filter(s => s.id !== id))
  }, [])

  const getStockHistory = useCallback(async (stockId: string): Promise<StockEvent[]> => {
    const { data, error } = await supabase
      .from('stock_events')
      .select('*')
      .eq('stock_id', stockId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return data || []
  }, [])

  const refreshStocks = fetchStocks

  useEffect(() => {
    fetchStocks()
  }, [fetchStocks])

  return {
    stocks,
    loading,
    loadStock,
    dumpStock,
    transferStock,
    addStock,
    deleteStock,
    getStockHistory,
    refreshStocks
  }
}
