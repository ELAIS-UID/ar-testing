import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../client'
import { Product } from '../types'

export interface UseProductsReturn {
  products: Product[]
  loading: boolean
  addProduct: (name: string, category?: string) => Promise<Product>
  deleteProduct: (id: string) => Promise<void>
  refreshProducts: () => Promise<void>
}

export function useProducts(): UseProductsReturn {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name')

      if (error) throw error

      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const addProduct = useCallback(async (name: string, category?: string): Promise<Product> => {
    const { data, error } = await supabase
      .from('products')
      .insert({ name, category: category || 'Other' })
      .select()
      .single()

    if (error) throw error

    await fetchProducts()
    return data
  }, [fetchProducts])

  const deleteProduct = useCallback(async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)

    if (error) throw error

    await fetchProducts()
  }, [fetchProducts])

  const refreshProducts = useCallback(async () => {
    await fetchProducts()
  }, [fetchProducts])

  return {
    products,
    loading,
    addProduct,
    deleteProduct,
    refreshProducts
  }
}
