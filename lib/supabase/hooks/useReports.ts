import { useState, useCallback } from 'react'
import { useCustomers } from './useCustomers'
import { useSales } from './useSales'
import { usePurchases } from './usePurchases'
import { usePayments } from './usePayments'
import { Customer, Sale, Purchase, CustomerTransaction, AccountTransaction } from '../types'

export interface UseReportsReturn {
  // Report data generators
  getItemReportByPartyData: (
    startDate: string,
    endDate: string
  ) => Array<{
    party: string
    product: string
    quantity: number
    amount: number
    unit: string
  }>

  getItemSaleSummaryData: (
    startDate: string,
    endDate: string
  ) => Array<{
    product: string
    quantity: number
    unit: string
  }>

  getMonthlyBusinessSummaryData: (
    startDate: string,
    endDate: string
  ) => Array<{
    month: string
    sales: number
    collections: number
  }>

  getCustomerWiseSummaryData: (
    startDate: string,
    endDate: string
  ) => Array<{
    name: string
    phone: string
    category: string
    totalSales: number
    totalPayments: number
    balance: number
  }>

  getAccountBalanceSummaryData: (
    startDate: string,
    endDate: string
  ) => Array<{
    account: string
    balance: number
  }>

  getTransactionReportData: (
    startDate: string,
    endDate: string
  ) => Array<{
    id: string
    date: string
    name: string
    notes: string
    type: string
    amount: number
    bags: number | null
    subCategory: string | null
    location: string | null
  }>

  getCustomerActivityData: (
    categoryFilter?: string
  ) => Array<{
    name: string
    phone: string
    category: string
    balance: number
    lastTransactionDate: string
    daysSinceLastTransaction: number | string
    isActive: boolean
    recentTransactions: number
    totalTransactions: number
  }>

  getProfitLossData: (
    startDate: string,
    endDate: string
  ) => {
    totalSalesBags: number
    totalSalesRevenue: number
    avgSellingPrice: number
    totalPurchaseBags: number
    totalPurchaseCost: number
    avgCostPrice: number
    profitPerBag: number
    profitMarginPercent: number
    totalProfit: number
    filteredSales: Sale[]
    filteredPurchases: Purchase[]
  }

  // Loading state
  loading: boolean

  // Refresh function
  refreshAllData: () => Promise<void>
}

