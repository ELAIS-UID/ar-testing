import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../client'
import { Customer, CustomerTransaction } from '../types'

export interface CustomerWithTransactions extends Customer {
  transactions: CustomerTransaction[]
}

export interface UseCustomersReturn {
  customers: CustomerWithTransactions[]
  loading: boolean
  addCustomer: (customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) => Promise<Customer>
  updateCustomer: (id: string, updates: Partial<Customer>) => Promise<Customer>
  deleteCustomer: (id: string) => Promise<void>
  getCustomerWithTransactions: (customerId: string) => Promise<{ customer: Customer; transactions: CustomerTransaction[] }>
  refreshCustomers: () => Promise<void>
}

export function useCustomers(): UseCustomersReturn {
  const [customers, setCustomers] = useState<CustomerWithTransactions[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true)

      // First get all customers
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .order('name')

      if (customersError) throw customersError

      // Then get all customer transactions with product information
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('customer_transactions')
        .select(`
          *,
          product:products(id, name)
        `)
        .order('date', { ascending: false })

      if (transactionsError) throw transactionsError

      // Group transactions by customer_id
      const transactionsByCustomer: Record<string, CustomerTransaction[]> = {}
      transactionsData?.forEach(transaction => {
        if (!transactionsByCustomer[transaction.customer_id]) {
          transactionsByCustomer[transaction.customer_id] = []
        }
        transactionsByCustomer[transaction.customer_id].push(transaction)
      })

      // Combine customers with their transactions
      const customersWithTransactions: CustomerWithTransactions[] = (customersData || []).map(customer => ({
        ...customer,
        transactions: transactionsByCustomer[customer.id] || []
      }))

      setCustomers(customersWithTransactions)
    } catch (error) {
      console.error('Error fetching customers:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const addCustomer = useCallback(async (customerData: Omit<Customer, 'id' | 'created_at' | 'updated_at'>): Promise<Customer> => {
    const { data, error } = await supabase
      .from('customers')
      .insert(customerData)
      .select()
      .single()

    if (error) throw error

    // Don't update local state here - caller should use refreshCustomers() instead
    // This prevents duplicates when both optimistic update and refresh happen
    return data
  }, [])

  const updateCustomer = useCallback(async (id: string, updates: Partial<Customer>): Promise<Customer> => {
    const { data, error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    setCustomers(prev => prev.map(c => c.id === id ? data : c))
    return data
  }, [])

  const deleteCustomer = useCallback(async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id)

    if (error) throw error

    setCustomers(prev => prev.filter(c => c.id !== id))
  }, [])

  const getCustomerWithTransactions = useCallback(async (customerId: string) => {
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single()

    if (customerError) throw customerError

    const { data: transactions, error: transactionsError } = await supabase
      .from('customer_transactions')
      .select('*')
      .eq('customer_id', customerId)
      .order('date', { ascending: false })

    if (transactionsError) throw transactionsError

    return { customer, transactions: transactions || [] }
  }, [])

  const refreshCustomers = fetchCustomers

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  return {
    customers,
    loading,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    getCustomerWithTransactions,
    refreshCustomers
  }
}
