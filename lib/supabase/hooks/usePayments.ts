import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../client'
import { AccountTransaction, Account, CustomerTransaction } from '../types'

interface AccountWithTransactions extends Account {
  transactions: AccountTransaction[]
}

export interface UsePaymentsReturn {
  accountTransactions: AccountTransaction[]
  loading: boolean
  addFunds: (accountId: string, amount: number, description?: string, notes?: string) => Promise<void>
  removeFunds: (accountId: string, amount: number, description?: string, notes?: string) => Promise<void>
  transferFunds: (fromAccountId: string, toAccountId: string, amount: number, notes?: string) => Promise<void>
  recordCustomerPayment: (customerId: string, amount: number, accountId: string, method?: string, notes?: string) => Promise<void>
  addExpense: (accountId: string, amount: number, description: string, notes?: string, date?: string) => Promise<void>
  updateExpense: (transactionId: string, updates: { amount?: number; description?: string; notes?: string; date?: string }) => Promise<void>
  accounts: AccountWithTransactions[]
  refreshPayments: () => Promise<void>
}

export function usePayments(): UsePaymentsReturn {
  const [accountTransactions, setAccountTransactions] = useState<AccountTransaction[]>([])
  const [accounts, setAccounts] = useState<AccountWithTransactions[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAccountTransactions = useCallback(async () => {
    try {
      setLoading(true)

      // First get all accounts
      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts')
        .select('*')
        .order('name')

      if (accountsError) throw accountsError

      // Then get all account transactions
      const { data: transactionsData, error: txError } = await supabase
        .from('account_transactions')
        .select('*')
        .order('date', { ascending: false })

      if (txError) throw txError
      setAccountTransactions(transactionsData || [])

      // Group transactions by account_id
      const transactionsByAccount: Record<string, AccountTransaction[]> = {}
      transactionsData?.forEach(transaction => {
        if (!transactionsByAccount[transaction.account_id]) {
          transactionsByAccount[transaction.account_id] = []
        }
        transactionsByAccount[transaction.account_id].push(transaction)
      })

      // Combine accounts with their transactions
      const accountsWithTransactions: AccountWithTransactions[] = (accountsData || []).map(account => ({
        ...account,
        transactions: transactionsByAccount[account.id] || []
      }))

      setAccounts(accountsWithTransactions)
    } catch (error) {
      console.error('Error fetching account transactions:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const addFunds = useCallback(async (accountId: string, amount: number, description?: string, notes?: string): Promise<void> => {
    const txDescription = description || `Added Funds - ₹${amount.toLocaleString()}`

    const { error } = await supabase
      .from('account_transactions')
      .insert({
        account_id: accountId,
        type: 'add-funds',
        amount: amount,
        description: txDescription,
        notes: notes
      })

    if (error) throw error

    await fetchAccountTransactions()
  }, [fetchAccountTransactions])

  const removeFunds = useCallback(async (accountId: string, amount: number, description?: string, notes?: string): Promise<void> => {
    const txDescription = description || `Removed Funds - ₹${amount.toLocaleString()}`

    const { error } = await supabase
      .from('account_transactions')
      .insert({
        account_id: accountId,
        type: 'remove-funds',
        amount: -amount, // Negative for removal
        description: txDescription,
        notes: notes
      })

    if (error) throw error

    await fetchAccountTransactions()
  }, [fetchAccountTransactions])

  const transferFunds = useCallback(async (fromAccountId: string, toAccountId: string, amount: number, notes?: string): Promise<void> => {
    const currentDate = new Date().toISOString().split('T')[0]

    // Transfer out from source account
    const { error: outError } = await supabase
      .from('account_transactions')
      .insert({
        account_id: fromAccountId,
        type: 'transfer-out',
        amount: -amount,
        description: `Transfer Out - ₹${amount.toLocaleString()}`,
        related_account_id: toAccountId,
        notes: notes
      })

    if (outError) throw outError

    // Transfer in to destination account
    const { error: inError } = await supabase
      .from('account_transactions')
      .insert({
        account_id: toAccountId,
        type: 'transfer-in',
        amount: amount,
        description: `Transfer In - ₹${amount.toLocaleString()}`,
        related_account_id: fromAccountId,
        notes: notes
      })

    if (inError) throw inError

    await fetchAccountTransactions()
  }, [fetchAccountTransactions])

  const recordCustomerPayment = useCallback(async (
    customerId: string,
    amount: number,
    accountId: string,
    method?: string,
    notes?: string
  ): Promise<void> => {
    // Record payment in customer transactions
    // Database triggers will automatically handle:
    // - Updating customer balance (customer_balance_trigger)
    // - Creating corresponding account transaction (payment_processing_trigger)
    // - Updating account balance (account_balance_trigger)
    
    const customerTxData = {
      customer_id: customerId,
      type: 'payment' as const,
      amount: -amount, // Negative for payment (reduction in customer balance)
      account_id: accountId,
      date: new Date().toISOString().split('T')[0], // Add explicit date
      notes: notes || `Payment received${method ? ` - ${method}` : ''}`
    }

    console.log('🔵 Recording customer payment:', customerTxData)

    const { data, error: customerTxError } = await supabase
      .from('customer_transactions')
      .insert(customerTxData)
      .select()

    if (customerTxError) {
      console.error('❌ Error inserting customer transaction:', customerTxError)
      throw customerTxError
    }

    console.log('✅ Customer transaction created:', data)

    // Refresh data to show updated balances and transactions
    await fetchAccountTransactions()
  }, [fetchAccountTransactions])

  const addExpense = useCallback(async (
    accountId: string,
    amount: number,
    description: string,
    notes?: string,
    date?: string
  ): Promise<void> => {
    const { error } = await supabase
      .from('account_transactions')
      .insert({
        account_id: accountId,
        type: 'expense',
        amount: amount,
        description: description,
        notes: notes,
        date: date || new Date().toISOString().split('T')[0]
      })

    if (error) throw error

    await fetchAccountTransactions()
  }, [fetchAccountTransactions])

  const updateExpense = useCallback(async (
    transactionId: string,
    updates: { amount?: number; description?: string; notes?: string; date?: string }
  ): Promise<void> => {
    const { error } = await supabase
      .from('account_transactions')
      .update(updates)
      .eq('id', transactionId)

    if (error) throw error

    await fetchAccountTransactions()
  }, [fetchAccountTransactions])

  const refreshPayments = fetchAccountTransactions

  useEffect(() => {
    fetchAccountTransactions()
  }, [fetchAccountTransactions])

  return {
    accountTransactions,
    accounts,
    loading,
    addFunds,
    removeFunds,
    transferFunds,
    recordCustomerPayment,
    addExpense,
    updateExpense,
    refreshPayments
  }
}