export function useReports(): UseReportsReturn {
  const { customers, loading: customersLoading, refreshCustomers } = useCustomers()
  const { sales, loading: salesLoading, refreshSales } = useSales()
  const { purchases, loading: purchasesLoading, refreshPurchases } = usePurchases()
  const { accounts, loading: paymentsLoading, refreshPayments } = usePayments()

  const loading = customersLoading || salesLoading || purchasesLoading || paymentsLoading

  const refreshAllData = useCallback(async () => {
    await Promise.all([
      refreshCustomers(),
      refreshSales(),
      refreshPurchases(),
      refreshPayments()
    ])
  }, [refreshCustomers, refreshSales, refreshPurchases, refreshPayments])

  const getItemReportByPartyData = useCallback((
    startDate: string,
    endDate: string
  ) => {
    const start = new Date(startDate)
    const end = new Date(endDate)

    // Get customer transactions within date range
    const filteredTransactions = customers.flatMap(customer =>
      customer.transactions?.filter(t => {
        if (t.type !== 'sale') return false
        const transactionDate = new Date(t.date)
        return transactionDate >= start && transactionDate <= end
      }).map(t => ({
        party: customer.name || 'Unknown Party',
        product: t.sub_category || 'Unknown Product',
        quantity: Math.max(1, t.bags || 1),
        amount: t.amount || 0,
        unit: 'BAG'
      })) || []
    )

    // Group by party + product and sum quantities and amounts
    const grouped = filteredTransactions.reduce((acc, item) => {
      const key = `${item.party}-${item.product}`
      if (!acc[key]) {
        acc[key] = { party: item.party, product: item.product, quantity: 0, amount: 0, unit: item.unit }
      }
      acc[key].quantity += item.quantity
      acc[key].amount += item.amount
      return acc
    }, {} as Record<string, { party: string; product: string; quantity: number; amount: number; unit: string }>)

    return Object.values(grouped).sort((a, b) => a.party.localeCompare(b.party))
  }, [customers])

  const getItemSaleSummaryData = useCallback((
    startDate: string,
    endDate: string
  ) => {
    const start = new Date(startDate)
    const end = new Date(endDate)

    const filteredTransactions = customers.flatMap(customer =>
      customer.transactions?.filter(t => {
        if (t.type !== 'sale') return false
        const transactionDate = new Date(t.date)
        return transactionDate >= start && transactionDate <= end
      }).map(t => ({
        product: t.sub_category || 'Unknown Product',
        quantity: Math.max(1, t.bags || 1),
        unit: 'BAG'
      })) || []
    )

    // Group by product and sum quantities
    const grouped = filteredTransactions.reduce((acc, item) => {
      if (!acc[item.product]) {
        acc[item.product] = { product: item.product, quantity: 0, unit: item.unit }
      }
      acc[item.product].quantity += item.quantity
      return acc
    }, {} as Record<string, { product: string; quantity: number; unit: string }>)

    return Object.values(grouped).sort((a, b) => a.product.localeCompare(b.product))
  }, [customers])

  const getMonthlyBusinessSummaryData = useCallback((
    startDate: string,
    endDate: string
  ) => {
    const start = new Date(startDate)
    const end = new Date(endDate)

    // Group transactions by month
    const monthlyData: Record<string, { sales: number; collections: number; month: string }> = {}

    // Process all customer transactions
    customers.forEach(customer => {
      customer.transactions?.forEach(transaction => {
        const transactionDate = new Date(transaction.date)
        if (isNaN(transactionDate.getTime())) return

        // Check if transaction is within date range
        if (transactionDate >= start && transactionDate <= end) {
          const monthKey = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}`
          const monthName = transactionDate.toLocaleDateString('en-IN', { year: 'numeric', month: 'short' })

          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { sales: 0, collections: 0, month: monthName }
          }

          if (transaction.type === 'sale') {
            monthlyData[monthKey].sales += transaction.amount
          } else if (transaction.type === 'payment') {
            monthlyData[monthKey].collections += Math.abs(transaction.amount)
          }
        }
      })
    })

    // Convert to array and sort by month
    return Object.values(monthlyData).sort((a, b) => {
      const [aYear, aMonth] = a.month.split(' ')
      const [bYear, bMonth] = b.month.split(' ')
      const aDate = new Date(`${aMonth} 1, ${aYear}`)
      const bDate = new Date(`${bMonth} 1, ${bYear}`)
      return aDate.getTime() - bDate.getTime()
    })
  }, [customers])

  const getCustomerWiseSummaryData = useCallback((
    startDate: string,
    endDate: string
  ) => {
    const start = new Date(startDate)
    const end = new Date(endDate)

    // Process customer data
    return customers.map(customer => {
      // Filter transactions within date range
      const filteredTransactions = customer.transactions?.filter(transaction => {
        const transactionDate = new Date(transaction.date)
        return transactionDate >= start && transactionDate <= end
      }) || []

      // Calculate totals
      const totalSales = filteredTransactions
        .filter(t => t.type === 'sale')
        .reduce((sum, t) => sum + t.amount, 0)

      const totalPayments = filteredTransactions
        .filter(t => t.type === 'payment')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0)

      const balance = totalSales - totalPayments

      return {
        name: customer.name,
        phone: customer.phone || '',
        category: customer.category || 'Individual',
        totalSales,
        totalPayments,
        balance
      }
    }).filter(customer => customer.totalSales > 0 || customer.totalPayments > 0) // Only include customers with activity
      .sort((a, b) => b.totalSales - a.totalSales) // Sort by total sales descending
  }, [customers])

  const getAccountBalanceSummaryData = useCallback((
    startDate: string,
    endDate: string
  ) => {
    const start = new Date(startDate)
    const end = new Date(endDate)

    // Process account data
    return accounts.map(account => {
      // Filter account transactions within date range
      const filteredTransactions = account.transactions?.filter(transaction => {
        const transactionDate = new Date(transaction.date)
        return transactionDate >= start && transactionDate <= end &&
               transaction.type === 'payment'
      }) || []

      // Calculate balance (sum of payment amounts)
      const balance = filteredTransactions.reduce((sum: number, transaction) =>
        sum + Math.abs(transaction.amount), 0)

      return {
        account: account.name,
        balance
      }
    }).filter(account => account.balance > 0) // Only include accounts with activity
      .sort((a, b) => b.balance - a.balance) // Sort by balance descending
  }, [accounts])

  const getTransactionReportData = useCallback((
    startDate: string,
    endDate: string
  ) => {
    const start = new Date(startDate)
    const end = new Date(endDate)

    // Collect all transactions from all customers
    const allTransactions = customers.flatMap(customer =>
      customer.transactions?.filter(transaction => {
        const transactionDate = new Date(transaction.date)
        return transactionDate >= start && transactionDate <= end
      }).map(transaction => ({
        id: transaction.id,
        date: transaction.date,
        name: customer.name,
        notes: transaction.notes || '',
        type: transaction.type,
        amount: transaction.amount,
        bags: transaction.bags,
        subCategory: transaction.sub_category,
        location: transaction.location
      })) || []
    )

    // Sort by date (newest first)
    return allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [customers])

  const getCustomerActivityData = useCallback((
    categoryFilter?: string
  ) => {
    const today = new Date()
    const thirtyDaysAgo = new Date(today)
    thirtyDaysAgo.setDate(today.getDate() - 30)

    const filteredCustomers = categoryFilter === "all" || !categoryFilter
      ? customers
      : customers.filter(c => c.category === categoryFilter)

    return filteredCustomers.map(customer => {
      // Find last transaction date
      const lastTransaction = customer.transactions?.sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime())[0]

      const lastTransactionDate = lastTransaction ? new Date(lastTransaction.date) : null
      const daysSinceLastTransaction = lastTransactionDate
        ? Math.floor((today.getTime() - lastTransactionDate.getTime()) / (1000 * 60 * 60 * 24))
        : null

      const isActive = lastTransactionDate && lastTransactionDate >= thirtyDaysAgo

      // Count transactions in last 30 days
      const recentTransactions = customer.transactions?.filter(t => {
        const txDate = new Date(t.date)
        return txDate >= thirtyDaysAgo && txDate <= today
      }).length || 0

      return {
        name: customer.name,
        phone: customer.phone || '',
        category: customer.category || 'Individual',
        balance: customer.balance,
        lastTransactionDate: lastTransactionDate ? lastTransactionDate.toISOString().split('T')[0] : 'Never',
        daysSinceLastTransaction: daysSinceLastTransaction !== null ? daysSinceLastTransaction : '-',
        isActive: Boolean(isActive),
        recentTransactions,
        totalTransactions: customer.transactions?.length || 0
      }
    }).sort((a, b) => {
      // Sort by active status first, then by days since last transaction
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
      if (a.daysSinceLastTransaction === '-') return 1
      if (b.daysSinceLastTransaction === '-') return -1
      return Number(a.daysSinceLastTransaction) - Number(b.daysSinceLastTransaction)
    })
  }, [customers])

  const getProfitLossData = useCallback((
    startDate: string,
    endDate: string
  ) => {
    const start = new Date(startDate)
    const end = new Date(endDate)

    // Filter sales within date range
    const filteredSales = sales.filter(sale => {
      const saleDate = new Date(sale.date)
      return saleDate >= start && saleDate <= end
    })

    // Filter purchases within date range
    const filteredPurchases = purchases.filter(purchase => {
      const purchaseDate = new Date(purchase.date)
      return purchaseDate >= start && purchaseDate <= end
    })

    // Calculate averages
    const totalSalesBags = filteredSales.reduce((sum, sale) => sum + sale.quantity, 0)
    const totalSalesRevenue = filteredSales.reduce((sum, sale) => sum + sale.total_amount, 0)
    const avgSellingPrice = totalSalesBags > 0 ? totalSalesRevenue / totalSalesBags : 0

    const totalPurchaseBags = filteredPurchases.reduce((sum, purchase) => sum + purchase.quantity, 0)
    const totalPurchaseCost = filteredPurchases.reduce((sum, purchase) => {
      // Use original_price if available, otherwise use price_per_unit
      const costPerUnit = purchase.original_price || purchase.price_per_unit
      return sum + (purchase.quantity * costPerUnit)
    }, 0)
    const avgCostPrice = totalPurchaseBags > 0 ? totalPurchaseCost / totalPurchaseBags : 0

    // Calculate profit/loss
    const profitPerBag = avgSellingPrice - avgCostPrice
    const profitMarginPercent = avgCostPrice > 0 ? (profitPerBag / avgCostPrice) * 100 : 0
    const totalProfit = totalSalesBags * profitPerBag

    return {
      totalSalesBags,
      totalSalesRevenue,
      avgSellingPrice,
      totalPurchaseBags,
      totalPurchaseCost,
      avgCostPrice,
      profitPerBag,
      profitMarginPercent,
      totalProfit,
      filteredSales,
      filteredPurchases
    }
  }, [sales, purchases])

  return {
    getItemReportByPartyData,
    getItemSaleSummaryData,
    getMonthlyBusinessSummaryData,
    getCustomerWiseSummaryData,
    getAccountBalanceSummaryData,
    getTransactionReportData,
    getCustomerActivityData,
    getProfitLossData,
    loading,
    refreshAllData
  }
}
