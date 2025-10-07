"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useCustomers, useSales, usePurchases, useStocks, usePayments, useProducts } from "@/lib/supabase/hooks"
import { useReminders } from "@/lib/supabase/hooks/useReminders"
import { useNotes } from "@/lib/supabase/hooks/useNotes"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  BarChart3,
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
  CreditCard,
  UserCheck,
  Settings,
  Plus,
  AlertTriangle,
  Download,
  ArrowLeft,
  History,
  Calendar,
  Menu,
  X,
  Edit2,
  Trash2,
  FileText,
  Wallet,
} from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts"
import { pdf, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import PDFReport from "@/components/PDFReport"
import React from "react"

// Custom Date Input Component with Calendar Icon
const DateInputWithIcon = ({
  value,
  onChange,
  placeholder,
  className = "",
  ...props
}: {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  className?: string
  [key: string]: any
}) => {
  return (
    <div className="relative">
      <Input
        type="date"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`${className} pr-10`}
        {...props}
      />
      <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
    </div>
  )
}

interface Stock {
  location: string
  quantity: number
  threshold: number
  status: "normal" | "low"
}

interface Sale {
  id: string
  customer: string
  location: string
  quantity: number
  units: string
  total: number
  date: string
  // Keep bags for backward compatibility
  bags?: number
  subCategory?: string | null
  notes?: string | null
  originalPrice?: number
}

interface Customer {
  name: string
  phone: string
  category: string
  balance: number
  transactions: Transaction[]
}

interface Transaction {
  id: string
  type: "sale" | "payment"
  date: string
  amount: number
  bags?: number
  location?: string
  description: string
  account?: string // Added account field for payment tracking
  subCategory?: string
  notes?: string
}

interface AccountTransaction {
  id: string
  type: "add-funds" | "remove-funds" | "transfer-in" | "transfer-out"
  account: string
  amount: number
  date: string
  description: string
  notes?: string
  relatedAccount?: string // For transfers
}

interface Purchase {
  id: string
  supplier: string
  bags: number
  pricePerBag: number
  total: number
  date: string
  account?: string
  category?: string
  notes?: string
  originalPrice?: number
}

interface Expense {
  id: string
  name: string
  amount: number
  date: string
  category: string
  account: string
  notes?: string
}

interface Reminder {
  id: string
  customerName: string
  amount: number
  reminderDate: string
  notes?: string
  status: "active" | "completed"
  createdDate: string
}

export default function CementBusinessApp() {
  // Initialize Supabase hooks for data management
  const { 
    customers: supabaseCustomers, 
    loading: customersLoading,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    refreshCustomers
  } = useCustomers()

  const {
    sales: supabaseSales,
    loading: salesLoading,
    addSale,
    updateSale,
    deleteSale,
    refreshSales
  } = useSales()

  const {
    purchases: supabasePurchases,
    loading: purchasesLoading,
    addPurchase,
    updatePurchase,
    deletePurchase,
    refreshPurchases
  } = usePurchases()

  const {
    stocks: supabaseStocks,
    loading: stocksLoading,
    loadStock,
    dumpStock,
    transferStock,
    addStock,
    deleteStock,
    refreshStocks
  } = useStocks()

  const {
    accountTransactions: supabaseAccountTransactions,
    accounts: supabaseAccounts,
    loading: paymentsLoading,
    addFunds,
    removeFunds,
    transferFunds,
    recordCustomerPayment,
    addExpense,
    updateExpense,
    refreshPayments
  } = usePayments()

  const {
    products: supabaseProducts,
    loading: productsLoading,
    addProduct,
    deleteProduct,
    refreshProducts
  } = useProducts()

  const {
    reminders: supabaseReminders,
    loading: remindersLoading,
    addReminder,
    updateReminder,
    deleteReminder,
    refreshReminders
  } = useReminders()

  const {
    notes: supabaseNotes,
    loading: noteLoading,
    addNote,
    updateNote,
    refreshNotes
  } = useNotes()

  // UUID generation function for cross-browser compatibility
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  const [activeTab, setActiveTab] = useState("dashboard")
  const [isLoggedIn, setIsLoggedIn] = useState(true)
  const [userRole, setUserRole] = useState<"admin" | "employee">("admin")
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentAccount, setPaymentAccount] = useState("") // Added payment account state
  const [paymentCustomer, setPaymentCustomer] = useState("") // Added for sales module customer selection
  const [paymentDate, setPaymentDate] = useState("") // optional custom payment date
  const [paymentMethod, setPaymentMethod] = useState<"" | "Cash" | "Online">("") // optional payment method
  const [paymentNotes, setPaymentNotes] = useState("") // Added payment notes state
  const [showDiscountDialog, setShowDiscountDialog] = useState(false)
  const [discountAmount, setDiscountAmount] = useState("")
  const [discountType, setDiscountType] = useState<"amount" | "percentage">("amount")
  const [discountCategory, setDiscountCategory] = useState("")
  const [discountReason, setDiscountReason] = useState("")
  const [discountDate, setDiscountDate] = useState("")
  const [dateFilter, setDateFilter] = useState("") // Added date filter state
  const [showAddPurchase, setShowAddPurchase] = useState(false) // Added purchase dialog state
  const [showAddExpense, setShowAddExpense] = useState(false) // Added expense dialog state
  const [showDumpStock, setShowDumpStock] = useState(false) // Added dump stock dialog state
  const [showAddCustomerPurchase, setShowAddCustomerPurchase] = useState(false) // Added customer purchase dialog
  const [showOutstandingBalances, setShowOutstandingBalances] = useState(false)
  const [showSalesHistory, setShowSalesHistory] = useState(false)
  const [showSalesTrend, setShowSalesTrend] = useState(false)
  const [purchaseDateFilter, setPurchaseDateFilter] = useState("")
  const [salesDateFilter, setSalesDateFilter] = useState("")
  const [paymentDateFilter, setPaymentDateFilter] = useState("")
  const [selectedPurchaseSupplier, setSelectedPurchaseSupplier] = useState<string>("")
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>("")
  const [summaryStartDate, setSummaryStartDate] = useState<string>("")
  const [summaryEndDate, setSummaryEndDate] = useState<string>("")
  const [customerCategoryFilter, setCustomerCategoryFilter] = useState<
    "all" | "Engineer" | "Contractor" | "Builder" | "Individual"
  >("all")
  const [customerTransactionProductFilter, setCustomerTransactionProductFilter] = useState<string>("all")
  const [customerTransactionStartDate, setCustomerTransactionStartDate] = useState<string>("")
  const [customerTransactionEndDate, setCustomerTransactionEndDate] = useState<string>("")

  // Enhanced filtering state
  const [searchQuery, setSearchQuery] = useState("")
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<"all" | "sale" | "payment">("all")
  const [amountMin, setAmountMin] = useState("")
  const [amountMax, setAmountMax] = useState("")
  const [quickFilter, setQuickFilter] = useState<"all" | "today" | "week" | "month" | "quarter">("all")
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  // Sales filtering state
  const [salesSearchQuery, setSalesSearchQuery] = useState("")
  const [salesQuickFilter, setSalesQuickFilter] = useState<"all" | "today" | "week" | "month" | "quarter">("all")
  const [salesShowAdvancedFilters, setSalesShowAdvancedFilters] = useState(false)
  const [salesAmountMin, setSalesAmountMin] = useState("")
  const [salesAmountMax, setSalesAmountMax] = useState("")
  const [salesStartDate, setSalesStartDate] = useState<string>("")
  const [salesEndDate, setSalesEndDate] = useState<string>("")
  const [salesCustomerFilter, setSalesCustomerFilter] = useState<string>("all")
  const [salesLocationFilter, setSalesLocationFilter] = useState<string>("all")
  const [salesProductFilter, setSalesProductFilter] = useState<string>("all")

  const [accounts, setAccounts] = useState([
    { id: "1", name: "A.R", balance: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), user_id: null },
    { id: "2", name: "NEW A.R", balance: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), user_id: null },
    { id: "3", name: "ABDUL", balance: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), user_id: null },
    { id: "4", name: "SOHAIL", balance: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), user_id: null },
    { id: "5", name: "ABUBAKAR", balance: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), user_id: null }
  ])

  // Helper function to get account name by ID
  const getAccountName = (accountId: string) => {
    const account = supabaseAccounts.find(acc => acc.id === accountId)
    return account?.name || accountId
  }

  // Map Supabase data to local format for backward compatibility
  // This allows existing UI code to work without modifications
  const stockData = supabaseStocks.map(stock => ({
    location: stock.location,
    quantity: stock.quantity,
    threshold: stock.threshold || 100,
    status: (stock.quantity < (stock.threshold || 100) ? "low" : "normal") as "low" | "normal"
  }))

  const salesData = supabaseSales.map(sale => {
    const saleWithJoins = sale as any
    return {
      id: sale.id,
      customer: saleWithJoins.customers?.name || sale.customer_id || "",
      location: sale.location || "",
      quantity: sale.quantity,
      units: sale.unit,
      total: sale.total_amount,
      date: sale.date,
      bags: sale.quantity, // For backward compatibility
      subCategory: sale.sub_category,
      notes: sale.notes
    }
  })

  const customerData = supabaseCustomers.map(customer => ({
    name: customer.name,
    phone: customer.phone || "",
    category: customer.category || "",
    balance: customer.balance,
    transactions: (customer.transactions || []).map((transaction: any) => ({
      id: transaction.id,
      type: transaction.type,
      date: transaction.date,
      amount: transaction.amount,
      bags: transaction.quantity || transaction.bags,
      location: transaction.location,
      description: transaction.description || `${transaction.type} - ${transaction.amount}`,
      account: transaction.account_id,
      subCategory: transaction.sub_category,
      notes: transaction.notes,
      productName: transaction.product?.name || null, // Add product name
      productId: transaction.product_id || null // Add product ID
    }))
  }))

  const purchaseData = supabasePurchases.map(purchase => {
    // Handle the supplier/product lookup - purchase includes joined data
    // Cast to any to access joined properties from Supabase query
    const purchaseWithJoins = purchase as any
    
    // Handle both single object and array format for joins
    const supplierData = purchaseWithJoins.supplier
    const productData = purchaseWithJoins.product
    const accountData = purchaseWithJoins.account
    
    const supplierName = supplierData?.name || productData?.name || 'Unknown'
    const accountName = Array.isArray(accountData) ? accountData[0]?.name : accountData?.name || ''
    
    return {
      id: purchase.id,
      supplier: supplierName,
      bags: purchase.quantity,
      pricePerBag: purchase.price_per_unit,
      total: purchase.total_amount,
      date: purchase.date,
      account: accountName,
      category: purchase.category || undefined,
      notes: purchase.notes || undefined,
      originalPrice: purchase.original_price || undefined,
      is_dump: purchaseWithJoins.is_dump || false  // Include is_dump field for DUMP badge display
    }
  })

  // Keep setters for forms that need to update UI optimistically
  // These will be replaced with Supabase mutations
  const [stockData_legacy, setStockData] = useState<Stock[]>([])
  const [salesData_legacy, setSalesData] = useState<Sale[]>([])
  const [customerData_legacy, setCustomerData] = useState<Customer[]>([])
  const [purchaseData_legacy, setPurchaseData] = useState<Purchase[]>([])

  const [addStockForm, setAddStockForm] = useState({
    location: "",
    quantity: "",
    date: new Date().toISOString().split("T")[0],
  })
  const [stockLoadEvents, setStockLoadEvents] = useState<{ location: string; quantity: number; date: string; type: "load" | "dump"; brand?: string; category?: string }[]>([])
  const [transferStockForm, setTransferStockForm] = useState({ from: "", to: "", quantity: "" })
  const [addSaleForm, setAddSaleForm] = useState({ customer: "", location: "", quantity: "", unit: "bags", pricePerUnit: "", originalPrice: "", productType: "", subCategory: "", date: "", notes: "" })
  const [addCustomerForm, setAddCustomerForm] = useState({ name: "", phone: "", category: "", openingBalance: "" })
  const [customerSearchQuery, setCustomerSearchQuery] = useState("")

  const [brandOptions, setBrandOptions] = useState<string[]>(["JSW", "Ultra Tech", "Sri Cement"])
  
  // Map Supabase products to productTypes format for backward compatibility
  const productTypes = supabaseProducts.map(p => ({
    name: p.name,
    category: p.category || 'Other'
  }))
  
  const [productCategories, setProductCategories] = useState<string[]>(["Cement", "Paint", "Steel"])
  const [selectedProductCategory, setSelectedProductCategory] = useState<string>("")
  const [customCategoryName, setCustomCategoryName] = useState<string>("")
  const [productCategoryFilter, setProductCategoryFilter] = useState<string>("all")

  const [showAddBrand, setShowAddBrand] = useState(false)
  const [newBrandName, setNewBrandName] = useState("")

  // keep existing state keys nearby; only show the changed parts
  const [addPurchaseForm, setAddPurchaseForm] = useState({
    quantity: "",
    unit: "bags",
    pricePerUnit: "",
    originalPrice: "",
    amount: "",
    date: "",
  })
  const [addExpenseForm, setAddExpenseForm] = useState({ name: "", amount: "", category: "", date: "", account: "", notes: "" })
  const [dumpForm, setDumpForm] = useState({
    brand: "",
    subCategory: "",
    quantity: "",
    date: new Date().toISOString().split("T")[0],
    location: "",
  })
  const [addCustomerPurchaseForm, setAddCustomerPurchaseForm] = useState({
    quantity: "",
    location: "",
    productType: "",
    subCategory: "",
    unit: "bags",
    pricePerUnit: "520",
    originalPrice: "",
    date: "",
  })

  const [showAddStock, setShowAddStock] = useState(false)
  const [showTransferStock, setShowTransferStock] = useState(false)
  const [showAddSale, setShowAddSale] = useState(false)
  const [showAddCustomer, setShowAddCustomer] = useState(false)
  const [showEditDumpDialog, setShowEditDumpDialog] = useState(false)
  const [selectedDumpForEdit, setSelectedDumpForEdit] = useState<string | null>(null)

  const [showShopDetails, setShowShopDetails] = useState(false)
  const [selectedShop, setSelectedShop] = useState<string | null>(null)
  const [shopDateFilter, setShopDateFilter] = useState("")
  const [showAddShop, setShowAddShop] = useState(false)
  const [addShopForm, setAddShopForm] = useState({ name: "", quantity: "", threshold: "" })
  const [selectedAccountFilter, setSelectedAccountFilter] = useState("all")
  const [expenseData, setExpenseData] = useState<Expense[]>([])
  const [selectedAccountForFunds, setSelectedAccountForFunds] = useState<string>("")
  const [fundAmount, setFundAmount] = useState("")
  const [fundDate, setFundDate] = useState("")
  const [fundNotes, setFundNotes] = useState("")
  const [showAddFunds, setShowAddFunds] = useState(false)
  const [showRemoveFunds, setShowRemoveFunds] = useState(false)
  const [showTransferAmount, setShowTransferAmount] = useState(false)
  const [transferFromAccount, setTransferFromAccount] = useState("")
  const [transferToAccount, setTransferToAccount] = useState("")
  const [transferAmount, setTransferAmount] = useState("")
  const [transferDate, setTransferDate] = useState("")
  const [transferNotes, setTransferNotes] = useState("")
  const [accountTransactions, setAccountTransactions] = useState<AccountTransaction[]>([])
  const [editingAccountTransactionId, setEditingAccountTransactionId] = useState<string | null>(null)
  const [showAddAccount, setShowAddAccount] = useState(false)
  const [newAccountName, setNewAccountName] = useState("")

  // Note functionality state
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set())
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [noteText, setNoteText] = useState("")
  const [noteInputRefs, setNoteInputRefs] = useState<{ [key: string]: HTMLInputElement | null }>({})
  const noteDraftRef = React.useRef("")

  // Editing transaction state
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null)
  const [editingSaleIndex, setEditingSaleIndex] = useState<number | null>(null)
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null)
  const [editingCustomerTransactionId, setEditingCustomerTransactionId] = useState<string | null>(null)
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null)
  const [editingDumpId, setEditingDumpId] = useState<string | null>(null)
  
  // Report dialogs state
  const [showProfitLossAnalysis, setShowProfitLossAnalysis] = useState(false)
  const [showCustomerActivityReport, setShowCustomerActivityReport] = useState(false)
  const [showProductSubCategoryReport, setShowProductSubCategoryReport] = useState(false)
  const [showItemReportByParty, setShowItemReportByParty] = useState(false)
  const [showItemSaleSummary, setShowItemSaleSummary] = useState(false)
  const [showMonthlyBusinessSummary, setShowMonthlyBusinessSummary] = useState(false)
  const [showCustomerWiseSummary, setShowCustomerWiseSummary] = useState(false)
  const [showAccountBalanceSummary, setShowAccountBalanceSummary] = useState(false)
  const [showTransactionReport, setShowTransactionReport] = useState(false)
  const [reportStartDate, setReportStartDate] = useState("")
  const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split('T')[0])

  // Reports navigation state
  const [reportsView, setReportsView] = useState<"landing" | "customer-list" | "customer-details" | "notepad">("landing")
  const [notepadContent, setNotepadContent] = useState("")
  
  // Mobile sidebar state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  // Load notepad content from database on mount
  useEffect(() => {
    if (supabaseNotes && supabaseNotes.length > 0) {
      // Use the first note as the notepad content
      setNotepadContent(supabaseNotes[0].content || '')
    }
  }, [supabaseNotes])

  // Save notepad content to database whenever it changes (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      const currentContent = (supabaseNotes && supabaseNotes.length > 0) ? supabaseNotes[0].content || '' : ''
      if (notepadContent !== currentContent) {
        try {
          if (supabaseNotes && supabaseNotes.length > 0) {
            // Update existing note
            await updateNote(supabaseNotes[0].id, { content: notepadContent })
          } else {
            // Create new note
            await addNote({ title: 'Notepad', content: notepadContent })
          }
          await refreshNotes()
        } catch (error) {
          console.error('Failed to save note:', error)
        }
      }
    }, 1000) // Save after 1 second of no changes

    return () => clearTimeout(timeoutId)
  }, [notepadContent, supabaseNotes, updateNote, addNote, refreshNotes])

  // Reminder state (using Supabase data)
  const [showReminderDialog, setShowReminderDialog] = useState(false)
  const [showRemindersList, setShowRemindersList] = useState(false)
  const [reminderForm, setReminderForm] = useState({
    customerName: "",
    amount: "",
    reminderDate: "",
    notes: ""
  })

  const handleAddStock = async () => {
    if (!addStockForm.location || !addStockForm.quantity) {
      return
    }

    try {
      const addQty = Number.parseInt(addStockForm.quantity)
      const eventDate = addStockForm.date || new Date().toISOString().split("T")[0]

      // Find stock record by location
      const stock = supabaseStocks.find(s => s.location === addStockForm.location)
      if (!stock) {
        alert('Stock location not found')
        return
      }

      // Load stock using hook function
      await loadStock(stock.id, addQty, `Stock loaded to ${addStockForm.location} on ${eventDate}`)

      // Refresh stocks to show updated quantity
      await refreshStocks()

      // Reset form and close dialog
      setAddStockForm({ location: "", quantity: "", date: new Date().toISOString().split("T")[0] })
      setShowAddStock(false)

    } catch (error: any) {
      console.error('❌ Error loading stock:', error)
      alert('Failed to load stock: ' + (error.message || 'Unknown error'))
    }
  }

  const handleAddShop = async () => {
    if (!addShopForm.name || !addShopForm.quantity || !addShopForm.threshold) {
      return
    }

    try {
      const qty = Number.parseInt(addShopForm.quantity)
      const threshold = Number.parseInt(addShopForm.threshold)

      // Add new stock location to database
      const newStock = await addStock(addShopForm.name, threshold)

      // If initial quantity > 0, load stock to the new location
      if (qty > 0) {
        await loadStock(newStock.id, qty, `Initial stock quantity for ${addShopForm.name}`)
      }

      // Refresh stocks to show new location
      await refreshStocks()

      // Reset form and close dialog
      setAddShopForm({ name: "", quantity: "", threshold: "" })
      setShowAddShop(false)

    } catch (error: any) {
      console.error('❌ Error adding shop:', error)
      alert('Failed to add shop: ' + (error.message || 'Unknown error'))
    }
  }

  const handleTransferStock = async () => {
    if (!transferStockForm.from || !transferStockForm.to || !transferStockForm.quantity) {
      return
    }

    try {
      const transferQty = Number.parseInt(transferStockForm.quantity)

      // Find stock IDs by location names
      const fromStock = supabaseStocks.find(s => s.location === transferStockForm.from)
      const toStock = supabaseStocks.find(s => s.location === transferStockForm.to)

      if (!fromStock) {
        alert('Source stock location not found')
        return
      }

      if (!toStock) {
        alert('Destination stock location not found')
        return
      }

      // Transfer stock using hook function
      await transferStock(fromStock.id, toStock.id, transferQty, `Transfer from ${transferStockForm.from} to ${transferStockForm.to}`)

      // Refresh stocks to show updated quantities
      await refreshStocks()

      // Reset form and close dialog
      setTransferStockForm({ from: "", to: "", quantity: "" })
      setShowTransferStock(false)

    } catch (error: any) {
      console.error('❌ Error transferring stock:', error)
      alert('Failed to transfer stock: ' + (error.message || 'Unknown error'))
    }
  }

  const handleAddSale = async () => {
    if (!addSaleForm.customer || !addSaleForm.quantity || !addSaleForm.pricePerUnit) {
      alert('Please fill in all required fields')
      return
    }

    try {
      const quantity = Number.parseInt(addSaleForm.quantity)
      const pricePerUnit = Number.parseFloat(addSaleForm.pricePerUnit)

      // Find customer ID by name
      const customer = supabaseCustomers.find(c => c.name === addSaleForm.customer)
      if (!customer) {
        alert('Customer not found. Please select a valid customer.')
        return
      }

      // Find stock ID if location is not Direct/Company Goddam/none
      let stockId: string | undefined
      if (addSaleForm.location && !['Direct', 'Company Goddam', 'none'].includes(addSaleForm.location)) {
        const stock = supabaseStocks.find(s => s.location === addSaleForm.location)
        stockId = stock?.id
      }

      // Find product ID if product type (brand) is selected
      let productId: string | undefined
      if (addSaleForm.productType && addSaleForm.productType !== "none") {
        const product = supabaseProducts.find(p => p.name === addSaleForm.productType)
        productId = product?.id
      }

      // Check if we're editing an existing sale
      if (editingSaleId) {
        // Update existing sale
        await updateSale(editingSaleId, {
          customer_id: customer.id,
          stock_id: stockId,
          product_id: productId,
          quantity,
          unit: addSaleForm.unit,
          price_per_unit: pricePerUnit,
          total_amount: quantity * pricePerUnit,
          sub_category: addSaleForm.subCategory !== "none" ? addSaleForm.subCategory : undefined,
          location: addSaleForm.location,
          notes: addSaleForm.notes.trim() || undefined,
          date: addSaleForm.date || new Date().toISOString().split("T")[0]
        })
        
        console.log('✅ Sale updated successfully')
      } else {
        // Add new sale to database
        // Database triggers will automatically:
        // 1. Create customer transaction
        // 2. Update customer balance
        // 3. Create purchase transaction card (if Direct + product selected)
        // 4. Update stock quantities (if not Direct)
        await addSale({
          customerId: customer.id,
          stockId,
          productId,
          quantity,
          unit: addSaleForm.unit,
          pricePerUnit,
          subCategory: addSaleForm.subCategory !== "none" ? addSaleForm.subCategory : undefined,
          location: addSaleForm.location,
          notes: addSaleForm.notes.trim() || undefined,
          date: addSaleForm.date || new Date().toISOString().split("T")[0]
        })
        
        console.log('✅ Sale added successfully')
      }

      // Refresh data to show updated sale
      await refreshSales()
      await refreshCustomers()
      
      // If this was a Direct sale with product, refresh purchases to show transaction card
      if (productId && ['Direct', 'Company Goddam', 'none'].includes(addSaleForm.location)) {
        await refreshPurchases()
      }

      // If stock was updated, refresh stocks
      if (stockId) {
        await refreshStocks()
      }

      // Update selected customer if viewing customer details
      if (selectedCustomer && selectedCustomer.name === addSaleForm.customer) {
        const updatedCustomer = supabaseCustomers.find(c => c.id === customer.id)
        if (updatedCustomer) {
          setSelectedCustomer({
            name: updatedCustomer.name,
            phone: updatedCustomer.phone || "",
            category: updatedCustomer.category || "",
            balance: updatedCustomer.balance,
            transactions: updatedCustomer.transactions.map((t: any) => ({
              id: t.id,
              type: t.type,
              date: t.date,
              amount: t.amount,
              bags: t.quantity || t.bags,
              location: t.location,
              description: t.description || `${t.type} - ${t.amount}`,
              account: t.account_id,
              subCategory: t.sub_category,
              notes: t.notes
            }))
          })
        }
      }

      // Reset form and clear editing states
      setAddSaleForm({ customer: "", location: "", quantity: "", unit: "bags", pricePerUnit: "", originalPrice: "", productType: "", subCategory: "", date: "", notes: "" })
      setEditingSaleId(null)
      setEditingSaleIndex(null)
      setShowAddSale(false)

    } catch (error) {
      console.error('❌ Error saving sale:', error)
      alert('Failed to save sale. Please try again. Error: ' + (error as Error).message)
    }
  }

  const handleAddCustomer = async () => {
    if (!addCustomerForm.name || !addCustomerForm.phone || !addCustomerForm.category) {
      alert('Please fill in all required fields')
      return
    }

    try {
      const openingBalance = addCustomerForm.openingBalance ? Number.parseFloat(addCustomerForm.openingBalance) : 0
      
      // Add customer to database
      await addCustomer({
        name: addCustomerForm.name,
        phone: addCustomerForm.phone,
        category: addCustomerForm.category,
        balance: openingBalance,
        user_id: null // For now, not using authentication
      })

      // Refresh customers list
      await refreshCustomers()

      // Reset form and close dialog
      setAddCustomerForm({ name: "", phone: "", category: "", openingBalance: "" })
      setShowAddCustomer(false)

      console.log('✅ Customer added successfully')
    } catch (error) {
      console.error('❌ Error adding customer:', error)
      alert('Failed to add customer. Please try again. Error: ' + (error as Error).message)
    }
  }

  const handleCustomerPayment = async () => {
    // Support both selectedCustomer and paymentCustomer field
    const customerName = selectedCustomer?.name || paymentCustomer
    
    if (!customerName || !paymentAmount || !paymentAccount) {
      return
    }

    try {
      const amount = Number.parseFloat(paymentAmount)
      const txDate = paymentDate || new Date().toISOString().split("T")[0]
      const methodRemark = paymentMethod ? `, Method: ${paymentMethod}` : ""

      // Find customer ID by name
      const customer = supabaseCustomers.find(c => c.name === customerName)
      if (!customer) {
        alert('Customer not found')
        return
      }

      // Record customer payment
      // Database trigger will automatically:
      // 1. Update customer balance
      // 2. Create account transaction
      await recordCustomerPayment(
        customer.id,
        amount,
        paymentAccount,
        paymentMethod || undefined,
        `Payment received${methodRemark}`
      )

      // Refresh data to show new payment
      await refreshPayments()
      await refreshCustomers()

      // Update selected customer view
      const updatedCustomer = supabaseCustomers.find(c => c.id === customer.id)
      if (updatedCustomer) {
        setSelectedCustomer({
          name: updatedCustomer.name,
          phone: updatedCustomer.phone || "",
          category: updatedCustomer.category || "",
          balance: updatedCustomer.balance,
          transactions: (updatedCustomer.transactions || []).map((t: any) => ({
            id: t.id,
            type: t.type,
            date: t.date,
            amount: t.amount,
            bags: t.quantity || t.bags,
            location: t.location,
            description: t.description || `${t.type} - ${t.amount}`,
            account: t.account_id,
            subCategory: t.sub_category,
            notes: t.notes
          }))
        })
      }

      // Clear form
      setPaymentAmount("")
      setPaymentAccount("")
      setPaymentCustomer("")
      setPaymentDate("")
      setPaymentMethod("")
      setPaymentNotes("")
      setShowPaymentDialog(false)
      setEditingCustomerTransactionId(null)

    } catch (error: any) {
      console.error('❌ Error adding payment:', error)
      alert('Failed to add payment: ' + (error.message || 'Unknown error'))
    }
  }

  const handleApplyDiscount = () => {
    if (selectedCustomer && discountAmount) {
      const amount = Number.parseFloat(discountAmount)
      const txDate = discountDate || new Date().toISOString().split("T")[0]

      // Calculate discount value based on type
      let discountValue = 0
      if (discountType === "percentage") {
        discountValue = (selectedCustomer.balance * amount) / 100
      } else {
        discountValue = amount
      }

      // Apply 20% limit
      const maxDiscount = selectedCustomer.balance * 0.2
      const actualDiscount = Math.min(discountValue, maxDiscount)

      // Create discount transaction
      const discountDescription = discountCategory === "Custom Reason"
        ? `Discount Applied - ${discountReason || "Custom Reason"}`
        : `Discount Applied - ${discountCategory}`

      const newTransaction: Transaction = {
        id: generateUUID(),
        type: "payment", // Using payment type for discount (negative amount)
        date: txDate,
        amount: -actualDiscount,
        description: discountDescription,
        subCategory: discountCategory,
      }

      // Update customer data
      setCustomerData((prev) =>
        prev.map((customer) => {
          if (customer.name === selectedCustomer.name) {
            return {
              ...customer,
              balance: customer.balance - actualDiscount,
              transactions: [newTransaction, ...customer.transactions],
            }
          }
          return customer
        }),
      )

      // Update selected customer state
      setSelectedCustomer((prev) =>
        prev
          ? {
              ...prev,
              balance: prev.balance - actualDiscount,
              transactions: [newTransaction, ...prev.transactions],
            }
          : null,
      )

      // Reset form and close dialog
      setDiscountAmount("")
      setDiscountType("amount")
      setDiscountCategory("")
      setDiscountReason("")
      setDiscountDate("")
      setShowDiscountDialog(false)
    }
  }

  async function handleAddPurchase() {
    // Use the selected brand (supplier) from the buttons above
    const resolvedSupplier = selectedPurchaseSupplier

    // guard: require a supplier one way or another
    if (!resolvedSupplier) return

    try {
      const qty = Number.parseInt(addPurchaseForm.quantity || "0", 10)
      const pricePerUnit = Number.parseFloat(addPurchaseForm.pricePerUnit || "0")
      const dateStr = addPurchaseForm.date || purchaseDateFilter || new Date().toISOString().slice(0, 10)

      // Find supplier (product) by name
      const supplier = supabaseProducts.find(p => p.name === resolvedSupplier)
      if (!supplier) {
        alert('Supplier not found')
        return
      }

      // Add purchase to database
      await addPurchase({
        supplierId: supplier.id,
        productId: supplier.id, // Same as supplier for now
        quantity: qty,
        unit: addPurchaseForm.unit || 'bags',
        pricePerUnit,
        category: selectedSubCategory || undefined,
        originalPrice: addPurchaseForm.originalPrice ? Number.parseFloat(addPurchaseForm.originalPrice) : undefined,
        date: dateStr
      })

      // Refresh purchases to show new record
      await refreshPurchases()

      // Reset form
      setShowAddPurchase(false)
      setAddPurchaseForm({
        quantity: "",
        unit: "bags",
        pricePerUnit: "",
        originalPrice: "",
        amount: "",
        date: "",
      })
      setEditingPurchaseId(null)

    } catch (error: any) {
      console.error('❌ Error adding purchase:', error)
      alert('Failed to add purchase: ' + (error.message || 'Unknown error'))
    }
  }

  const handleAddExpense = async () => {
    if (addExpenseForm.name && addExpenseForm.amount && addExpenseForm.category && addExpenseForm.account) {
      try {
        const amount = Number.parseFloat(addExpenseForm.amount)
        const txDate = addExpenseForm.date || new Date().toISOString().split("T")[0]
        
        // Find account by ID
        const account = supabaseAccounts.find(a => a.id === addExpenseForm.account)
        if (!account) {
          alert('Account not found')
          return
        }

        if (editingAccountTransactionId) {
          // Edit existing expense - update account transaction
          await updateExpense(editingAccountTransactionId, {
            amount: amount,
            description: `Expense: ${addExpenseForm.name} (${addExpenseForm.category})`,
            notes: addExpenseForm.notes || undefined,
            date: txDate
          })
          
          setEditingAccountTransactionId(null)
        } else {
          // Add new expense to database
          await addExpense(
            account.id,
            amount,
            `Expense: ${addExpenseForm.name} (${addExpenseForm.category})`,
            addExpenseForm.notes || undefined,
            txDate
          )
        }
        
        // Refresh account data to show updated balance
        await refreshPayments()
        // Create an account transaction to track the expense
        // Refresh account data to show updated balance
        await refreshPayments()
        
        // Reset form
        setAddExpenseForm({ name: "", amount: "", category: "", date: "", account: "", notes: "" })
        setShowAddExpense(false)
      } catch (error: any) {
        console.error('Error adding/updating expense:', error)
        alert('Failed to save expense: ' + (error.message || 'Unknown error'))
      }
    }
  }

  const handleAddCustomerPurchase = async () => {
    if (!selectedCustomer || !addCustomerPurchaseForm.quantity || !addCustomerPurchaseForm.pricePerUnit) {
      alert('Please fill in all required fields')
      return
    }

    try {
      const quantity = Number.parseInt(addCustomerPurchaseForm.quantity)
      const pricePerUnit = Number.parseFloat(addCustomerPurchaseForm.pricePerUnit)

      // Find customer ID by name
      const customer = supabaseCustomers.find(c => c.name === selectedCustomer.name)
      if (!customer) {
        alert('Customer not found')
        return
      }

      // Find stock ID if location is not Direct/Company Goddam/none
      let stockId: string | undefined
      if (addCustomerPurchaseForm.location && !['Direct', 'Company Goddam', 'none'].includes(addCustomerPurchaseForm.location)) {
        const stock = supabaseStocks.find(s => s.location === addCustomerPurchaseForm.location)
        if (stock) {
          stockId = stock.id
        }
      }

      // Find product ID if product type is selected
      let productId: string | undefined
      if (addCustomerPurchaseForm.productType && addCustomerPurchaseForm.productType !== "none") {
        const product = supabaseProducts.find(p => p.name === addCustomerPurchaseForm.productType)
        if (product) {
          productId = product.id
        }
      }

      // Add sale to database
      // Database triggers will automatically:
      // 1. Create customer transaction
      // 2. Update customer balance
      // 3. Create purchase transaction card (if Direct + product selected)
      // 4. Update stock quantities (if not Direct)
      await addSale({
        customerId: customer.id,
        stockId,
        productId,
        quantity,
        unit: addCustomerPurchaseForm.unit || 'bags',
        pricePerUnit,
        subCategory: addCustomerPurchaseForm.subCategory !== "none" ? addCustomerPurchaseForm.subCategory : undefined,
        location: addCustomerPurchaseForm.location,
        notes: undefined,
        date: addCustomerPurchaseForm.date || new Date().toISOString().split("T")[0]
      })

      // Refresh data to show new sale
      await refreshSales()
      await refreshCustomers()
      
      // If this was a Direct sale with product, refresh purchases
      if (productId && ['Direct', 'Company Goddam', 'none'].includes(addCustomerPurchaseForm.location)) {
        await refreshPurchases()
      }

      // If stock was updated, refresh stocks
      if (stockId) {
        await refreshStocks()
      }

      // Update selected customer view
      const updatedCustomer = supabaseCustomers.find(c => c.id === customer.id)
      if (updatedCustomer) {
        setSelectedCustomer({
          name: updatedCustomer.name,
          phone: updatedCustomer.phone || "",
          category: updatedCustomer.category || "",
          balance: updatedCustomer.balance,
          transactions: (updatedCustomer.transactions || []).map((t: any) => ({
            id: t.id,
            type: t.type,
            date: t.date,
            amount: t.amount,
            bags: t.quantity || t.bags,
            location: t.location,
            description: t.description || `${t.type} - ${t.amount}`,
            account: t.account_id,
            subCategory: t.sub_category,
            notes: t.notes,
            productName: t.product?.name || null,
            productId: t.product_id || null
          }))
        })
      }

      // Reset form and close dialog
      setAddCustomerPurchaseForm({ quantity: "", location: "", productType: "", subCategory: "", unit: "bags", pricePerUnit: "520", originalPrice: "", date: "" })
      setShowAddCustomerPurchase(false)
      setEditingCustomerTransactionId(null)

      console.log('✅ Customer sale added successfully')
    } catch (error) {
      console.error('❌ Error adding customer sale:', error)
      alert('Failed to add sale. Please try again. Error: ' + (error as Error).message)
    }
  }

  const getFilteredPayments = () => {
    const byAccount = (t: any) => selectedAccountFilter === "all" || t.account === selectedAccountFilter
    
    // Get customer payment transactions
    const customerPayments = customerData
      .flatMap((customer) =>
        customer.transactions
          .filter((t) => t.type === "payment" && t.account)
          .map((t) => ({ ...t, customerName: customer.name })),
      )
      .filter((t) => !paymentDateFilter || t.date === paymentDateFilter)
      .filter(byAccount)
    
    // Get expense transactions and format them like payment transactions
    const expensePayments = expenseData
      .filter((expense) => expense.account)
      .filter((expense) => !paymentDateFilter || expense.date === paymentDateFilter)
      .filter((expense) => selectedAccountFilter === "all" || expense.account === selectedAccountFilter)
      .map((expense) => ({
        id: expense.id,
        type: "expense" as const,
        date: expense.date,
        amount: expense.amount, // Positive for expenses (deduction from account)
        account: expense.account,
        customerName: expense.category,
        description: expense.name,
        notes: expense.notes,
      }))
    
    // Combine and sort by date
    return [...customerPayments, ...expensePayments]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  const filteredSalesData = dateFilter ? salesData.filter((sale) => sale.date >= dateFilter) : salesData

  const filteredCustomerData = dateFilter
    ? customerData.map((customer) => ({
        ...customer,
        transactions: customer.transactions.filter((t) => t.date >= dateFilter),
      }))
    : customerData

  const getFilteredData = (data: any[], dateFilter: string, dateField: string) => {
    if (!dateFilter) return data
    return data.filter((item) => item[dateField] === dateFilter)
  }

  const getSalesTrendData = () => {
    const filtered = getFilteredData(salesData, dateFilter, "date")

    const salesByDate = filtered.reduce<Record<string, { date: string; sales: number; bags: number }>>((acc, sale) => {
      const date = sale.date
      if (!acc[date]) {
        acc[date] = { date, sales: 0, bags: 0 }
      }
      acc[date].sales += sale.total
      acc[date].bags += sale.bags
      return acc
    }, {})

    return Object.values(salesByDate).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  const getCustomersWithBalance = () => {
    return customerData.filter((customer) => customer.balance > 0)
  }

  const getAccountTotal = (account: string | {id: string, name: string}) => {
    const accountName = typeof account === 'string' ? account : account.name
    // Calculate customer payment transactions
    const payments = customerData.flatMap((customer) =>
      customer.transactions
        .filter((t) => t.type === "payment" && t.account)
        .map((t) => ({ ...t, customerName: customer.name })),
    )
    const scoped = accountName === "all" ? payments : payments.filter((p) => p.account === accountName)
    const paymentSum = scoped.reduce((acc, p) => acc + p.amount, 0)
    
    // Calculate account fund transactions (add-funds, remove-funds, transfers)
    const accountFunds = accountTransactions.filter(t => {
      if (accountName === "all") return true
      return t.account === accountName
    })
    
    const fundSum = accountFunds.reduce((acc, t) => {
      if (t.type === "add-funds" || t.type === "transfer-in") {
        return acc + t.amount
      } else if (t.type === "remove-funds" || t.type === "transfer-out") {
        return acc - t.amount
      }
      return acc
    }, 0)
    
    return Math.abs(paymentSum) + fundSum
  }

  // Enhanced transaction filtering function
  const getFilteredTransactions = () => {
    if (!selectedCustomer) return []

    let filtered = selectedCustomer.transactions

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(t =>
        t.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Transaction type filter
    if (transactionTypeFilter !== "all") {
      filtered = filtered.filter(t => t.type === transactionTypeFilter)
    }

    // Amount range filter
    if (amountMin) {
      filtered = filtered.filter(t => Math.abs(t.amount) >= parseFloat(amountMin))
    }
    if (amountMax) {
      filtered = filtered.filter(t => Math.abs(t.amount) <= parseFloat(amountMax))
    }

    // Quick filter (date-based)
    if (quickFilter !== "all") {
      const now = new Date()
      let startDate: Date

      switch (quickFilter) {
        case "today":
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        case "quarter":
          startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
          break
        default:
          startDate = new Date(0)
      }

      filtered = filtered.filter(t => new Date(t.date) >= startDate)
    }

    // Date range filters (existing)
    if (customerTransactionStartDate) {
      filtered = filtered.filter(t => t.date >= customerTransactionStartDate)
    }
    if (customerTransactionEndDate) {
      filtered = filtered.filter(t => t.date <= customerTransactionEndDate)
    }

    // Product filter (existing) - only apply to sale transactions
    if (customerTransactionProductFilter !== "all") {
      filtered = filtered.filter(t => {
        // Only filter sale transactions by product type, include all others
        return t.type !== "sale" || t.description.toLowerCase().includes(customerTransactionProductFilter.toLowerCase())
      })
    }

    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  // Clear all filters function
  const clearAllFilters = () => {
    setSearchQuery("")
    setTransactionTypeFilter("all")
    setAmountMin("")
    setAmountMax("")
    setQuickFilter("all")
    setCustomerTransactionProductFilter("all")
    setCustomerTransactionStartDate("")
    setCustomerTransactionEndDate("")
  }

  // Sales filtering function
  const getFilteredSales = () => {
    // Start with all sales data (removed filter for location !== "none")
    let filtered = salesData

    // Search filter
    if (salesSearchQuery) {
      filtered = filtered.filter(sale =>
        sale.customer.toLowerCase().includes(salesSearchQuery.toLowerCase()) ||
        sale.location.toLowerCase().includes(salesSearchQuery.toLowerCase())
      )
    }

    // Amount range filter
    if (salesAmountMin) {
      filtered = filtered.filter(sale => sale.total >= parseFloat(salesAmountMin))
    }
    if (salesAmountMax) {
      filtered = filtered.filter(sale => sale.total <= parseFloat(salesAmountMax))
    }

    // Quick filter (date-based)
    if (salesQuickFilter !== "all") {
      const now = new Date()
      let startDate: Date

      switch (salesQuickFilter) {
        case "today":
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        case "quarter":
          startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
          break
        default:
          startDate = new Date(0)
      }

      filtered = filtered.filter(sale => new Date(sale.date) >= startDate)
    }

    // Date range filters
    if (salesStartDate) {
      filtered = filtered.filter(sale => sale.date >= salesStartDate)
    }
    if (salesEndDate) {
      filtered = filtered.filter(sale => sale.date <= salesEndDate)
    }

    // Customer filter
    if (salesCustomerFilter !== "all") {
      filtered = filtered.filter(sale => sale.customer === salesCustomerFilter)
    }

    // Location filter
    if (salesLocationFilter !== "all") {
      filtered = filtered.filter(sale => sale.location === salesLocationFilter)
    }

    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  // Clear sales filters function
  const clearSalesFilters = () => {
    setSalesSearchQuery("")
    setSalesQuickFilter("all")
    setSalesShowAdvancedFilters(false)
    setSalesAmountMin("")
    setSalesAmountMax("")
    setSalesStartDate("")
    setSalesEndDate("")
    setSalesCustomerFilter("all")
    setSalesLocationFilter("all")
  }

  const handleAddAccount = () => {
    if (newAccountName.trim() && !accounts.find(acc => acc.name === newAccountName.trim())) {
      const newAccount = {
        id: Date.now().toString(),
        name: newAccountName.trim(),
        balance: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: null
      }
      setAccounts([...accounts, newAccount])
      setNewAccountName("")
      setShowAddAccount(false)
    }
  }

  const handleAddFunds = async () => {
    if (!selectedAccountForFunds || !fundAmount) {
      return
    }

    try {
      const amount = Number.parseFloat(fundAmount)
      const txDate = fundDate || new Date().toISOString().split("T")[0]

      // Find account by ID (not name)
      const account = supabaseAccounts.find(a => a.id === selectedAccountForFunds)
      if (!account) {
        alert('Account not found')
        return
      }

      // Add funds to database
      await addFunds(
        account.id,
        amount,
        `Added Funds - ₹${amount.toLocaleString()} to ${account.name}`,
        fundNotes.trim() || undefined
      )

      // Refresh data
      await refreshPayments()

      // Reset form
      setFundAmount("")
      setFundDate("")
      setFundNotes("")
      setSelectedAccountForFunds("")
      setShowAddFunds(false)
      setEditingAccountTransactionId(null)

    } catch (error: any) {
      console.error('❌ Error adding funds:', error)
      alert('Failed to add funds: ' + (error.message || 'Unknown error'))
    }
  }

  const handleRemoveFunds = async () => {
    if (!selectedAccountForFunds || !fundAmount) {
      return
    }

    try {
      const amount = Number.parseFloat(fundAmount)
      const txDate = fundDate || new Date().toISOString().split("T")[0]

      // Find account by ID (not name)
      const account = supabaseAccounts.find(a => a.id === selectedAccountForFunds)
      if (!account) {
        alert('Account not found')
        return
      }

      // Remove funds from database
      await removeFunds(
        account.id,
        amount,
        `Removed Funds - ₹${amount.toLocaleString()} from ${account.name}`,
        fundNotes.trim() || undefined
      )

      // Refresh data
      await refreshPayments()

      // Reset form
      setFundAmount("")
      setFundDate("")
      setFundNotes("")
      setSelectedAccountForFunds("")
      setShowRemoveFunds(false)
      setEditingAccountTransactionId(null)

    } catch (error: any) {
      console.error('❌ Error removing funds:', error)
      alert('Failed to remove funds: ' + (error.message || 'Unknown error'))
    }
  }

  const handleTransferAmount = async () => {
    if (!transferFromAccount || !transferToAccount || !transferAmount) {
      return
    }

    try {
      const amount = Number.parseFloat(transferAmount)
      const txDate = transferDate || new Date().toISOString().split("T")[0]

      // Find accounts by ID (not name)
      const fromAccount = supabaseAccounts.find(a => a.id === transferFromAccount)
      const toAccount = supabaseAccounts.find(a => a.id === transferToAccount)

      if (!fromAccount) {
        alert('Source account not found')
        return
      }

      if (!toAccount) {
        alert('Destination account not found')
        return
      }

      // Transfer funds in database
      // This creates both transfer-out and transfer-in transactions
      await transferFunds(
        fromAccount.id,
        toAccount.id,
        amount,
        transferNotes.trim() || undefined
      )

      // Refresh data
      await refreshPayments()

      // Reset form
      setTransferAmount("")
      setTransferDate("")
      setTransferNotes("")
      setTransferFromAccount("")
      setTransferToAccount("")
      setShowTransferAmount(false)

    } catch (error: any) {
      console.error('❌ Error transferring funds:', error)
      alert('Failed to transfer funds: ' + (error.message || 'Unknown error'))
    }
  }

  // PDF Generation Function for Item Report by Party
  const generateItemReportByPartyPDF = async (data: any[], startDate: string, endDate: string) => {

    const styles = StyleSheet.create({
      page: {
        padding: 30,
        fontSize: 10,
      },
      header: {
        marginBottom: 20,
        textAlign: 'center',
      },
      title: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
      },
      dateRange: {
        fontSize: 12,
        marginBottom: 10,
      },
      table: {
        marginTop: 20,
      },
      tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#000',
        paddingVertical: 5,
      },
      tableHeader: {
        backgroundColor: '#f0f0f0',
        fontWeight: 'bold',
      },
      tableCell: {
        flex: 1,
        padding: 5,
        fontSize: 9,
      },
      partyCell: {
        flex: 2,
      },
      productCell: {
        flex: 2,
      },
      quantityCell: {
        flex: 1,
        textAlign: 'right',
      },
      amountCell: {
        flex: 1,
        textAlign: 'right',
      },
    })

    const MyDocument = () => (
      <Document>
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.title}>Item Report by Party</Text>
            <Text style={styles.dateRange}>
              Period: {new Date(startDate).toLocaleDateString('en-IN')} - {new Date(endDate).toLocaleDateString('en-IN')}
            </Text>
            <Text style={styles.dateRange}>A.R. Enterprises</Text>
          </View>

          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={[styles.tableCell, styles.partyCell]}>Party</Text>
              <Text style={[styles.tableCell, styles.productCell]}>Item Name</Text>
              <Text style={[styles.tableCell, styles.quantityCell]}>Sales Qty.</Text>
              <Text style={[styles.tableCell, styles.amountCell]}>Sales Amount</Text>
            </View>

            {data.map((item, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.partyCell]}>{item.party}</Text>
                <Text style={[styles.tableCell, styles.productCell]}>{item.product}</Text>
                <Text style={[styles.tableCell, styles.quantityCell]}>{item.quantity} {item.unit}</Text>
                <Text style={[styles.tableCell, styles.amountCell]}>₹{item.amount.toLocaleString()}</Text>
              </View>
            ))}
          </View>
        </Page>
      </Document>
    )

    return await pdf(<MyDocument />).toBlob()
  }

  // PDF Generation Function
  const generatePDFReport = async () => {
    if (!selectedCustomer) {
      alert('Please select a customer first.')
      return
    }

    const filteredTransactions = getFilteredTransactions()

    if (filteredTransactions.length === 0) {
      alert('No transactions found for the selected customer and date range.')
      return
    }

    const dateRange = customerTransactionStartDate && customerTransactionEndDate ? {
      from: customerTransactionStartDate,
      to: customerTransactionEndDate
    } : undefined

    try {
      console.log('Generating PDF for customer:', selectedCustomer.name)
      console.log('Transactions count:', filteredTransactions.length)

      const blob = await pdf(
        <PDFReport
          customer={selectedCustomer}
          transactions={filteredTransactions}
          dateRange={dateRange}
        />
      ).toBlob()

      if (!blob) {
        throw new Error('Failed to generate PDF blob')
      }

      // Create download link
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Customer_Ledger_${selectedCustomer.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      console.log('PDF generated and downloaded successfully')
    } catch (error) {
      console.error('Error generating PDF:', error)

      // More specific error messages
      let errorMessage = 'Error generating PDF report. Please try again.'
      if (error instanceof Error) {
        if (error.message.includes('blob')) {
          errorMessage = 'Failed to create PDF file. Please check your browser settings.'
        } else if (error.message.includes('render')) {
          errorMessage = 'PDF rendering failed. Please try with fewer transactions.'
        }
      }

      alert(errorMessage)
    }
  }

  // Generate Item Report by Party data
  const getItemReportByPartyData = () => {
    if (!reportStartDate || !reportEndDate) return []

    // Validate date range
    const startDate = new Date(reportStartDate)
    const endDate = new Date(reportEndDate)

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.error('Invalid date range:', reportStartDate, reportEndDate)
      return []
    }

    if (startDate > endDate) {
      console.error('Start date cannot be after end date')
      return []
    }

    console.log('Report dates:', reportStartDate, reportEndDate)
    console.log('Customer data:', customerData)
    console.log('Product types:', productTypes)

    const filteredTransactions = customerData.flatMap(customer =>
      customer.transactions.filter(t => {
        // Validate transaction data
        if (!t || t.type !== 'sale') return false

        const transactionDate = new Date(t.date)
        if (isNaN(transactionDate.getTime())) return false

        const isInDateRange = transactionDate >= startDate && transactionDate <= endDate

        // Include all sale transactions, even without product types
        return isInDateRange
      }).map(t => ({
        party: customer.name || 'Unknown Party',
        product: t.subCategory || extractProductFromDescription(t.description) || 'Unknown Product',
        quantity: Math.max(1, t.bags || 1), // Ensure positive quantity
        amount: t.amount || 0, // Use actual transaction amount, default to 0
        unit: 'BAG'
      }))
    )

    console.log('Filtered transactions:', filteredTransactions)

    // Group by party + product and sum quantities and amounts
    const grouped = filteredTransactions.reduce((acc, item) => {
      const key = `${item.party}-${item.product}`
      if (!acc[key]) {
        acc[key] = { party: item.party, product: item.product, quantity: 0, amount: 0, unit: item.unit }
      }
      acc[key].quantity += item.quantity
      acc[key].amount += item.amount // Sum actual transaction amounts
      return acc
    }, {} as Record<string, { party: string; product: string; quantity: number; amount: number; unit: string }>)

    return Object.values(grouped).sort((a, b) => a.party.localeCompare(b.party))
  }

  // Helper function to extract product name from description
  const extractProductFromDescription = (description: string): string => {
    if (!description) return 'Unknown Product'

    // Common product patterns in descriptions
    const productPatterns = [
      /Cement/i,
      /JSW/i,
      /Ultra Tech/i,
      /Sri Cement/i,
      /Ambuja/i,
      /ACC/i,
      /Birla/i,
      /Paint/i,
      /Steel/i
    ]

    for (const pattern of productPatterns) {
      const match = description.match(pattern)
      if (match) {
        return match[0]
      }
    }

    return 'Unknown Product'
  }

  // Generate Item Sale Summary data
  const getItemSaleSummaryData = () => {
    if (!reportStartDate || !reportEndDate) return []

    // Validate date range
    const startDate = new Date(reportStartDate)
    const endDate = new Date(reportEndDate)

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.error('Invalid date range:', reportStartDate, reportEndDate)
      return []
    }

    if (startDate > endDate) {
      console.error('Start date cannot be after end date')
      return []
    }

    const filteredTransactions = customerData.flatMap(customer =>
      customer.transactions.filter(t => {
        // Validate transaction data
        if (!t || t.type !== 'sale') return false

        const transactionDate = new Date(t.date)
        if (isNaN(transactionDate.getTime())) return false

        const isInDateRange = transactionDate >= startDate && transactionDate <= endDate
        // Check if transaction has a product name
        const hasValidProduct = t.productName || t.subCategory || extractProductFromDescription(t.description)

        return isInDateRange && hasValidProduct
      }).map(t => ({
        product: t.productName || extractProductFromDescription(t.description) || 'Unknown Product',
        quantity: Math.max(1, t.bags || 1), // Ensure positive quantity
        unit: 'BAG'
      }))
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
  }

  // Generate Monthly Business Summary data
  const getMonthlyBusinessSummaryData = () => {
    if (!reportStartDate || !reportEndDate) return []

    // Validate date range
    const startDate = new Date(reportStartDate)
    const endDate = new Date(reportEndDate)

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.error('Invalid date range:', reportStartDate, reportEndDate)
      return []
    }

    if (startDate > endDate) {
      console.error('Start date cannot be after end date')
      return []
    }

    // Group transactions by month
    const monthlyData: Record<string, { sales: number; collections: number; month: string }> = {}

    // Process all customer transactions
    customerData.forEach(customer => {
      customer.transactions.forEach(transaction => {
        const transactionDate = new Date(transaction.date)
        if (isNaN(transactionDate.getTime())) return

        // Check if transaction is within date range
        if (transactionDate >= startDate && transactionDate <= endDate) {
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
  }

  // Generate Customer-Wise Summary data
  const getCustomerWiseSummaryData = () => {
    if (!reportStartDate || !reportEndDate) return []

    // Validate date range
    const startDate = new Date(reportStartDate)
    const endDate = new Date(reportEndDate)

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.error('Invalid date range:', reportStartDate, reportEndDate)
      return []
    }

    if (startDate > endDate) {
      console.error('Start date cannot be after end date')
      return []
    }

    // Process customer data
    return customerData.map(customer => {
      // Filter transactions within date range
      const filteredTransactions = customer.transactions.filter(transaction => {
        const transactionDate = new Date(transaction.date)
        return transactionDate >= startDate && transactionDate <= endDate
      })

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
        phone: customer.phone,
        category: customer.category || 'Individual',
        totalSales,
        totalPayments,
        balance
      }
    }).filter(customer => customer.totalSales > 0 || customer.totalPayments > 0) // Only include customers with activity
      .sort((a, b) => b.totalSales - a.totalSales) // Sort by total sales descending
  }

  // Generate Account Balance Summary data
  const getAccountBalanceSummaryData = () => {
    if (!reportStartDate || !reportEndDate) return []

    // Validate date range
    const startDate = new Date(reportStartDate)
    const endDate = new Date(reportEndDate)

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.error('Invalid date range:', reportStartDate, reportEndDate)
      return []
    }

    if (startDate > endDate) {
      console.error('Start date cannot be after end date')
      return []
    }

    // Use actual database balances from supabaseAccounts
    return supabaseAccounts.map(account => {
      return {
        account,
        balance: account.balance // Use actual database balance
      }
    }).filter(account => account.balance > 0) // Only include accounts with positive balance
      .sort((a, b) => b.balance - a.balance) // Sort by balance descending
  }

  // Get Transaction Report Data - Khatabook Style
  const getTransactionReportData = () => {
    if (!reportStartDate || !reportEndDate) return []

    // Validate date range
    const startDate = new Date(reportStartDate)
    const endDate = new Date(reportEndDate)

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.error('Invalid date range:', reportStartDate, reportEndDate)
      return []
    }

    if (startDate > endDate) {
      console.error('Start date cannot be after end date')
      return []
    }

    // Collect all transactions from all customers
    const allTransactions = customerData.flatMap(customer =>
      customer.transactions
        .filter(transaction => {
          const transactionDate = new Date(transaction.date)
          return transactionDate >= startDate && transactionDate <= endDate
        })
        .map(transaction => {
          let notes = transaction.notes || transaction.description

          if (transaction.type === 'sale') {
            // Find corresponding sale and use its notes
            const correspondingSale = salesData.find(sale =>
              sale.customer === customer.name &&
              sale.date === transaction.date &&
              sale.location === transaction.location &&
              sale.bags === transaction.bags
            )
            if (correspondingSale && correspondingSale.notes) {
              notes = correspondingSale.notes
            }
          }

          return {
            id: transaction.id,
            date: transaction.date,
            name: customer.name,
            notes,
            type: transaction.type,
            amount: transaction.amount,
            bags: transaction.bags,
            subCategory: transaction.subCategory,
            location: transaction.location
          }
        })
    )

    // Sort by date (newest first)
    return allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  const getPurchaseCardStyle = (supplier: string, category?: string): { bg: string; text: string; border: string } => {
    const key = `${supplier}-${category || "Direct"}`

    const styleMap: Record<string, { bg: string; text: string; border: string }> = {
      // JSW variants
      "JSW-Direct": { bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-200" },
      "JSW-G.V": { bg: "bg-blue-100", text: "text-blue-900", border: "border-blue-300" },
      "JSW-G.L": { bg: "bg-blue-200", text: "text-blue-900", border: "border-blue-400" },

      // Ultra Tech variants
      "Ultra Tech-Direct": { bg: "bg-green-50", text: "text-green-800", border: "border-green-200" },
      "Ultra Tech-G.V": { bg: "bg-green-100", text: "text-green-900", border: "border-green-300" },
      "Ultra Tech-G.L": { bg: "bg-green-200", text: "text-green-900", border: "border-green-400" },

      // Sri Cement variants
      "Sri Cement-Direct": { bg: "bg-purple-50", text: "text-purple-800", border: "border-purple-200" },
      "Sri Cement-G.V": { bg: "bg-purple-100", text: "text-purple-900", border: "border-purple-300" },
      "Sri Cement-G.L": { bg: "bg-purple-200", text: "text-purple-900", border: "border-purple-400" },

      // Additional cement brands
      "Ambuja Cement-Direct": { bg: "bg-orange-50", text: "text-orange-800", border: "border-orange-200" },
      "Ambuja Cement-G.V": { bg: "bg-orange-100", text: "text-orange-900", border: "border-orange-300" },
      "Ambuja Cement-G.L": { bg: "bg-orange-200", text: "text-orange-900", border: "border-orange-400" },

      "ACC Cement-Direct": { bg: "bg-red-50", text: "text-red-800", border: "border-red-200" },
      "ACC Cement-G.V": { bg: "bg-red-100", text: "text-red-900", border: "border-red-300" },
      "ACC Cement-G.L": { bg: "bg-red-200", text: "text-red-900", border: "border-red-400" },

      "Birla Cement-Direct": { bg: "bg-yellow-50", text: "text-yellow-800", border: "border-yellow-200" },
      "Birla Cement-G.V": { bg: "bg-yellow-100", text: "text-yellow-900", border: "border-yellow-300" },
      "Birla Cement-G.L": { bg: "bg-yellow-200", text: "text-yellow-900", border: "border-yellow-400" },

      // Paint brands
      "Asian Paints-Direct": { bg: "bg-pink-50", text: "text-pink-800", border: "border-pink-200" },
      "Asian Paints-G.V": { bg: "bg-pink-100", text: "text-pink-900", border: "border-pink-300" },
      "Asian Paints-G.L": { bg: "bg-pink-200", text: "text-pink-900", border: "border-pink-400" },

      "Berger Paints-Direct": { bg: "bg-indigo-50", text: "text-indigo-800", border: "border-indigo-200" },
      "Berger Paints-G.V": { bg: "bg-indigo-100", text: "text-indigo-900", border: "border-indigo-300" },
      "Berger Paints-G.L": { bg: "bg-indigo-200", text: "text-indigo-900", border: "border-indigo-400" },

      // Steel brands
      "Tata Steel-Direct": { bg: "bg-slate-50", text: "text-slate-800", border: "border-slate-200" },
      "Tata Steel-G.V": { bg: "bg-slate-100", text: "text-slate-900", border: "border-slate-300" },
      "Tata Steel-G.L": { bg: "bg-slate-200", text: "text-slate-900", border: "border-slate-400" },

      "JSW Steel-Direct": { bg: "bg-cyan-50", text: "text-cyan-800", border: "border-cyan-200" },
      "JSW Steel-G.V": { bg: "bg-cyan-100", text: "text-cyan-900", border: "border-cyan-300" },
      "JSW Steel-G.L": { bg: "bg-cyan-200", text: "text-cyan-900", border: "border-cyan-400" },
    }

    return styleMap[key] || { bg: "bg-gray-50", text: "text-gray-800", border: "border-gray-200" }
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-blue-600">AR MANAGER</CardTitle>
            <p className="text-muted-foreground">Sign in to your account</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" placeholder="Enter your username" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="Enter your password" />
            </div>
            <Button onClick={() => setIsLoggedIn(true)} className="w-full">
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div className={`fixed top-0 left-0 h-full w-80 bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-50 md:hidden ${
        isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">AR MANAGER</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMobileSidebarOpen(false)}
            className="p-2"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Sidebar Navigation */}
        <nav className="p-4 space-y-2">
          <Button
            variant={activeTab === "dashboard" ? "default" : "ghost"}
            className="w-full justify-start gap-3 h-12 text-left"
            onClick={() => {
              setActiveTab("dashboard")
              setIsMobileSidebarOpen(false)
            }}
          >
            <BarChart3 className="h-5 w-5" />
            <span className="font-medium">Dashboard</span>
          </Button>

          <Button
            variant={activeTab === "sales" ? "default" : "ghost"}
            className="w-full justify-start gap-3 h-12 text-left"
            onClick={() => {
              setActiveTab("sales")
              setIsMobileSidebarOpen(false)
            }}
          >
            <ShoppingCart className="h-5 w-5" />
            <span className="font-medium">Sales</span>
          </Button>

          <Button
            variant={activeTab === "customers" ? "default" : "ghost"}
            className="w-full justify-start gap-3 h-12 text-left"
            onClick={() => {
              setActiveTab("customers")
              setIsMobileSidebarOpen(false)
            }}
          >
            <Users className="h-5 w-5" />
            <span className="font-medium">Customers</span>
          </Button>

          <Button
            variant={activeTab === "payments" ? "default" : "ghost"}
            className="w-full justify-start gap-3 h-12 text-left"
            onClick={() => {
              setActiveTab("payments")
              setIsMobileSidebarOpen(false)
            }}
          >
            <CreditCard className="h-5 w-5" />
            <span className="font-medium">Payments</span>
          </Button>

          <Button
            variant={activeTab === "products" ? "default" : "ghost"}
            className="w-full justify-start gap-3 h-12 text-left"
            onClick={() => {
              setActiveTab("products")
              setIsMobileSidebarOpen(false)
            }}
          >
            <Package className="h-5 w-5" />
            <span className="font-medium">Products</span>
          </Button>

          <Button
            variant={activeTab === "reports" ? "default" : "ghost"}
            className="w-full justify-start gap-3 h-12 text-left"
            onClick={() => {
              setActiveTab("reports")
              setIsMobileSidebarOpen(false)
            }}
          >
            <Download className="h-5 w-5" />
            <span className="font-medium">Reports</span>
          </Button>

          <Button
            variant={activeTab === "settings" ? "default" : "ghost"}
            className="w-full justify-start gap-3 h-12 text-left"
            onClick={() => {
              setActiveTab("settings")
              setIsMobileSidebarOpen(false)
            }}
          >
            <Settings className="h-5 w-5" />
            <span className="font-medium">Settings</span>
          </Button>
        </nav>

        {/* Sidebar Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="text-center">
            <p className="text-xs text-gray-500">A.R. Enterprises</p>
            <p className="text-xs text-gray-400">Cement Business Management</p>
          </div>
        </div>
      </div>

      <div className="border-b bg-white shadow-sm">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden p-2"
            >
              <Menu className="h-6 w-6" />
            </Button>
            <h1 className="text-2xl font-bold text-blue-600">AR MANAGER</h1>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline">{userRole === "admin" ? "Admin" : "Employee"}</Badge>
            <Button variant="outline" onClick={() => setIsLoggedIn(false)}>
              Logout
            </Button>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="border-b bg-white hidden md:block">
          <TabsList className="grid w-full grid-cols-8 h-auto p-1">
            <TabsTrigger value="dashboard" className="flex items-center gap-2 p-3">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="stocks" className="flex items-center gap-2 p-3">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Stocks</span>
            </TabsTrigger>
            <TabsTrigger value="purchases" className="flex items-center gap-2 p-3">
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">Purchases</span>
            </TabsTrigger>
            <TabsTrigger value="sales" className="flex items-center gap-2 p-3">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Sales</span>
            </TabsTrigger>
            <TabsTrigger value="customers" className="flex items-center gap-2 p-3">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Customers</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2 p-3">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Payments</span>
            </TabsTrigger>

            <TabsTrigger value="products" className="flex items-center gap-2 p-3">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Products</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2 p-3">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Reports</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2 p-3">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Payment Dialog - Moved outside tabs so it works from both sales and customers tabs */}
        <Dialog open={showPaymentDialog} onOpenChange={(value) => {
          setShowPaymentDialog(value)
          if (value) {
            // Reset payment form
            setPaymentCustomer("")
            setPaymentAmount("")
            setPaymentAccount("")
            setPaymentDate("")
            setPaymentMethod("")
            setPaymentNotes("")
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Payment {selectedCustomer ? `for ${selectedCustomer.name}` : ''}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {!selectedCustomer && (
                <div>
                  <Label htmlFor="paymentCustomer">Select Customer</Label>
                  <Select
                    value={paymentCustomer}
                    onValueChange={setPaymentCustomer}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customerData.map((customer) => (
                        <SelectItem key={customer.name} value={customer.name}>
                          {customer.name} {customer.balance > 0 ? `(Owes ₹${Math.abs(customer.balance).toLocaleString()})` : customer.balance < 0 ? `(Advance ₹${Math.abs(customer.balance).toLocaleString()})` : '(Settled)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label htmlFor="paymentAmount">Payment Amount (₹)</Label>
                <Input
                  id="paymentAmount"
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter payment amount"
                />
              </div>
              <div>
                <Label htmlFor="paymentAccount">Account</Label>
                <Select
                  value={paymentAccount}
                  onValueChange={setPaymentAccount}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {supabaseAccounts?.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="paymentDate">Payment Date</Label>
                <Input
                  id="paymentDate"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  placeholder="DD-MM-YY"
                  className="placeholder:text-gray-500 md:placeholder:text-transparent"
                />
              </div>
              <div>
                <Label htmlFor="paymentMethod">Payment Method (Optional)</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(value) => setPaymentMethod(value as "" | "Cash" | "Online")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Online">Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="paymentNotes">Notes (Optional)</Label>
                <Input
                  id="paymentNotes"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Enter payment notes..."
                />
              </div>
              {paymentAmount && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-800">
                    Payment Amount: ₹{Number.parseFloat(paymentAmount).toLocaleString()}
                  </p>
                  {paymentAccount && (
                    <p className="text-xs text-green-600 mt-1">
                      Account: {getAccountName(paymentAccount)}
                    </p>
                  )}
                  {paymentCustomer && !selectedCustomer && (
                    <p className="text-xs text-green-600 mt-1">
                      Customer: {paymentCustomer}
                    </p>
                  )}
                </div>
              )}
                        <Button
                          onClick={async () => {
                            const customerToRecord = selectedCustomer?.name || paymentCustomer
                            if (customerToRecord && paymentAmount && paymentAccount) {
                              try {
                                const amount = Number.parseFloat(paymentAmount)
                                const txDate = paymentDate || new Date().toISOString().split("T")[0]

                                // Find customer ID by name
                                const customer = supabaseCustomers.find(c => c.name === customerToRecord)
                                if (!customer) {
                                  alert('Customer not found')
                                  return
                                }

                                // Record payment in database - this will automatically update balances via database triggers
                                await recordCustomerPayment(
                                  customer.id,
                                  amount,
                                  paymentAccount,
                                  paymentMethod !== "" ? paymentMethod : undefined,
                                  paymentNotes.trim() || undefined
                                )

                                // Refresh data to show updated balances and transactions
                                await refreshPayments()
                                await refreshCustomers()

                                // Update the local selectedCustomer state to reflect new balance
                                if (selectedCustomer?.name === customerToRecord) {
                                  const updatedCustomer = supabaseCustomers.find(c => c.name === customerToRecord)
                                  if (updatedCustomer) {
                                    setSelectedCustomer({
                                      name: updatedCustomer.name,
                                      phone: updatedCustomer.phone || "",
                                      category: updatedCustomer.category || "",
                                      balance: updatedCustomer.balance,
                                      transactions: (updatedCustomer.transactions || []).map((t: any) => ({
                                        id: t.id,
                                        type: t.type,
                                        date: t.date,
                                        amount: t.amount,
                                        bags: t.quantity || t.bags,
                                        location: t.location,
                                        description: t.description || `${t.type} - ${t.amount}`,
                                        account: t.account_id,
                                        subCategory: t.sub_category,
                                        notes: t.notes
                                      }))
                                    })
                                  }
                                }

                                // Clear form
                                setPaymentAmount("")
                                setPaymentAccount("")
                                setPaymentCustomer("")
                                setPaymentDate("")
                                setPaymentMethod("")
                                setPaymentNotes("")
                                setShowPaymentDialog(false)

                                console.log('✅ Payment recorded successfully in database')
                              } catch (error: any) {
                                console.error('❌ Error recording payment:', error)
                                alert('Failed to record payment: ' + (error.message || 'Unknown error'))
                              }
                            }
                          }}
                          className="w-full"
                          disabled={!((selectedCustomer?.name || paymentCustomer) && paymentAmount && paymentAccount)}
                        >
                Record Payment
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <TabsContent value="dashboard" className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
            <h2 className="text-xl sm:text-2xl font-bold">Dashboard</h2>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <DateInputWithIcon
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                placeholder="DD-MM-YY"
                className="w-full sm:w-auto placeholder:text-gray-500 md:placeholder:text-transparent text-sm h-9"
              />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowSalesTrend(true)} size="sm" className="flex-1 sm:flex-none">
                  <TrendingUp className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Sales Trend</span>
                  <span className="sm:hidden">Trend</span>
                </Button>
                <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                  <Download className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Export</span>
                  <span className="sm:hidden">Export</span>
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Stock</p>
                    <p className="text-2xl font-bold">
                      {getFilteredData(stockData, dateFilter, "date").reduce((sum, stock) => sum + stock.quantity, 0)}{" "}
                      bags
                    </p>
                  </div>
                  <Package className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setShowOutstandingBalances(true)}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Outstanding Balance</p>
                    <p className="text-2xl font-bold text-red-500">
                      ₹{customerData.reduce((sum, customer) => sum + customer.balance, 0).toLocaleString()}
                    </p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setShowRemindersList(true)}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Payment Reminders</p>
                    <p className="text-2xl font-bold text-orange-500">
                      {supabaseReminders.filter(r => r.status === "active").length}
                    </p>
                  </div>
                  <Calendar className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setShowSalesHistory(true)}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Sales</p>
                    <p className="text-2xl font-bold text-green-500">
                      ₹
                      {getFilteredData(salesData, dateFilter, "date")
                        .reduce((sum, sale) => sum + sale.total, 0)
                        .toLocaleString()}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Customers</p>
                    <p className="text-2xl font-bold">{customerData.length}</p>
                  </div>
                  <Users className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Reminders Section */}
          {supabaseReminders.filter(r => r.status === "active").length > 0 && (
            <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-orange-800">
                    <AlertTriangle className="h-5 w-5" />
                    Payment Reminders
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowReminderDialog(true)}
                      className="border-orange-300 text-orange-700 hover:bg-orange-100"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowRemindersList(true)}
                      className="border-orange-300 text-orange-700 hover:bg-orange-100"
                    >
                      View All
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Today's Reminders */}
                  {(() => {
                    const today = new Date().toISOString().split('T')[0]
                    const todaysReminders = supabaseReminders.filter(r =>
                      r.status === "active" && r.reminder_date === today
                    )
                    if (todaysReminders.length > 0) {
                      return (
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold text-red-700 flex items-center gap-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            Today's Reminders ({todaysReminders.length})
                          </h4>
                          <div className="space-y-2">
                            {todaysReminders.slice(0, 3).map((reminder) => (
                              <div key={reminder.id} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                                <div className="flex-1">
                                  <p className="font-medium text-sm text-red-900">{reminder.customer?.name || 'Unknown'}</p>
                                  <p className="text-xs text-red-700">₹{reminder.amount.toLocaleString()} - {reminder.notes || 'Payment reminder'}</p>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={async () => {
                                    try {
                                      await updateReminder(reminder.id, { status: 'completed' })
                                      await refreshReminders()
                                    } catch (error) {
                                      console.error('Failed to update reminder:', error)
                                    }
                                  }}
                                  className="text-green-600 border-green-600 hover:bg-green-50"
                                >
                                  Done
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    }
                    return null
                  })()}

                  {/* Overdue Reminders */}
                  {(() => {
                    const today = new Date().toISOString().split('T')[0]
                    const overdueReminders = supabaseReminders.filter(r =>
                      r.status === "active" && r.reminder_date < today
                    )
                    if (overdueReminders.length > 0) {
                      return (
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold text-red-700 flex items-center gap-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            Overdue ({overdueReminders.length})
                          </h4>
                          <div className="space-y-2">
                            {overdueReminders.slice(0, 2).map((reminder) => (
                              <div key={reminder.id} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                                <div className="flex-1">
                                  <p className="font-medium text-sm text-red-900">{reminder.customer?.name || 'Unknown'}</p>
                                  <p className="text-xs text-red-700">₹{reminder.amount.toLocaleString()} - Due: {new Date(reminder.reminder_date).toLocaleDateString('en-IN')}</p>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={async () => {
                                    try {
                                      await updateReminder(reminder.id, { status: 'completed' })
                                      await refreshReminders()
                                    } catch (error) {
                                      console.error('Failed to update reminder:', error)
                                    }
                                  }}
                                  className="text-green-600 border-green-600 hover:bg-green-50"
                                >
                                  Done
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    }
                    return null
                  })()}

                  {/* Upcoming Reminders */}
                  {(() => {
                    const today = new Date()
                    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
                    const upcomingReminders = supabaseReminders.filter(r => {
                      if (r.status !== "active") return false
                      const reminderDate = new Date(r.reminder_date)
                      return reminderDate >= today && reminderDate <= nextWeek
                    })
                    if (upcomingReminders.length > 0) {
                      return (
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold text-orange-700 flex items-center gap-2">
                            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                            Upcoming (Next 7 days) ({upcomingReminders.length})
                          </h4>
                          <div className="space-y-2">
                            {upcomingReminders.slice(0, 3).map((reminder) => (
                              <div key={reminder.id} className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
                                <div className="flex-1">
                                  <p className="font-medium text-sm text-orange-900">{reminder.customer?.name || 'Unknown'}</p>
                                  <p className="text-xs text-orange-700">₹{reminder.amount.toLocaleString()} - {new Date(reminder.reminder_date).toLocaleDateString('en-IN')}</p>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={async () => {
                                    try {
                                      await updateReminder(reminder.id, { status: 'completed' })
                                      await refreshReminders()
                                    } catch (error) {
                                      console.error('Failed to update reminder:', error)
                                    }
                                  }}
                                  className="text-green-600 border-green-600 hover:bg-green-50"
                                >
                                  Done
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    }
                    return null
                  })()}

                  {/* Quick Actions */}
                  <div className="flex gap-2 pt-2 border-t border-orange-200">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const activeReminders = supabaseReminders.filter(r => r.status === "active")
                        if (activeReminders.length === 0) {
                          alert("No active reminders to mark as completed")
                          return
                        }
                        if (window.confirm(`Mark all ${activeReminders.length} active reminders as completed?`)) {
                          try {
                            for (const reminder of activeReminders) {
                              await updateReminder(reminder.id, { status: 'completed' })
                            }
                            await refreshReminders()
                          } catch (error) {
                            console.error('Failed to update reminders:', error)
                          }
                        }
                      }}
                      className="text-green-600 border-green-600 hover:bg-green-50"
                    >
                      Mark All Complete
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowRemindersList(true)}
                      className="text-blue-600 border-blue-600 hover:bg-blue-50"
                    >
                      View All Reminders
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Dialog open={showOutstandingBalances} onOpenChange={setShowOutstandingBalances}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Customers with Outstanding Balance</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {getCustomersWithBalance().map((customer) => (
                  <div key={customer.name} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{customer.name}</p>
                      <p className="text-sm text-muted-foreground">{customer.phone}</p>
                      <p className="text-sm text-muted-foreground">{customer.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-red-500">₹{customer.balance.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showSalesHistory} onOpenChange={setShowSalesHistory}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Sales History</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <DateInputWithIcon
                    value={salesDateFilter}
                    onChange={(e) => setSalesDateFilter(e.target.value)}
                    placeholder="DD-MM-YY"
                    className="placeholder:text-gray-500 md:placeholder:text-transparent"
                  />
                  <Button variant="outline" onClick={() => setSalesDateFilter("")}>
                    Clear Filter
                  </Button>
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {getFilteredData(salesData, salesDateFilter, "date")
                    .filter((sale) => sale.location !== "none")
                    .map((sale, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">{sale.customer}</p>
                          <p className="text-sm text-muted-foreground">
                            {sale.location} • {sale.bags}/₹{Math.round(sale.total / sale.bags)}
                          </p>
                          <p className="text-sm text-muted-foreground">{sale.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-500">₹{sale.total.toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showSalesTrend} onOpenChange={setShowSalesTrend}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Sales Trend Over Time</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={getSalesTrendData()}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Line type="monotone" dataKey="sales" stroke="#3b82f6" name="Sales (₹)" />
                          <Line type="monotone" dataKey="bags" stroke="#10b981" name="Bags Sold" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="stocks" className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
            <h2 className="text-xl sm:text-2xl font-bold">Stock Overview</h2>
            <div className="flex gap-1 sm:gap-2">
              <Dialog open={showAddStock} onOpenChange={setShowAddStock}>
                <DialogTrigger asChild>
                  <Button size="sm" className="text-xs px-2 h-8">
                    <Plus className="h-3 w-3 mr-1" />
                    Add Stock
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Stock to Shop</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="location">Choose Shop</Label>
                      <Select
                        value={addStockForm.location}
                        onValueChange={(value) => setAddStockForm({ ...addStockForm, location: value })}
                      >
                        <SelectTrigger>
                        
                          <SelectValue placeholder="Select shop to add stock" />
                        </SelectTrigger>
                        <SelectContent>    
                          {stockData.map((stock) => (
                            <SelectItem key={stock.location} value={stock.location}>
                              {stock.location} (Current: {stock.quantity} bags)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="quantity">Quantity to Add (bags)</Label>
                      <Input
                        id="quantity"
                        type="number"
                        value={addStockForm.quantity}
                        onChange={(e) => setAddStockForm({ ...addStockForm, quantity: e.target.value })}
                        placeholder="Enter quantity to add"
                      />
                    </div>
                    <div>
                      <Label htmlFor="stockDate">Date</Label>
                    <Input
                      id="stockDate"
                      type="date"
                      value={addStockForm.date}
                      onChange={(e) => setAddStockForm({ ...addStockForm, date: e.target.value })}
                      placeholder="DD-MM-YY"
                      className="placeholder:text-gray-500 md:placeholder:text-transparent"
                    />
                    </div>
                    {addStockForm.location && addStockForm.quantity && (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium">
                          New Total:{" "}
                          {(stockData.find((s) => s.location === addStockForm.location)?.quantity || 0) +
                            Number.parseInt(addStockForm.quantity) || 0}{" "}
                          bags
                        </p>
                      </div>
                    )}
                    <Button onClick={handleAddStock} className="w-full">
                      Add Stock
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={showTransferStock} onOpenChange={setShowTransferStock}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-xs px-2 h-8">
                    Transfer Stock
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Transfer Stock</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="from">From Location</Label>
                      <Select
                        value={transferStockForm.from}
                        onValueChange={(value) => setTransferStockForm({ ...transferStockForm, from: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select source location" />
                        </SelectTrigger>
                        <SelectContent>
                          {stockData.map((stock) => (
                            <SelectItem key={stock.location} value={stock.location}>
                              {stock.location} ({stock.quantity} bags)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="to">To Location</Label>
                      <Select
                        value={transferStockForm.to}
                        onValueChange={(value) => setTransferStockForm({ ...transferStockForm, to: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select destination location" />
                        </SelectTrigger>
                        <SelectContent>
                          {stockData
                            .filter((stock) => stock.location !== transferStockForm.from)
                            .map((stock) => (
                              <SelectItem key={stock.location} value={stock.location}>
                                {stock.location} ({stock.quantity} bags)
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="transferQuantity">Quantity to Transfer</Label>
                      <Input
                        id="transferQuantity"
                        type="number"
                        value={transferStockForm.quantity}
                        onChange={(e) => setTransferStockForm({ ...transferStockForm, quantity: e.target.value })}
                        placeholder="Enter quantity"
                      />
                    </div>
                    <Button onClick={handleTransferStock} className="w-full">
                      Transfer Stock
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={showAddShop} onOpenChange={setShowAddShop}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-xs px-2 h-8">
                    Add Shop
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Shop</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="shopName">Shop Name</Label>
                      <Input
                        id="shopName"
                        value={addShopForm.name}
                        onChange={(e) => setAddShopForm({ ...addShopForm, name: e.target.value })}
                        placeholder="e.g., Shop 3"
                      />
                    </div>
                    <div>
                      <Label htmlFor="shopQty">Initial Quantity (bags)</Label>
                      <Input
                        id="shopQty"
                        type="number"
                        value={addShopForm.quantity}
                        onChange={(e) => setAddShopForm({ ...addShopForm, quantity: e.target.value })}
                        placeholder="e.g., 100"
                      />
                    </div>
                    <div>
                      <Label htmlFor="shopThreshold">Threshold (bags)</Label>
                      <Input
                        id="shopThreshold"
                        type="number"
                        value={addShopForm.threshold}
                        onChange={(e) => setAddShopForm({ ...addShopForm, threshold: e.target.value })}
                        placeholder="e.g., 100"
                      />
                    </div>
                    <Button onClick={handleAddShop} className="w-full">
                      Save Shop
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-6">
            {stockData.map((stock) => (
              <Card
                key={stock.location}
                className={`cursor-pointer hover:shadow-md transition-shadow p-2 md:p-6 ${stock.status === "low" ? "border-destructive" : ""}`}
                onClick={() => {
                  setSelectedShop(stock.location)
                  setShopDateFilter("")
                  setShowShopDetails(true)
                }}
              >
                <div className="flex flex-row items-center justify-between mb-1">
                  <h3 className="text-xs font-medium truncate">{stock.location}</h3>
                  {stock.status === "low" && <AlertTriangle className="h-2.5 w-2.5 md:h-4 md:w-4 text-destructive flex-shrink-0" />}
                </div>
                <div className="space-y-0.5">
                  <div className="text-sm md:text-2xl font-bold">{stock.quantity} bags</div>
                  <p className="text-xs text-muted-foreground">Threshold: {stock.threshold} bags</p>
                  <Badge variant={stock.status === "low" ? "destructive" : "default"} className="text-xs px-1 py-0">
                    {stock.status === "low" ? "Low Stock" : "Normal"}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>

          <Dialog open={showShopDetails} onOpenChange={setShowShopDetails}>
            <DialogContent className="max-w-xs md:max-w-md w-[85vw] md:w-[60vw] max-h-[40vh] md:max-h-[50vh] overflow-y-auto">
              <DialogHeader className="pb-2 md:pb-4">
                <DialogTitle className="text-base md:text-lg">{selectedShop ? `${selectedShop} — Transactions` : "Shop Transactions"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 md:space-y-4">
                <div className="flex gap-1 md:gap-2">
                  <DateInputWithIcon
                    value={shopDateFilter}
                    onChange={(e) => setShopDateFilter(e.target.value)}
                    placeholder="DD-MM-YY"
                    className="placeholder:text-gray-500 md:placeholder:text-transparent text-sm h-8"
                  />
                  <Button variant="outline" onClick={() => setShopDateFilter("")} size="sm" className="text-xs px-2 h-8">
                    Clear
                  </Button>
                </div>

                {/* Sales at this shop */}
                <div className="space-y-1 md:space-y-2 max-h-64 md:max-h-96 overflow-y-auto">
                  {salesData
                    .filter((s) => (selectedShop ? s.location === selectedShop : true))
                    .filter((s) => !shopDateFilter || s.date === shopDateFilter)
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((sale, index) => (
                      <div
                        key={`${sale.customer}-${sale.date}-${index}`}
                        className="flex items-center justify-between p-2 md:p-4 border rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm md:text-base truncate">{sale.customer}</p>
                          <p className="text-xs md:text-sm text-muted-foreground">
                            {sale.location} • {sale.bags} bags
                          </p>
                          <p className="text-xs text-muted-foreground">{sale.date}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-semibold text-green-500 text-sm md:text-base">₹{sale.total.toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                </div>

                {selectedShop && !/company/i.test(selectedShop) && (
                  <div className="space-y-1 md:space-y-2 max-h-64 md:max-h-96 overflow-y-auto">
                    {stockLoadEvents
                      .filter((e) => e.location === selectedShop)
                      .filter((e) => !shopDateFilter || e.date === shopDateFilter)
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((ev, idx) => (
                        <div
                          key={`${ev.location}-${ev.date}-${idx}`}
                          className="flex items-center justify-between p-2 md:p-4 border rounded-lg"
                        >
                          {ev.type === "dump" ? (
                            <div className={`flex-1 p-2 md:p-3 border rounded-lg ${getPurchaseCardStyle(ev.brand || "Unknown", ev.category).bg} ${getPurchaseCardStyle(ev.brand || "Unknown", ev.category).border}`}>
                              <div className="flex items-center gap-1 md:gap-2 mb-1">
                                <Badge variant="outline" className="text-xs font-bold px-1 md:px-2 py-0">
                                  {ev.brand || "Unknown"} {ev.category || "Direct"}
                                </Badge>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1 md:gap-2">
                                  <p className="font-medium text-xs md:text-sm">{ev.quantity} bags</p>
                                  <p className="text-xs text-muted-foreground">{ev.date}</p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <p className="font-semibold text-green-600 text-xs md:text-sm">{ev.quantity}</p>
                                  <p className="text-xs text-muted-foreground font-medium">total bags</p>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex-1">
                              <p className="font-medium text-sm md:text-base">Stock Loaded</p>
                              <p className="text-xs md:text-sm text-muted-foreground">
                                {ev.location} • {ev.quantity} bags
                              </p>
                              <p className="text-xs text-muted-foreground">{ev.date}</p>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="sales" className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
            <h2 className="text-xl sm:text-2xl font-bold">Sales</h2>
            <div className="flex gap-1 sm:gap-2">
              <Input
                type="date"
                value={salesDateFilter}
                onChange={(e) => setSalesDateFilter(e.target.value)}
                placeholder="DD-MM-YY"
                className="w-auto text-sm h-8 placeholder:text-gray-500 md:placeholder:text-transparent"
              />
              <Button variant="outline" onClick={() => setSalesDateFilter("")} size="sm" className="text-xs px-2 h-8">
                Clear
              </Button>
              <Dialog open={showPaymentDialog} onOpenChange={(value) => {
                setShowPaymentDialog(value)
                if (value) {
                  // Reset payment form for sales module
                  setPaymentCustomer("")
                  setPaymentAmount("")
                  setPaymentAccount("")
                  setPaymentDate("")
                  setPaymentMethod("")
                  setPaymentNotes("")
                }
              }}>
                <DialogTrigger asChild>
                  <Button size="sm" className="text-xs px-2 h-8">
                    <CreditCard className="h-3 w-3 mr-1" />
                    Record Payment
                  </Button>
                </DialogTrigger>
              </Dialog>
              <Dialog open={showAddSale} onOpenChange={setShowAddSale}>
                <DialogTrigger asChild>
                  <Button size="sm" className="text-xs px-2 h-8">
                    <Plus className="h-3 w-3 mr-1" />
                    Add Sale
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Sale</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="customer">Customer</Label>
                      <Select
                        value={addSaleForm.customer}
                        onValueChange={(value) => setAddSaleForm({ ...addSaleForm, customer: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select customer" />
                        </SelectTrigger>
                        <SelectContent>
                          {customerData.map((customer) => (
                            <SelectItem key={customer.name} value={customer.name}>
                              {customer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="saleLocation">Location</Label>
                      <Select
                        value={addSaleForm.location}
                        onValueChange={(value) => setAddSaleForm({ ...addSaleForm, location: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select location" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {stockData.map((stock) => (
                            <SelectItem key={stock.location} value={stock.location}>
                              {stock.location} ({stock.quantity} bags available)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="saleProductType">Product Type (Optional)</Label>
                      <Select
                        value={addSaleForm.productType}
                        onValueChange={(value) => setAddSaleForm({ ...addSaleForm, productType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select product type (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {productTypes.map((productType) => (
                            <SelectItem key={productType.name} value={productType.name}>
                              {productType.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="saleSubCategory">Sub-Category (Optional)</Label>
                      <Select
                        value={addSaleForm.subCategory}
                        onValueChange={(value) => setAddSaleForm({ ...addSaleForm, subCategory: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select sub-category (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="Direct">Direct</SelectItem>
                          <SelectItem value="G.V">G.V</SelectItem>
                          <SelectItem value="G.L">G.L</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="quantity">Quantity</Label>
                      <div className="flex gap-2">
                        <Input
                          id="quantity"
                          type="number"
                          value={addSaleForm.quantity}
                          onChange={(e) => setAddSaleForm({ ...addSaleForm, quantity: e.target.value })}
                          placeholder="Enter quantity"
                          className="flex-1"
                        />
                        <Select
                          value={addSaleForm.unit}
                          onValueChange={(value) => setAddSaleForm({ ...addSaleForm, unit: value })}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bags">bags</SelectItem>
                            <SelectItem value="liters">liters</SelectItem>
                            <SelectItem value="kg">kg</SelectItem>
                            <SelectItem value="ton">ton</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="pricePerUnit">Price per {addSaleForm.unit} (₹)</Label>
                      <Input
                        id="pricePerUnit"
                        type="number"
                        value={addSaleForm.pricePerUnit}
                        onChange={(e) => setAddSaleForm({ ...addSaleForm, pricePerUnit: e.target.value })}
                        placeholder={`Enter price per ${addSaleForm.unit}`}
                      />
                    </div>
                    <div>
                      <Label htmlFor="originalPrice">Original Price (₹)</Label>
                      <Input
                        id="originalPrice"
                        type="number"
                        value={addSaleForm.originalPrice}
                        onChange={(e) => setAddSaleForm({ ...addSaleForm, originalPrice: e.target.value })}
                        placeholder="Enter original price"
                      />
                    </div>
                    <div>
                      <Label htmlFor="saleDate">Date</Label>
                      <Input
                        id="saleDate"
                        type="date"
                        value={addSaleForm.date}
                        onChange={(e) => setAddSaleForm({ ...addSaleForm, date: e.target.value })}
                        placeholder="DD-MM-YY"
                        className="placeholder:text-gray-500 md:placeholder:text-transparent"
                      />
                    </div>
                    <div>
                      <Label htmlFor="saleNotes">Notes (Optional)</Label>
                      <Input
                        id="saleNotes"
                        value={addSaleForm.notes}
                        onChange={(e) => setAddSaleForm({ ...addSaleForm, notes: e.target.value })}
                        placeholder="Enter sale notes..."
                      />
                    </div>
                    {addSaleForm.quantity && addSaleForm.pricePerUnit && (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium">
                          Total: ₹
                          {(
                            Number.parseInt(addSaleForm.quantity) * Number.parseFloat(addSaleForm.pricePerUnit)
                          ).toLocaleString()}
                        </p>
                      </div>
                    )}
                    <Button onClick={handleAddSale} className="w-full">
                      Add Sale
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Sales Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={getSalesTrendData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={3} name="Sales (₹)" />
                    <Line type="monotone" dataKey="bags" stroke="#10b981" strokeWidth={3} name="Bags Sold" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Recent Sales
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Enhanced Filters */}
              <div className="space-y-3 mb-4 p-3 bg-muted/30 rounded-lg">
                {/* Quick Filter Buttons */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: "all", label: "All Time" },
                    { key: "today", label: "Today" },
                    { key: "week", label: "Last 7 Days" },
                    { key: "month", label: "This Month" },
                    { key: "quarter", label: "Last 3 Months" }
                  ].map(filter => (
                    <Button
                      key={filter.key}
                      variant={salesQuickFilter === filter.key ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSalesQuickFilter(filter.key as "all" | "today" | "week" | "month" | "quarter")}
                      className="text-xs h-8"
                    >
                      {filter.label}
                    </Button>
                  ))}
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Input
                    placeholder="Search sales by customer or location..."
                    value={salesSearchQuery}
                    onChange={(e) => setSalesSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-sm"
                  />
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                {/* Advanced Filters Toggle */}
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSalesShowAdvancedFilters(!salesShowAdvancedFilters)}
                    className="text-xs h-8 px-2"
                  >
                    {salesShowAdvancedFilters ? "Hide" : "Show"} Advanced Filters
                    <svg className={`ml-1 h-3 w-3 transition-transform ${salesShowAdvancedFilters ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearSalesFilters}
                    className="text-xs h-8 px-3"
                  >
                    Clear All
                  </Button>
                </div>

                {/* Advanced Filters Panel */}
                {salesShowAdvancedFilters && (
                  <div className="space-y-3 pt-3 border-t">
                    {/* Amount Range Filters */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Min Amount</Label>
                        <Input
                          type="number"
                          placeholder="₹0"
                          value={salesAmountMin}
                          onChange={(e) => setSalesAmountMin(e.target.value)}
                          className="mt-1 h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Max Amount</Label>
                        <Input
                          type="number"
                          placeholder="No limit"
                          value={salesAmountMax}
                          onChange={(e) => setSalesAmountMax(e.target.value)}
                          className="mt-1 h-8 text-sm"
                        />
                      </div>
                    </div>

                    {/* Date Range Filters */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">From Date</Label>
                        <DateInputWithIcon
                          value={salesStartDate}
                          onChange={(e) => setSalesStartDate(e.target.value)}
                          placeholder="DD-MM-YY"
                          className="mt-1 h-8 text-sm placeholder:text-gray-500 md:placeholder:text-transparent"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">To Date</Label>
                        <DateInputWithIcon
                          value={salesEndDate}
                          onChange={(e) => setSalesEndDate(e.target.value)}
                          placeholder="DD-MM-YY"
                          className="mt-1 h-8 text-sm placeholder:text-gray-500 md:placeholder:text-transparent"
                        />
                      </div>
                    </div>

                    {/* Customer Filter */}
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Customer</Label>
                      <Select value={salesCustomerFilter} onValueChange={setSalesCustomerFilter}>
                        <SelectTrigger className="mt-1 h-8 text-sm">
                          <SelectValue placeholder="All Customers" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Customers</SelectItem>
                          {[...new Set(salesData.map(sale => sale.customer))].map((customer) => (
                            <SelectItem key={customer} value={customer}>
                              {customer}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Location Filter */}
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Location</Label>
                      <Select value={salesLocationFilter} onValueChange={setSalesLocationFilter}>
                        <SelectTrigger className="mt-1 h-8 text-sm">
                          <SelectValue placeholder="All Locations" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Locations</SelectItem>
                          {[...new Set(salesData.map(sale => sale.location))].map((location) => (
                            <SelectItem key={location} value={location}>
                              {location}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Product Type Filter */}
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Product Type</Label>
                      <Select value={salesProductFilter || "all"} onValueChange={setSalesProductFilter}>
                        <SelectTrigger className="mt-1 h-8 text-sm">
                          <SelectValue placeholder="All Product Types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Product Types</SelectItem>
                          {[...new Set(salesData.map(sale => sale.subCategory).filter(Boolean))].map((productType) => (
                            <SelectItem key={productType} value={productType!}>
                              {productType}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>

              {/* Active Filters Summary */}
              {(salesSearchQuery || salesQuickFilter !== "all" || salesAmountMin || salesAmountMax || salesStartDate || salesEndDate || salesCustomerFilter !== "all" || salesLocationFilter !== "all") && (
                <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-blue-800">Active filters:</span>
                    {salesSearchQuery && (
                      <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                        Search: "{salesSearchQuery}"
                      </Badge>
                    )}
                    {salesQuickFilter !== "all" && (
                      <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                        Period: {salesQuickFilter === "today" ? "Today" : salesQuickFilter === "week" ? "Last 7 Days" : salesQuickFilter === "month" ? "This Month" : "Last 3 Months"}
                      </Badge>
                    )}
                    {(salesAmountMin || salesAmountMax) && (
                      <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                        Amount: ₹{salesAmountMin || "0"} - ₹{salesAmountMax || "∞"}
                      </Badge>
                    )}
                    {(salesStartDate || salesEndDate) && (
                      <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                        Date: {salesStartDate || "..."} - {salesEndDate || "..."}
                      </Badge>
                    )}
                    {salesCustomerFilter !== "all" && (
                      <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                        Customer: {salesCustomerFilter}
                      </Badge>
                    )}
                    {salesLocationFilter !== "all" && (
                      <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                        Location: {salesLocationFilter}
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Enhanced Sales Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                {getFilteredSales().map((sale, index) => (
                  <div
                    key={`${sale.customer}-${sale.date}-${Math.random()}`}
                    className="bg-white rounded-lg border-l-4 border-l-green-500 bg-gradient-to-r from-green-50 to-white p-2 sm:p-3 shadow-sm hover:shadow-md transition-all duration-200 relative"
                  >
                    {/* Delete and Edit Icons */}
                    <div className="absolute top-1 right-1 sm:top-2 sm:right-2 flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 sm:h-6 sm:w-6 p-0 hover:bg-blue-100"
                        onClick={() => {
                          // Store sale ID for editing
                          setEditingSaleId(sale.id)
                          setEditingSaleIndex(index)
                          const matchingTx = selectedCustomer?.transactions.find(t => t.type === 'sale' && t.amount === sale.total && t.date === sale.date)
                          if (matchingTx) setEditingCustomerTransactionId(matchingTx.id)
                          setAddSaleForm({
                            customer: sale.customer,
                            location: sale.location,
                            quantity: sale.bags?.toString() || "",
                            unit: sale.units,
                            pricePerUnit: Math.round(sale.total / (sale.bags || 1)).toString(),
                            originalPrice: "",
                            productType: "",
                            subCategory: sale.subCategory || "",
                            date: sale.date,
                            notes: sale.notes || ""
                          })
                          setShowAddSale(true)
                        }}
                      >
                        <svg className="h-3 w-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 sm:h-6 sm:w-6 p-0 hover:bg-red-100"
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete this sale to ${sale.customer}?`)) {
                            // Delete sale and restore stock
                            setSalesData(prev => prev.filter((_, i) => i !== index))

                            // Restore stock if location is not Direct/Company Goddam
                            if (sale.location !== "Direct" && sale.location !== "Company Goddam" && sale.location !== "none") {
                              setStockData(prev =>
                                prev.map((stock) => {
                                  if (stock.location === sale.location) {
                                    const newQty = stock.quantity + (sale.bags || 0)
                                    return { ...stock, quantity: newQty, status: newQty < stock.threshold ? "low" : "normal" }
                                  }
                                  return stock
                                }),
                              )
                            }

                            // Update customer balance
                            setCustomerData(prev =>
                              prev.map((customer) => {
                                if (customer.name === sale.customer) {
                                  return {
                                    ...customer,
                                    balance: customer.balance - sale.total,
                                    transactions: customer.transactions.filter(t =>
                                      !(t.type === "sale" && t.amount === sale.total && t.date === sale.date)
                                    ),
                                  }
                                }
                                return customer
                              }),
                            )
                          }
                        }}
                      >
                        <svg className="h-3 w-3 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </Button>
                    </div>

                        {/* Compact Header - All info in one row */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 mb-1">
                              <Badge className="text-xs px-1.5 py-0.5 bg-green-100 text-green-800">
                                Sale
                              </Badge>
                              {sale.location !== "none" && (
                                <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                                  {sale.location}
                                </Badge>
                              )}
                              {sale.subCategory && (
                                <Badge variant="secondary" className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-800">
                                  {sale.subCategory}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 truncate">{sale.date}</p>
                          </div>
                          <div className="text-right ml-2">
                            <p className="text-sm font-bold text-green-600">
                              +₹{sale.total.toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {/* Compact Content */}
                        <div className="space-y-1">
                          <p className="font-medium text-gray-900 text-xs leading-tight truncate">
                            Sale to {sale.customer}
                          </p>
                          {sale.bags && (
                            <div className="flex items-center justify-between text-xs text-gray-600">
                              <span>{sale.bags} {sale.units}</span>
                              <span>₹{Math.round(sale.total / sale.bags)}/{sale.units.slice(0, -1)}</span>
                            </div>
                          )}

                      {/* Compact Notes Section */}
                      <div className="flex items-center gap-1 mt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 hover:bg-gray-100"
                          onClick={() => {
                            const noteId = `sale-${sale.customer}-${sale.date}-${sale.total}`
                            setExpandedNotes(prev => {
                              const newSet = new Set(prev)
                              if (newSet.has(noteId)) {
                                newSet.delete(noteId)
                              } else {
                                newSet.add(noteId)
                              }
                              return newSet
                            })
                          }}
                        >
                          <svg className={`h-3 w-3 ${sale.notes ? 'text-blue-600 fill-current' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Button>
                        {sale.notes && (
                          <span className="text-xs text-blue-600 font-medium">Has notes</span>
                        )}
                      </div>

                          {/* Expanded Notes */}
                          {expandedNotes.has(`sale-${sale.customer}-${sale.date}-${sale.total}`) && (
                            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                              {editingNote === `sale-${sale.customer}-${sale.date}-${sale.total}` ? (
                                <div className="space-y-2">
                                  <Input
                                    value={noteText}
                                    onChange={(e) => setNoteText(e.target.value)}
                                    placeholder="Enter notes..."
                                    className="text-sm h-8"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        // Save note on Enter key
                                        setSalesData(prev => prev.map(s =>
                                          s.customer === sale.customer &&
                                          s.date === sale.date &&
                                          s.total === sale.total
                                            ? { ...s, notes: noteText.trim() || undefined }
                                            : s
                                        ))
                                        setEditingNote(null)
                                        setNoteText("")
                                      } else if (e.key === 'Escape') {
                                        // Cancel on Escape key
                                        setEditingNote(null)
                                        setNoteText("")
                                      }
                                    }}
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        // Save note
                                        setSalesData(prev => prev.map(s =>
                                          s.customer === sale.customer &&
                                          s.date === sale.date &&
                                          s.total === sale.total
                                            ? { ...s, notes: noteText.trim() || undefined }
                                            : s
                                        ))
                                        setEditingNote(null)
                                        setNoteText("")
                                      }}
                                      className="h-6 text-xs px-2"
                                    >
                                      Save
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setEditingNote(null)
                                        setNoteText("")
                                      }}
                                      className="h-6 text-xs px-2"
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <p className="text-sm text-gray-700">
                                    {sale.notes || "No notes added yet."}
                                  </p>
                                  <div className="flex gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setEditingNote(`sale-${sale.customer}-${sale.date}-${sale.total}`)
                                        setNoteText(sale.notes || "")
                                      }}
                                      className="h-6 text-xs px-2"
                                    >
                                      {sale.notes ? 'Edit' : 'Add'} Note
                                    </Button>
                                    {sale.notes && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setSalesData(prev => prev.map(s =>
                                            s.customer === sale.customer &&
                                            s.date === sale.date &&
                                            s.total === sale.total
                                              ? { ...s, notes: undefined }
                                              : s
                                          ))
                                        }}
                                        className="h-6 text-xs px-2 text-red-600 hover:text-red-700"
                                      >
                                        Clear
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                    </div>
                  </div>
                ))}

                {getFilteredSales().length === 0 && (
                  <div className="col-span-full text-center text-muted-foreground py-12">
                    <div className="flex flex-col items-center gap-3">
                      <TrendingUp className="h-12 w-12 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium">No sales found</p>
                        <p className="text-xs mt-1">Try adjusting your filters or add a new sale</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Payments Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Recent Payments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                {getFilteredPayments()
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .slice(0, 8)
                  .map((payment, index) => (
                    <div
                      key={`${payment.customerName}-${payment.date}-${payment.amount}-${index}`}
                      className="bg-white rounded-lg border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-white p-2 sm:p-3 shadow-sm hover:shadow-md transition-all duration-200 relative"
                    >
                      {/* Delete and Edit Icons */}
                      <div className="absolute top-1 right-1 sm:top-2 sm:right-2 flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 sm:h-6 sm:w-6 p-0 hover:bg-blue-100"
                          onClick={() => {
                            // Set payment form for editing
                            setPaymentCustomer(payment.customerName)
                            setPaymentAmount(Math.abs(payment.amount).toString())
                            setPaymentAccount(payment.account || "")
                            setPaymentDate(payment.date)
                            setShowPaymentDialog(true)
                          }}
                        >
                          <svg className="h-3 w-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 sm:h-6 sm:w-6 p-0 hover:bg-red-100"
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete this payment from ${payment.customerName}?`)) {
                              // Find and update customer data
                              setCustomerData(prev =>
                                prev.map((customer) => {
                                  if (customer.name === payment.customerName) {
                                    return {
                                      ...customer,
                                      balance: customer.balance - payment.amount,
                                      transactions: customer.transactions.filter(t =>
                                        !(t.type === "payment" && t.date === payment.date && t.amount === payment.amount && t.account === payment.account)
                                      ),
                                    }
                                  }
                                  return customer
                                }),
                              )
                            }
                          }}
                        >
                          <svg className="h-3 w-3 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </Button>
                      </div>

                      {/* Compact Header - All info in one row */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 mb-1">
                            <Badge className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-800">
                              Payment
                            </Badge>
                            {payment.account && (
                              <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                                {getAccountName(payment.account)}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 truncate">{payment.date}</p>
                        </div>
                        <div className="text-right ml-2">
                          <p className="text-sm font-bold text-blue-600">
                            -₹{Math.abs(payment.amount).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Compact Content */}
                      <div className="space-y-1">
                        <p className="font-medium text-gray-900 text-xs leading-tight truncate">
                          Payment from {payment.customerName}
                        </p>
                        <p className="text-xs text-gray-600 truncate">{payment.description}</p>

                      {/* Compact Notes Section */}
                      <div className="flex items-center gap-1 mt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 hover:bg-gray-100"
                          onClick={() => {
                            const noteId = `sales-payment-${payment.customerName}-${payment.date}-${payment.amount}`
                            setExpandedNotes(prev => {
                              const newSet = new Set(prev)
                              if (newSet.has(noteId)) {
                                newSet.delete(noteId)
                              } else {
                                newSet.add(noteId)
                              }
                              return newSet
                            })
                          }}
                        >
                          <svg className={`h-3 w-3 ${payment.notes ? 'text-blue-600 fill-current' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Button>
                        {payment.notes && (
                          <span className="text-xs text-blue-600 font-medium">Has notes</span>
                        )}
                      </div>

                      {/* Expanded Notes */}
                      {expandedNotes.has(`sales-payment-${payment.customerName}-${payment.date}-${payment.amount}`) && (
                        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                          {editingNote === `sales-payment-${payment.customerName}-${payment.date}-${payment.amount}` ? (
                            <div className="space-y-2">
                              <Input
                                value={noteText}
                                onChange={(e) => setNoteText(e.target.value)}
                                placeholder="Enter notes..."
                                className="text-sm h-8"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    // Save note on Enter key
                                    // Find the customer and update their transaction
                                    setCustomerData(prev => prev.map(customer =>
                                      customer.name === payment.customerName
                                        ? {
                                            ...customer,
                                            transactions: customer.transactions.map(t =>
                                              t.type === 'payment' &&
                                              t.date === payment.date &&
                                              t.amount === payment.amount &&
                                              t.account === payment.account
                                                ? { ...t, notes: noteText.trim() || undefined }
                                                : t
                                            )
                                          }
                                        : customer
                                    ))
                                    setEditingNote(null)
                                    setNoteText("")
                                  } else if (e.key === 'Escape') {
                                    // Cancel on Escape key
                                    setEditingNote(null)
                                    setNoteText("")
                                  }
                                }}
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    // Save note
                                    setCustomerData(prev => prev.map(customer =>
                                      customer.name === payment.customerName
                                        ? {
                                            ...customer,
                                            transactions: customer.transactions.map(t =>
                                              t.type === 'payment' &&
                                              t.date === payment.date &&
                                              t.amount === payment.amount &&
                                              t.account === payment.account
                                                ? { ...t, notes: noteText.trim() || undefined }
                                                : t
                                            )
                                          }
                                        : customer
                                    ))
                                    setEditingNote(null)
                                    setNoteText("")
                                  }}
                                  className="h-6 text-xs px-2"
                                >
                                  Save
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingNote(null)
                                    setNoteText("")
                                  }}
                                  className="h-6 text-xs px-2"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-sm text-gray-700">
                                {payment.notes || "No notes added yet."}
                              </p>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingNote(`sales-payment-${payment.customerName}-${payment.date}-${payment.amount}`)
                                    setNoteText(payment.notes || "")
                                  }}
                                  className="h-6 text-xs px-2"
                                >
                                  {payment.notes ? 'Edit' : 'Add'} Note
                                </Button>
                                {payment.notes && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setCustomerData(prev => prev.map(customer =>
                                        customer.name === payment.customerName
                                          ? {
                                              ...customer,
                                              transactions: customer.transactions.map(t =>
                                                t.type === 'payment' &&
                                                t.date === payment.date &&
                                                t.amount === payment.amount &&
                                                t.account === payment.account
                                                  ? { ...t, notes: undefined }
                                                  : t
                                              )
                                            }
                                          : customer
                                      ))
                                    }}
                                    className="h-6 text-xs px-2 text-red-600 hover:text-red-700"
                                  >
                                    Clear
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      </div>
                    </div>
                  ))
                }

                {getFilteredPayments().length === 0 && (
                  <div className="col-span-full text-center text-muted-foreground py-12">
                    <div className="flex flex-col items-center gap-3">
                      <CreditCard className="h-12 w-12 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium">No payments found</p>
                        <p className="text-xs mt-1">Payments will appear here once recorded</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="p-6 space-y-6">
          {selectedCustomer ? (
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={() => setSelectedCustomer(null)} className="h-8 w-8 p-0">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </Button>
                    <div>
                      <h2 className="text-lg font-bold">{selectedCustomer.name}</h2>
                      <p className="text-sm text-muted-foreground">{selectedCustomer.phone}</p>
                      <p className="text-sm text-blue-600 font-medium">{selectedCustomer.category}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Dialog open={showAddCustomerPurchase} onOpenChange={setShowAddCustomerPurchase}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="text-xs md:text-sm h-8 md:h-10 px-3 md:px-4">
                        <Plus className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                        <span className="hidden sm:inline">Add New Sale</span>
                        <span className="sm:hidden">Add Sale</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          {editingCustomerTransactionId ? "Edit Sale" : "Add New Sale"} for {selectedCustomer?.name}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="customerPurchaseLocation">Location (Optional)</Label>
                          <Select
                            value={addCustomerPurchaseForm.location}
                            onValueChange={(value) => setAddCustomerPurchaseForm({ ...addCustomerPurchaseForm, location: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select location" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {stockData.map((stock) => (
                                <SelectItem key={stock.location} value={stock.location}>
                                  {stock.location} ({stock.quantity} bags available)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="customerPurchaseProductType">Product Type (Optional)</Label>
                          <Select
                            value={addCustomerPurchaseForm.productType}
                            onValueChange={(value) => setAddCustomerPurchaseForm({ ...addCustomerPurchaseForm, productType: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select product type (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {productTypes.map((productType) => (
                                <SelectItem key={productType.name} value={productType.name}>
                                  {productType.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="customerPurchaseSubCategory">Sub-Category (Optional)</Label>
                          <Select
                            value={addCustomerPurchaseForm.subCategory}
                            onValueChange={(value) => setAddCustomerPurchaseForm({ ...addCustomerPurchaseForm, subCategory: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select sub-category (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              <SelectItem value="Direct">Direct</SelectItem>
                              <SelectItem value="G.V">G.V</SelectItem>
                              <SelectItem value="G.L">G.L</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="customerPurchaseQuantity">Quantity</Label>
                          <div className="flex gap-2">
                            <Input
                              id="customerPurchaseQuantity"
                              type="number"
                              value={addCustomerPurchaseForm.quantity}
                              onChange={(e) => setAddCustomerPurchaseForm({ ...addCustomerPurchaseForm, quantity: e.target.value })}
                              placeholder="Enter quantity"
                              className="flex-1"
                            />
                            <Select
                              value={addCustomerPurchaseForm.unit}
                              onValueChange={(value) => setAddCustomerPurchaseForm({ ...addCustomerPurchaseForm, unit: value })}
                            >
                              <SelectTrigger className="w-24">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="bags">bags</SelectItem>
                                <SelectItem value="liters">liters</SelectItem>
                                <SelectItem value="kg">kg</SelectItem>
                                <SelectItem value="ton">ton</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="customerPurchasePrice">Price per {addCustomerPurchaseForm.unit} (₹)</Label>
                          <Input
                            id="customerPurchasePrice"
                            type="number"
                            value={addCustomerPurchaseForm.pricePerUnit}
                            onChange={(e) => setAddCustomerPurchaseForm({ ...addCustomerPurchaseForm, pricePerUnit: e.target.value })}
                            placeholder={`Enter price per ${addCustomerPurchaseForm.unit}`}
                          />
                        </div>
                        <div>
                          <Label htmlFor="customerPurchaseOriginalPrice">Original Price (₹)</Label>
                          <Input
                            id="customerPurchaseOriginalPrice"
                            type="number"
                            value={addCustomerPurchaseForm.originalPrice}
                            onChange={(e) => setAddCustomerPurchaseForm({ ...addCustomerPurchaseForm, originalPrice: e.target.value })}
                            placeholder="Enter original price"
                          />
                        </div>
                        <div>
                          <Label htmlFor="customerPurchaseDate">Date</Label>
                          <Input
                            id="customerPurchaseDate"
                            type="date"
                            value={addCustomerPurchaseForm.date}
                            onChange={(e) => setAddCustomerPurchaseForm({ ...addCustomerPurchaseForm, date: e.target.value })}
                            placeholder="DD-MM-YY"
                            className="placeholder:text-gray-500 md:placeholder:text-transparent"
                          />
                        </div>
                        {addCustomerPurchaseForm.quantity && addCustomerPurchaseForm.pricePerUnit && (
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-sm font-medium">
                              Total: ₹
                              {(
                                Number.parseInt(addCustomerPurchaseForm.quantity) * Number.parseFloat(addCustomerPurchaseForm.pricePerUnit)
                              ).toLocaleString()}
                            </p>
                          </div>
                        )}
                        <Button onClick={handleAddCustomerPurchase} className="w-full">
                          {editingCustomerTransactionId ? "Update Sale" : "Add Sale"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="text-xs md:text-sm h-8 md:h-10 px-3 md:px-4">
                        <CreditCard className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                        Record Payment
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Record Payment {selectedCustomer ? `for ${selectedCustomer.name}` : ''}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        {!selectedCustomer && (
                          <div>
                            <Label htmlFor="paymentCustomer">Select Customer</Label>
                            <Select
                              value={paymentCustomer}
                              onValueChange={setPaymentCustomer}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Choose customer" />
                              </SelectTrigger>
                              <SelectContent>
                                {customerData.map((customer) => (
                                  <SelectItem key={customer.name} value={customer.name}>
                                    {customer.name} {customer.balance > 0 ? `(Owes ₹${Math.abs(customer.balance).toLocaleString()})` : customer.balance < 0 ? `(Advance ₹${Math.abs(customer.balance).toLocaleString()})` : '(Settled)'}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        <div>
                          <Label htmlFor="paymentAmount">Payment Amount (₹)</Label>
                          <Input
                            id="paymentAmount"
                            type="number"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            placeholder="Enter payment amount"
                          />
                        </div>
                        <div>
                          <Label htmlFor="paymentAccount">Account</Label>
                          <Select
                            value={paymentAccount}
                            onValueChange={setPaymentAccount}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select account" />
                            </SelectTrigger>
                            <SelectContent>
                              {supabaseAccounts?.map((account) => (
                                <SelectItem key={account.id} value={account.id}>
                                  {account.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="paymentDate">Payment Date</Label>
                          <Input
                            id="paymentDate"
                            type="date"
                            value={paymentDate}
                            onChange={(e) => setPaymentDate(e.target.value)}
                            placeholder="DD-MM-YY"
                            className="placeholder:text-gray-500 md:placeholder:text-transparent"
                          />
                        </div>
                        <div>
                          <Label htmlFor="paymentMethod">Payment Method (Optional)</Label>
                          <Select
                            value={paymentMethod}
                            onValueChange={(value) => setPaymentMethod(value as "" | "Cash" | "Online")}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select payment method" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              <SelectItem value="Cash">Cash</SelectItem>
                              <SelectItem value="Online">Online</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="paymentNotes">Notes (Optional)</Label>
                          <Input
                            id="paymentNotes"
                            value={paymentNotes}
                            onChange={(e) => setPaymentNotes(e.target.value)}
                            placeholder="Enter payment notes..."
                          />
                        </div>
                        {paymentAmount && (
                          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-sm font-medium text-green-800">
                              Payment Amount: ₹{Number.parseFloat(paymentAmount).toLocaleString()}
                            </p>
                            {paymentAccount && (
                              <p className="text-xs text-green-600 mt-1">
                                Account: {paymentAccount}
                              </p>
                            )}
                            {paymentCustomer && !selectedCustomer && (
                              <p className="text-xs text-green-600 mt-1">
                                Customer: {paymentCustomer}
                              </p>
                            )}
                          </div>
                        )}
                        <Button
                          onClick={handleCustomerPayment}
                          className="w-full"
                          disabled={!((selectedCustomer?.name || paymentCustomer) && paymentAmount && paymentAccount)}
                        >
                          Record Payment
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={showDiscountDialog} onOpenChange={setShowDiscountDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="text-xs md:text-sm h-8 md:h-10 px-3 md:px-4 bg-orange-600 hover:bg-orange-700 text-white">
                        <svg className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                        <span className="hidden sm:inline">Apply Discount</span>
                        <span className="sm:hidden">Discount</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Apply Discount for {selectedCustomer?.name}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="discountType">Discount Type</Label>
                          <Select
                            value={discountType}
                            onValueChange={(value: "amount" | "percentage") => setDiscountType(value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select discount type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="amount">Fixed Amount (₹)</SelectItem>
                              <SelectItem value="percentage">Percentage (%)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="discountAmount">
                            {discountType === "amount" ? "Discount Amount (₹)" : "Discount Percentage (%)"}
                          </Label>
                          <Input
                            id="discountAmount"
                            type="number"
                            value={discountAmount}
                            onChange={(e) => setDiscountAmount(e.target.value)}
                            placeholder={discountType === "amount" ? "Enter discount amount" : "Enter discount percentage"}
                          />
                        </div>
                        <div>
                          <Label htmlFor="discountCategory">Discount Category</Label>
                          <Select
                            value={discountCategory}
                            onValueChange={setDiscountCategory}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select discount category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Partial Payment">Partial Payment</SelectItem>
                              <SelectItem value="Settlement Discount">Settlement Discount</SelectItem>
                              <SelectItem value="Goodwill">Goodwill</SelectItem>
                              <SelectItem value="Bulk Discount">Bulk Discount</SelectItem>
                              <SelectItem value="Custom Reason">Custom Reason</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {discountCategory === "Custom Reason" && (
                          <div>
                            <Label htmlFor="discountReason">Custom Reason</Label>
                            <Input
                              id="discountReason"
                              value={discountReason}
                              onChange={(e) => setDiscountReason(e.target.value)}
                              placeholder="Enter custom reason for discount"
                            />
                          </div>
                        )}
                        <div>
                          <Label htmlFor="discountDate">Discount Date</Label>
                          <Input
                            id="discountDate"
                            type="date"
                            value={discountDate}
                            onChange={(e) => setDiscountDate(e.target.value)}
                            placeholder="DD-MM-YY"
                            className="placeholder:text-gray-500 md:placeholder:text-transparent"
                          />
                        </div>
                        {discountAmount && selectedCustomer && (
                          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-sm font-medium">Current Balance:</span>
                                <span className="text-sm">₹{selectedCustomer.balance.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm font-medium">Discount Amount:</span>
                                <span className="text-sm text-orange-600">
                                  -₹{(() => {
                                    const amount = Number.parseFloat(discountAmount)
                                    if (discountType === "percentage") {
                                      const maxDiscount = selectedCustomer.balance * 0.2 // 20% limit
                                      const calculatedDiscount = (selectedCustomer.balance * amount) / 100
                                      return Math.min(calculatedDiscount, maxDiscount).toLocaleString()
                                    }
                                    return Math.min(amount, selectedCustomer.balance * 0.2).toLocaleString()
                                  })()}
                                </span>
                              </div>
                              <div className="flex justify-between border-t pt-2">
                                <span className="text-sm font-medium">New Balance:</span>
                                <span className="text-sm font-bold text-orange-700">
                                  ₹{(() => {
                                    const amount = Number.parseFloat(discountAmount)
                                    let discountValue = 0
                                    if (discountType === "percentage") {
                                      discountValue = (selectedCustomer.balance * amount) / 100
                                    } else {
                                      discountValue = amount
                                    }
                                    const maxDiscount = selectedCustomer.balance * 0.2 // 20% limit
                                    const actualDiscount = Math.min(discountValue, maxDiscount)
                                    return (selectedCustomer.balance - actualDiscount).toLocaleString()
                                  })()}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                        <Button onClick={() => handleApplyDiscount()} className="w-full bg-orange-600 hover:bg-orange-700">
                          Apply Discount
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <Card>
                  <CardHeader className="pb-1">
                    <CardTitle className="text-xs font-medium">Current Balance</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-1">
                    <div
                      className={`text-lg font-bold ${selectedCustomer.balance > 0 ? "text-destructive" : selectedCustomer.balance < 0 ? "text-green-600" : ""}`}
                    >
                      ₹{Math.abs(selectedCustomer.balance).toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {selectedCustomer.balance > 0
                        ? "Amount Due"
                        : selectedCustomer.balance < 0
                          ? "Advance Balance"
                          : "Settled"}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-1">
                    <CardTitle className="text-xs font-medium">Total Purchases</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-1">
                    <div className="text-lg font-bold">
                      {selectedCustomer.transactions
                        .filter((t) => t.type === "sale")
                        .reduce((sum, t) => sum + (t.bags || 0), 0)}{" "}
                      bags
                    </div>
                    <p className="text-xs text-muted-foreground">All time</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-1">
                    <CardTitle className="text-xs font-medium">Total Sales Value</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-1">
                    <div className="text-lg font-bold">
                      ₹
                      {selectedCustomer.transactions
                        .filter((t) => t.type === "sale")
                        .reduce((sum, t) => sum + t.amount, 0)
                        .toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">All time</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-1">
                    <CardTitle className="text-xs font-medium">Total Payments</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-1">
                    <div className="text-lg font-bold text-green-600">
                      ₹
                      {Math.abs(
                        selectedCustomer.transactions
                          .filter((t) => t.type === "payment")
                          .reduce((sum, t) => sum + t.amount, 0),
                      ).toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">All time</p>
                  </CardContent>
                </Card>
              </div>



              <div className="mt-6">
                <Card className="w-full max-w-xs md:max-w-sm">
                  <CardHeader className="pb-1 px-3 py-2 md:pb-2">
                    <CardTitle className="text-xs md:text-sm font-medium">Profit Trend</CardTitle>
                  </CardHeader>
                  <CardContent className="p-2 md:p-3">
                    <div className="h-[80px] md:h-[120px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={selectedCustomer.transactions
                          .filter((t) => t.type === "sale")
                          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                          .map((t, index) => ({
                            date: t.date,
                            profit: t.amount - (t.bags || 0) * 500, // Assuming cost price of ₹500 per bag
                            cumulative: selectedCustomer.transactions
                              .filter((tx, i) => i <= index && tx.type === "sale")
                              .reduce((sum, tx) => sum + (tx.amount - (tx.bags || 0) * 500), 0)
                          }))}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" tick={{ fontSize: 8 }} className="md:text-[10px]" />
                          <YAxis tick={{ fontSize: 8 }} className="md:text-[10px]" />
                          <Tooltip
                            formatter={(value, name) => [
                              `₹${Number(value).toLocaleString()}`,
                              name === 'profit' ? 'Profit per Sale' : 'Cumulative Profit'
                            ]}
                          />
                          <Line
                            type="monotone"
                            dataKey="cumulative"
                            stroke={selectedCustomer.transactions
                              .filter((t) => t.type === "sale")
                              .reduce((sum, t) => sum + (t.amount - (t.bags || 0) * 500), 0) > 0
                              ? "#10b981" : "#ef4444"}
                            strokeWidth={1.5}
                            dot={{ r: 2 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-1 text-center">
                      <p className={`text-xs font-medium ${
                        selectedCustomer.transactions
                          .filter((t) => t.type === "sale")
                          .reduce((sum, t) => sum + (t.amount - (t.bags || 0) * 500), 0) > 0
                          ? "text-green-600" : "text-red-600"
                      }`}>
                        {selectedCustomer.transactions
                          .filter((t) => t.type === "sale")
                          .reduce((sum, t) => sum + (t.amount - (t.bags || 0) * 500), 0) > 0
                          ? "Profitable" : "Loss Making"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Transaction History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Enhanced Filters */}
                  <div className="space-y-3 mb-4 p-3 bg-muted/30 rounded-lg">
                    {/* Quick Filter Buttons */}
                    <div className="flex flex-wrap gap-2">
                      {[
                        { key: "all", label: "All Time" },
                        { key: "today", label: "Today" },
                        { key: "week", label: "Last 7 Days" },
                        { key: "month", label: "This Month" },
                        { key: "quarter", label: "Last 3 Months" }
                      ].map(filter => (
                        <Button
                          key={filter.key}
                          variant={quickFilter === filter.key ? "default" : "outline"}
                          size="sm"
                          onClick={() => setQuickFilter(filter.key as "all" | "today" | "week" | "month" | "quarter")}
                          className="text-xs h-8"
                        >
                          {filter.label}
                        </Button>
                      ))}
                    </div>

                    {/* Search Bar */}
                    <div className="relative">
                      <Input
                        placeholder="Search transactions..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9 text-sm"
                      />
                      <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>

                    {/* Advanced Filters Toggle */}
                    <div className="flex items-center justify-between">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                        className="text-xs h-8 px-2"
                      >
                        {showAdvancedFilters ? "Hide" : "Show"} Advanced Filters
                        <svg className={`ml-1 h-3 w-3 transition-transform ${showAdvancedFilters ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearAllFilters}
                        className="text-xs h-8 px-3"
                      >
                        Clear All
                      </Button>
                    </div>

                    {/* Advanced Filters Panel */}
                    {showAdvancedFilters && (
                      <div className="space-y-3 pt-3 border-t">
                        {/* Transaction Type Filter */}
                        <div>
                          <Label className="text-xs font-medium text-muted-foreground">Transaction Type</Label>
                          <Select value={transactionTypeFilter} onValueChange={(value: string) => setTransactionTypeFilter(value as "all" | "sale" | "payment")}>
                            <SelectTrigger className="mt-1 h-8 text-sm">
                              <SelectValue placeholder="All Types" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Types</SelectItem>
                              <SelectItem value="sale">Sales Only</SelectItem>
                              <SelectItem value="payment">Payments Only</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Amount Range Filters */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs font-medium text-muted-foreground">Min Amount</Label>
                            <Input
                              type="number"
                              placeholder="₹0"
                              value={amountMin}
                              onChange={(e) => setAmountMin(e.target.value)}
                              className="mt-1 h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-muted-foreground">Max Amount</Label>
                            <Input
                              type="number"
                              placeholder="No limit"
                              value={amountMax}
                              onChange={(e) => setAmountMax(e.target.value)}
                              className="mt-1 h-8 text-sm"
                            />
                          </div>
                        </div>

                        {/* Date Range Filters */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs font-medium text-muted-foreground">From Date</Label>
                            <DateInputWithIcon
                              value={customerTransactionStartDate}
                              onChange={(e) => setCustomerTransactionStartDate(e.target.value)}
                              placeholder="DD-MM-YY"
                              className="mt-1 h-8 text-sm placeholder:text-gray-500 md:placeholder:text-transparent"
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-muted-foreground">To Date</Label>
                            <DateInputWithIcon
                              value={customerTransactionEndDate}
                              onChange={(e) => setCustomerTransactionEndDate(e.target.value)}
                              placeholder="DD-MM-YY"
                              className="mt-1 h-8 text-sm placeholder:text-gray-500 md:placeholder:text-transparent"
                            />
                          </div>
                        </div>

                        {/* Product Type Filter */}
                        <div>
                          <Label className="text-xs font-medium text-muted-foreground">Product Type</Label>
                          <Select value={customerTransactionProductFilter} onValueChange={setCustomerTransactionProductFilter}>
                            <SelectTrigger className="mt-1 h-8 text-sm">
                              <SelectValue placeholder="All Products" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Products</SelectItem>
                              {productTypes.map((product) => (
                                <SelectItem key={product.name} value={product.name}>
                                  {product.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Active Filters Summary */}
                  {(searchQuery || transactionTypeFilter !== "all" || amountMin || amountMax || quickFilter !== "all" || customerTransactionStartDate || customerTransactionEndDate || customerTransactionProductFilter !== "all") && (
                    <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-blue-800">Active filters:</span>
                        {searchQuery && (
                          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                            Search: "{searchQuery}"
                          </Badge>
                        )}
                        {transactionTypeFilter !== "all" && (
                          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                            Type: {transactionTypeFilter === "sale" ? "Sales" : "Payments"}
                          </Badge>
                        )}
                        {(amountMin || amountMax) && (
                          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                            Amount: ₹{amountMin || "0"} - ₹{amountMax || "∞"}
                          </Badge>
                        )}
                        {quickFilter !== "all" && (
                          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                            Period: {quickFilter === "today" ? "Today" : quickFilter === "week" ? "Last 7 Days" : quickFilter === "month" ? "This Month" : "Last 3 Months"}
                          </Badge>
                        )}
                        {(customerTransactionStartDate || customerTransactionEndDate) && (
                          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                            Date: {customerTransactionStartDate || "..."} - {customerTransactionEndDate || "..."}
                          </Badge>
                        )}
                        {customerTransactionProductFilter !== "all" && (
                          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                            Product: {customerTransactionProductFilter}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Enhanced Transaction Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    {getFilteredTransactions().map((transaction, index) => (
                      <div
                        key={transaction.id}
                        className={`bg-white rounded-lg border-l-4 ${
                          transaction.type === "sale"
                            ? "border-l-green-500 bg-gradient-to-r from-green-50 to-white"
                            : "border-l-blue-500 bg-gradient-to-r from-blue-50 to-white"
                        } p-2 sm:p-3 shadow-sm hover:shadow-md transition-all duration-200 relative`}
                      >
                        {/* Delete and Edit Icons */}
                        <div className="absolute top-1 right-1 sm:top-2 sm:right-2 flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 sm:h-6 sm:w-6 p-0 hover:bg-blue-100"
                            onClick={() => {
                              if (transaction.type === "sale") {
                                // Edit sale transaction
                                setEditingCustomerTransactionId(transaction.id)
                                setAddCustomerPurchaseForm({
                                  quantity: transaction.bags?.toString() || "",
                                  location: transaction.location || "",
                                  productType: "",
                                  subCategory: "",
                                  unit: "bags",
                                  pricePerUnit: transaction.bags ? Math.round(transaction.amount / transaction.bags).toString() : "",
                                  originalPrice: "",
                                  date: transaction.date
                                })
                                setShowAddCustomerPurchase(true)
                              } else {
                                // Edit payment transaction
                                setPaymentAmount(Math.abs(transaction.amount).toString())
                                setPaymentAccount(transaction.account || "")
                                setPaymentDate(transaction.date)
                                setShowPaymentDialog(true)
                              }
                            }}
                          >
                            <svg className="h-3 w-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 sm:h-6 sm:w-6 p-0 hover:bg-red-100"
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to delete this ${transaction.type}?`)) {
                                // Delete transaction and update customer balance
                                setCustomerData(prev =>
                                  prev.map((customer) => {
                                    if (customer.name === selectedCustomer?.name) {
                                      return {
                                        ...customer,
                                        balance: customer.balance - transaction.amount, // Reverse the transaction effect
                                        transactions: customer.transactions.filter(t => t.id !== transaction.id),
                                      }
                                    }
                                    return customer
                                  }),
                                )

                                // Update selected customer state
                                setSelectedCustomer(prev =>
                                  prev
                                    ? {
                                        ...prev,
                                        balance: prev.balance - transaction.amount,
                                        transactions: prev.transactions.filter(t => t.id !== transaction.id),
                                      }
                                    : null,
                                )

                            // If it's a sale transaction, restore stock
                            if (transaction.type === "sale" && transaction.location && transaction.location !== "Direct" && transaction.location !== "Company Goddam" && transaction.location !== "none") {
                              setStockData(prevStock =>
                                prevStock.map((stock) => {
                                  if (stock.location === transaction.location) {
                                    const newQty = stock.quantity + (transaction.bags || 0)
                                    return { ...stock, quantity: newQty, status: newQty < stock.threshold ? "low" : "normal" }
                                  }
                                  return stock
                                }),
                              )
                            }
                              }
                            }}
                          >
                            <svg className="h-3 w-3 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </Button>
                        </div>

                        {/* Compact Header - All info in one row */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 mb-1">
                              <Badge className={`text-xs px-1.5 py-0.5 ${
                                transaction.type === "sale"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}>
                                {transaction.type === "sale" ? "Sale" : "Payment"}
                              </Badge>
                              {transaction.subCategory && (
                                <Badge variant="secondary" className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-800">
                                  {transaction.subCategory}
                                </Badge>
                              )}
                              {transaction.location && transaction.location !== "none" && (
                                <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                                  {transaction.location}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 truncate">{transaction.date}</p>
                          </div>
                          <div className="text-right ml-2">
                            <p className={`text-sm font-bold ${
                              transaction.type === "sale" ? "text-green-600" : "text-blue-600"
                            }`}>
                              {transaction.type === "sale" ? "+" : "-"}₹{Math.abs(transaction.amount).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {/* Compact Content */}
                        <div className="space-y-1">
                          <p className="font-medium text-gray-900 text-xs leading-tight truncate">
                            {transaction.description}
                          </p>
                          {transaction.bags && transaction.type === "sale" && (
                            <div className="flex items-center justify-between text-xs text-gray-600">
                              <span>{transaction.bags} units</span>
                              <span>₹{Math.round(transaction.amount / transaction.bags)}/unit</span>
                            </div>
                          )}

                          {/* Compact Notes Section */}
                          <div className="flex items-center gap-1 mt-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0 hover:bg-gray-100"
                              onClick={() => {
                                const noteId = `customer-${selectedCustomer?.name}-${transaction.id}`
                                setExpandedNotes(prev => {
                                  const newSet = new Set(prev)
                                  if (newSet.has(noteId)) {
                                    newSet.delete(noteId)
                                  } else {
                                    newSet.add(noteId)
                                  }
                                  return newSet
                                })
                              }}
                            >
                              <svg className={`h-3 w-3 ${transaction.notes ? 'text-blue-600 fill-current' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </Button>
                            {transaction.notes && (
                              <span className="text-xs text-blue-600 font-medium">Has notes</span>
                            )}
                          </div>

                          {/* Expanded Notes */}
                          {expandedNotes.has(`customer-${selectedCustomer?.name}-${transaction.id}`) && (
                            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                              {editingNote === `customer-${selectedCustomer?.name}-${transaction.id}` ? (
                                <div className="space-y-2">
                                  <Input
                                    defaultValue={transaction.notes || ""}
                                    onChange={(e) => { noteDraftRef.current = e.target.value }}
                                    placeholder="Enter notes..."
                                    className="text-sm h-8"
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        const newNote = (noteDraftRef.current || "").trim() || undefined
                                        // Update customerData
                                        setCustomerData(prev => prev.map(customer =>
                                          customer.name === selectedCustomer?.name
                                            ? {
                                                ...customer,
                                                transactions: customer.transactions.map(t =>
                                                  t.id === transaction.id ? { ...t, notes: newNote } : t
                                                )
                                              }
                                            : customer
                                        ))
                                        // Update selectedCustomer mirror
                                        setSelectedCustomer(prev => prev ? {
                                          ...prev,
                                          transactions: prev.transactions.map(t => t.id === transaction.id ? { ...t, notes: newNote } : t)
                                        } : prev)
                                        setEditingNote(null)
                                      }}
                                      className="h-6 text-xs px-2"
                                    >
                                      Save
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setEditingNote(null)
                                      }}
                                      className="h-6 text-xs px-2"
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <p className="text-sm text-gray-700">
                                    {transaction.notes || "No notes added yet."}
                                  </p>
                                  <div className="flex gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setEditingNote(`customer-${selectedCustomer?.name}-${transaction.id}`)
                                        noteDraftRef.current = transaction.notes || ""
                                      }}
                                      className="h-6 text-xs px-2"
                                    >
                                      {transaction.notes ? 'Edit' : 'Add'} Note
                                    </Button>
                                    {transaction.notes && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setCustomerData(prev => prev.map(customer => customer.name === selectedCustomer?.name ? {
                                            ...customer,
                                            transactions: customer.transactions.map(t => t.id === transaction.id ? { ...t, notes: undefined } : t)
                                          } : customer))
                                          setSelectedCustomer(prev => prev ? {
                                            ...prev,
                                            transactions: prev.transactions.map(t => t.id === transaction.id ? { ...t, notes: undefined } : t)
                                          } : prev)
                                        }}
                                        className="h-6 text-xs px-2 text-red-600 hover:text-red-700"
                                      >
                                        Clear
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {getFilteredTransactions().length === 0 && (
                      <div className="col-span-full text-center text-muted-foreground py-12">
                        <div className="flex flex-col items-center gap-3">
                          <History className="h-12 w-12 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium">No transactions found</p>
                            <p className="text-xs mt-1">Try adjusting your filters or add a new transaction</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                <h2 className="text-xl sm:text-2xl font-bold">Customers</h2>
                <div className="flex gap-1 sm:gap-2">
                  <Select value={customerCategoryFilter} onValueChange={(value) => setCustomerCategoryFilter(value as "all" | "Engineer" | "Contractor" | "Builder" | "Individual")}>
                    <SelectTrigger className="w-auto text-sm h-8">
                      <SelectValue placeholder="Filter: All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="Engineer">Engineers</SelectItem>
                      <SelectItem value="Contractor">Contractors</SelectItem>
                      <SelectItem value="Builder">Builders</SelectItem>
                      <SelectItem value="Individual">Individuals</SelectItem>
                    </SelectContent>
                  </Select>

                  <Dialog open={showAddCustomer} onOpenChange={setShowAddCustomer}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="text-xs px-2 h-8">
                        <Plus className="h-3 w-3 mr-1" />
                        Add Customer
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Customer</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="customerName">Customer Name</Label>
                          <Input
                            id="customerName"
                            value={addCustomerForm.name}
                            onChange={(e) => setAddCustomerForm({ ...addCustomerForm, name: e.target.value })}
                            placeholder="Enter customer name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="phone">Phone Number</Label>
                          <Input
                            id="phone"
                            value={addCustomerForm.phone}
                            onChange={(e) => setAddCustomerForm({ ...addCustomerForm, phone: e.target.value })}
                            placeholder="Enter phone number"
                          />
                        </div>
                        <div>
                          <Label htmlFor="category">Category</Label>
                          <Select
                            value={addCustomerForm.category}
                            onValueChange={(value) => setAddCustomerForm({ ...addCustomerForm, category: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Engineer">Engineer</SelectItem>
                              <SelectItem value="Contractor">Contractor</SelectItem>
                              <SelectItem value="Builder">Builder</SelectItem>
                              <SelectItem value="Individual">Individual</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="openingBalance">Opening Balance (₹)</Label>
                          <Input
                            id="openingBalance"
                            type="number"
                            value={addCustomerForm.openingBalance}
                            onChange={(e) => setAddCustomerForm({ ...addCustomerForm, openingBalance: e.target.value })}
                            placeholder="Enter opening balance (optional)"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Positive value = Customer owes money (Outstanding), Negative value = Advance payment
                          </p>
                        </div>
                        <Button onClick={handleAddCustomer} className="w-full">
                          Add Customer
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <Input
                  type="text"
                  placeholder="Search customers by name or phone number..."
                  value={customerSearchQuery}
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  className="pl-10 h-10"
                />
                {customerSearchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                    onClick={() => setCustomerSearchQuery("")}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
                {customerData
                  .filter((c) => customerCategoryFilter === "all" || c.category === customerCategoryFilter)
                  .filter((c) => {
                    if (!customerSearchQuery) return true
                    const query = customerSearchQuery.toLowerCase()
                    return (
                      c.name.toLowerCase().includes(query) ||
                      c.phone.toLowerCase().includes(query)
                    )
                  })
                  .map((customer, index) => (
                    <Card
                      key={index}
                      className="cursor-pointer hover:shadow-md transition-shadow p-3 md:p-6"
                      onClick={() => setSelectedCustomer(customer)}
                    >
                      <CardHeader className="pb-2 md:pb-6">
                        <CardTitle className="flex items-center justify-between text-sm md:text-base">
                          <span className="truncate text-xs md:text-sm font-medium">{customer.name}</span>
                          <Badge variant="outline" className="text-xs md:text-sm px-1.5 md:px-2 py-0.5">{customer.category}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0 md:pt-6">
                        <p className="text-xs md:text-sm text-muted-foreground mb-1.5 md:mb-2 truncate">{customer.phone}</p>
                        <div className="flex items-center justify-between mb-1.5 md:mb-2">
                          <span className="text-xs md:text-sm">Balance:</span>
                          <span
                            className={`font-medium text-xs md:text-sm ${customer.balance > 0 ? "text-destructive" : "text-green-600"}`}
                          >
                            ₹{Math.abs(customer.balance).toLocaleString()}
                            {customer.balance > 0 ? " (Owes)" : customer.balance < 0 ? " (Advance)" : ""}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs md:text-sm text-muted-foreground">
                          <span>Total Purchases:</span>
                          <span>
                            {customer.transactions
                              .filter((t) => t.type === "sale")
                              .reduce((sum, t) => sum + (t.bags || 0), 0)}{" "}
                            bags
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="purchases" className="p-3 sm:p-6 space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
            <h2 className="text-xl sm:text-2xl font-bold">Purchases</h2>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              <DateInputWithIcon
                value={purchaseDateFilter}
                onChange={(e) => setPurchaseDateFilter(e.target.value)}
                placeholder="Filter by date"
                className="text-sm h-8 sm:h-10 w-auto min-w-0 flex-shrink-0"
              />
              <Button
                variant="outline"
                onClick={() => {
                  setPurchaseDateFilter("")
                  setSelectedPurchaseSupplier("")
                }}
                size="sm"
                className="text-xs sm:text-sm h-8 sm:h-10 px-2 sm:px-4 min-w-0 flex-shrink-0"
              >
                Clear
              </Button>
              <Dialog open={showAddPurchase} onOpenChange={setShowAddPurchase}>
                <DialogTrigger asChild>
                  <Button size="sm" className="text-xs sm:text-sm h-8 sm:h-10 px-2 sm:px-4 min-w-0 flex-shrink-0">
                    <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    Add
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-lg sm:text-xl">Add New Purchase</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 sm:space-y-6">
                    {/* Product Type Selection */}
                    <div>
                      <Label htmlFor="productTypeSelect" className="text-sm sm:text-base font-medium">Select Product Type</Label>
                      <div className="flex gap-2 mt-2">
                        <Select
                          value={selectedPurchaseSupplier}
                          onValueChange={(value) => {
                            setSelectedPurchaseSupplier(value)
                            setSelectedSubCategory("")
                          }}
                        >
                          <SelectTrigger className="flex-1 text-sm">
                            <SelectValue placeholder="Choose a product type" />
                          </SelectTrigger>
                          <SelectContent>
                            {productTypes.map((product) => (
                              <SelectItem key={product.name} value={product.name}>
                                {product.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Dialog open={showAddBrand} onOpenChange={setShowAddBrand}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" className="px-3">
                              <Plus className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="w-[90vw] max-w-md">
                            <DialogHeader>
                              <DialogTitle className="text-base sm:text-lg">Add Custom Product Type</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-3">
                              <Label htmlFor="newProductType" className="text-sm">Product Type Name</Label>
                              <Input
                                id="newProductType"
                                value={newBrandName}
                                onChange={(e) => setNewBrandName(e.target.value)}
                                placeholder="Enter product type name"
                                className="text-sm"
                              />
                              <div>
                                <Label htmlFor="productCategory" className="text-sm">Category</Label>
                                <Select
                                  value={selectedProductCategory}
                                  onValueChange={(value) => {
                                    setSelectedProductCategory(value)
                                    if (value !== "Custom") {
                                      setCustomCategoryName("")
                                    }
                                  }}
                                >
                                  <SelectTrigger className="text-sm">
                                    <SelectValue placeholder="Select category" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {productCategories.map((category) => (
                                      <SelectItem key={category} value={category}>
                                        {category}
                                      </SelectItem>
                                    ))}
                                    <SelectItem value="Custom">Custom</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              {selectedProductCategory === "Custom" && (
                                <div>
                                  <Label htmlFor="customCategory" className="text-sm">Custom Category Name</Label>
                                  <Input
                                    id="customCategory"
                                    value={customCategoryName}
                                    onChange={(e) => setCustomCategoryName(e.target.value)}
                                    placeholder="Enter custom category name"
                                    className="text-sm"
                                  />
                                </div>
                              )}
                              <Button
                                onClick={() => {
                                  const product = newBrandName.trim()
                                  if (!product) return

                                  let finalCategory = selectedProductCategory
                                  if (selectedProductCategory === "Custom") {
                                    const customCat = customCategoryName.trim()
                                    if (customCat && !productCategories.includes(customCat)) {
                                      setProductCategories([...productCategories, customCat])
                                    }
                                    finalCategory = customCat || "Custom"
                                  }

                                  if (!productTypes.some(p => p.name === product)) {
                                    // Add product to Supabase
                                    addProduct(product, finalCategory).then(() => refreshProducts()).catch(console.error)
                                    setSelectedPurchaseSupplier(product)
                                    setSelectedSubCategory("")
                                    setNewBrandName("")
                                    setSelectedProductCategory("")
                                    setCustomCategoryName("")
                                    setShowAddBrand(false)
                                  }
                                }}
                                className="w-full text-sm"
                                disabled={!selectedProductCategory || (selectedProductCategory === "Custom" && !customCategoryName.trim())}
                              >
                                Save
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>

                    {/* Sub-Category Selection */}
                    <div>
                      <Label htmlFor="categorySelect" className="text-sm sm:text-base font-medium">Select Sub-Category</Label>
                      <Select
                        value={selectedSubCategory}
                        onValueChange={setSelectedSubCategory}
                      >
                        <SelectTrigger className="mt-2 text-sm">
                          <SelectValue placeholder="Choose Direct, G.V, G.L, or None" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="Direct">Direct</SelectItem>
                          <SelectItem value="G.V">G.V</SelectItem>
                          <SelectItem value="G.L">G.L</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Purchase Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      {/* Date */}
                      <div className="sm:col-span-2">
                        <Label htmlFor="purchaseDate" className="text-sm">Date</Label>
                        <Input
                          id="purchaseDate"
                          type="date"
                          value={addPurchaseForm.date}
                          onChange={(e) => setAddPurchaseForm({ ...addPurchaseForm, date: e.target.value })}
                          className="text-sm"
                        />
                      </div>

                      {/* Quantity */}
                      <div>
                        <Label htmlFor="quantity" className="text-sm">Quantity</Label>
                        <div className="flex gap-2">
                          <Input
                            id="quantity"
                            type="number"
                            value={addPurchaseForm.quantity}
                            onChange={(e) => {
                              const quantity = e.target.value
                              const pricePerUnit = addPurchaseForm.pricePerUnit
                              const amount =
                                quantity && pricePerUnit
                                  ? String(Number.parseInt(quantity || "0") * Number.parseFloat(pricePerUnit || "0"))
                                  : ""
                              setAddPurchaseForm({ ...addPurchaseForm, quantity, amount })
                            }}
                            placeholder="Enter quantity"
                            className="flex-1 text-sm"
                          />
                          <Select
                            value={addPurchaseForm.unit}
                            onValueChange={(value) => setAddPurchaseForm({ ...addPurchaseForm, unit: value })}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="bags">bags</SelectItem>
                              <SelectItem value="liters">liters</SelectItem>
                              <SelectItem value="kg">kg</SelectItem>
                              <SelectItem value="ton">ton</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Price per Unit */}
                      <div>
                        <Label htmlFor="pricePerUnit" className="text-sm">Price per {addPurchaseForm.unit} (₹)</Label>
                        <Input
                          id="pricePerUnit"
                          type="number"
                          value={addPurchaseForm.pricePerUnit}
                          onChange={(e) => {
                            const pricePerUnit = e.target.value
                            const quantity = addPurchaseForm.quantity
                            const amount =
                              quantity && pricePerUnit
                                ? String(Number.parseInt(quantity || "0") * Number.parseFloat(pricePerUnit || "0"))
                                : ""
                            setAddPurchaseForm({ ...addPurchaseForm, pricePerUnit, amount })
                          }}
                          placeholder={`Enter price per ${addPurchaseForm.unit}`}
                          className="text-sm"
                        />
                      </div>

                      {/* Original Price */}
                      <div>
                        <Label htmlFor="originalPrice" className="text-sm">Original Price (₹)</Label>
                        <Input
                          id="originalPrice"
                          type="number"
                          value={addPurchaseForm.originalPrice}
                          onChange={(e) => setAddPurchaseForm({ ...addPurchaseForm, originalPrice: e.target.value })}
                          placeholder="Enter original price"
                          className="text-sm"
                        />
                      </div>

                      {/* Amount (auto-calculated) */}
                      <div className="sm:col-span-2">
                        <Label htmlFor="amount" className="text-sm">Total Amount (₹)</Label>
                        <Input
                          id="amount"
                          type="number"
                          value={addPurchaseForm.amount}
                          readOnly
                          placeholder="Auto calculated"
                          className="text-sm bg-muted"
                        />
                      </div>
                    </div>

                    {/* Save button */}
                    <Button
                      onClick={handleAddPurchase}
                      className="w-full text-sm sm:text-base py-2.5 sm:py-3"
                      disabled={
                        !selectedPurchaseSupplier ||
                        !addPurchaseForm.quantity ||
                        !addPurchaseForm.pricePerUnit
                      }
                    >
                      Save Purchase
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={showAddExpense} onOpenChange={(open) => {
                setShowAddExpense(open)
                if (!open) {
                  setEditingAccountTransactionId(null)
                  setAddExpenseForm({ name: "", amount: "", category: "", date: "", account: "", notes: "" })
                }
              }}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-xs sm:text-sm h-8 sm:h-10 px-2 sm:px-4 min-w-0 flex-shrink-0">
                    <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    Expense
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-base sm:text-lg">{editingAccountTransactionId ? "Edit" : "Add New"} Expense</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 sm:space-y-4">
                    <div>
                      <Label htmlFor="expenseName" className="text-sm">Expense Name</Label>
                      <Input
                        id="expenseName"
                        value={addExpenseForm.name}
                        onChange={(e) => setAddExpenseForm({ ...addExpenseForm, name: e.target.value })}
                        placeholder="Enter expense name"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="expenseAmount" className="text-sm">Amount (₹)</Label>
                      <Input
                        id="expenseAmount"
                        type="number"
                        value={addExpenseForm.amount}
                        onChange={(e) => setAddExpenseForm({ ...addExpenseForm, amount: e.target.value })}
                        placeholder="Enter amount"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="expenseDate" className="text-sm">Date</Label>
                      <Input
                        id="expenseDate"
                        type="date"
                        value={addExpenseForm.date}
                        onChange={(e) => setAddExpenseForm({ ...addExpenseForm, date: e.target.value })}
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="expenseCategory" className="text-sm">Category</Label>
                      <Select
                        value={addExpenseForm.category}
                        onValueChange={(value) => setAddExpenseForm({ ...addExpenseForm, category: value })}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Logistics">Logistics</SelectItem>
                          <SelectItem value="Office">Office</SelectItem>
                          <SelectItem value="Maintenance">Maintenance</SelectItem>
                          <SelectItem value="Utilities">Utilities</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="expenseAccount" className="text-sm">Account</Label>
                      <Select
                        value={addExpenseForm.account}
                        onValueChange={(value) => setAddExpenseForm({ ...addExpenseForm, account: value })}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                        <SelectContent>
                          {supabaseAccounts?.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="expenseNotes" className="text-sm">Notes (Optional)</Label>
                      <Input
                        id="expenseNotes"
                        value={addExpenseForm.notes}
                        onChange={(e) => setAddExpenseForm({ ...addExpenseForm, notes: e.target.value })}
                        placeholder="Enter notes"
                        className="text-sm"
                      />
                    </div>
                    <Button onClick={handleAddExpense} className="w-full text-sm sm:text-base py-2.5 sm:py-3">
                      {editingAccountTransactionId ? "Update" : "Add"} Expense
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={showDumpStock} onOpenChange={setShowDumpStock}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-xs sm:text-sm h-8 sm:h-10 px-2 sm:px-4 min-w-0 flex-shrink-0">
                    <Package className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    Dump
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-base sm:text-lg">Dump Stock to Shop</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 sm:space-y-4">
                    <div>
                      <Label htmlFor="dumpBrand" className="text-sm">Select Product Type</Label>
                      <Select
                        value={dumpForm.brand}
                        onValueChange={(value) => setDumpForm({ ...dumpForm, brand: value })}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Choose a product type" />
                        </SelectTrigger>
                        <SelectContent>
                          {productTypes.map((product) => (
                            <SelectItem key={product.name} value={product.name}>
                              {product.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="dumpSubCategory" className="text-sm">Select Sub-Category</Label>
                      <Select
                        value={dumpForm.subCategory}
                        onValueChange={(value) => setDumpForm({ ...dumpForm, subCategory: value })}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Choose Direct, G.V, or G.L" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Direct">Direct</SelectItem>
                          <SelectItem value="G.V">G.V</SelectItem>
                          <SelectItem value="G.L">G.L</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="dumpQuantity" className="text-sm">Quantity (bags)</Label>
                      <Input
                        id="dumpQuantity"
                        type="number"
                        value={dumpForm.quantity}
                        onChange={(e) => setDumpForm({ ...dumpForm, quantity: e.target.value })}
                        placeholder="Enter quantity to dump"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="dumpDate" className="text-sm">Date</Label>
                      <Input
                        id="dumpDate"
                        type="date"
                        value={dumpForm.date}
                        onChange={(e) => setDumpForm({ ...dumpForm, date: e.target.value })}
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="dumpLocation" className="text-sm">Select Location (Shop)</Label>
                      <Select
                        value={dumpForm.location}
                        onValueChange={(value) => setDumpForm({ ...dumpForm, location: value })}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Choose shop location" />
                        </SelectTrigger>
                        <SelectContent>
                          {supabaseStocks.map((stock) => (
                            <SelectItem key={stock.location} value={stock.location}>
                              {stock.location} (Current: {stock.quantity} bags)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={async () => {
                        if (dumpForm.brand && dumpForm.subCategory && dumpForm.quantity && dumpForm.location) {
                          try {
                            const qty = Number.parseInt(dumpForm.quantity)

                            if (editingDumpId) {
                              // EDIT MODE: Update existing dump
                              // Find supplier/product by brand name
                              const supplier = supabaseProducts.find(p => p.name === dumpForm.brand)
                              if (!supplier) {
                                alert('Supplier/brand not found')
                                return
                              }

                              // Update the purchase record
                              await updatePurchase(editingDumpId, {
                                product_id: supplier.id,
                                quantity: qty,
                                category: dumpForm.subCategory,
                                date: dumpForm.date,
                                notes: `Stock dump: ${dumpForm.brand} - ${dumpForm.subCategory} to ${dumpForm.location} on ${dumpForm.date}`
                              })

                              // Refresh purchases
                              await refreshPurchases()

                              // Reset form and editing state
                              setEditingDumpId(null)
                              setDumpForm({
                                brand: "",
                                subCategory: "",
                                quantity: "",
                                date: new Date().toISOString().split("T")[0],
                                location: "",
                              })
                              setShowDumpStock(false)

                            } else {
                              // CREATE MODE: New dump
                              // Find stock record by location
                              const stock = supabaseStocks.find(s => s.location === dumpForm.location)
                              if (!stock) {
                                alert('Stock location not found')
                                return
                              }

                              // Find supplier/product by brand name
                              const supplier = supabaseProducts.find(p => p.name === dumpForm.brand)
                              if (!supplier) {
                                alert('Supplier/brand not found')
                                return
                              }

                              // Dump stock using hook function
                              // Database trigger will automatically create purchase record
                              await dumpStock(
                                stock.id,
                                qty,
                                dumpForm.location,  // Destination shop location
                                supplier.id,
                                dumpForm.subCategory,
                                `Stock dump: ${dumpForm.brand} - ${dumpForm.subCategory} to ${dumpForm.location} on ${dumpForm.date}`
                              )

                              // Refresh data to show updated stock
                              await refreshStocks()
                              await refreshPurchases()

                              // Reset form
                              setDumpForm({
                                brand: "",
                                subCategory: "",
                                quantity: "",
                                date: new Date().toISOString().split("T")[0],
                                location: "",
                              })
                              setShowDumpStock(false)
                            }

                          } catch (error: any) {
                            console.error('❌ Error with dump:', error)
                            alert(`Failed to ${editingDumpId ? 'update' : 'create'} dump: ` + (error.message || 'Unknown error'))
                          }
                        }
                      }}
                      className="w-full text-sm sm:text-base py-2.5 sm:py-3"
                      disabled={!dumpForm.brand || !dumpForm.subCategory || !dumpForm.quantity || !dumpForm.location}
                    >
                      {editingDumpId ? 'Update Dump' : 'Dump Stock'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <Card className="p-3 sm:p-6">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-lg sm:text-xl">Purchase Records</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4 justify-center sm:justify-start">
                  <Button
                    size="sm"
                    variant={!selectedPurchaseSupplier ? "default" : "outline"}
                    onClick={() => setSelectedPurchaseSupplier("")}
                    className="text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 h-auto min-w-0 flex-shrink-0"
                  >
                    All
                  </Button>
                  {brandOptions.map((brand) => (
                    <Button
                      key={brand}
                      size="sm"
                      variant={selectedPurchaseSupplier === brand ? "default" : "outline"}
                      onClick={() => {
                        setSelectedPurchaseSupplier(brand)
                        // Don't clear sub-category when clicking brand
                      }}
                      onDoubleClick={() => {
                        setSelectedPurchaseSupplier("")
                      }}
                      className="text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 h-auto min-w-0 flex-shrink-0"
                    >
                      {brand}
                    </Button>
                  ))}

                  <Dialog open={showAddBrand} onOpenChange={setShowAddBrand}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 h-auto">Custom +</Button>
                    </DialogTrigger>
                    <DialogContent className="w-[90vw] max-w-md">
                      <DialogHeader>
                        <DialogTitle className="text-base sm:text-lg">Add Custom Brand</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3">
                        <Label htmlFor="newBrand" className="text-sm">Brand Name</Label>
                        <Input
                          id="newBrand"
                          value={newBrandName}
                          onChange={(e) => setNewBrandName(e.target.value)}
                          placeholder="Enter brand name"
                          className="text-sm"
                        />
                        <Button
                          onClick={() => {
                            const b = newBrandName.trim()
                            if (!b) return
                            if (!brandOptions.includes(b)) setBrandOptions([...brandOptions, b])
                            setSelectedPurchaseSupplier(b)
                            setSelectedSubCategory("")
                            setNewBrandName("")
                            setShowAddBrand(false)
                          }}
                          className="w-full text-sm"
                        >
                          Save
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {selectedPurchaseSupplier && (
                  <div className="flex items-center gap-2 mb-3 sm:mb-4 justify-center sm:justify-start">
                    <Label htmlFor="categoryFilter" className="text-xs sm:text-sm font-medium">Category:</Label>
                    <Select value={selectedSubCategory} onValueChange={setSelectedSubCategory}>
                      <SelectTrigger className="w-auto min-w-[120px] text-xs sm:text-sm h-8 sm:h-10">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="Direct">Direct</SelectItem>
                        <SelectItem value="G.V">G.V</SelectItem>
                        <SelectItem value="G.L">G.L</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Summary Card for Aggregated Totals */}
                {selectedPurchaseSupplier && selectedSubCategory && selectedSubCategory !== "all" && (() => {
                  // Calculate aggregated totals for selected supplier + category with custom date range
                  const filteredPurchases = supabasePurchases
                    .filter(purchase => {
                      const supplierName = supabaseProducts.find(p => p.id === purchase.product_id)?.name
                      return supplierName === selectedPurchaseSupplier &&
                             (purchase.category || "Direct") === selectedSubCategory &&
                             (purchase.price_per_unit > 0 || (purchase.price_per_unit === 0 && (purchase as any).is_dump === false))
                    })
                    .filter(purchase => {
                      if (!summaryStartDate && !summaryEndDate) return true
                      const purchaseDate = new Date(purchase.date)
                      const start = summaryStartDate ? new Date(summaryStartDate) : null
                      const end = summaryEndDate ? new Date(summaryEndDate) : null
                      if (start && purchaseDate < start) return false
                      if (end && purchaseDate > end) return false
                      return true
                    })

                  // Get dumps from purchases table (only where is_dump = true)
                  const filteredDumps = supabasePurchases
                    .filter(purchase => {
                      const supplierName = supabaseProducts.find(p => p.id === purchase.product_id)?.name
                      const isDump = (purchase as any).is_dump === true
                      return supplierName === selectedPurchaseSupplier && 
                             (purchase.category || "Direct") === selectedSubCategory &&
                             isDump
                    })
                    .filter(purchase => {
                      if (!summaryStartDate && !summaryEndDate) return true
                      const purchaseDate = new Date(purchase.date)
                      const start = summaryStartDate ? new Date(summaryStartDate) : null
                      const end = summaryEndDate ? new Date(summaryEndDate) : null
                      if (start && purchaseDate < start) return false
                      if (end && purchaseDate > end) return false
                      return true
                    })

                  const totalBags = filteredPurchases.reduce((sum, p) => sum + p.quantity, 0) + filteredDumps.reduce((sum, d) => sum + d.quantity, 0)
                  const totalAmount = filteredPurchases.reduce((sum, p) => sum + p.total_amount, 0) // Dumps have 0 cost
                  const avgPricePerBag = totalBags > 0 ? Math.round(totalAmount / totalBags) : 0

                  return (
                    <Card className="mb-4 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                      <CardContent className="p-4">
                        {/* Date Range Inputs */}
                        <div className="mb-4 flex items-center gap-2">
                          <Input
                            id="summaryStartDate"
                            type="date"
                            value={summaryStartDate}
                            onChange={(e) => setSummaryStartDate(e.target.value)}
                            className="text-xs h-6 w-28"
                            placeholder=""
                          />
                          <span className="text-xs text-gray-500">to</span>
                          <Input
                            id="summaryEndDate"
                            type="date"
                            value={summaryEndDate}
                            onChange={(e) => setSummaryEndDate(e.target.value)}
                            className="text-xs h-6 w-28"
                            placeholder=""
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSummaryStartDate("")
                              setSummaryEndDate("")
                            }}
                            className="text-xs h-6 px-2"
                          >
                            ×
                          </Button>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-bold text-blue-900">
                              {selectedPurchaseSupplier} {selectedSubCategory} Summary
                            </h3>
                            <p className="text-sm text-blue-700">
                              {summaryStartDate || summaryEndDate
                                ? `Period: ${summaryStartDate ? new Date(summaryStartDate).toLocaleDateString('en-IN') : '...'} - ${summaryEndDate ? new Date(summaryEndDate).toLocaleDateString('en-IN') : '...'}`
                                : 'All dates'
                              }
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-3xl font-bold text-blue-900">{totalBags.toLocaleString()}</div>
                            <div className="text-sm text-blue-700 font-medium">Total Bags</div>
                          </div>
                        </div>



                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-blue-200">
                          <div className="text-xs text-blue-700">
                            <span className="font-medium">Purchases:</span> {filteredPurchases.length} ({filteredPurchases.reduce((sum, p) => sum + p.quantity, 0)} bags)
                          </div>
                          <div className="text-xs text-blue-700">
                            <span className="font-medium">Dumps:</span> {filteredDumps.length} ({filteredDumps.reduce((sum, d) => sum + d.quantity, 0)} bags)
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })()}

                {/* Purchase Records Display */}
                <div className="space-y-3 sm:space-y-4 max-h-96 overflow-y-auto">
                  {getFilteredData(purchaseData, purchaseDateFilter, "date")
                    .filter((purchase) => !selectedPurchaseSupplier || purchase.supplier === selectedPurchaseSupplier)
                    .filter((purchase) => selectedSubCategory === "all" || !selectedSubCategory || (purchase.category || "Direct") === selectedSubCategory)
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((purchase) => (
                      <div key={purchase.id} className={`flex items-center justify-between p-3 sm:p-4 border rounded-lg ${getPurchaseCardStyle(purchase.supplier, purchase.category).bg} ${getPurchaseCardStyle(purchase.supplier, purchase.category).border} relative`}>
                        {/* Delete and Edit Icons */}
                        <div className="absolute top-2 right-2 flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 hover:bg-blue-100"
                            onClick={() => {
                              const isDump = (purchase as any).is_dump
                              
                              if (isDump) {
                                // Edit dump - open dump dialog
                                setEditingDumpId(purchase.id)
                                setDumpForm({
                                  brand: purchase.supplier,
                                  subCategory: purchase.category || "Direct",
                                  quantity: purchase.bags.toString(),
                                  date: purchase.date,
                                  location: "" // Location not stored in purchase, user will need to reselect
                                })
                                setShowDumpStock(true)
                              } else {
                                // Edit regular purchase - open purchase dialog
                                setEditingPurchaseId(purchase.id)
                                setSelectedPurchaseSupplier(purchase.supplier)
                                setSelectedSubCategory(purchase.category || "")
                                setAddPurchaseForm({
                                  quantity: purchase.bags.toString(),
                                  unit: "bags",
                                  pricePerUnit: purchase.pricePerBag.toString(),
                                  originalPrice: purchase.originalPrice?.toString() || "",
                                  amount: purchase.total.toString(),
                                  date: purchase.date
                                })
                                setShowAddPurchase(true)
                              }
                            }}
                          >
                            <svg className="h-3 w-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 hover:bg-red-100"
                            onClick={async () => {
                              const itemType = (purchase as any).is_dump ? 'dump' : 'purchase'
                              if (window.confirm(`Are you sure you want to delete this ${itemType} of ${purchase.bags} bags from ${purchase.supplier}?`)) {
                                try {
                                  // Delete from Supabase
                                  await deletePurchase(purchase.id)
                                  // Refresh purchases to update UI
                                  await refreshPurchases()
                                } catch (error: any) {
                                  console.error('Error deleting purchase:', error)
                                  alert('Failed to delete: ' + (error.message || 'Unknown error'))
                                }
                              }
                            }}
                          >
                            <svg className="h-3 w-3 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </Button>
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge
                              variant={purchase.category === "Direct" ? "default" : purchase.category === "G.V" ? "secondary" : purchase.category === "G.L" ? "destructive" : "outline"}
                              className="text-xs font-bold"
                            >
                              {purchase.supplier} {purchase.category || "Direct"}
                            </Badge>
                            {/* DUMP Badge - only show for actual dumps (is_dump = true), not for sale transaction cards */}
                            {(purchase as any).is_dump === true && (
                              <Badge variant="outline" className="text-xs font-bold bg-orange-100 text-orange-700 border-orange-300">
                                DUMP
                              </Badge>
                            )}
                          </div>
                          <div className="space-y-1">
                            <p className="font-medium text-sm sm:text-base">
                              {purchase.bags} bags × ₹{purchase.pricePerBag.toLocaleString()} = ₹{purchase.total.toLocaleString()}
                            </p>
                            <div className="flex items-center gap-2">
                              <p className="text-xs sm:text-sm text-muted-foreground">{purchase.date}</p>
                            </div>
                          </div>

                          {/* Notes Section */}
                          <div className="flex items-center gap-2 mt-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 hover:bg-gray-100"
                              onClick={() => {
                                const noteId = `purchase-${purchase.id}`
                                setExpandedNotes(prev => {
                                  const newSet = new Set(prev)
                                  if (newSet.has(noteId)) {
                                    newSet.delete(noteId)
                                  } else {
                                    newSet.add(noteId)
                                  }
                                  return newSet
                                })
                              }}
                            >
                              <svg className={`h-3 w-3 ${purchase.notes ? 'text-blue-600 fill-current' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </Button>
                            {purchase.notes && (
                              <span className="text-xs text-blue-600 font-medium">Has notes</span>
                            )}
                          </div>

                          {/* Expanded Notes */}
                          {expandedNotes.has(`purchase-${purchase.id}`) && (
                            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                              {editingNote === `purchase-${purchase.id}` ? (
                                <div className="space-y-2">
                                  <Input
                                    value={noteText}
                                    onChange={(e) => setNoteText(e.target.value)}
                                    placeholder="Enter notes..."
                                    className="text-sm h-8"
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        // Save note
                                        setPurchaseData(prev => prev.map(p =>
                                          p.id === purchase.id
                                            ? { ...p, notes: noteText.trim() || undefined }
                                            : p
                                        ))
                                        setEditingNote(null)
                                        setNoteText("")
                                      }}
                                      className="h-6 text-xs px-2"
                                    >
                                      Save
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setEditingNote(null)
                                        setNoteText("")
                                      }}
                                      className="h-6 text-xs px-2"
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <p className="text-sm text-gray-700">
                                    {purchase.notes || "No notes added yet."}
                                  </p>
                                  <div className="flex gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setEditingNote(`purchase-${purchase.id}`)
                                        setNoteText(purchase.notes || "")
                                      }}
                                      className="h-6 text-xs px-2"
                                    >
                                      {purchase.notes ? 'Edit' : 'Add'} Note
                                    </Button>
                                    {purchase.notes && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setPurchaseData(prev => prev.map(p =>
                                            p.id === purchase.id
                                              ? { ...p, notes: undefined }
                                              : p
                                          ))
                                        }}
                                        className="h-6 text-xs px-2 text-red-600 hover:text-red-700"
                                      >
                                        Clear
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-600 text-sm sm:text-base">{purchase.bags}</p>
                          <p className="text-xs text-muted-foreground font-medium">total bags</p>
                        </div>
                      </div>
                    ))}
                  {getFilteredData(purchaseData, purchaseDateFilter, "date")
                    .filter((purchase) => !selectedPurchaseSupplier || purchase.supplier === selectedPurchaseSupplier)
                    .length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-sm">No purchase records found</p>
                      <p className="text-xs">Add purchases using the + Add button above</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="p-3 sm:p-6">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-lg sm:text-xl">Expenses</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-3 sm:space-y-4">
                  {getFilteredData(expenseData, purchaseDateFilter, "date")
                    .slice(0, 5)
                    .map((expense) => (
                      <div key={expense.id} className="border rounded-lg">
                        <div className="flex items-center justify-between p-3 sm:p-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium text-sm sm:text-base truncate">{expense.name}</p>
                              <Badge
                                variant="outline"
                                className="text-xs px-2 py-0.5 bg-orange-50 text-orange-700 border-orange-200"
                              >
                                {expense.category}
                              </Badge>
                              {expense.account && (
                                <Badge
                                  variant="outline"
                                  className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 border-blue-200"
                                >
                                  {expense.account}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs sm:text-sm text-muted-foreground">{expense.date}</p>
                            
                            {/* Notes display/edit */}
                            {expense.notes && expandedNotes.has(expense.id) && (
                              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-semibold text-gray-700">Notes:</span>
                                  <button
                                    onClick={() => {
                                      const newSet = new Set(expandedNotes)
                                      newSet.delete(expense.id)
                                      setExpandedNotes(newSet)
                                    }}
                                    className="text-gray-500 hover:text-gray-700"
                                  >
                                    ×
                                  </button>
                                </div>
                                {editingNote === expense.id ? (
                                  <div className="space-y-2">
                                    <textarea
                                      value={noteText}
                                      onChange={(e) => setNoteText(e.target.value)}
                                      className="w-full p-2 border rounded text-xs min-h-[60px]"
                                    />
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        onClick={() => {
                                          setExpenseData(prev =>
                                            prev.map(e =>
                                              e.id === expense.id
                                                ? { ...e, notes: noteText }
                                                : e
                                            )
                                          )
                                          // Also update in accountTransactions if it exists
                                          setAccountTransactions(prev =>
                                            prev.map(t =>
                                              t.id === expense.id
                                                ? { ...t, notes: noteText }
                                                : t
                                            )
                                          )
                                          setEditingNote(null)
                                          setNoteText("")
                                        }}
                                        className="h-7 text-xs"
                                      >
                                        Save
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setEditingNote(null)
                                          setNoteText("")
                                        }}
                                        className="h-7 text-xs"
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <p className="text-gray-600 whitespace-pre-wrap">{expense.notes}</p>
                                    <button
                                      onClick={() => {
                                        setEditingNote(expense.id)
                                        setNoteText(expense.notes || "")
                                      }}
                                      className="text-blue-600 hover:text-blue-800 mt-1"
                                    >
                                      Edit notes
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0 ml-4">
                            <p className="font-medium text-sm sm:text-base text-red-600">₹{expense.amount.toLocaleString()}</p>
                            <div className="flex gap-1 mt-2 justify-end">
                              {expense.notes && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    if (expandedNotes.has(expense.id)) {
                                      const newSet = new Set(expandedNotes)
                                      newSet.delete(expense.id)
                                      setExpandedNotes(newSet)
                                    } else {
                                      setExpandedNotes(prev => new Set(prev).add(expense.id))
                                    }
                                  }}
                                  className="h-6 text-xs px-2"
                                >
                                  <FileText className="h-3 w-3" />
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setAddExpenseForm({
                                    name: expense.name,
                                    amount: expense.amount.toString(),
                                    category: expense.category,
                                    date: expense.date,
                                    account: expense.account,
                                    notes: expense.notes || ""
                                  })
                                  setEditingAccountTransactionId(expense.id)
                                  setShowAddExpense(true)
                                }}
                                className="h-6 text-xs px-2"
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (confirm("Are you sure you want to delete this expense?")) {
                                    setExpenseData(prev => prev.filter(e => e.id !== expense.id))
                                    setAccountTransactions(prev => prev.filter(t => t.id !== expense.id))
                                  }
                                }}
                                className="h-6 text-xs px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="payments" className="p-4 md:p-6 space-y-4 md:space-y-6">
          {/* Header Section */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">Payment Management</h2>
              <p className="text-sm text-muted-foreground mt-1">Track payments and manage account balances</p>
            </div>

            {/* Filters and Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex gap-2">
                <DateInputWithIcon
                  value={paymentDateFilter}
                  onChange={(e) => setPaymentDateFilter(e.target.value)}
                  placeholder="DD-MM-YY"
                  className="w-auto min-w-[140px] placeholder:text-gray-500 md:placeholder:text-transparent"
                />
                <Button
                  variant="outline"
                  onClick={() => setPaymentDateFilter("")}
                  size="sm"
                  className="whitespace-nowrap"
                >
                  Clear
                </Button>
              </div>

              <Select value={selectedAccountFilter} onValueChange={setSelectedAccountFilter}>
                <SelectTrigger className="w-auto min-w-[140px]">
                  <SelectValue placeholder="Select Account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  {supabaseAccounts?.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="flex gap-2 md:gap-6 overflow-x-auto pb-2">
            <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-700">Total Payments</p>
                    <p className="text-2xl font-bold text-blue-900">
                      ₹{getFilteredPayments().reduce((sum, p) => sum + Math.abs(p.amount), 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-200 rounded-full">
                    <CreditCard className="h-6 w-6 text-blue-700" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-700">Active Accounts</p>
                    <p className="text-2xl font-bold text-green-900">{accounts.length}</p>
                  </div>
                  <div className="p-3 bg-green-200 rounded-full">
                    <Users className="h-6 w-6 text-green-700" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-700">This Month</p>
                    <p className="text-2xl font-bold text-purple-900">
                      ₹{getFilteredPayments()
                        .filter(p => {
                          const paymentDate = new Date(p.date)
                          const currentMonth = new Date()
                          return paymentDate.getMonth() === currentMonth.getMonth() &&
                                 paymentDate.getFullYear() === currentMonth.getFullYear()
                        })
                        .reduce((sum, p) => sum + Math.abs(p.amount), 0)
                        .toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-200 rounded-full">
                    <TrendingUp className="h-6 w-6 text-purple-700" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <Dialog open={showAddAccount} onOpenChange={setShowAddAccount}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Account
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Account</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="newAccountName">Account Name</Label>
                    <Input
                      id="newAccountName"
                      value={newAccountName}
                      onChange={(e) => setNewAccountName(e.target.value)}
                      placeholder="Enter account name (e.g., NEW ACCOUNT)"
                    />
                  </div>
                  <Button onClick={handleAddAccount} className="w-full" disabled={!newAccountName.trim()}>
                    Add Account
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showAddFunds} onOpenChange={setShowAddFunds}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Funds
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingAccountTransactionId ? "Edit" : "Add"} Funds to Account</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="addFundsAccount">Select Account</Label>
                    <Select value={selectedAccountForFunds} onValueChange={setSelectedAccountForFunds}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose account" />
                      </SelectTrigger>
                      <SelectContent>
                        {supabaseAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="addFundsAmount">Amount (₹)</Label>
                    <Input
                      id="addFundsAmount"
                      type="number"
                      value={fundAmount}
                      onChange={(e) => setFundAmount(e.target.value)}
                      placeholder="Enter amount to add"
                    />
                  </div>
                  <div>
                    <Label htmlFor="addFundsDate">Date</Label>
                    <Input
                      id="addFundsDate"
                      type="date"
                      value={fundDate}
                      onChange={(e) => setFundDate(e.target.value)}
                      placeholder="Select date (optional)"
                    />
                  </div>
                  <div>
                    <Label htmlFor="addFundsNotes">Notes (Optional)</Label>
                    <Input
                      id="addFundsNotes"
                      value={fundNotes}
                      onChange={(e) => setFundNotes(e.target.value)}
                      placeholder="Enter notes"
                    />
                  </div>
                  <Button
                    onClick={handleAddFunds}
                    className="w-full"
                    disabled={!selectedAccountForFunds || !fundAmount}
                  >
                    {editingAccountTransactionId ? "Update" : "Add"} Funds
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showRemoveFunds} onOpenChange={setShowRemoveFunds}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50">
                  Remove Funds
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingAccountTransactionId ? "Edit" : "Remove"} Funds from Account</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="removeFundsAccount">Select Account</Label>
                    <Select value={selectedAccountForFunds} onValueChange={setSelectedAccountForFunds}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose account" />
                      </SelectTrigger>
                      <SelectContent>
                        {supabaseAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="removeFundsAmount">Amount (₹)</Label>
                    <Input
                      id="removeFundsAmount"
                      type="number"
                      value={fundAmount}
                      onChange={(e) => setFundAmount(e.target.value)}
                      placeholder="Enter amount to remove"
                    />
                  </div>
                  <div>
                    <Label htmlFor="removeFundsDate">Date</Label>
                    <Input
                      id="removeFundsDate"
                      type="date"
                      value={fundDate}
                      onChange={(e) => setFundDate(e.target.value)}
                      placeholder="Select date (optional)"
                    />
                  </div>
                  <div>
                    <Label htmlFor="removeFundsNotes">Notes (Optional)</Label>
                    <Input
                      id="removeFundsNotes"
                      value={fundNotes}
                      onChange={(e) => setFundNotes(e.target.value)}
                      placeholder="Enter notes"
                    />
                  </div>
                  <Button
                    onClick={handleRemoveFunds}
                    className="w-full"
                    disabled={!selectedAccountForFunds || !fundAmount}
                  >
                    {editingAccountTransactionId ? "Update" : "Remove"} Funds
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showTransferAmount} onOpenChange={setShowTransferAmount}>
              <DialogTrigger asChild>
                <Button className="bg-purple-600 hover:bg-purple-700">
                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  Transfer Amount
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Transfer Amount Between Accounts</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="transferFromAccount">From Account</Label>
                    <Select value={transferFromAccount} onValueChange={setTransferFromAccount}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose source account" />
                      </SelectTrigger>
                      <SelectContent>
                        {supabaseAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="transferToAccount">To Account</Label>
                    <Select value={transferToAccount} onValueChange={setTransferToAccount}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose destination account" />
                      </SelectTrigger>
                      <SelectContent>
                        {supabaseAccounts.filter(acc => acc.id !== transferFromAccount).map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="transferAmountInput">Amount (₹)</Label>
                    <Input
                      id="transferAmountInput"
                      type="number"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      placeholder="Enter amount to transfer"
                    />
                  </div>
                  <div>
                    <Label htmlFor="transferDate">Date</Label>
                    <Input
                      id="transferDate"
                      type="date"
                      value={transferDate}
                      onChange={(e) => setTransferDate(e.target.value)}
                      placeholder="Select date (optional)"
                    />
                  </div>
                  <div>
                    <Label htmlFor="transferNotes">Notes (Optional)</Label>
                    <Input
                      id="transferNotes"
                      value={transferNotes}
                      onChange={(e) => setTransferNotes(e.target.value)}
                      placeholder="Enter notes"
                    />
                  </div>
                  <Button
                    onClick={handleTransferAmount}
                    className="w-full"
                    disabled={!transferFromAccount || !transferToAccount || !transferAmount}
                  >
                    Transfer Amount
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 gap-4 md:gap-6">
            {/* Account Balances and Transactions */}
            <Card className="w-full">
              <CardHeader className="pb-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-green-600" />
                      Account Balances & Transactions
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Select an account to view its balance and transactions
                    </p>
                  </div>

                  {/* Account Selector */}
                  <div className="flex items-center gap-3">
                    <Label htmlFor="accountSelector" className="text-sm font-medium">Select Account:</Label>
                    <Select value={selectedAccountFilter} onValueChange={setSelectedAccountFilter}>
                      <SelectTrigger className="w-auto min-w-[160px]">
                        <SelectValue placeholder="Choose account" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Accounts</SelectItem>
                        {supabaseAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {selectedAccountFilter === "all" ? (
                  /* All Accounts View */
                  <div className="p-4 md:p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {supabaseAccounts.map((account) => {
                        const total = account.balance // Use actual database balance
                        const totalSum = supabaseAccounts.reduce((sum, acc) => sum + acc.balance, 0)
                        const accountPercentage = totalSum > 0 ? (total / totalSum) * 100 : 0

                        return (
                          <div
                            key={account.id}
                            className="p-4 bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-lg hover:shadow-md transition-all duration-200 cursor-pointer"
                            onClick={() => setSelectedAccountFilter(account.id)}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <p className="font-semibold text-gray-900 text-sm md:text-base">{account.name}</p>
                              <Badge
                                variant="secondary"
                                className="text-xs bg-blue-100 text-blue-800"
                              >
                                {accountPercentage.toFixed(0)}%
                              </Badge>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Balance</span>
                                <span className="text-lg font-bold text-blue-700">
                                  ₹{total.toLocaleString()}
                                </span>
                              </div>

                              <div className="w-full bg-blue-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${Math.min(accountPercentage, 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  /* Single Account View */
                  <div className="p-4 md:p-6">
                    {(() => {
                      // Find the selected account to get its name and balance
                      const selectedAccount = supabaseAccounts.find(acc => acc.id === selectedAccountFilter)
                      if (!selectedAccount) return <div>Account not found</div>
                      
                      return (
                        <>
                          {/* Account Header */}
                          <div className="flex items-center justify-between mb-6 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                            <div>
                              <h3 className="text-xl font-bold text-gray-900">{selectedAccount.name}</h3>
                              <p className="text-sm text-muted-foreground">Account balance and transactions</p>
                            </div>
                            <div className="text-right">
                              <p className="text-3xl font-bold text-blue-700">
                                ₹{selectedAccount.balance.toLocaleString()}
                              </p>
                              <p className="text-sm text-muted-foreground">Current balance</p>
                            </div>
                          </div>

                          {/* Account Transactions */}
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="text-lg font-semibold text-gray-900">Recent Transactions</h4>
                              <Badge variant="outline" className="text-sm">
                          {getFilteredPayments().filter(p => p.account === selectedAccount.name).length} transactions
                        </Badge>
                      </div>

                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {getFilteredPayments()
                          .filter(p => p.account === selectedAccount.name)
                          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                          .map((payment, index) => (
                            <div
                              key={payment.id || index}
                              className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  {payment.type === "expense" ? (
                                    <Badge
                                      variant="outline"
                                      className="text-xs px-2 py-0.5 bg-orange-50 text-orange-700 border-orange-200"
                                    >
                                      Expense
                                    </Badge>
                                  ) : (
                                    <p className="font-semibold text-gray-900 truncate">{payment.customerName}</p>
                                  )}
                                  <Badge
                                    variant="outline"
                                    className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 border-blue-200"
                                  >
                                    {payment.account ? getAccountName(payment.account) : 'N/A'}
                                  </Badge>
                                  {payment.type === "expense" && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs px-2 py-0.5 bg-gray-50 text-gray-700 border-gray-200"
                                    >
                                      {payment.customerName}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground truncate mb-1">{payment.description}</p>
                                <p className="text-xs text-gray-500">{payment.date}</p>
                                
                                {/* Notes for expenses */}
                                {payment.type === "expense" && payment.notes && !expandedNotes.has(`expense-${payment.id}`) && (
                                  <button
                                    onClick={() => setExpandedNotes(prev => new Set(prev).add(`expense-${payment.id}`))}
                                    className="text-xs text-blue-600 hover:text-blue-800 mt-1 flex items-center gap-1"
                                  >
                                    <FileText className="h-3 w-3" />
                                    View notes
                                  </button>
                                )}
                                {payment.type === "expense" && expandedNotes.has(`expense-${payment.id}`) && (
                                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-semibold text-gray-700">Notes:</span>
                                      <button
                                        onClick={() => {
                                          const newSet = new Set(expandedNotes)
                                          newSet.delete(`expense-${payment.id}`)
                                          setExpandedNotes(newSet)
                                        }}
                                        className="text-gray-500 hover:text-gray-700"
                                      >
                                        ×
                                      </button>
                                    </div>
                                    {editingNote === `expense-${payment.id}` ? (
                                      <div className="space-y-2">
                                        <textarea
                                          value={noteText}
                                          onChange={(e) => setNoteText(e.target.value)}
                                          className="w-full p-2 border rounded text-xs min-h-[60px]"
                                        />
                                        <div className="flex gap-2">
                                          <Button
                                            size="sm"
                                            onClick={() => {
                                              setExpenseData(prev =>
                                                prev.map(e =>
                                                  e.id === payment.id
                                                    ? { ...e, notes: noteText }
                                                    : e
                                                )
                                              )
                                              setEditingNote(null)
                                              setNoteText("")
                                            }}
                                            className="h-7 text-xs"
                                          >
                                            Save
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                              setEditingNote(null)
                                              setNoteText("")
                                            }}
                                            className="h-7 text-xs"
                                          >
                                            Cancel
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div>
                                        <p className="text-gray-600 whitespace-pre-wrap">{payment.notes}</p>
                                        <button
                                          onClick={() => {
                                            setEditingNote(`expense-${payment.id}`)
                                            setNoteText(payment.notes || "")
                                          }}
                                          className="text-blue-600 hover:text-blue-800 mt-1"
                                        >
                                          Edit notes
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="text-right flex-shrink-0 ml-4">
                                <p className={`text-lg font-bold ${
                                  payment.type === "expense" ? 'text-red-600' : 
                                  payment.amount > 0 ? 'text-red-600' : 'text-green-600'
                                }`}>
                                  {payment.type === "expense" ? '-' : payment.amount > 0 ? '+' : ''}
                                  ₹{Math.abs(payment.amount).toLocaleString()}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {payment.type === "expense" ? 'Expense deduction' :
                                   payment.amount > 0 ? 'Payment due' : 'Payment received'}
                                </p>
                                
                                {/* Edit/Delete buttons for expenses */}
                                {payment.type === "expense" && (
                                  <div className="flex gap-1 mt-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        const expense = expenseData.find(e => e.id === payment.id)
                                        if (expense) {
                                          setAddExpenseForm({
                                            name: expense.name,
                                            amount: expense.amount.toString(),
                                            category: expense.category,
                                            date: expense.date,
                                            account: expense.account,
                                            notes: expense.notes || ""
                                          })
                                          setEditingAccountTransactionId(payment.id)
                                          setShowAddExpense(true)
                                        }
                                      }}
                                      className="h-7 text-xs"
                                    >
                                      <Edit2 className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        if (confirm("Are you sure you want to delete this expense?")) {
                                          setExpenseData(prev => prev.filter(e => e.id !== payment.id))
                                          setAccountTransactions(prev => prev.filter(t => t.id !== payment.id))
                                        }
                                      }}
                                      className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}

                        {getFilteredPayments().filter(p => p.account === selectedAccount.name).length === 0 && (
                          <div className="text-center py-12 px-4">
                            <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500 font-medium">No transactions found</p>
                            <p className="text-sm text-gray-400 mt-1">Transactions for this account will appear here</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Account Fund Transactions (Add/Remove/Transfer) */}
                    <div className="space-y-4 mt-8 pt-8 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-semibold text-gray-900">Fund Transactions</h4>
                        <Badge variant="outline" className="text-sm">
                          {accountTransactions.filter(t => {
                            if (selectedAccountFilter === "all") return true;
                            return t.account === selectedAccount.name;
                          }).filter(t => !t.description.startsWith("Expense:")).length} transactions
                        </Badge>
                      </div>

                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {accountTransactions
                          .filter(t => {
                            if (selectedAccountFilter === "all") return true;
                            return t.account === selectedAccount.name;
                          })
                          .filter(t => !t.description.startsWith("Expense:")) // Exclude expenses from fund transactions
                          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                          .map((transaction) => (
                            <div
                              key={transaction.id}
                              className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-white border border-blue-200 rounded-lg hover:shadow-sm transition-shadow"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge
                                    variant="outline"
                                    className={`text-xs px-2 py-0.5 ${
                                      transaction.type === "add-funds" || transaction.type === "transfer-in"
                                        ? "bg-green-50 text-green-700 border-green-200"
                                        : "bg-red-50 text-red-700 border-red-200"
                                    }`}
                                  >
                                    {transaction.type === "add-funds" && "Add Funds"}
                                    {transaction.type === "remove-funds" && (transaction.description.startsWith("Expense:") ? "Expense" : "Remove Funds")}
                                    {transaction.type === "transfer-in" && "Transfer In"}
                                    {transaction.type === "transfer-out" && "Transfer Out"}
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 border-blue-200"
                                  >
                                    {transaction.account}
                                  </Badge>
                                  {(transaction.type === "transfer-in" || transaction.type === "transfer-out") && transaction.relatedAccount && (
                                    <>
                                      <span className="text-xs text-gray-400">→</span>
                                      <Badge
                                        variant="outline"
                                        className="text-xs px-2 py-0.5 bg-purple-50 text-purple-700 border-purple-200"
                                      >
                                        {transaction.relatedAccount}
                                      </Badge>
                                    </>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground truncate mb-1">{transaction.description}</p>
                                <p className="text-xs text-gray-500">{transaction.date}</p>
                                {transaction.notes && !expandedNotes.has(`account-${transaction.id}`) && (
                                  <button
                                    onClick={() => setExpandedNotes(prev => new Set(prev).add(`account-${transaction.id}`))}
                                    className="text-xs text-blue-600 hover:text-blue-800 mt-1 flex items-center gap-1"
                                  >
                                    <FileText className="h-3 w-3" />
                                    View notes
                                  </button>
                                )}
                                {expandedNotes.has(`account-${transaction.id}`) && (
                                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-semibold text-gray-700">Notes:</span>
                                      <button
                                        onClick={() => {
                                          const newSet = new Set(expandedNotes)
                                          newSet.delete(`account-${transaction.id}`)
                                          setExpandedNotes(newSet)
                                        }}
                                        className="text-gray-500 hover:text-gray-700"
                                      >
                                        ×
                                      </button>
                                    </div>
                                    {editingNote === `account-${transaction.id}` ? (
                                      <div className="space-y-2">
                                        <textarea
                                          value={noteText}
                                          onChange={(e) => setNoteText(e.target.value)}
                                          className="w-full p-2 border rounded text-xs min-h-[60px]"
                                        />
                                        <div className="flex gap-2">
                                          <Button
                                            size="sm"
                                            onClick={() => {
                                              setAccountTransactions(prev =>
                                                prev.map(t =>
                                                  t.id === transaction.id
                                                    ? { ...t, notes: noteText }
                                                    : t
                                                )
                                              )
                                              setEditingNote(null)
                                              setNoteText("")
                                            }}
                                            className="h-7 text-xs"
                                          >
                                            Save
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                              setEditingNote(null)
                                              setNoteText("")
                                            }}
                                            className="h-7 text-xs"
                                          >
                                            Cancel
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div>
                                        <p className="text-gray-600 whitespace-pre-wrap">{transaction.notes}</p>
                                        <button
                                          onClick={() => {
                                            setEditingNote(`account-${transaction.id}`)
                                            setNoteText(transaction.notes || "")
                                          }}
                                          className="text-blue-600 hover:text-blue-800 mt-1"
                                        >
                                          Edit notes
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="text-right flex-shrink-0 ml-4">
                                <p className={`text-lg font-bold ${
                                  transaction.type === "add-funds" || transaction.type === "transfer-in"
                                    ? "text-green-600"
                                    : "text-red-600"
                                }`}>
                                  {transaction.type === "add-funds" || transaction.type === "transfer-in" ? "+" : "-"}
                                  ₹{transaction.amount.toLocaleString()}
                                </p>
                                <div className="flex gap-1 mt-2">
                                  {(transaction.type === "add-funds" || transaction.type === "remove-funds") && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        const isExpense = transaction.description.startsWith("Expense:")
                                        
                                        if (isExpense) {
                                          // Find the corresponding expense in expenseData
                                          const expense = expenseData.find(e => e.id === transaction.id)
                                          if (expense) {
                                            setAddExpenseForm({
                                              name: expense.name,
                                              amount: expense.amount.toString(),
                                              category: expense.category,
                                              date: expense.date,
                                              account: expense.account,
                                              notes: expense.notes || ""
                                            })
                                            setEditingAccountTransactionId(transaction.id)
                                            setShowAddExpense(true)
                                          }
                                        } else if (transaction.type === "add-funds") {
                                          setSelectedAccountForFunds(transaction.account)
                                          setFundAmount(transaction.amount.toString())
                                          setFundDate(transaction.date)
                                          setFundNotes(transaction.notes || "")
                                          setEditingAccountTransactionId(transaction.id)
                                          setShowAddFunds(true)
                                        } else if (transaction.type === "remove-funds") {
                                          setSelectedAccountForFunds(transaction.account)
                                          setFundAmount(transaction.amount.toString())
                                          setFundDate(transaction.date)
                                          setFundNotes(transaction.notes || "")
                                          setEditingAccountTransactionId(transaction.id)
                                          setShowRemoveFunds(true)
                                        }
                                      }}
                                      className="h-7 text-xs"
                                    >
                                      <Edit2 className="h-3 w-3" />
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      if (confirm("Are you sure you want to delete this transaction?")) {
                                        setAccountTransactions(prev => prev.filter(t => t.id !== transaction.id))
                                        // Also delete from expenseData if it's an expense
                                        if (transaction.description.startsWith("Expense:")) {
                                          setExpenseData(prev => prev.filter(e => e.id !== transaction.id))
                                        }
                                      }
                                    }}
                                    className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}

                        {accountTransactions.filter(t => {
                          if (selectedAccountFilter === "all") return true;
                          return t.account === selectedAccount.name;
                        }).length === 0 && (
                          <div className="text-center py-12 px-4">
                            <Wallet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500 font-medium">No fund transactions found</p>
                            <p className="text-sm text-gray-400 mt-1">Fund transactions will appear here</p>
                          </div>
                        )}
                      </div>
                    </div>
                        </>
                      )
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {userRole === "admin" && (
          <TabsContent value="employees" className="p-6 space-y-6">
            <h2 className="text-2xl font-bold">Employees</h2>
            <p>Employee management features will be implemented here.</p>
          </TabsContent>
        )}

        <TabsContent value="products" className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Product Management</h2>
            <Dialog open={showAddBrand} onOpenChange={setShowAddBrand}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Product</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="productName">Product Name</Label>
                    <Input
                      id="productName"
                      value={newBrandName}
                      onChange={(e) => setNewBrandName(e.target.value)}
                      placeholder="e.g., Paint, Steel, Cement Type A"
                    />
                  </div>
                  <div>
                    <Label htmlFor="productCategory">Category</Label>
                    <Select
                      value={selectedProductCategory}
                      onValueChange={(value) => {
                        setSelectedProductCategory(value)
                        if (value !== "Custom") {
                          setCustomCategoryName("")
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {productCategories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                        <SelectItem value="Custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedProductCategory === "Custom" && (
                    <div>
                      <Label htmlFor="customCategory">Custom Category Name</Label>
                      <Input
                        id="customCategory"
                        value={customCategoryName}
                        onChange={(e) => setCustomCategoryName(e.target.value)}
                        placeholder="Enter custom category name"
                      />
                    </div>
                  )}
                  <Button
                    onClick={() => {
                      const product = newBrandName.trim()
                      if (!product) return

                      let finalCategory = selectedProductCategory
                      if (selectedProductCategory === "Custom") {
                        const customCat = customCategoryName.trim()
                        if (customCat && !productCategories.includes(customCat)) {
                          setProductCategories([...productCategories, customCat])
                        }
                        finalCategory = customCat || "Custom"
                      }

                      if (!productTypes.some(p => p.name === product)) {
                        // Add product to Supabase
                        addProduct(product, finalCategory).then(() => refreshProducts()).catch(console.error)
                        setNewBrandName("")
                        setSelectedProductCategory("")
                        setCustomCategoryName("")
                        setShowAddBrand(false)
                      }
                    }}
                    className="w-full"
                    disabled={!selectedProductCategory || (selectedProductCategory === "Custom" && !customCategoryName.trim())}
                  >
                    Add Product
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            <Card className="p-3">
              <div className="text-center">
                <div className="text-xl md:text-2xl font-bold text-blue-600 mb-1">{productTypes.length}</div>
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Total Products</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Available product types</p>
              </div>
            </Card>

            <Card className="p-3">
              <div className="text-center">
                <div className="text-xl md:text-2xl font-bold text-green-600 mb-1">
                  {productTypes.filter(p => p.name.includes("Cement") || p.name.includes("JSW") || p.name.includes("Ultra") || p.name.includes("Sri")).length}
                </div>
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Cement Products</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Cement and concrete products</p>
              </div>
            </Card>

            <Card className="p-3 col-span-2 md:col-span-1">
              <div className="text-center">
                <div className="text-xl md:text-2xl font-bold text-purple-600 mb-1">
                  {productTypes.filter(p => p.name.includes("Paint") || p.name.includes("Steel")).length}
                </div>
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Other Products</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Paint and steel products</p>
              </div>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                <div className="flex-1">
                  <CardTitle className="text-lg sm:text-xl">Product Types</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    These products appear as options in the Product Type field when adding sales
                  </p>
                </div>
                <div className="flex justify-end">
                  <Select value={productCategoryFilter} onValueChange={setProductCategoryFilter}>
                    <SelectTrigger className="w-[160px] sm:w-[180px]">
                      <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {productCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-4">
                {productTypes
                  .filter((product) => {
                    if (productCategoryFilter === "all") return true
                    return product.category === productCategoryFilter
                  })
                  .map((product, index) => (
                    <div key={index} className="group relative bg-gradient-to-br from-white to-gray-50 hover:from-blue-50 hover:to-purple-50 border border-gray-200 hover:border-blue-300 rounded-lg p-2 md:p-3 transition-all duration-200 hover:shadow-md hover:scale-[1.02]">
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 text-xs md:text-sm truncate leading-tight">
                              {product.name}
                            </h4>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <Badge
                            variant="secondary"
                            className={`text-xs px-2 py-0.5 font-medium ${
                              product.category === 'Cement' ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' :
                              product.category === 'Paint' ? 'bg-green-100 text-green-800 hover:bg-green-200' :
                              product.category === 'Steel' ? 'bg-orange-100 text-orange-800 hover:bg-orange-200' :
                              'bg-purple-100 text-purple-800 hover:bg-purple-200'
                            } transition-colors duration-200`}
                          >
                            {product.category}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
              {productTypes.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No products added yet</p>
                  <p className="text-sm">Click "Add Product" to create your first product type</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="p-6 space-y-6">
          {/* Landing Page */}
          {reportsView === "landing" && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Reports Module</h2>
                <p className="text-muted-foreground">Choose a report type to generate</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
                <Card
                  className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
                  onClick={() => setReportsView("customer-list")}
                >
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users className="h-8 w-8 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Customer Ledger</h3>
                    <p className="text-sm text-muted-foreground">
                      View detailed transaction history and balances for individual customers
                    </p>
                  </CardContent>
                </Card>

                <Card 
                  className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
                  onClick={() => {
                    const today = new Date()
                    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
                    setReportStartDate('2024-01-01')
                    setReportEndDate(today.toISOString().split('T')[0])
                    setShowItemReportByParty(true)
                  }}
                >
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <TrendingUp className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Item Report by Party</h3>
                    <p className="text-sm text-muted-foreground">
                      View sales quantities by party and product type
                    </p>
                  </CardContent>
                </Card>

                <Card
                  className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
                  onClick={() => {
                    const today = new Date()
                    setReportStartDate('2024-01-01')
                    setReportEndDate(today.toISOString().split('T')[0])
                    setShowItemSaleSummary(true)
                  }}
                >
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Package className="h-8 w-8 text-purple-600" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Item Sale Summary</h3>
                    <p className="text-sm text-muted-foreground">
                      View total sales quantities by product type
                    </p>
                  </CardContent>
                </Card>

                <Card
                  className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
                  onClick={() => {
                    const today = new Date()
                    setReportStartDate('2024-01-01')
                    setReportEndDate(today.toISOString().split('T')[0])
                    setShowMonthlyBusinessSummary(true)
                  }}
                >
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <BarChart3 className="h-8 w-8 text-orange-600" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Monthly Business Summary</h3>
                    <p className="text-sm text-muted-foreground">
                      Compare monthly sales vs. collections
                    </p>
                  </CardContent>
                </Card>

                <Card
                  className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
                  onClick={() => {
                    const today = new Date()
                    setReportStartDate('2024-01-01')
                    setReportEndDate(today.toISOString().split('T')[0])
                    setShowCustomerWiseSummary(true)
                  }}
                >
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users className="h-8 w-8 text-indigo-600" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Customer-Wise Summary</h3>
                    <p className="text-sm text-muted-foreground">
                      View total sales, payments, and balances for all customers
                    </p>
                  </CardContent>
                </Card>

                <Card
                  className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
                  onClick={() => {
                    const today = new Date()
                    setReportStartDate('2024-01-01')
                    setReportEndDate(today.toISOString().split('T')[0])
                    setShowAccountBalanceSummary(true)
                  }}
                >
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CreditCard className="h-8 w-8 text-emerald-600" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Account Balance Summary</h3>
                    <p className="text-sm text-muted-foreground">
                      View current balances and transaction summaries for all accounts
                    </p>
                  </CardContent>
                </Card>

                <Card
                  className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
                  onClick={() => {
                    const today = new Date()
                    setReportStartDate('2024-01-01')
                    setReportEndDate(today.toISOString().split('T')[0])
                    setShowTransactionReport(true)
                  }}
                >
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <History className="h-8 w-8 text-red-600" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Transaction Report</h3>
                    <p className="text-sm text-muted-foreground">
                      View all transactions with debit/credit format like Khatabook
                    </p>
                  </CardContent>
                </Card>

                {/* New Profit/Loss Analysis Report */}
                <Card
                  className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
                  onClick={() => {
                    const today = new Date()
                    setReportStartDate('2024-01-01')
                    setReportEndDate(today.toISOString().split('T')[0])
                    setShowProfitLossAnalysis(true)
                  }}
                >
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <TrendingUp className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Profit/Loss Analysis</h3>
                    <p className="text-sm text-muted-foreground">
                      Compares selling vs. cost prices and calculates profit margins
                    </p>
                  </CardContent>
                </Card>

                {/* New Customer Activity Report */}
                <Card
                  className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
                  onClick={() => {
                    const today = new Date()
                    setReportStartDate('2024-01-01')
                    setReportEndDate(today.toISOString().split('T')[0])
                    setShowCustomerActivityReport(true)
                  }}
                >
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <UserCheck className="h-8 w-8 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Customer Activity Report</h3>
                    <p className="text-sm text-muted-foreground">
                      30-day activity window with active/inactive customer classification
                    </p>
                  </CardContent>
                </Card>

                {/* New Product Sub-Category Report */}
                <Card
                  className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
                  onClick={() => {
                    setShowProductSubCategoryReport(true)
                    setReportStartDate('2024-01-01')
                    setReportEndDate(new Date().toISOString().split('T')[0])
                  }}
                >
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Package className="h-8 w-8 text-purple-600" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Product Sub-Category Report</h3>
                    <p className="text-sm text-muted-foreground">
                      Product-specific performance with regular vs. dump transaction separation
                    </p>
                  </CardContent>
                </Card>

                {/* Notepad */}
                <Card
                  className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
                  onClick={() => setReportsView("notepad")}
                >
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileText className="h-8 w-8 text-yellow-600" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Notepad</h3>
                    <p className="text-sm text-muted-foreground">
                      Write and save important notes with dates and export to PDF
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Customer List View */}
          {reportsView === "customer-list" && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setReportsView("landing")
                    setSelectedCustomer(null)
                  }}
                  className="h-8"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Reports
                </Button>
                <div>
                  <h2 className="text-xl font-bold">Customer Ledger Reports</h2>
                  <p className="text-sm text-muted-foreground">Select a customer to view their detailed ledger</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                {customerData.map((customer, index) => (
                  <div
                    key={customer.name}
                    className="bg-white rounded-lg border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-purple-50 p-2 sm:p-3 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02] cursor-pointer"
                    onClick={() => {
                      setSelectedCustomer(customer)
                      setReportsView("customer-details")
                    }}
                  >
                    {/* Header - All info in one row */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 mb-1">
                          <Badge className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-800">
                            Customer
                          </Badge>
                          <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                            {customer.category}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 truncate">Phone: {customer.phone}</p>
                      </div>
                      <div className="text-right ml-2">
                        <p className={`text-sm font-bold ${
                          customer.balance > 0 ? "text-red-600" : customer.balance < 0 ? "text-green-600" : "text-gray-600"
                        }`}>
                          {customer.balance > 0 ? "+" : customer.balance < 0 ? "-" : ""}₹{Math.abs(customer.balance).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {customer.balance > 0 ? "Due" : customer.balance < 0 ? "Advance" : "Settled"}
                        </p>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="space-y-2">
                      <p className="font-medium text-gray-900 text-sm leading-tight truncate">
                        {customer.name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {customerData.length === 0 && (
                <div className="text-center py-12">
                  <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Customers Found</h3>
                  <p className="text-muted-foreground">Add customers in the Customers tab to generate ledger reports</p>
                </div>
              )}
            </div>
          )}

          {/* Customer Details View */}
          {reportsView === "customer-details" && selectedCustomer && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setReportsView("customer-list")
                    setSelectedCustomer(null)
                  }}
                  className="h-8"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Customers
                </Button>
                <div>
                  <h2 className="text-xl font-bold">{selectedCustomer.name} Statement</h2>
                  <p className="text-sm text-muted-foreground">Customer Ledger Details</p>
                </div>
              </div>

              {/* Date Range Filter */}
              <div className="mb-4">
                <div className="flex gap-2">
                  <div className="flex-1">
                  <Label htmlFor="fromDate" className="text-sm">From Date</Label>
                  <DateInputWithIcon
                    value={customerTransactionStartDate}
                    onChange={(e) => setCustomerTransactionStartDate(e.target.value)}
                    placeholder="DD-MM-YY"
                    className="text-sm placeholder:text-gray-500 md:placeholder:text-transparent"
                  />
                  </div>
                  <div className="flex-1">
                  <Label htmlFor="toDate" className="text-sm">To Date</Label>
                  <DateInputWithIcon
                    value={customerTransactionEndDate}
                    onChange={(e) => setCustomerTransactionEndDate(e.target.value)}
                    placeholder="DD-MM-YY"
                    className="text-sm placeholder:text-gray-500 md:placeholder:text-transparent"
                  />
                  </div>
                </div>
                <div className="mt-2 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCustomerTransactionStartDate("")
                      setCustomerTransactionEndDate("")
                    }}
                    className="h-9"
                  >
                    Clear
                  </Button>
                  <Button
                    onClick={generatePDFReport}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 h-9"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    PDF Report
                  </Button>
                </div>
              </div>

              {/* Customer Statement Header */}
              <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                <CardContent className="p-1">
                  <div className="text-center mb-1">
                    <h1 className="text-sm font-bold text-gray-900 mb-0.5">{selectedCustomer.name} Statement</h1>
                    <p className="text-gray-600 text-xs">Phone: {selectedCustomer.phone}</p>
                    <p className="text-gray-600 text-xs">
                      ({customerTransactionStartDate ? new Date(customerTransactionStartDate).toLocaleDateString('en-IN') : 'Start'} - {customerTransactionEndDate ? new Date(customerTransactionEndDate).toLocaleDateString('en-IN') : 'End'})
                    </p>
                  </div>

                  {/* Summary Row */}
                  {(() => {
                    const filteredTransactions = getFilteredTransactions()
                    const totalDebit = filteredTransactions.filter(t => t.type === 'sale').reduce((sum, t) => sum + t.amount, 0)
                    const totalCredit = filteredTransactions.filter(t => t.type === 'payment').reduce((sum, t) => sum + Math.abs(t.amount), 0)
                    const openingBalance = 0 // Assuming opening balance is 0 for this period
                    const netBalance = openingBalance + totalDebit - totalCredit

                    return (
                      <div className="grid grid-cols-4 gap-0.5 mb-1 p-1 bg-white rounded border">
                        <div className="text-center">
                          <p className="text-xs font-medium text-gray-600">Opening</p>
                          <p className="text-xs font-bold">₹{openingBalance.toLocaleString()}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-medium text-red-600">Debit(-)</p>
                          <p className="text-xs font-bold text-red-600">₹{totalDebit.toLocaleString()}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-medium text-green-600">Credit(+)</p>
                          <p className="text-xs font-bold text-green-600">₹{totalCredit.toLocaleString()}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-medium text-blue-600">Balance</p>
                          <p className={`text-xs font-bold ${netBalance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                            ₹{Math.abs(netBalance).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )
                  })()}

                  {/* Number of Entries */}
                  <div className="text-center mb-0.5">
                    <p className="text-xs text-gray-600">
                      Entries: {getFilteredTransactions().length} (All)
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Monthly Transaction Sections */}
              {(() => {
                const filteredTransactions = getFilteredTransactions()
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

                // Group transactions by month and year
                const groupedByMonth = filteredTransactions.reduce((acc, transaction) => {
                  const date = new Date(transaction.date)
                  const monthYear = `${date.toLocaleDateString('en-IN', { year: 'numeric', month: 'long' })} ${date.getFullYear()}`

                  if (!acc[monthYear]) {
                    acc[monthYear] = []
                  }
                  acc[monthYear].push(transaction)
                  return acc
                }, {} as Record<string, typeof filteredTransactions>)

                let runningBalance = 0

                return Object.entries(groupedByMonth).map(([monthYear, transactions]) => {
                  const monthlyDebit = transactions.filter(t => t.type === 'sale').reduce((sum, t) => sum + t.amount, 0)
                  const monthlyCredit = transactions.filter(t => t.type === 'payment').reduce((sum, t) => sum + Math.abs(t.amount), 0)

                  return (
                    <Card key={monthYear} className="mb-4">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-semibold text-gray-800">{monthYear}</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="text-left px-4 py-2">Date</th>
                                <th className="text-left px-4 py-2">Details</th>
                                <th className="text-right px-4 py-2">Debit(-)</th>
                                <th className="text-right px-4 py-2">Credit(+)</th>
                                <th className="text-right px-4 py-2">Balance</th>
                              </tr>
                            </thead>
                            <tbody>
                              {transactions.map((transaction) => {
                                if (transaction.type === 'sale') {
                                  runningBalance += transaction.amount
                                } else {
                                  runningBalance -= Math.abs(transaction.amount)
                                }

                                const transactionDate = new Date(transaction.date)
                                const day = transactionDate.getDate()
                                const month = transactionDate.toLocaleDateString('en-IN', { month: 'short' })

                                return (
                                  <tr key={transaction.id} className="hover:bg-gray-50 border-b">
                                    <td className="px-4 py-2 text-gray-600 whitespace-nowrap">{day} {month}</td>
                                    <td className="px-4 py-2">
                                      <p className="font-medium">{transaction.description}</p>
                                      {transaction.bags && transaction.type === 'sale' && (
                                        <p className="text-xs text-gray-500">{transaction.bags} bags</p>
                                      )}
                                      {transaction.subCategory && (
                                        <p className="text-xs text-gray-500">{transaction.subCategory}</p>
                                      )}
                                    </td>
                                    <td className="px-4 py-2 text-right align-top">
                                      {transaction.type === 'sale' && (
                                        <span className="text-red-600 font-medium">₹{transaction.amount.toLocaleString()}</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-2 text-right align-top">
                                      {transaction.type === 'payment' && (
                                        <span className="text-green-600 font-medium">₹{Math.abs(transaction.amount).toLocaleString()}</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-2 text-right align-top">
                                      <span className={`font-semibold ${runningBalance >= 0 ? 'text-red-600' : 'text-green-600'}`}>₹{Math.abs(runningBalance).toLocaleString()}</span>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                            <tfoot className="bg-gray-100">
                              <tr>
                                <td className="px-4 py-3 font-semibold" colSpan={2}>{monthYear} Total</td>
                                <td className="px-4 py-3 text-right text-red-600 font-semibold">₹{monthlyDebit.toLocaleString()}</td>
                                <td className="px-4 py-3 text-right text-green-600 font-semibold">₹{monthlyCredit.toLocaleString()}</td>
                                <td className="px-4 py-3" />
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              })()}

              {getFilteredTransactions().length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No transactions found for the selected date range</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Notepad View */}
          {reportsView === "notepad" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setReportsView("landing")}
                    className="h-8"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Reports
                  </Button>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Notepad</h2>
                    <p className="text-sm text-muted-foreground">Write your important notes with dates</p>
                  </div>
                </div>
                <Button
                  onClick={async () => {
                    if (!notepadContent.trim()) {
                      alert("Please write some notes before generating PDF")
                      return
                    }
                    
                    // Generate PDF for notepad
                    const NotepadPDF = () => (
                      <Document>
                        <Page size="A4" style={{ padding: 30 }}>
                          <View style={{ marginBottom: 20 }}>
                            <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 10 }}>Important Notes</Text>
                            <Text style={{ fontSize: 10, color: '#666' }}>
                              Generated on: {new Date().toLocaleDateString('en-IN')}
                            </Text>
                          </View>
                          <View style={{ borderTop: '2px solid #000', paddingTop: 20 }}>
                            {notepadContent.split('\n').map((line, index) => (
                              <Text key={index} style={{ fontSize: 11, lineHeight: 1.8, marginBottom: 2 }}>
                                {line || ' '}
                              </Text>
                            ))}
                          </View>
                        </Page>
                      </Document>
                    )
                    
                    const blob = await pdf(<NotepadPDF />).toBlob()
                    const url = URL.createObjectURL(blob)
                    const link = document.createElement('a')
                    link.href = url
                    link.download = `notepad-${new Date().toISOString().split('T')[0]}.pdf`
                    link.click()
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export to PDF
                </Button>
              </div>

              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <Label htmlFor="notepad" className="text-lg font-semibold">Your Notes</Label>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const today = new Date().toLocaleDateString('en-IN')
                            const dateHeader = `\n\n═══ ${today} ═══\n\n`
                            setNotepadContent(prev => prev + dateHeader)
                          }}
                        >
                          <Calendar className="h-4 w-4 mr-2" />
                          Insert Date
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (confirm("Are you sure you want to clear all notes?")) {
                              setNotepadContent("")
                            }
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          Clear All
                        </Button>
                      </div>
                    </div>
                    
                    <textarea
                      id="notepad"
                      value={notepadContent}
                      onChange={(e) => setNotepadContent(e.target.value)}
                      placeholder="Start writing your notes here...&#10;&#10;Tip: Click 'Insert Date' button to add today's date as a separator"
                      className="w-full min-h-[500px] p-4 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none resize-y font-mono text-sm leading-relaxed"
                      style={{ fontFamily: 'monospace' }}
                    />
                    
                    <div className="flex items-center justify-between pt-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        {notepadContent.length} characters • {notepadContent.split('\n').length} lines
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Auto-saved locally
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Example/Help Section */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <AlertTriangle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-blue-900 mb-1">How to use Notepad:</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Click "Insert Date" to add today's date as a separator</li>
                        <li>• Write your notes below each date entry</li>
                        <li>• Use the "Export to PDF" button to download your notes</li>
                        <li>• Notes are automatically saved in your browser</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings" className="p-6 space-y-6">
          <h2 className="text-2xl font-bold">Settings</h2>
          <p>Settings panel will be implemented here.</p>
        </TabsContent>
      </Tabs>

      {/* Item Report by Party Dialog - Khatabook Style */}
      <Dialog open={showItemReportByParty} onOpenChange={setShowItemReportByParty}>
        <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden p-0">
          <DialogTitle className="sr-only">Item Reports by Party</DialogTitle>
          {/* Khatabook Style Header */}
          <div className="bg-blue-600 text-white p-4">
            <div className="flex items-center justify-between pr-10">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowItemReportByParty(false)}
                  className="text-white hover:bg-blue-700 p-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-lg font-semibold">Item Reports by Party</h2>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-blue-700"
                  onClick={async () => {
                    const data = getItemReportByPartyData()
                    if (data.length === 0) {
                      alert('No data found for the selected date range')
                      return
                    }

                    try {
                      // Generate PDF for Item Report by Party
                      const pdfBlob = await generateItemReportByPartyPDF(data, reportStartDate, reportEndDate)
                      const url = URL.createObjectURL(pdfBlob)
                      const link = document.createElement('a')
                      link.href = url
                      link.download = `Item_Report_By_Party_${reportStartDate}_to_${reportEndDate}.pdf`
                      document.body.appendChild(link)
                      link.click()
                      document.body.removeChild(link)
                      URL.revokeObjectURL(url)
                    } catch (error) {
                      console.error('Error generating PDF:', error)
                      alert('Error generating PDF. Please try again.')
                    }
                  }}
                >
                  <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                  </svg>
                  PDF
                </Button>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* Date Range and Filter Section */}
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium">
                    {reportStartDate && reportEndDate 
                      ? `${new Date(reportStartDate).toLocaleDateString('en-IN')} - ${new Date(reportEndDate).toLocaleDateString('en-IN')}`
                      : 'Select Date Range'
                    }
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = new Date()
                    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
                    setReportStartDate(lastMonth.toISOString().split('T')[0])
                    setReportEndDate(today.toISOString().split('T')[0])
                  }}
                  className="text-purple-600 border-purple-600 hover:bg-purple-50"
                >
                  CHANGE
                </Button>
              </div>
              
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label className="text-xs text-gray-600">From Date</Label>
                  <Input
                    type="date"
                    value={reportStartDate}
                    onChange={(e) => setReportStartDate(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-xs text-gray-600">To Date</Label>
                  <Input
                    type="date"
                    value={reportEndDate}
                    onChange={(e) => setReportEndDate(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Filter Section */}
            <div className="bg-purple-50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-purple-800">All Parties</span>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-purple-600">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </Button>
              </div>
            </div>

            {/* Summary Cards */}
            {reportStartDate && reportEndDate && (() => {
              const data = getItemReportByPartyData()
              const totalQuantity = data.reduce((sum, item) => sum + item.quantity, 0)
              const totalAmount = data.reduce((sum, item) => sum + item.amount, 0)
              const uniqueParties = new Set(data.map(item => item.party)).size

              return (
                <div className="grid grid-cols-3 gap-1">
                  <div className="bg-blue-50 border border-blue-200 rounded p-1.5">
                    <div className="text-center">
                      <div className="text-xs font-medium text-blue-800 mb-0.5">Total Parties</div>
                      <div className="text-xs font-bold text-blue-600">{uniqueParties}</div>
                    </div>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded p-1.5">
                    <div className="text-center">
                      <div className="text-xs font-medium text-green-800 mb-0.5">Total Quantity</div>
                      <div className="text-xs font-bold text-green-600">{totalQuantity.toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded p-1.5">
                    <div className="text-center">
                      <div className="text-xs font-medium text-purple-800 mb-0.5">Total Amount</div>
                      <div className="text-xs font-bold text-purple-600">₹{totalAmount.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Data Table */}
            {reportStartDate && reportEndDate && (
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th className="text-left p-1.5 text-xs font-semibold text-gray-700 border-r">Party</th>
                        <th className="text-left p-1.5 text-xs font-semibold text-gray-700 border-r">Item Name</th>
                        <th className="text-right p-1.5 text-xs font-semibold text-gray-700 border-r">Sales Qty.</th>
                        <th className="text-right p-1.5 text-xs font-semibold text-gray-700">Sales Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getItemReportByPartyData().map((item, index) => (
                        <tr key={index} className={`border-b hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <td className="p-1.5 text-xs border-r font-medium">{item.party}</td>
                          <td className="p-1.5 text-xs border-r">{item.product}</td>
                          <td className="p-1.5 text-xs border-r text-right">{item.quantity} {item.unit}</td>
                          <td className="p-1.5 text-xs text-right font-semibold text-green-600">₹{item.amount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {reportStartDate && reportEndDate && getItemReportByPartyData().length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No data found for the selected date range</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Item Sale Summary Dialog - Khatabook Style */}
      <Dialog open={showItemSaleSummary} onOpenChange={setShowItemSaleSummary}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden p-0">
          <DialogTitle className="sr-only">Item Sale Summary</DialogTitle>
          {/* Khatabook Style Header */}
          <div className="bg-blue-600 text-white p-4">
            <div className="flex items-center justify-between pr-10">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowItemSaleSummary(false)}
                  className="text-white hover:bg-blue-700 p-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-lg font-semibold">Item Sale Summary</h2>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-blue-700"
                  onClick={async () => {
                    const data = getItemSaleSummaryData()
                    console.log('Item Sale Summary Data:', data)
                    console.log('Date range:', reportStartDate, 'to', reportEndDate)

                    if (data.length === 0) {
                      alert('No data found for the selected date range. Please check your date range and ensure there are sales transactions.')
                      return
                    }

                    try {
                      // Generate PDF for Item Sale Summary
                      const styles = StyleSheet.create({
                        page: {
                          padding: 30,
                          fontSize: 10,
                        },
                        header: {
                          marginBottom: 20,
                          textAlign: 'center',
                        },
                        title: {
                          fontSize: 16,
                          fontWeight: 'bold',
                          marginBottom: 10,
                        },
                        dateRange: {
                          fontSize: 12,
                          marginBottom: 10,
                        },
                        table: {
                          marginTop: 20,
                        },
                        tableRow: {
                          flexDirection: 'row',
                          borderBottomWidth: 1,
                          borderBottomColor: '#000',
                          paddingVertical: 5,
                        },
                        tableHeader: {
                          backgroundColor: '#f0f0f0',
                          fontWeight: 'bold',
                        },
                        tableCell: {
                          flex: 1,
                          padding: 5,
                          fontSize: 9,
                        },
                        itemCell: {
                          flex: 2,
                        },
                        unitCell: {
                          flex: 1,
                          textAlign: 'center',
                        },
                        quantityCell: {
                          flex: 1,
                          textAlign: 'right',
                        },
                      })

                      const MyDocument = () => (
                        <Document>
                          <Page size="A4" style={styles.page}>
                            <View style={styles.header}>
                              <Text style={styles.title}>Item Sale Summary</Text>
                              <Text style={styles.dateRange}>
                                Period: {new Date(reportStartDate).toLocaleDateString('en-IN')} - {new Date(reportEndDate).toLocaleDateString('en-IN')}
                              </Text>
                              <Text style={styles.dateRange}>A.R. Enterprises</Text>
                            </View>

                            <View style={styles.table}>
                              <View style={[styles.tableRow, styles.tableHeader]}>
                                <Text style={[styles.tableCell, styles.itemCell]}>Item Name</Text>
                                <Text style={[styles.tableCell, styles.unitCell]}>Unit</Text>
                                <Text style={[styles.tableCell, styles.quantityCell]}>Quantity</Text>
                              </View>

                              {data.map((item, index) => (
                                <View key={index} style={styles.tableRow}>
                                  <Text style={[styles.tableCell, styles.itemCell]}>{item.product}</Text>
                                  <Text style={[styles.tableCell, styles.unitCell]}>{item.unit}</Text>
                                  <Text style={[styles.tableCell, styles.quantityCell]}>{item.quantity}</Text>
                                </View>
                              ))}
                            </View>
                          </Page>
                        </Document>
                      )

                      console.log('Generating PDF...')
                      const blob = await pdf(<MyDocument />).toBlob()
                      console.log('PDF blob created:', blob)

                      if (!blob || blob.size === 0) {
                        throw new Error('Failed to generate PDF blob')
                      }

                      const url = URL.createObjectURL(blob)
                      const link = document.createElement('a')
                      link.href = url
                      link.download = `Item_Sale_Summary_${reportStartDate}_to_${reportEndDate}.pdf`
                      document.body.appendChild(link)
                      link.click()
                      document.body.removeChild(link)
                      URL.revokeObjectURL(url)

                      console.log('PDF download initiated')
                    } catch (error) {
                      console.error('Error generating PDF:', error)
                      alert(`Error generating PDF: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`)
                    }
                  }}
                >
                  <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                  </svg>
                  PDF
                </Button>
                {/* Excel button removed as requested */}
              </div>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* Date Range Section */}
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium">
                    {reportStartDate && reportEndDate 
                      ? `${new Date(reportStartDate).toLocaleDateString('en-IN')} - ${new Date(reportEndDate).toLocaleDateString('en-IN')}`
                      : 'Select Date Range'
                    }
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = new Date()
                    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1)
                    setReportStartDate(thisMonth.toISOString().split('T')[0])
                    setReportEndDate(today.toISOString().split('T')[0])
                  }}
                  className="text-purple-600 border-purple-600 hover:bg-purple-50"
                >
                  CHANGE
                </Button>
              </div>
              
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label className="text-xs text-gray-600">From Date</Label>
                  <Input
                    type="date"
                    value={reportStartDate}
                    onChange={(e) => setReportStartDate(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-xs text-gray-600">To Date</Label>
                  <Input
                    type="date"
                    value={reportEndDate}
                    onChange={(e) => setReportEndDate(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Company Info */}
            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-900">A.R.Enterprises</h3>
              <p className="text-sm text-gray-600">Phone no: 7396844871</p>
            </div>

            {/* Summary Cards */}
            {reportStartDate && reportEndDate && (() => {
              const data = getItemSaleSummaryData()
              const totalQuantity = data.reduce((sum, item) => sum + item.quantity, 0)
              const uniqueItems = data.length

              return (
                <div className="grid grid-cols-2 gap-1">
                  <div className="bg-blue-50 border border-blue-200 rounded p-1.5">
                    <div className="text-center">
                      <div className="text-xs font-medium text-blue-800 mb-0.5">Total Items</div>
                      <div className="text-xs font-bold text-blue-600">{uniqueItems}</div>
                    </div>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded p-1.5">
                    <div className="text-center">
                      <div className="text-xs font-medium text-green-800 mb-0.5">Total Quantity</div>
                      <div className="text-xs font-bold text-green-600">{totalQuantity.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Data Table */}
            {reportStartDate && reportEndDate && (
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th className="text-left p-1.5 text-xs font-semibold text-gray-700 border-r">Item Name</th>
                        <th className="text-left p-1.5 text-xs font-semibold text-gray-700 border-r">Unit</th>
                        <th className="text-right p-1.5 text-xs font-semibold text-gray-700">Quantity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getItemSaleSummaryData().map((item, index) => (
                        <tr key={index} className={`border-b hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <td className="p-1.5 text-xs border-r font-medium">{item.product}</td>
                          <td className="p-1.5 text-xs border-r">{item.unit}</td>
                          <td className="p-1.5 text-xs text-right font-semibold text-green-600">{item.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {reportStartDate && reportEndDate && getItemSaleSummaryData().length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No data found for the selected date range</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Monthly Business Summary Dialog - Khatabook Style */}
      <Dialog open={showMonthlyBusinessSummary} onOpenChange={setShowMonthlyBusinessSummary}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden p-0">
          <DialogTitle className="sr-only">Monthly Business Summary</DialogTitle>
          {/* Khatabook Style Header */}
          <div className="bg-blue-600 text-white p-4">
            <div className="flex items-center justify-between pr-10">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMonthlyBusinessSummary(false)}
                  className="text-white hover:bg-blue-700 p-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-lg font-semibold">Monthly Business Summary</h2>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-blue-700"
                  onClick={async () => {
                    const data = getMonthlyBusinessSummaryData()
                    console.log('Monthly Business Summary Data:', data)
                    console.log('Date range:', reportStartDate, 'to', reportEndDate)

                    if (data.length === 0) {
                      alert('No data found for the selected date range. Please check your date range and ensure there are sales transactions.')
                      return
                    }

                    try {
                      // Generate PDF for Monthly Business Summary
                      const styles = StyleSheet.create({
                        page: {
                          padding: 30,
                          fontSize: 10,
                        },
                        header: {
                          marginBottom: 20,
                          textAlign: 'center',
                        },
                        title: {
                          fontSize: 16,
                          fontWeight: 'bold',
                          marginBottom: 10,
                        },
                        dateRange: {
                          fontSize: 12,
                          marginBottom: 10,
                        },
                        summary: {
                          marginBottom: 20,
                          padding: 10,
                          backgroundColor: '#f0f0f0',
                          borderRadius: 5,
                        },
                        table: {
                          marginTop: 20,
                        },
                        tableRow: {
                          flexDirection: 'row',
                          borderBottomWidth: 1,
                          borderBottomColor: '#000',
                          paddingVertical: 5,
                        },
                        tableHeader: {
                          backgroundColor: '#f0f0f0',
                          fontWeight: 'bold',
                        },
                        tableCell: {
                          flex: 1,
                          padding: 5,
                          fontSize: 9,
                        },
                        monthCell: {
                          flex: 1.5,
                        },
                        amountCell: {
                          flex: 1,
                          textAlign: 'right',
                        },
                      })

                      const MyDocument = () => {
                        const totalSales = data.reduce((sum, item) => sum + item.sales, 0)
                        const totalCollections = data.reduce((sum, item) => sum + item.collections, 0)
                        const totalDifference = totalSales - totalCollections

                        return (
                          <Document>
                            <Page size="A4" style={styles.page}>
                              <View style={styles.header}>
                                <Text style={styles.title}>Monthly Business Summary</Text>
                                <Text style={styles.dateRange}>
                                  Period: {new Date(reportStartDate).toLocaleDateString('en-IN')} - {new Date(reportEndDate).toLocaleDateString('en-IN')}
                                </Text>
                                <Text style={styles.dateRange}>A.R. Enterprises</Text>
                              </View>

                              <View style={styles.summary}>
                                <Text style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 5 }}>Summary</Text>
                                <Text style={{ fontSize: 9, marginBottom: 3 }}>Total Sales: ₹{totalSales.toLocaleString()}</Text>
                                <Text style={{ fontSize: 9, marginBottom: 3 }}>Total Collections: ₹{totalCollections.toLocaleString()}</Text>
                                <Text style={{ fontSize: 9 }}>
                                  Difference: ₹{Math.abs(totalDifference).toLocaleString()} {totalDifference > 0 ? '(Outstanding)' : totalDifference < 0 ? '(Advance)' : '(Balanced)'}
                                </Text>
                              </View>

                              <View style={styles.table}>
                                <View style={[styles.tableRow, styles.tableHeader]}>
                                  <Text style={[styles.tableCell, styles.monthCell]}>Month</Text>
                                  <Text style={[styles.tableCell, styles.amountCell]}>Sales (₹)</Text>
                                  <Text style={[styles.tableCell, styles.amountCell]}>Collections (₹)</Text>
                                  <Text style={[styles.tableCell, styles.amountCell]}>Difference (₹)</Text>
                                </View>

                                {data.map((item, index) => {
                                  const difference = item.sales - item.collections
                                  return (
                                    <View key={index} style={styles.tableRow}>
                                      <Text style={[styles.tableCell, styles.monthCell]}>{item.month}</Text>
                                      <Text style={[styles.tableCell, styles.amountCell]}>₹{item.sales.toLocaleString()}</Text>
                                      <Text style={[styles.tableCell, styles.amountCell]}>₹{item.collections.toLocaleString()}</Text>
                                      <Text style={[styles.tableCell, styles.amountCell]}>
                                        ₹{Math.abs(difference).toLocaleString()}
                                        {difference > 0 && ' (Due)'}
                                        {difference < 0 && ' (Advance)'}
                                        {difference === 0 && ' (Balanced)'}
                                      </Text>
                                    </View>
                                  )
                                })}
                              </View>
                            </Page>
                          </Document>
                        )
                      }

                      console.log('Generating PDF...')
                      const blob = await pdf(<MyDocument />).toBlob()
                      console.log('PDF blob created:', blob)

                      if (!blob || blob.size === 0) {
                        throw new Error('Failed to generate PDF blob')
                      }

                      const url = URL.createObjectURL(blob)
                      const link = document.createElement('a')
                      link.href = url
                      link.download = `Monthly_Business_Summary_${reportStartDate}_to_${reportEndDate}.pdf`
                      document.body.appendChild(link)
                      link.click()
                      document.body.removeChild(link)
                      URL.revokeObjectURL(url)

                      console.log('PDF download initiated')
                    } catch (error) {
                      console.error('Error generating PDF:', error)
                      alert(`Error generating PDF: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`)
                    }
                  }}
                >
                  <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                  </svg>
                  PDF
                </Button>
                {/* Excel button removed as requested */}
              </div>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* Date Range Section */}
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium">
                    {reportStartDate && reportEndDate
                      ? `${new Date(reportStartDate).toLocaleDateString('en-IN')} - ${new Date(reportEndDate).toLocaleDateString('en-IN')}`
                      : 'Select Date Range'
                    }
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = new Date()
                    const lastYear = new Date(today.getFullYear() - 1, today.getMonth() + 1, 1)
                    setReportStartDate(lastYear.toISOString().split('T')[0])
                    setReportEndDate(today.toISOString().split('T')[0])
                  }}
                  className="text-purple-600 border-purple-600 hover:bg-purple-50"
                >
                  CHANGE
                </Button>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <Label className="text-xs text-gray-600">From Date</Label>
                  <Input
                    type="date"
                    value={reportStartDate}
                    onChange={(e) => setReportStartDate(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-xs text-gray-600">To Date</Label>
                  <Input
                    type="date"
                    value={reportEndDate}
                    onChange={(e) => setReportEndDate(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Company Info */}
            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-900">A.R.Enterprises</h3>
              <p className="text-sm text-gray-600">Phone no: 7396844871</p>
            </div>

            {/* Report Summary */}
            {reportStartDate && reportEndDate && (() => {
              const data = getMonthlyBusinessSummaryData()
              const totalSales = data.reduce((sum, item) => sum + item.sales, 0)
              const totalCollections = data.reduce((sum, item) => sum + item.collections, 0)
              const totalDifference = totalSales - totalCollections

              return (
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-blue-800">
                      <div>Duration: {new Date(reportStartDate).toLocaleDateString('en-IN')} - {new Date(reportEndDate).toLocaleDateString('en-IN')}</div>
                      <div>Monthly Business Summary Report</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-blue-800">Summary</div>
                      <div className="text-sm font-semibold text-blue-900">
                        Total Sales: ₹{totalSales.toLocaleString()}
                      </div>
                      <div className="text-sm font-semibold text-green-700">
                        Total Collections: ₹{totalCollections.toLocaleString()}
                      </div>
                      <div className={`text-sm font-semibold ${totalDifference > 0 ? 'text-red-600' : totalDifference < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                        Difference: ₹{Math.abs(totalDifference).toLocaleString()} {totalDifference > 0 ? '(Outstanding)' : totalDifference < 0 ? '(Advance)' : '(Balanced)'}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Data Table */}
            {reportStartDate && reportEndDate && (
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th className="text-left p-3 text-xs font-semibold text-gray-700 border-r">Month</th>
                        <th className="text-right p-3 text-xs font-semibold text-gray-700 border-r">Total Sales (₹)</th>
                        <th className="text-right p-3 text-xs font-semibold text-gray-700 border-r">Total Collections (₹)</th>
                        <th className="text-right p-3 text-xs font-semibold text-gray-700">Difference (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getMonthlyBusinessSummaryData().map((item, index) => {
                        const difference = item.sales - item.collections
                        return (
                          <tr key={index} className={`border-b hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                            <td className="p-3 text-xs border-r font-medium">{item.month}</td>
                            <td className="p-3 text-xs border-r text-right font-semibold text-green-600">₹{item.sales.toLocaleString()}</td>
                            <td className="p-3 text-xs border-r text-right font-semibold text-blue-600">₹{item.collections.toLocaleString()}</td>
                            <td className={`p-3 text-xs text-right font-semibold ${difference > 0 ? 'text-red-600' : difference < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                              ₹{Math.abs(difference).toLocaleString()}
                              {difference > 0 && <span className="text-xs ml-1">(Due)</span>}
                              {difference < 0 && <span className="text-xs ml-1">(Advance)</span>}
                              {difference === 0 && <span className="text-xs ml-1">(Balanced)</span>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {reportStartDate && reportEndDate && getMonthlyBusinessSummaryData().length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No data found for the selected date range</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Account Balance Summary Dialog - Khatabook Style */}
      <Dialog open={showAccountBalanceSummary} onOpenChange={setShowAccountBalanceSummary}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden p-0">
          <DialogTitle className="sr-only">Account Balance Summary</DialogTitle>
          {/* Khatabook Style Header */}
          <div className="bg-blue-600 text-white p-4">
            <div className="flex items-center justify-between pr-10">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAccountBalanceSummary(false)}
                  className="text-white hover:bg-blue-700 p-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-lg font-semibold">Account Balance Summary</h2>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-blue-700"
                  onClick={async () => {
                    const data = getAccountBalanceSummaryData()
                    console.log('Account Balance Summary Data:', data)
                    console.log('Date range:', reportStartDate, 'to', reportEndDate)

                    if (data.length === 0) {
                      alert('No account data found for the selected date range. Please check your date range and ensure there are account transactions.')
                      return
                    }

                    try {
                      // Generate PDF for Account Balance Summary
                      const styles = StyleSheet.create({
                        page: {
                          padding: 30,
                          fontSize: 10,
                        },
                        header: {
                          marginBottom: 20,
                          textAlign: 'center',
                        },
                        title: {
                          fontSize: 16,
                          fontWeight: 'bold',
                          marginBottom: 10,
                        },
                        dateRange: {
                          fontSize: 12,
                          marginBottom: 10,
                        },
                        summary: {
                          marginBottom: 20,
                          padding: 10,
                          backgroundColor: '#f0f0f0',
                          borderRadius: 5,
                        },
                        table: {
                          marginTop: 20,
                        },
                        tableRow: {
                          flexDirection: 'row',
                          borderBottomWidth: 1,
                          borderBottomColor: '#000',
                          paddingVertical: 5,
                        },
                        tableHeader: {
                          backgroundColor: '#f0f0f0',
                          fontWeight: 'bold',
                        },
                        tableCell: {
                          padding: 5,
                          fontSize: 9,
                        },
                        accountCell: {
                          flex: 1.5,
                        },
                        amountCell: {
                          flex: 1,
                          textAlign: 'right',
                        },
                      })

                      const MyDocument = () => {
                        const totalBalance = data.reduce((sum, item) => sum + item.balance, 0)

                        return (
                          <Document>
                            <Page size="A4" style={styles.page}>
                              <View style={styles.header}>
                                <Text style={styles.title}>Account Balance Summary</Text>
                                <Text style={styles.dateRange}>
                                  Period: {new Date(reportStartDate).toLocaleDateString('en-IN')} - {new Date(reportEndDate).toLocaleDateString('en-IN')}
                                </Text>
                                <Text style={styles.dateRange}>A.R. Enterprises</Text>
                              </View>

                              <View style={styles.summary}>
                                <Text style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 5 }}>Summary</Text>
                                <Text style={{ fontSize: 9 }}>
                                  Total Account Balance: ₹{Math.abs(totalBalance).toLocaleString()} {totalBalance >= 0 ? '(Positive)' : '(Negative)'}
                                </Text>
                              </View>

                              <View style={styles.table}>
                                <View style={[styles.tableRow, styles.tableHeader]}>
                                  <Text style={[styles.tableCell, styles.accountCell]}>Account Name</Text>
                                  <Text style={[styles.tableCell, styles.amountCell]}>Balance (₹)</Text>
                                  <Text style={[styles.tableCell, styles.amountCell]}>Status</Text>
                                </View>

                                {data.map((account, index) => (
                                  <View key={index} style={styles.tableRow}>
                                    <Text style={[styles.tableCell, styles.accountCell]}>{typeof account.account === 'string' ? account.account : account.account.name}</Text>
                                    <Text style={[styles.tableCell, styles.amountCell]}>₹{Math.abs(account.balance).toLocaleString()}</Text>
                                    <Text style={[styles.tableCell, styles.amountCell]}>
                                      {account.balance > 0 ? 'Positive' : account.balance < 0 ? 'Negative' : 'Zero'}
                                    </Text>
                                  </View>
                                ))}
                              </View>
                            </Page>
                          </Document>
                        )
                      }

                      console.log('Generating PDF...')
                      const blob = await pdf(<MyDocument />).toBlob()
                      console.log('PDF blob created:', blob)

                      if (!blob || blob.size === 0) {
                        throw new Error('Failed to generate PDF blob')
                      }

                      const url = URL.createObjectURL(blob)
                      const link = document.createElement('a')
                      link.href = url
                      link.download = `Account_Balance_Summary_${reportStartDate}_to_${reportEndDate}.pdf`
                      document.body.appendChild(link)
                      link.click()
                      document.body.removeChild(link)
                      URL.revokeObjectURL(url)

                      console.log('PDF download initiated')
                    } catch (error) {
                      console.error('Error generating PDF:', error)
                      alert(`Error generating PDF: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`)
                    }
                  }}
                >
                  <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                  </svg>
                  PDF
                </Button>
                {/* Excel removed */}
              </div>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* Date Range Section */}
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium">
                    {reportStartDate && reportEndDate
                      ? `${new Date(reportStartDate).toLocaleDateString('en-IN')} - ${new Date(reportEndDate).toLocaleDateString('en-IN')}`
                      : 'Select Date Range'
                    }
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = new Date()
                    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
                    setReportStartDate(lastMonth.toISOString().split('T')[0])
                    setReportEndDate(today.toISOString().split('T')[0])
                  }}
                  className="text-purple-600 border-purple-600 hover:bg-purple-50"
                >
                  CHANGE
                </Button>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <Label className="text-xs text-gray-600">From Date</Label>
                  <Input
                    type="date"
                    value={reportStartDate}
                    onChange={(e) => setReportStartDate(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-xs text-gray-600">To Date</Label>
                  <Input
                    type="date"
                    value={reportEndDate}
                    onChange={(e) => setReportEndDate(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Company Info */}
            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-900">A.R.Enterprises</h3>
              <p className="text-sm text-gray-600">Phone no: 7396844871</p>
            </div>

            {/* Report Summary */}
            {reportStartDate && reportEndDate && (() => {
              const data = getAccountBalanceSummaryData()
              const totalBalance = data.reduce((sum, item) => sum + item.balance, 0)

              return (
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-blue-800">
                      <div>Duration: {new Date(reportStartDate).toLocaleDateString('en-IN')} - {new Date(reportEndDate).toLocaleDateString('en-IN')}</div>
                      <div>Account Balance Summary Report</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-blue-800">Summary</div>
                      <div className={`text-sm font-semibold ${totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        Total Balance: ₹{Math.abs(totalBalance).toLocaleString()} {totalBalance >= 0 ? '(Positive)' : '(Negative)'}
                      </div>
                      <div className="text-sm font-semibold text-blue-900">
                        Active Accounts: {data.length}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Data Table */}
            {reportStartDate && reportEndDate && (
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th className="text-left p-3 text-xs font-semibold text-gray-700 border-r">Account Name</th>
                        <th className="text-right p-3 text-xs font-semibold text-gray-700 border-r">Balance (₹)</th>
                        <th className="text-left p-3 text-xs font-semibold text-gray-700">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getAccountBalanceSummaryData().map((account, index) => (
                        <tr key={index} className={`border-b hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <td className="p-3 text-xs border-r font-medium">{typeof account.account === 'string' ? account.account : account.account.name}</td>
                          <td className={`p-3 text-xs border-r text-right font-semibold ${account.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ₹{Math.abs(account.balance).toLocaleString()}
                          </td>
                          <td className="p-3 text-xs">
                            <Badge
                              variant={account.balance > 0 ? "default" : account.balance < 0 ? "destructive" : "secondary"}
                              className="text-xs"
                            >
                              {account.balance > 0 ? 'Positive' : account.balance < 0 ? 'Negative' : 'Zero'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {reportStartDate && reportEndDate && getAccountBalanceSummaryData().length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <CreditCard className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No account data found for the selected date range</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Customer-Wise Summary Dialog - Khatabook Style */}
      <Dialog open={showCustomerWiseSummary} onOpenChange={setShowCustomerWiseSummary}>
        <DialogContent className="w-[92vw] sm:w-[85vw] md:max-w-4xl lg:max-w-5xl max-h-[90vh] overflow-y-auto p-0">
          <DialogTitle className="sr-only">Customer-Wise Summary</DialogTitle>
          {/* Khatabook Style Header */}
          <div className="bg-blue-600 text-white p-3 sm:p-4">
            <div className="flex items-center justify-between pr-10">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCustomerWiseSummary(false)}
                  className="text-white hover:bg-blue-700 p-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-base sm:text-lg font-semibold">Customer-Wise Summary</h2>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-blue-700"
                  onClick={async () => {
                    const data = getCustomerWiseSummaryData()
                    console.log('Customer-Wise Summary Data:', data)
                    console.log('Date range:', reportStartDate, 'to', reportEndDate)

                    if (data.length === 0) {
                      alert('No data found for the selected date range. Please check your date range and ensure there are customer transactions.')
                      return
                    }

                    try {
                      // Generate PDF for Customer-Wise Summary
                      const styles = StyleSheet.create({
                        page: {
                          padding: 30,
                          fontSize: 10,
                        },
                        header: {
                          marginBottom: 20,
                          textAlign: 'center',
                        },
                        title: {
                          fontSize: 16,
                          fontWeight: 'bold',
                          marginBottom: 10,
                        },
                        dateRange: {
                          fontSize: 12,
                          marginBottom: 10,
                        },
                        summary: {
                          marginBottom: 20,
                          padding: 10,
                          backgroundColor: '#f0f0f0',
                          borderRadius: 5,
                        },
                        table: {
                          marginTop: 20,
                        },
                        tableRow: {
                          flexDirection: 'row',
                          borderBottomWidth: 1,
                          borderBottomColor: '#000',
                          paddingVertical: 5,
                        },
                        tableHeader: {
                          backgroundColor: '#f0f0f0',
                          fontWeight: 'bold',
                        },
                        tableCell: {
                          padding: 5,
                          fontSize: 9,
                        },
                        nameCell: {
                          flex: 2,
                        },
                        categoryCell: {
                          flex: 1,
                        },
                        amountCell: {
                          flex: 1,
                          textAlign: 'right',
                        },
                        balanceCell: {
                          flex: 1,
                          textAlign: 'right',
                        },
                      })

                      const MyDocument = () => {
                        const totalSales = data.reduce((sum, item) => sum + item.totalSales, 0)
                        const totalPayments = data.reduce((sum, item) => sum + item.totalPayments, 0)
                        const totalBalance = data.reduce((sum, item) => sum + item.balance, 0)

                        return (
                          <Document>
                            <Page size="A4" style={styles.page}>
                              <View style={styles.header}>
                                <Text style={styles.title}>Customer-Wise Summary</Text>
                                <Text style={styles.dateRange}>
                                  Period: {new Date(reportStartDate).toLocaleDateString('en-IN')} - {new Date(reportEndDate).toLocaleDateString('en-IN')}
                                </Text>
                                <Text style={styles.dateRange}>A.R. Enterprises</Text>
                              </View>

                              <View style={styles.summary}>
                                <Text style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 5 }}>Summary</Text>
                                <Text style={{ fontSize: 9, marginBottom: 3 }}>Total Sales: ₹{totalSales.toLocaleString()}</Text>
                                <Text style={{ fontSize: 9, marginBottom: 3 }}>Total Payments: ₹{totalPayments.toLocaleString()}</Text>
                                <Text style={{ fontSize: 9 }}>
                                  Net Balance: ₹{Math.abs(totalBalance).toLocaleString()} {totalBalance > 0 ? '(Outstanding)' : totalBalance < 0 ? '(Advance)' : '(Balanced)'}
                                </Text>
                              </View>

                              <View style={styles.table}>
                                <View style={[styles.tableRow, styles.tableHeader]}>
                                  <Text style={[styles.tableCell, styles.nameCell]}>Customer Name</Text>
                                  <Text style={[styles.tableCell, styles.categoryCell]}>Category</Text>
                                  <Text style={[styles.tableCell, styles.amountCell]}>Total Sales (₹)</Text>
                                  <Text style={[styles.tableCell, styles.amountCell]}>Total Payments (₹)</Text>
                                  <Text style={[styles.tableCell, styles.balanceCell]}>Balance (₹)</Text>
                                </View>

                                {data.map((customer, index) => (
                                  <View key={index} style={styles.tableRow}>
                                    <Text style={[styles.tableCell, styles.nameCell]}>{customer.name}</Text>
                                    <Text style={[styles.tableCell, styles.categoryCell]}>{customer.category}</Text>
                                    <Text style={[styles.tableCell, styles.amountCell]}>₹{customer.totalSales.toLocaleString()}</Text>
                                    <Text style={[styles.tableCell, styles.amountCell]}>₹{customer.totalPayments.toLocaleString()}</Text>
                                    <Text style={[styles.tableCell, styles.balanceCell]}>
                                      ₹{Math.abs(customer.balance).toLocaleString()}
                                      {customer.balance > 0 && ' (Due)'}
                                      {customer.balance < 0 && ' (Advance)'}
                                      {customer.balance === 0 && ' (Settled)'}
                                    </Text>
                                  </View>
                                ))}
                              </View>
                            </Page>
                          </Document>
                        )
                      }

                      console.log('Generating PDF...')
                      const blob = await pdf(<MyDocument />).toBlob()
                      console.log('PDF blob created:', blob)

                      if (!blob || blob.size === 0) {
                        throw new Error('Failed to generate PDF blob')
                      }

                      const url = URL.createObjectURL(blob)
                      const link = document.createElement('a')
                      link.href = url
                      link.download = `Customer_Wise_Summary_${reportStartDate}_to_${reportEndDate}.pdf`
                      document.body.appendChild(link)
                      link.click()
                      document.body.removeChild(link)
                      URL.revokeObjectURL(url)

                      console.log('PDF download initiated')
                    } catch (error) {
                      console.error('Error generating PDF:', error)
                      alert(`Error generating PDF: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`)
                    }
                  }}
                >
                  <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                  </svg>
                  PDF
                </Button>
                {/* Excel removed */}
              </div>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* Date Range Section */}
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium">
                    {reportStartDate && reportEndDate
                      ? `${new Date(reportStartDate).toLocaleDateString('en-IN')} - ${new Date(reportEndDate).toLocaleDateString('en-IN')}`
                      : 'Select Date Range'
                    }
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = new Date()
                    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
                    setReportStartDate(lastMonth.toISOString().split('T')[0])
                    setReportEndDate(today.toISOString().split('T')[0])
                  }}
                  className="text-purple-600 border-purple-600 hover:bg-purple-50"
                >
                  CHANGE
                </Button>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <Label className="text-xs text-gray-600">From Date</Label>
                  <Input
                    type="date"
                    value={reportStartDate}
                    onChange={(e) => setReportStartDate(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-xs text-gray-600">To Date</Label>
                  <Input
                    type="date"
                    value={reportEndDate}
                    onChange={(e) => setReportEndDate(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Company Info */}
            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-900">A.R.Enterprises</h3>
              <p className="text-sm text-gray-600">Phone no: 7396844871</p>
            </div>

            {/* Report Summary */}
            {reportStartDate && reportEndDate && (() => {
              const data = getCustomerWiseSummaryData()
              const totalSales = data.reduce((sum, item) => sum + item.totalSales, 0)
              const totalPayments = data.reduce((sum, item) => sum + item.totalPayments, 0)
              const totalBalance = data.reduce((sum, item) => sum + item.balance, 0)

              return (
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-blue-800">
                      <div>Duration: {new Date(reportStartDate).toLocaleDateString('en-IN')} - {new Date(reportEndDate).toLocaleDateString('en-IN')}</div>
                      <div>Customer-Wise Summary Report</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-blue-800">Summary</div>
                      <div className="text-sm font-semibold text-blue-900">
                        Total Sales: ₹{totalSales.toLocaleString()}
                      </div>
                      <div className="text-sm font-semibold text-green-700">
                        Total Payments: ₹{totalPayments.toLocaleString()}
                      </div>
                      <div className={`text-sm font-semibold ${totalBalance > 0 ? 'text-red-600' : totalBalance < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                        Net Balance: ₹{Math.abs(totalBalance).toLocaleString()} {totalBalance > 0 ? '(Outstanding)' : totalBalance < 0 ? '(Advance)' : '(Balanced)'}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Data Table */}
            {reportStartDate && reportEndDate && (
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full table-fixed text-[11px] sm:text-xs">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th className="text-left p-2 sm:p-2 font-semibold text-gray-700 border-r break-words">Customer Name</th>
                        <th className="text-left p-2 sm:p-2 font-semibold text-gray-700 border-r break-words">Category</th>
                        <th className="text-right p-2 sm:p-2 font-semibold text-gray-700 border-r break-words">Total Sales (₹)</th>
                        <th className="text-right p-2 sm:p-2 font-semibold text-gray-700 border-r break-words">Total Payments (₹)</th>
                        <th className="text-right p-2 sm:p-2 font-semibold text-gray-700 break-words">Balance (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getCustomerWiseSummaryData().map((customer, index) => (
                        <tr key={index} className={`border-b hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <td className="p-2 sm:p-2 border-r font-medium break-words whitespace-normal">{customer.name}</td>
                          <td className="p-2 sm:p-2 border-r">
                            <Badge variant="outline" className="text-[10px] sm:text-xs">{customer.category}</Badge>
                          </td>
                          <td className="p-2 sm:p-2 border-r text-right font-semibold text-green-600">₹{customer.totalSales.toLocaleString()}</td>
                          <td className="p-2 sm:p-2 border-r text-right font-semibold text-blue-600">₹{customer.totalPayments.toLocaleString()}</td>
                          <td className={`p-2 sm:p-2 text-right font-semibold ${customer.balance > 0 ? 'text-red-600' : customer.balance < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                            ₹{Math.abs(customer.balance).toLocaleString()}
                            {customer.balance > 0 && <span className="ml-1">(Due)</span>}
                            {customer.balance < 0 && <span className="ml-1">(Advance)</span>}
                            {customer.balance === 0 && <span className="ml-1">(Settled)</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {reportStartDate && reportEndDate && getCustomerWiseSummaryData().length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No customer data found for the selected date range</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Reminder Dialog */}
      <Dialog open={showReminderDialog} onOpenChange={setShowReminderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Payment Reminder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reminderCustomer">Customer Name</Label>
              <Select
                value={reminderForm.customerName}
                onValueChange={(value) => setReminderForm({ ...reminderForm, customerName: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customerData.map((customer) => (
                    <SelectItem key={customer.name} value={customer.name}>
                      {customer.name} (Balance: ₹{Math.abs(customer.balance).toLocaleString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="reminderAmount">Amount (₹)</Label>
              <Input
                id="reminderAmount"
                type="number"
                value={reminderForm.amount}
                onChange={(e) => setReminderForm({ ...reminderForm, amount: e.target.value })}
                placeholder="Enter amount to remind about"
              />
            </div>
            <div>
              <Label htmlFor="reminderDate">Reminder Date</Label>
              <Input
                id="reminderDate"
                type="date"
                value={reminderForm.reminderDate}
                onChange={(e) => setReminderForm({ ...reminderForm, reminderDate: e.target.value })}
                placeholder="DD-MM-YY"
                className="placeholder:text-gray-500 md:placeholder:text-transparent"
              />
            </div>
            <div>
              <Label htmlFor="reminderNotes">Notes</Label>
              <Input
                id="reminderNotes"
                value={reminderForm.notes}
                onChange={(e) => setReminderForm({ ...reminderForm, notes: e.target.value })}
                placeholder="Additional notes for the reminder"
              />
            </div>
            <Button
              onClick={async () => {
                if (reminderForm.customerName && reminderForm.amount && reminderForm.reminderDate) {
                  try {
                    // Find customer ID by name
                    const customer = supabaseCustomers.find(c => c.name === reminderForm.customerName)
                    if (!customer) {
                      alert('Customer not found')
                      return
                    }

                    await addReminder({
                      customer_id: customer.id,
                      amount: Number.parseFloat(reminderForm.amount),
                      reminder_date: reminderForm.reminderDate,
                      notes: reminderForm.notes || undefined,
                      status: 'active'
                    })
                    
                    await refreshReminders()
                    
                    setReminderForm({
                      customerName: "",
                      amount: "",
                      reminderDate: "",
                      notes: ""
                    })
                    setShowReminderDialog(false)
                  } catch (error) {
                    console.error('Failed to add reminder:', error)
                    alert('Failed to add reminder')
                  }
                }
              }}
              className="w-full"
              disabled={!reminderForm.customerName || !reminderForm.amount || !reminderForm.reminderDate}
            >
              Add Reminder
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reminders List Dialog */}
      <Dialog open={showRemindersList} onOpenChange={setShowRemindersList}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Payment Reminders
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowReminderDialog(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Reminder
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const activeReminders = supabaseReminders.filter(r => r.status === "active")
                    if (activeReminders.length === 0) {
                      alert("No active reminders to mark as completed")
                      return
                    }
                    if (window.confirm(`Mark all ${activeReminders.length} active reminders as completed?`)) {
                      try {
                        for (const reminder of activeReminders) {
                          await updateReminder(reminder.id, { status: 'completed' })
                        }
                        await refreshReminders()
                      } catch (error) {
                        console.error('Failed to update reminders:', error)
                      }
                    }
                  }}
                >
                  Mark All Complete
                </Button>
              </div>
              <div className="text-sm text-muted-foreground">
                {supabaseReminders.filter(r => r.status === "active").length} active reminders
              </div>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {supabaseReminders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-sm">No reminders set yet</p>
                  <p className="text-xs mt-1">Click "Add Reminder" to create your first payment reminder</p>
                </div>
              ) : (
                supabaseReminders
                  .sort((a, b) => {
                    // Sort by status (active first) then by date
                    if (a.status !== b.status) {
                      return a.status === "active" ? -1 : 1
                    }
                    return new Date(a.reminder_date).getTime() - new Date(b.reminder_date).getTime()
                  })
                  .map((reminder) => {
                    const customerName = reminder.customer?.name || 'Unknown Customer'
                    return (
                    <div
                      key={reminder.id}
                      className={`p-4 border rounded-lg ${
                        reminder.status === "active"
                          ? "border-orange-200 bg-orange-50"
                          : "border-gray-200 bg-gray-50 opacity-60"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-sm">{customerName}</h3>
                            <Badge
                              variant={reminder.status === "active" ? "default" : "secondary"}
                              className={`text-xs ${
                                reminder.status === "active"
                                  ? "bg-orange-100 text-orange-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {reminder.status === "active" ? "Active" : "Completed"}
                            </Badge>
                          </div>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <p>Amount: ₹{reminder.amount.toLocaleString()}</p>
                            <p>Reminder Date: {new Date(reminder.reminder_date).toLocaleDateString('en-IN')}</p>
                            {reminder.notes && <p>Notes: {reminder.notes}</p>}
                            <p className="text-xs">Created: {new Date(reminder.created_date).toLocaleDateString('en-IN')}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          {reminder.status === "active" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                try {
                                  await updateReminder(reminder.id, { status: 'completed', completed_date: new Date().toISOString() })
                                  await refreshReminders()
                                } catch (error) {
                                  console.error('Failed to complete reminder:', error)
                                }
                              }}
                              className="text-green-600 border-green-600 hover:bg-green-50"
                            >
                              Mark Complete
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              if (window.confirm("Are you sure you want to delete this reminder?")) {
                                try {
                                  await deleteReminder(reminder.id)
                                  await refreshReminders()
                                } catch (error) {
                                  console.error('Failed to delete reminder:', error)
                                }
                              }
                            }}
                            className="text-red-600 border-red-600 hover:bg-red-50"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                    )
                  })
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transaction Report Dialog - Khatabook Style */}
      <Dialog open={showTransactionReport} onOpenChange={setShowTransactionReport}>
        <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden p-0">
          <DialogTitle className="sr-only">Transaction Report</DialogTitle>
          {/* Khatabook Style Header */}
          <div className="bg-blue-600 text-white p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTransactionReport(false)}
                  className="text-white hover:bg-blue-700 p-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-lg font-semibold">Transaction Report</h2>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-blue-700"
                  onClick={async () => {
                    const data = getTransactionReportData()
                    console.log('Transaction Report Data:', data)
                    console.log('Date range:', reportStartDate, 'to', reportEndDate)

                    if (data.length === 0) {
                      alert('No transaction data found for the selected date range. Please check your date range and ensure there are transactions.')
                      return
                    }

                    try {
                      // Generate PDF for Transaction Report
                      const styles = StyleSheet.create({
                        page: {
                          padding: 20,
                          fontSize: 8,
                        },
                        header: {
                          marginBottom: 15,
                          textAlign: 'center',
                        },
                        title: {
                          fontSize: 14,
                          fontWeight: 'bold',
                          marginBottom: 8,
                          color: '#1e40af',
                        },
                        dateRange: {
                          fontSize: 10,
                          marginBottom: 8,
                          color: '#6b7280',
                        },
                        summaryCards: {
                          flexDirection: 'row',
                          marginBottom: 15,
                          gap: 8,
                        },
                        summaryCard: {
                          flex: 1,
                          padding: 8,
                          borderRadius: 4,
                          borderWidth: 1,
                        },
                        debitCard: {
                          backgroundColor: '#fef2f2',
                          borderColor: '#fecaca',
                        },
                        creditCard: {
                          backgroundColor: '#f0fdf4',
                          borderColor: '#bbf7d0',
                        },
                        balanceCard: {
                          backgroundColor: '#fff7ed',
                          borderColor: '#fed7aa',
                        },
                        summaryLabel: {
                          fontSize: 8,
                          fontWeight: 'bold',
                          marginBottom: 4,
                          textAlign: 'center',
                        },
                        debitLabel: {
                          color: '#991b1b',
                        },
                        creditLabel: {
                          color: '#166534',
                        },
                        balanceLabel: {
                          color: '#9a3412',
                        },
                        summaryAmount: {
                          fontSize: 9,
                          fontWeight: 'bold',
                          textAlign: 'center',
                        },
                        debitAmount: {
                          color: '#dc2626',
                        },
                        creditAmount: {
                          color: '#16a34a',
                        },
                        balanceAmount: {
                          color: '#ea580c',
                        },
                        table: {
                          marginTop: 10,
                        },
                        tableRow: {
                          flexDirection: 'row',
                          borderBottomWidth: 1,
                          borderBottomColor: '#d1d5db',
                          paddingVertical: 3,
                        },
                        tableHeader: {
                          backgroundColor: '#f3f4f6',
                          fontWeight: 'bold',
                        },
                        tableCell: {
                          padding: 3,
                          fontSize: 7,
                        },
                        dateCell: {
                          flex: 0.8,
                        },
                        nameCell: {
                          flex: 1.2,
                        },
                        notesCell: {
                          flex: 2,
                        },
                        debitCell: {
                          flex: 1,
                          textAlign: 'right',
                        },
                        creditCell: {
                          flex: 1,
                          textAlign: 'right',
                        },
                        debitText: {
                          color: '#dc2626',
                          fontWeight: 'bold',
                        },
                        creditText: {
                          color: '#16a34a',
                          fontWeight: 'bold',
                        },
                        totalRow: {
                          backgroundColor: '#f3f4f6',
                          fontWeight: 'bold',
                          borderTopWidth: 2,
                          borderTopColor: '#374151',
                        },
                      })

                      const MyDocument = () => {
                        const totalDebit = data.filter(t => t.type === 'sale').reduce((sum, t) => sum + t.amount, 0)
                        const totalCredit = data.filter(t => t.type === 'payment').reduce((sum, t) => sum + Math.abs(t.amount), 0)
                        const netBalance = totalDebit - totalCredit

                        return (
                          <Document>
                            <Page size="A4" style={styles.page}>
                              <View style={styles.header}>
                                <Text style={styles.title}>Transaction Report</Text>
                                <Text style={styles.dateRange}>
                                  Period: {new Date(reportStartDate).toLocaleDateString('en-IN')} - {new Date(reportEndDate).toLocaleDateString('en-IN')}
                                </Text>
                                <Text style={styles.dateRange}>A.R. Enterprises</Text>
                              </View>

                              {/* Summary Cards */}
                              <View style={styles.summaryCards}>
                                <View style={[styles.summaryCard, styles.debitCard]}>
                                  <Text style={[styles.summaryLabel, styles.debitLabel]}>Total Debit(-)</Text>
                                  <Text style={[styles.summaryAmount, styles.debitAmount]}>₹{totalDebit.toLocaleString()}</Text>
                                </View>
                                <View style={[styles.summaryCard, styles.creditCard]}>
                                  <Text style={[styles.summaryLabel, styles.creditLabel]}>Total Credit(+)</Text>
                                  <Text style={[styles.summaryAmount, styles.creditAmount]}>₹{totalCredit.toLocaleString()}</Text>
                                </View>
                                <View style={[styles.summaryCard, styles.balanceCard]}>
                                  <Text style={[styles.summaryLabel, styles.balanceLabel]}>Net Balance</Text>
                                  <Text style={[styles.summaryAmount, styles.balanceAmount]}>
                                    ₹{Math.abs(netBalance).toLocaleString()} {netBalance >= 0 ? 'Dr' : 'Cr'}
                                  </Text>
                                </View>
                              </View>

                              <View style={styles.table}>
                                <View style={[styles.tableRow, styles.tableHeader]}>
                                  <Text style={[styles.tableCell, styles.dateCell]}>Date</Text>
                                  <Text style={[styles.tableCell, styles.nameCell]}>Name</Text>
                                  <Text style={[styles.tableCell, styles.notesCell]}>Notes</Text>
                                  <Text style={[styles.tableCell, styles.debitCell]}>Debit(-)</Text>
                                  <Text style={[styles.tableCell, styles.creditCell]}>Credit(+)</Text>
                                </View>

                                {data.map((transaction, index) => {
                                  const isSale = transaction.type === 'sale'
                                  const debit = isSale ? transaction.amount : 0
                                  const credit = !isSale ? Math.abs(transaction.amount) : 0
                                  const notes = transaction.notes || (isSale ? `${transaction.bags || 0} bags ${transaction.subCategory || ''}` : 'Payment')

                                  return (
                                    <View key={transaction.id} style={[styles.tableRow, { backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb' }]}>
                                      <Text style={[styles.tableCell, styles.dateCell]}>
                                        {new Date(transaction.date).toLocaleDateString('en-IN')}
                                      </Text>
                                      <Text style={[styles.tableCell, styles.nameCell]}>{transaction.name}</Text>
                                      <Text style={[styles.tableCell, styles.notesCell]}>{notes}</Text>
                                      <Text style={[styles.tableCell, styles.debitCell]}>
                                        {debit ? <Text style={styles.debitText}>₹{debit.toLocaleString()}</Text> : ''}
                                      </Text>
                                      <Text style={[styles.tableCell, styles.creditCell]}>
                                        {credit ? <Text style={styles.creditText}>₹{credit.toLocaleString()}</Text> : ''}
                                      </Text>
                                    </View>
                                  )
                                })}

                                {/* Totals Row */}
                                <View style={[styles.tableRow, styles.totalRow]}>
                                  <Text style={[styles.tableCell, styles.dateCell]}>TOTAL</Text>
                                  <Text style={[styles.tableCell, styles.nameCell]}></Text>
                                  <Text style={[styles.tableCell, styles.notesCell]}></Text>
                                  <Text style={[styles.tableCell, styles.debitCell]}>
                                    <Text style={styles.debitText}>₹{totalDebit.toLocaleString()}</Text>
                                  </Text>
                                  <Text style={[styles.tableCell, styles.creditCell]}>
                                    <Text style={styles.creditText}>₹{totalCredit.toLocaleString()}</Text>
                                  </Text>
                                </View>
                              </View>
                            </Page>
                          </Document>
                        )
                      }

                      console.log('Generating PDF...')
                      const blob = await pdf(<MyDocument />).toBlob()
                      console.log('PDF blob created:', blob)

                      if (!blob || blob.size === 0) {
                        throw new Error('Failed to generate PDF blob')
                      }

                      const url = URL.createObjectURL(blob)
                      const link = document.createElement('a')
                      link.href = url
                      link.download = `Transaction_Report_${reportStartDate}_to_${reportEndDate}.pdf`
                      document.body.appendChild(link)
                      link.click()
                      document.body.removeChild(link)
                      URL.revokeObjectURL(url)

                      console.log('PDF download initiated')
                    } catch (error) {
                      console.error('Error generating PDF:', error)
                      alert(`Error generating PDF: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`)
                    }
                  }}
                >
                  <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                  </svg>
                  PDF
                </Button>
                {/* Excel removed */}
              </div>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* Date Range Section */}
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium">
                    {reportStartDate && reportEndDate
                      ? `${new Date(reportStartDate).toLocaleDateString('en-IN')} - ${new Date(reportEndDate).toLocaleDateString('en-IN')}`
                      : 'Select Date Range'
                    }
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = new Date()
                    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
                    setReportStartDate(lastMonth.toISOString().split('T')[0])
                    setReportEndDate(today.toISOString().split('T')[0])
                  }}
                  className="text-purple-600 border-purple-600 hover:bg-purple-50"
                >
                  CHANGE
                </Button>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <Label htmlFor="transaction-report-start-date" className="text-xs text-gray-600 mb-1 block">
                    From Date
                  </Label>
                  <DateInputWithIcon
                    id="transaction-report-start-date"
                    value={reportStartDate}
                    onChange={(e) => setReportStartDate(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="transaction-report-end-date" className="text-xs text-gray-600 mb-1 block">
                    To Date
                  </Label>
                  <DateInputWithIcon
                    id="transaction-report-end-date"
                    value={reportEndDate}
                    onChange={(e) => setReportEndDate(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Summary Cards */}
            {reportStartDate && reportEndDate && (() => {
              const data = getTransactionReportData()
              const totalDebit = data.filter(t => t.type === 'sale').reduce((sum, t) => sum + t.amount, 0)
              const totalCredit = data.filter(t => t.type === 'payment').reduce((sum, t) => sum + Math.abs(t.amount), 0)
              const netBalance = totalDebit - totalCredit

              return (
                <div className="grid grid-cols-3 gap-1">
                  <div className="bg-red-50 border border-red-200 rounded p-1.5">
                    <div className="text-center">
                      <div className="text-xs font-medium text-red-800 mb-0.5">Total Debit(-)</div>
                      <div className="text-xs font-bold text-red-600">₹{totalDebit.toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded p-1.5">
                    <div className="text-center">
                      <div className="text-xs font-medium text-green-800 mb-0.5">Total Credit(+)</div>
                      <div className="text-xs font-bold text-green-600">₹{totalCredit.toLocaleString()}</div>
                    </div>
                  </div>
                  <div className={`border rounded p-1.5 ${netBalance >= 0 ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'}`}>
                    <div className="text-center">
                      <div className="text-xs font-medium text-gray-800 mb-0.5">Net Balance</div>
                      <div className={`text-xs font-bold ${netBalance >= 0 ? 'text-orange-600' : 'text-blue-600'}`}>
                        ₹{Math.abs(netBalance).toLocaleString()} {netBalance >= 0 ? 'Dr' : 'Cr'}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Data Table */}
            {reportStartDate && reportEndDate && (
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th className="text-left p-1.5 text-xs font-semibold text-gray-700 border-r">Date</th>
                        <th className="text-left p-1.5 text-xs font-semibold text-gray-700 border-r">Name</th>
                        <th className="text-left p-1.5 text-xs font-semibold text-gray-700 border-r">Notes</th>
                        <th className="text-right p-1.5 text-xs font-semibold text-gray-700 border-r">Debit(-)</th>
                        <th className="text-right p-1.5 text-xs font-semibold text-gray-700">Credit(+)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getTransactionReportData().map((transaction, index) => {
                        const isSale = transaction.type === 'sale'
                        const debit = isSale ? transaction.amount : 0
                        const credit = !isSale ? Math.abs(transaction.amount) : 0
                        const notes = transaction.notes || (isSale ? `${transaction.bags || 0} bags ${transaction.subCategory || ''}` : 'Payment')

                        return (
                          <tr key={transaction.id} className={`border-b hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                            <td className="p-1.5 text-xs border-r font-medium">
                              {new Date(transaction.date).toLocaleDateString('en-IN')}
                            </td>
                            <td className="p-1.5 text-xs border-r font-medium">{transaction.name}</td>
                            <td className="p-1.5 text-xs border-r">{notes}</td>
                            <td className={`p-1.5 text-xs border-r text-right font-semibold ${debit ? 'text-red-600' : ''}`}>
                              {debit ? `₹${debit.toLocaleString()}` : ''}
                            </td>
                            <td className={`p-1.5 text-xs text-right font-semibold ${credit ? 'text-green-600' : ''}`}>
                              {credit ? `₹${credit.toLocaleString()}` : ''}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {reportStartDate && reportEndDate && getTransactionReportData().length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <History className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No transaction data found for the selected date range</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Profit/Loss Analysis Report Dialog */}
      <Dialog open={showProfitLossAnalysis} onOpenChange={setShowProfitLossAnalysis}>
        <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden p-0">
          <DialogTitle className="sr-only">Profit/Loss Analysis Report</DialogTitle>
          {/* Header */}
          <div className="bg-green-600 text-white p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowProfitLossAnalysis(false)}
                  className="text-white hover:bg-green-700 p-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-lg font-semibold">Profit/Loss Analysis</h2>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-green-700"
                  onClick={async () => {
                    // Get profit/loss data
                    const getProfitLossData = () => {
                      const startDate = new Date(reportStartDate)
                      const endDate = new Date(reportEndDate)
                      
                      // Filter sales within date range
                      const filteredSales = salesData.filter(sale => {
                        const saleDate = new Date(sale.date)
                        return saleDate >= startDate && saleDate <= endDate
                      })
                      
                      // Filter purchases within date range
                      const filteredPurchases = purchaseData.filter(purchase => {
                        const purchaseDate = new Date(purchase.date)
                        return purchaseDate >= startDate && purchaseDate <= endDate
                      })
                      
                      // Calculate averages
                      const totalSalesBags = filteredSales.reduce((sum, sale) => sum + (sale.bags || sale.quantity || 0), 0)
                      const totalSalesRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0)
                      const avgSellingPrice = totalSalesBags > 0 ? totalSalesRevenue / totalSalesBags : 0
                      
                      const totalPurchaseBags = filteredPurchases.reduce((sum, purchase) => sum + purchase.bags, 0)
                      const totalPurchaseCost = filteredPurchases.reduce((sum, purchase) => {
                        // Use originalPrice if available, otherwise use pricePerBag
                        const costPerBag = purchase.originalPrice || purchase.pricePerBag
                        return sum + (purchase.bags * costPerBag)
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
                    }

                    const data = getProfitLossData()
                    
                    if (data.totalSalesBags === 0 && data.totalPurchaseBags === 0) {
                      alert('No sales or purchase data found for the selected date range.')
                      return
                    }

                    try {
                      // Generate PDF for Profit/Loss Report
                      const styles = StyleSheet.create({
                        page: {
                          padding: 20,
                          fontSize: 10,
                        },
                        header: {
                          marginBottom: 15,
                          textAlign: 'center',
                        },
                        title: {
                          fontSize: 16,
                          fontWeight: 'bold',
                          marginBottom: 8,
                          color: '#16a34a',
                        },
                        dateRange: {
                          fontSize: 10,
                          marginBottom: 8,
                          color: '#6b7280',
                        },
                        summarySection: {
                          marginBottom: 15,
                          padding: 12,
                          backgroundColor: '#f9fafb',
                          borderRadius: 4,
                        },
                        summaryTitle: {
                          fontSize: 12,
                          fontWeight: 'bold',
                          marginBottom: 8,
                          color: '#374151',
                        },
                        summaryRow: {
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          marginBottom: 4,
                        },
                        summaryLabel: {
                          fontSize: 10,
                          color: '#6b7280',
                        },
                        summaryValue: {
                          fontSize: 10,
                          fontWeight: 'bold',
                          color: '#111827',
                        },
                        profitValue: {
                          color: '#16a34a',
                        },
                        lossValue: {
                          color: '#dc2626',
                        },
                        table: {
                          marginTop: 10,
                        },
                        tableRow: {
                          flexDirection: 'row',
                          borderBottomWidth: 1,
                          borderBottomColor: '#d1d5db',
                          paddingVertical: 4,
                        },
                        tableHeader: {
                          backgroundColor: '#f3f4f6',
                          fontWeight: 'bold',
                        },
                        tableCell: {
                          padding: 4,
                          fontSize: 8,
                        },
                      })

                      const MyDocument = () => (
                        <Document>
                          <Page size="A4" style={styles.page}>
                            <View style={styles.header}>
                              <Text style={styles.title}>Profit/Loss Analysis Report</Text>
                              <Text style={styles.dateRange}>
                                Period: {new Date(reportStartDate).toLocaleDateString('en-IN')} - {new Date(reportEndDate).toLocaleDateString('en-IN')}
                              </Text>
                              <Text style={styles.dateRange}>A.R. Enterprises</Text>
                            </View>

                            {/* Summary Section */}
                            <View style={styles.summarySection}>
                              <Text style={styles.summaryTitle}>Financial Summary</Text>
                              
                              <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Total Sales (Bags):</Text>
                                <Text style={styles.summaryValue}>{data.totalSalesBags.toLocaleString()} bags</Text>
                              </View>
                              
                              <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Total Sales Revenue:</Text>
                                <Text style={styles.summaryValue}>₹{data.totalSalesRevenue.toLocaleString()}</Text>
                              </View>
                              
                              <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Average Selling Price per Bag:</Text>
                                <Text style={styles.summaryValue}>₹{data.avgSellingPrice.toFixed(2)}</Text>
                              </View>
                              
                              <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Total Purchases (Bags):</Text>
                                <Text style={styles.summaryValue}>{data.totalPurchaseBags.toLocaleString()} bags</Text>
                              </View>
                              
                              <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Total Purchase Cost:</Text>
                                <Text style={styles.summaryValue}>₹{data.totalPurchaseCost.toLocaleString()}</Text>
                              </View>
                              
                              <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Average Cost Price per Bag:</Text>
                                <Text style={styles.summaryValue}>₹{data.avgCostPrice.toFixed(2)}</Text>
                              </View>
                              
                              <View style={[styles.summaryRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 2, borderTopColor: '#d1d5db' }]}>
                                <Text style={[styles.summaryLabel, { fontWeight: 'bold', fontSize: 11 }]}>Profit/Loss per Bag:</Text>
                                <Text style={[styles.summaryValue, data.profitPerBag >= 0 ? styles.profitValue : styles.lossValue, { fontSize: 11 }]}>
                                  ₹{data.profitPerBag.toFixed(2)}
                                </Text>
                              </View>
                              
                              <View style={styles.summaryRow}>
                                <Text style={[styles.summaryLabel, { fontWeight: 'bold', fontSize: 11 }]}>Profit Margin:</Text>
                                <Text style={[styles.summaryValue, data.profitMarginPercent >= 0 ? styles.profitValue : styles.lossValue, { fontSize: 11 }]}>
                                  {data.profitMarginPercent.toFixed(2)}%
                                </Text>
                              </View>
                              
                              <View style={styles.summaryRow}>
                                <Text style={[styles.summaryLabel, { fontWeight: 'bold', fontSize: 11 }]}>Total {data.totalProfit >= 0 ? 'Profit' : 'Loss'}:</Text>
                                <Text style={[styles.summaryValue, data.totalProfit >= 0 ? styles.profitValue : styles.lossValue, { fontSize: 12 }]}>
                                  ₹{Math.abs(data.totalProfit).toFixed(2)}
                                </Text>
                              </View>
                            </View>
                          </Page>
                        </Document>
                      )

                      const blob = await pdf(<MyDocument />).toBlob()
                      
                      if (!blob || blob.size === 0) {
                        throw new Error('Failed to generate PDF blob')
                      }

                      const url = URL.createObjectURL(blob)
                      const link = document.createElement('a')
                      link.href = url
                      link.download = `Profit_Loss_Analysis_${reportStartDate}_to_${reportEndDate}.pdf`
                      document.body.appendChild(link)
                      link.click()
                      document.body.removeChild(link)
                      URL.revokeObjectURL(url)
                    } catch (error) {
                      console.error('Error generating PDF:', error)
                      alert(`Error generating PDF: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`)
                    }
                  }}
                >
                  <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                  </svg>
                  PDF
                </Button>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(95vh - 80px)' }}>
            {/* Date Range Section */}
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium">
                    {reportStartDate && reportEndDate
                      ? `${new Date(reportStartDate).toLocaleDateString('en-IN')} - ${new Date(reportEndDate).toLocaleDateString('en-IN')}`
                      : 'Select Date Range'
                    }
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = new Date()
                    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
                    setReportStartDate(lastMonth.toISOString().split('T')[0])
                    setReportEndDate(today.toISOString().split('T')[0])
                  }}
                  className="text-purple-600 border-purple-600 hover:bg-purple-50"
                >
                  CHANGE
                </Button>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <Label htmlFor="profit-loss-start-date" className="text-xs text-gray-600 mb-1 block">
                    From Date
                  </Label>
                  <DateInputWithIcon
                    id="profit-loss-start-date"
                    value={reportStartDate}
                    onChange={(e) => setReportStartDate(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="profit-loss-end-date" className="text-xs text-gray-600 mb-1 block">
                    To Date
                  </Label>
                  <DateInputWithIcon
                    id="profit-loss-end-date"
                    value={reportEndDate}
                    onChange={(e) => setReportEndDate(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Analysis Section */}
            {reportStartDate && reportEndDate && (() => {
              const startDate = new Date(reportStartDate)
              const endDate = new Date(reportEndDate)
              
              // Filter sales within date range
              const filteredSales = salesData.filter(sale => {
                const saleDate = new Date(sale.date)
                return saleDate >= startDate && saleDate <= endDate
              })
              
              // Filter purchases within date range
              const filteredPurchases = purchaseData.filter(purchase => {
                const purchaseDate = new Date(purchase.date)
                return purchaseDate >= startDate && purchaseDate <= endDate
              })
              
              // Calculate averages
              const totalSalesBags = filteredSales.reduce((sum, sale) => sum + (sale.bags || sale.quantity || 0), 0)
              const totalSalesRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0)
              const avgSellingPrice = totalSalesBags > 0 ? totalSalesRevenue / totalSalesBags : 0
              
              const totalPurchaseBags = filteredPurchases.reduce((sum, purchase) => sum + purchase.bags, 0)
              const totalPurchaseCost = filteredPurchases.reduce((sum, purchase) => {
                // Use originalPrice if available, otherwise use pricePerBag
                const costPerBag = purchase.originalPrice || purchase.pricePerBag
                return sum + (purchase.bags * costPerBag)
              }, 0)
              const avgCostPrice = totalPurchaseBags > 0 ? totalPurchaseCost / totalPurchaseBags : 0
              
              // Calculate profit/loss
              const profitPerBag = avgSellingPrice - avgCostPrice
              const profitMarginPercent = avgCostPrice > 0 ? (profitPerBag / avgCostPrice) * 100 : 0
              const totalProfit = totalSalesBags * profitPerBag

              return (
                <div className="space-y-4">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-blue-600">Sales Overview</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-xs text-muted-foreground">Total Bags Sold:</span>
                          <span className="text-sm font-semibold">{totalSalesBags.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs text-muted-foreground">Total Revenue:</span>
                          <span className="text-sm font-semibold">₹{totalSalesRevenue.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t">
                          <span className="text-xs font-medium">Avg. Selling Price/Bag:</span>
                          <span className="text-sm font-bold text-blue-600">₹{avgSellingPrice.toFixed(2)}</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-orange-600">Purchase Overview</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-xs text-muted-foreground">Total Bags Purchased:</span>
                          <span className="text-sm font-semibold">{totalPurchaseBags.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs text-muted-foreground">Total Cost:</span>
                          <span className="text-sm font-semibold">₹{totalPurchaseCost.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t">
                          <span className="text-xs font-medium">Avg. Cost Price/Bag:</span>
                          <span className="text-sm font-bold text-orange-600">₹{avgCostPrice.toFixed(2)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Profit/Loss Summary */}
                  <Card className={`${totalProfit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className={`h-5 w-5 ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                        {totalProfit >= 0 ? 'Profit' : 'Loss'} Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Profit/Loss per Bag:</span>
                        <span className={`text-lg font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ₹{profitPerBag.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Profit Margin:</span>
                        <span className={`text-lg font-bold ${profitMarginPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {profitMarginPercent.toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t-2 border-gray-300">
                        <span className="text-base font-semibold">Total {totalProfit >= 0 ? 'Profit' : 'Loss'}:</span>
                        <span className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ₹{Math.abs(totalProfit).toFixed(2)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Details Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Sales Details ({filteredSales.length} transactions)</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="max-h-64 overflow-y-auto">
                          <table className="w-full text-xs">
                            <thead className="sticky top-0 bg-gray-100">
                              <tr>
                                <th className="text-left p-2">Date</th>
                                <th className="text-left p-2">Customer</th>
                                <th className="text-right p-2">Bags</th>
                                <th className="text-right p-2">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredSales.map((sale, idx) => (
                                <tr key={sale.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                  <td className="p-2">{new Date(sale.date).toLocaleDateString('en-IN')}</td>
                                  <td className="p-2">{sale.customer}</td>
                                  <td className="text-right p-2">{sale.bags || sale.quantity}</td>
                                  <td className="text-right p-2">₹{sale.total.toLocaleString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Purchase Details ({filteredPurchases.length} transactions)</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="max-h-64 overflow-y-auto">
                          <table className="w-full text-xs">
                            <thead className="sticky top-0 bg-gray-100">
                              <tr>
                                <th className="text-left p-2">Date</th>
                                <th className="text-left p-2">Supplier</th>
                                <th className="text-right p-2">Bags</th>
                                <th className="text-right p-2">Cost/Bag</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredPurchases.map((purchase, idx) => (
                                <tr key={purchase.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                  <td className="p-2">{new Date(purchase.date).toLocaleDateString('en-IN')}</td>
                                  <td className="p-2">{purchase.supplier}</td>
                                  <td className="text-right p-2">{purchase.bags}</td>
                                  <td className="text-right p-2">₹{(purchase.originalPrice || purchase.pricePerBag).toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )
            })()}

            {reportStartDate && reportEndDate && (() => {
              const startDate = new Date(reportStartDate)
              const endDate = new Date(reportEndDate)
              const filteredSales = salesData.filter(sale => {
                const saleDate = new Date(sale.date)
                return saleDate >= startDate && saleDate <= endDate
              })
              const filteredPurchases = purchaseData.filter(purchase => {
                const purchaseDate = new Date(purchase.date)
                return purchaseDate >= startDate && purchaseDate <= endDate
              })
              
              if (filteredSales.length === 0 && filteredPurchases.length === 0) {
                return (
                  <div className="text-center py-12">
                    <TrendingUp className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Found</h3>
                    <p className="text-sm text-muted-foreground">
                      No sales or purchase data available for the selected date range.
                    </p>
                  </div>
                )
              }
              return null
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Customer Activity Report Dialog */}
      <Dialog open={showCustomerActivityReport} onOpenChange={setShowCustomerActivityReport}>
        <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden p-0">
          <DialogTitle className="sr-only">Customer Activity Report</DialogTitle>
          {/* Header */}
          <div className="bg-blue-600 text-white p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCustomerActivityReport(false)}
                  className="text-white hover:bg-blue-700 p-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-lg font-semibold">Customer Activity Report</h2>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-blue-700"
                  onClick={async () => {
                    // Get customer activity data
                    const getCustomerActivityData = () => {
                      const today = new Date()
                      const thirtyDaysAgo = new Date(today)
                      thirtyDaysAgo.setDate(today.getDate() - 30)
                      
                      return customerData.map(customer => {
                        // Find last transaction date
                        const lastTransaction = customer.transactions
                          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
                        
                        const lastTransactionDate = lastTransaction ? new Date(lastTransaction.date) : null
                        const daysSinceLastTransaction = lastTransactionDate 
                          ? Math.floor((today.getTime() - lastTransactionDate.getTime()) / (1000 * 60 * 60 * 24))
                          : null
                        
                        const isActive = lastTransactionDate && lastTransactionDate >= thirtyDaysAgo
                        
                        // Count transactions in last 30 days
                        const recentTransactions = customer.transactions.filter(t => {
                          const txDate = new Date(t.date)
                          return txDate >= thirtyDaysAgo && txDate <= today
                        }).length
                        
                        return {
                          name: customer.name,
                          phone: customer.phone,
                          category: customer.category,
                          balance: customer.balance,
                          lastTransactionDate: lastTransactionDate ? lastTransactionDate.toISOString().split('T')[0] : 'Never',
                          daysSinceLastTransaction: daysSinceLastTransaction !== null ? daysSinceLastTransaction : '-',
                          isActive,
                          recentTransactions,
                          totalTransactions: customer.transactions.length
                        }
                      }).sort((a, b) => {
                        // Sort by active status first, then by days since last transaction
                        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
                        if (a.daysSinceLastTransaction === '-') return 1
                        if (b.daysSinceLastTransaction === '-') return -1
                        return Number(a.daysSinceLastTransaction) - Number(b.daysSinceLastTransaction)
                      })
                    }

                    const data = getCustomerActivityData()
                    
                    if (data.length === 0) {
                      alert('No customer data found.')
                      return
                    }

                    try {
                      // Generate PDF for Customer Activity Report
                      const styles = StyleSheet.create({
                        page: {
                          padding: 20,
                          fontSize: 9,
                        },
                        header: {
                          marginBottom: 15,
                          textAlign: 'center',
                        },
                        title: {
                          fontSize: 16,
                          fontWeight: 'bold',
                          marginBottom: 8,
                          color: '#2563eb',
                        },
                        subtitle: {
                          fontSize: 10,
                          marginBottom: 8,
                          color: '#6b7280',
                        },
                        summaryCards: {
                          flexDirection: 'row',
                          marginBottom: 15,
                          gap: 8,
                        },
                        summaryCard: {
                          flex: 1,
                          padding: 8,
                          borderRadius: 4,
                          borderWidth: 1,
                        },
                        activeCard: {
                          backgroundColor: '#dcfce7',
                          borderColor: '#86efac',
                        },
                        inactiveCard: {
                          backgroundColor: '#fee2e2',
                          borderColor: '#fca5a5',
                        },
                        totalCard: {
                          backgroundColor: '#dbeafe',
                          borderColor: '#93c5fd',
                        },
                        summaryLabel: {
                          fontSize: 8,
                          fontWeight: 'bold',
                          marginBottom: 4,
                          textAlign: 'center',
                        },
                        activeLabel: {
                          color: '#166534',
                        },
                        inactiveLabel: {
                          color: '#991b1b',
                        },
                        totalLabel: {
                          color: '#1e40af',
                        },
                        summaryValue: {
                          fontSize: 10,
                          fontWeight: 'bold',
                          textAlign: 'center',
                        },
                        activeValue: {
                          color: '#16a34a',
                        },
                        inactiveValue: {
                          color: '#dc2626',
                        },
                        totalValue: {
                          color: '#2563eb',
                        },
                        table: {
                          marginTop: 10,
                        },
                        tableRow: {
                          flexDirection: 'row',
                          borderBottomWidth: 1,
                          borderBottomColor: '#d1d5db',
                          paddingVertical: 3,
                        },
                        tableHeader: {
                          backgroundColor: '#f3f4f6',
                          fontWeight: 'bold',
                        },
                        tableCell: {
                          padding: 3,
                          fontSize: 7,
                        },
                        snoCell: {
                          flex: 0.4,
                        },
                        nameCell: {
                          flex: 1.2,
                        },
                        phoneCell: {
                          flex: 1,
                        },
                        categoryCell: {
                          flex: 0.9,
                        },
                        statusCell: {
                          flex: 0.8,
                        },
                        lastTxCell: {
                          flex: 0.9,
                        },
                        daysCell: {
                          flex: 0.6,
                          textAlign: 'right',
                        },
                        txCountCell: {
                          flex: 0.6,
                          textAlign: 'right',
                        },
                        activeRow: {
                          backgroundColor: '#f0fdf4',
                        },
                        inactiveRow: {
                          backgroundColor: '#fef2f2',
                        },
                      })

                      const MyDocument = () => {
                        const activeCustomers = data.filter(c => c.isActive).length
                        const inactiveCustomers = data.filter(c => !c.isActive).length
                        const totalCustomers = data.length

                        return (
                          <Document>
                            <Page size="A4" orientation="landscape" style={styles.page}>
                              <View style={styles.header}>
                                <Text style={styles.title}>Customer Activity Report</Text>
                                <Text style={styles.subtitle}>
                                  30-Day Activity Window | Generated: {new Date().toLocaleDateString('en-IN')}
                                </Text>
                                <Text style={styles.subtitle}>A.R. Enterprises</Text>
                              </View>

                              {/* Summary Cards */}
                              <View style={styles.summaryCards}>
                                <View style={[styles.summaryCard, styles.activeCard]}>
                                  <Text style={[styles.summaryLabel, styles.activeLabel]}>Active Customers</Text>
                                  <Text style={[styles.summaryValue, styles.activeValue]}>{activeCustomers}</Text>
                                </View>
                                <View style={[styles.summaryCard, styles.inactiveCard]}>
                                  <Text style={[styles.summaryLabel, styles.inactiveLabel]}>Inactive Customers</Text>
                                  <Text style={[styles.summaryValue, styles.inactiveValue]}>{inactiveCustomers}</Text>
                                </View>
                                <View style={[styles.summaryCard, styles.totalCard]}>
                                  <Text style={[styles.summaryLabel, styles.totalLabel]}>Total Customers</Text>
                                  <Text style={[styles.summaryValue, styles.totalValue]}>{totalCustomers}</Text>
                                </View>
                              </View>

                              <View style={styles.table}>
                                <View style={[styles.tableRow, styles.tableHeader]}>
                                  <Text style={[styles.tableCell, styles.snoCell]}>S.No</Text>
                                  <Text style={[styles.tableCell, styles.nameCell]}>Name</Text>
                                  <Text style={[styles.tableCell, styles.phoneCell]}>Phone</Text>
                                  <Text style={[styles.tableCell, styles.categoryCell]}>Category</Text>
                                  <Text style={[styles.tableCell, styles.statusCell]}>Status</Text>
                                  <Text style={[styles.tableCell, styles.lastTxCell]}>Last Tx</Text>
                                  <Text style={[styles.tableCell, styles.daysCell]}>Days</Text>
                                  <Text style={[styles.tableCell, styles.txCountCell]}>Tx(30d)</Text>
                                </View>

                                {data.map((customer, index) => (
                                  <View 
                                    key={index} 
                                    style={[
                                      styles.tableRow, 
                                      customer.isActive ? styles.activeRow : styles.inactiveRow
                                    ]}
                                  >
                                    <Text style={[styles.tableCell, styles.snoCell]}>{index + 1}</Text>
                                    <Text style={[styles.tableCell, styles.nameCell]}>{customer.name}</Text>
                                    <Text style={[styles.tableCell, styles.phoneCell]}>{customer.phone || '-'}</Text>
                                    <Text style={[styles.tableCell, styles.categoryCell]}>{customer.category}</Text>
                                    <Text style={[styles.tableCell, styles.statusCell]}>
                                      {customer.isActive ? 'Active' : 'Inactive'}
                                    </Text>
                                    <Text style={[styles.tableCell, styles.lastTxCell]}>
                                      {customer.lastTransactionDate === 'Never' 
                                        ? 'Never' 
                                        : new Date(customer.lastTransactionDate).toLocaleDateString('en-IN')}
                                    </Text>
                                    <Text style={[styles.tableCell, styles.daysCell]}>
                                      {customer.daysSinceLastTransaction}
                                    </Text>
                                    <Text style={[styles.tableCell, styles.txCountCell]}>
                                      {customer.recentTransactions}
                                    </Text>
                                  </View>
                                ))}
                              </View>
                            </Page>
                          </Document>
                        )
                      }

                      const blob = await pdf(<MyDocument />).toBlob()
                      
                      if (!blob || blob.size === 0) {
                        throw new Error('Failed to generate PDF blob')
                      }

                      const url = URL.createObjectURL(blob)
                      const link = document.createElement('a')
                      link.href = url
                      link.download = `Customer_Activity_Report_${new Date().toISOString().split('T')[0]}.pdf`
                      document.body.appendChild(link)
                      link.click()
                      document.body.removeChild(link)
                      URL.revokeObjectURL(url)
                    } catch (error) {
                      console.error('Error generating PDF:', error)
                      alert(`Error generating PDF: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`)
                    }
                  }}
                >
                  <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                  </svg>
                  PDF
                </Button>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(95vh - 80px)' }}>
            {/* Category Filter */}
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center gap-4">
                <Label className="text-sm font-medium">Filter by Category:</Label>
                <Select value={customerCategoryFilter} onValueChange={(value: any) => setCustomerCategoryFilter(value)}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="Engineer">Engineer</SelectItem>
                    <SelectItem value="Contractor">Contractor</SelectItem>
                    <SelectItem value="Builder">Builder</SelectItem>
                    <SelectItem value="Individual">Individual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Summary Cards */}
            {(() => {
              const today = new Date()
              const thirtyDaysAgo = new Date(today)
              thirtyDaysAgo.setDate(today.getDate() - 30)
              
              const filteredCustomers = customerCategoryFilter === "all" 
                ? customerData 
                : customerData.filter(c => c.category === customerCategoryFilter)
              
              const activeCustomers = filteredCustomers.filter(customer => {
                const lastTransaction = customer.transactions
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
                const lastTransactionDate = lastTransaction ? new Date(lastTransaction.date) : null
                return lastTransactionDate && lastTransactionDate >= thirtyDaysAgo
              }).length
              
              const inactiveCustomers = filteredCustomers.length - activeCustomers

              return (
                <div className="grid grid-cols-3 gap-4">
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="p-4 text-center">
                      <UserCheck className="h-8 w-8 text-green-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-green-600">{activeCustomers}</p>
                      <p className="text-sm text-green-700 font-medium">Active Customers</p>
                      <p className="text-xs text-muted-foreground mt-1">Transacted in last 30 days</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-red-50 border-red-200">
                    <CardContent className="p-4 text-center">
                      <AlertTriangle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-red-600">{inactiveCustomers}</p>
                      <p className="text-sm text-red-700 font-medium">Inactive Customers</p>
                      <p className="text-xs text-muted-foreground mt-1">No activity in 30+ days</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4 text-center">
                      <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-blue-600">{filteredCustomers.length}</p>
                      <p className="text-sm text-blue-700 font-medium">Total Customers</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {customerCategoryFilter === "all" ? "All categories" : customerCategoryFilter}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )
            })()}

            {/* Customer Activity Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Customer Activity Details</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Showing activity status based on 30-day window
                </p>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto max-h-96">
                    <table className="w-full">
                      <thead className="bg-gray-100 sticky top-0">
                        <tr>
                          <th className="text-left p-2 text-xs font-semibold border-r">S.No</th>
                          <th className="text-left p-2 text-xs font-semibold border-r">Name</th>
                          <th className="text-left p-2 text-xs font-semibold border-r">Phone</th>
                          <th className="text-left p-2 text-xs font-semibold border-r">Category</th>
                          <th className="text-center p-2 text-xs font-semibold border-r">Status</th>
                          <th className="text-left p-2 text-xs font-semibold border-r">Last Transaction</th>
                          <th className="text-center p-2 text-xs font-semibold border-r">Days Since</th>
                          <th className="text-center p-2 text-xs font-semibold">Tx (30d)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const today = new Date()
                          const thirtyDaysAgo = new Date(today)
                          thirtyDaysAgo.setDate(today.getDate() - 30)
                          
                          const filteredCustomers = customerCategoryFilter === "all" 
                            ? customerData 
                            : customerData.filter(c => c.category === customerCategoryFilter)
                          
                          const customersWithActivity = filteredCustomers.map(customer => {
                            const lastTransaction = customer.transactions
                              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
                            
                            const lastTransactionDate = lastTransaction ? new Date(lastTransaction.date) : null
                            const daysSinceLastTransaction = lastTransactionDate 
                              ? Math.floor((today.getTime() - lastTransactionDate.getTime()) / (1000 * 60 * 60 * 24))
                              : null
                            
                            const isActive = lastTransactionDate && lastTransactionDate >= thirtyDaysAgo
                            
                            const recentTransactions = customer.transactions.filter(t => {
                              const txDate = new Date(t.date)
                              return txDate >= thirtyDaysAgo && txDate <= today
                            }).length
                            
                            return {
                              ...customer,
                              lastTransactionDate,
                              daysSinceLastTransaction,
                              isActive,
                              recentTransactions
                            }
                          }).sort((a, b) => {
                            if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
                            if (a.daysSinceLastTransaction === null) return 1
                            if (b.daysSinceLastTransaction === null) return -1
                            return a.daysSinceLastTransaction - b.daysSinceLastTransaction
                          })

                          return customersWithActivity.map((customer, index) => (
                            <tr 
                              key={customer.name} 
                              className={`border-b hover:bg-gray-50 ${
                                customer.isActive ? 'bg-green-50' : 'bg-red-50'
                              }`}
                            >
                              <td className="p-2 text-xs border-r">{index + 1}</td>
                              <td className="p-2 text-xs font-medium border-r">{customer.name}</td>
                              <td className="p-2 text-xs border-r">{customer.phone || '-'}</td>
                              <td className="p-2 text-xs border-r">{customer.category}</td>
                              <td className="p-2 text-center border-r">
                                <Badge 
                                  className={`text-xs ${
                                    customer.isActive 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-red-100 text-red-800'
                                  }`}
                                >
                                  {customer.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                              </td>
                              <td className="p-2 text-xs border-r">
                                {customer.lastTransactionDate 
                                  ? new Date(customer.lastTransactionDate).toLocaleDateString('en-IN')
                                  : 'Never'}
                              </td>
                              <td className="p-2 text-xs text-center border-r font-medium">
                                {customer.daysSinceLastTransaction !== null 
                                  ? `${customer.daysSinceLastTransaction} days`
                                  : '-'}
                              </td>
                              <td className="p-2 text-xs text-center font-semibold">
                                {customer.recentTransactions}
                              </td>
                            </tr>
                          ))
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>

            {customerData.length === 0 && (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Customers Found</h3>
                <p className="text-sm text-muted-foreground">
                  Add customers in the Customers tab to generate activity reports.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Product Sub-Category Report Dialog */}
      <Dialog open={showProductSubCategoryReport} onOpenChange={setShowProductSubCategoryReport}>
        <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden p-0">
          <DialogTitle className="sr-only">Product Sub-Category Report</DialogTitle>
          {/* Header */}
          <div className="bg-purple-600 text-white p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowProductSubCategoryReport(false)}
                  className="text-white hover:bg-purple-700 p-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-lg font-semibold">Product Sub-Category Report</h2>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-purple-700"
                  onClick={async () => {
                    const selectedProduct = selectedPurchaseSupplier
                    if (!selectedProduct) {
                      alert('Please select a product first')
                      return
                    }

                    // Get product sub-category data
                    const getProductSubCategoryData = () => {
                      const startDate = new Date(reportStartDate)
                      const endDate = new Date(reportEndDate)
                      
                      // Get all purchases for the selected product
                      const productPurchases = purchaseData.filter(p => {
                        const purchaseDate = new Date(p.date)
                        return p.supplier === selectedProduct && 
                               purchaseDate >= startDate && 
                               purchaseDate <= endDate
                      })
                      
                      // Get all dumps for the selected product
                      const productDumps = stockLoadEvents.filter(d => {
                        const dumpDate = new Date(d.date)
                        return d.type === "dump" && 
                               d.brand === selectedProduct && 
                               dumpDate >= startDate && 
                               dumpDate <= endDate
                      })
                      
                      // Get all unique dates
                      const allDates = new Set<string>()
                      productPurchases.forEach(p => allDates.add(p.date))
                      productDumps.forEach(d => allDates.add(d.date))
                      
                      // Get all unique subcategories
                      const allSubCategories = new Set<string>()
                      productPurchases.forEach(p => {
                        if (p.category) allSubCategories.add(p.category)
                      })
                      productDumps.forEach(d => {
                        if (d.category) allSubCategories.add(d.category)
                      })
                      
                      // Build data by date and subcategory
                      const dateMap = new Map<string, Map<string, { purchases: number, dumps: number }>>()
                      
                      Array.from(allDates).sort().forEach(date => {
                        const subCatMap = new Map<string, { purchases: number, dumps: number }>()
                        
                        Array.from(allSubCategories).forEach(subCat => {
                          const purchases = productPurchases
                            .filter(p => p.date === date && p.category === subCat)
                            .reduce((sum, p) => sum + p.bags, 0)
                          
                          const dumps = productDumps
                            .filter(d => d.date === date && d.category === subCat)
                            .reduce((sum, d) => sum + d.quantity, 0)
                          
                          if (purchases > 0 || dumps > 0) {
                            subCatMap.set(subCat, { purchases, dumps })
                          }
                        })
                        
                        if (subCatMap.size > 0) {
                          dateMap.set(date, subCatMap)
                        }
                      })
                      
                      return {
                        dateMap,
                        allSubCategories: Array.from(allSubCategories).sort(),
                        totalPurchases: productPurchases.reduce((sum, p) => sum + p.bags, 0),
                        totalDumps: productDumps.reduce((sum, d) => sum + d.quantity, 0)
                      }
                    }

                    const data = getProductSubCategoryData()
                    
                    if (data.dateMap.size === 0) {
                      alert('No data found for the selected product and date range.')
                      return
                    }

                    try {
                      // Generate PDF for Product Sub-Category Report
                      const styles = StyleSheet.create({
                        page: {
                          padding: 20,
                          fontSize: 8,
                        },
                        header: {
                          marginBottom: 15,
                          textAlign: 'center',
                        },
                        title: {
                          fontSize: 16,
                          fontWeight: 'bold',
                          marginBottom: 8,
                          color: '#9333ea',
                        },
                        subtitle: {
                          fontSize: 10,
                          marginBottom: 8,
                          color: '#6b7280',
                        },
                        summarySection: {
                          flexDirection: 'row',
                          marginBottom: 15,
                          gap: 8,
                        },
                        summaryCard: {
                          flex: 1,
                          padding: 8,
                          backgroundColor: '#f3e8ff',
                          borderRadius: 4,
                          borderWidth: 1,
                          borderColor: '#c084fc',
                        },
                        summaryLabel: {
                          fontSize: 8,
                          color: '#6b21a8',
                          marginBottom: 4,
                        },
                        summaryValue: {
                          fontSize: 12,
                          fontWeight: 'bold',
                          color: '#7c3aed',
                        },
                        table: {
                          marginTop: 10,
                        },
                        tableRow: {
                          flexDirection: 'row',
                          borderBottomWidth: 1,
                          borderBottomColor: '#d1d5db',
                          paddingVertical: 4,
                        },
                        tableHeader: {
                          backgroundColor: '#f3f4f6',
                          fontWeight: 'bold',
                        },
                        tableCell: {
                          padding: 4,
                          fontSize: 7,
                        },
                        dateCell: {
                          flex: 1,
                        },
                        subCatCell: {
                          flex: 1,
                          textAlign: 'center',
                        },
                        dumpText: {
                          color: '#dc2626',
                          fontWeight: 'bold',
                        },
                        purchaseText: {
                          color: '#059669',
                        },
                      })

                      const MyDocument = () => (
                        <Document>
                          <Page size="A4" orientation="landscape" style={styles.page}>
                            <View style={styles.header}>
                              <Text style={styles.title}>Product Sub-Category Report</Text>
                              <Text style={styles.subtitle}>
                                Product: {selectedProduct} | Period: {new Date(reportStartDate).toLocaleDateString('en-IN')} - {new Date(reportEndDate).toLocaleDateString('en-IN')}
                              </Text>
                              <Text style={styles.subtitle}>A.R. Enterprises</Text>
                            </View>

                            {/* Summary Section */}
                            <View style={styles.summarySection}>
                              <View style={styles.summaryCard}>
                                <Text style={styles.summaryLabel}>Total Purchases</Text>
                                <Text style={styles.summaryValue}>{data.totalPurchases} bags</Text>
                              </View>
                              <View style={styles.summaryCard}>
                                <Text style={styles.summaryLabel}>Total Dumps</Text>
                                <Text style={styles.summaryValue}>{data.totalDumps} bags</Text>
                              </View>
                              <View style={styles.summaryCard}>
                                <Text style={styles.summaryLabel}>Total Quantity</Text>
                                <Text style={styles.summaryValue}>{data.totalPurchases + data.totalDumps} bags</Text>
                              </View>
                            </View>

                            <View style={styles.table}>
                              <View style={[styles.tableRow, styles.tableHeader]}>
                                <Text style={[styles.tableCell, styles.dateCell]}>Date</Text>
                                {data.allSubCategories.map((subCat, idx) => (
                                  <Text key={idx} style={[styles.tableCell, styles.subCatCell]}>{subCat}</Text>
                                ))}
                              </View>

                              {Array.from(data.dateMap.entries()).map(([date, subCatMap], idx) => (
                                <View key={idx} style={[styles.tableRow, { backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9fafb' }]}>
                                  <Text style={[styles.tableCell, styles.dateCell]}>
                                    {new Date(date).toLocaleDateString('en-IN')}
                                  </Text>
                                  {data.allSubCategories.map((subCat, subIdx) => {
                                    const values = subCatMap.get(subCat)
                                    if (!values) {
                                      return <Text key={subIdx} style={[styles.tableCell, styles.subCatCell]}>-</Text>
                                    }
                                    const displayText = values.purchases > 0 && values.dumps > 0
                                      ? `${values.purchases} / ${values.dumps}(D)`
                                      : values.dumps > 0
                                      ? `${values.dumps}(DUMP)`
                                      : values.purchases.toString()
                                    return (
                                      <Text key={subIdx} style={[styles.tableCell, styles.subCatCell, values.dumps > 0 ? styles.dumpText : styles.purchaseText]}>
                                        {displayText}
                                      </Text>
                                    )
                                  })}
                                </View>
                              ))}
                            </View>
                          </Page>
                        </Document>
                      )

                      const blob = await pdf(<MyDocument />).toBlob()
                      
                      if (!blob || blob.size === 0) {
                        throw new Error('Failed to generate PDF blob')
                      }

                      const url = URL.createObjectURL(blob)
                      const link = document.createElement('a')
                      link.href = url
                      link.download = `Product_SubCategory_Report_${selectedProduct}_${reportStartDate}_to_${reportEndDate}.pdf`
                      document.body.appendChild(link)
                      link.click()
                      document.body.removeChild(link)
                      URL.revokeObjectURL(url)
                    } catch (error) {
                      console.error('Error generating PDF:', error)
                      alert(`Error generating PDF: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`)
                    }
                  }}
                >
                  <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                  </svg>
                  PDF
                </Button>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(95vh - 80px)' }}>
            {/* Product Selection & Date Range */}
            <div className="bg-gray-50 p-3 rounded-lg space-y-3">
              <div className="flex items-center gap-4">
                <Label className="text-sm font-medium whitespace-nowrap">Select Product:</Label>
                <Select value={selectedPurchaseSupplier} onValueChange={(value) => setSelectedPurchaseSupplier(value)}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Choose a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {productTypes.map((product) => (
                      <SelectItem key={product.name} value={product.name}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium">
                    {reportStartDate && reportEndDate
                      ? `${new Date(reportStartDate).toLocaleDateString('en-IN')} - ${new Date(reportEndDate).toLocaleDateString('en-IN')}`
                      : 'Select Date Range'
                    }
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = new Date()
                    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
                    setReportStartDate(firstDayOfMonth.toISOString().split('T')[0])
                    setReportEndDate(today.toISOString().split('T')[0])
                  }}
                  className="text-purple-600 border-purple-600 hover:bg-purple-50"
                >
                  THIS MONTH
                </Button>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <Label htmlFor="product-report-start-date" className="text-xs text-gray-600 mb-1 block">
                    From Date
                  </Label>
                  <DateInputWithIcon
                    id="product-report-start-date"
                    value={reportStartDate}
                    onChange={(e) => setReportStartDate(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="product-report-end-date" className="text-xs text-gray-600 mb-1 block">
                    To Date
                  </Label>
                  <DateInputWithIcon
                    id="product-report-end-date"
                    value={reportEndDate}
                    onChange={(e) => setReportEndDate(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Report Display */}
            {selectedPurchaseSupplier && reportStartDate && reportEndDate && (() => {
              const startDate = new Date(reportStartDate)
              const endDate = new Date(reportEndDate)
              
              // Get all purchases for the selected product
              const productPurchases = purchaseData.filter(p => {
                const purchaseDate = new Date(p.date)
                return p.supplier === selectedPurchaseSupplier && 
                       purchaseDate >= startDate && 
                       purchaseDate <= endDate
              })
              
              // Get all dumps for the selected product
              const productDumps = stockLoadEvents.filter(d => {
                const dumpDate = new Date(d.date)
                return d.type === "dump" && 
                       d.brand === selectedPurchaseSupplier && 
                       dumpDate >= startDate && 
                       dumpDate <= endDate
              })
              
              // Get all unique dates
              const allDates = new Set<string>()
              productPurchases.forEach(p => allDates.add(p.date))
              productDumps.forEach(d => allDates.add(d.date))
              
              // Get all unique subcategories
              const allSubCategories = new Set<string>()
              productPurchases.forEach(p => {
                if (p.category) allSubCategories.add(p.category)
              })
              productDumps.forEach(d => {
                if (d.category) allSubCategories.add(d.category)
              })
              
              // Build data by date and subcategory
              const dateMap = new Map<string, Map<string, { purchases: number, dumps: number }>>()
              
              Array.from(allDates).sort().forEach(date => {
                const subCatMap = new Map<string, { purchases: number, dumps: number }>()
                
                Array.from(allSubCategories).forEach(subCat => {
                  const purchases = productPurchases
                    .filter(p => p.date === date && p.category === subCat)
                    .reduce((sum, p) => sum + p.bags, 0)
                  
                  const dumps = productDumps
                    .filter(d => d.date === date && d.category === subCat)
                    .reduce((sum, d) => sum + d.quantity, 0)
                  
                  if (purchases > 0 || dumps > 0) {
                    subCatMap.set(subCat, { purchases, dumps })
                  }
                })
                
                if (subCatMap.size > 0) {
                  dateMap.set(date, subCatMap)
                }
              })
              
              const totalPurchases = productPurchases.reduce((sum, p) => sum + p.bags, 0)
              const totalDumps = productDumps.reduce((sum, d) => sum + d.quantity, 0)

              if (dateMap.size === 0) {
                return (
                  <div className="text-center py-12">
                    <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Found</h3>
                    <p className="text-sm text-muted-foreground">
                      No transactions found for {selectedPurchaseSupplier} in the selected date range.
                    </p>
                  </div>
                )
              }

              return (
                <div className="space-y-4">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-3 gap-4">
                    <Card className="bg-purple-50 border-purple-200">
                      <CardContent className="p-4 text-center">
                        <ShoppingCart className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-purple-600">{totalPurchases}</p>
                        <p className="text-sm text-purple-700 font-medium">Total Purchases</p>
                        <p className="text-xs text-muted-foreground mt-1">bags</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-red-50 border-red-200">
                      <CardContent className="p-4 text-center">
                        <AlertTriangle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-red-600">{totalDumps}</p>
                        <p className="text-sm text-red-700 font-medium">Total Dumps</p>
                        <p className="text-xs text-muted-foreground mt-1">bags</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-blue-50 border-blue-200">
                      <CardContent className="p-4 text-center">
                        <Package className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-blue-600">{totalPurchases + totalDumps}</p>
                        <p className="text-sm text-blue-700 font-medium">Total Quantity</p>
                        <p className="text-xs text-muted-foreground mt-1">bags</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Data Table */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">{selectedPurchaseSupplier} - Sub-Category Breakdown</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Regular purchases and dumps by sub-category
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="border rounded-lg overflow-hidden">
                        <div className="overflow-x-auto max-h-96">
                          <table className="w-full">
                            <thead className="bg-purple-100 sticky top-0">
                              <tr>
                                <th className="text-left p-3 text-sm font-semibold border-r">Date</th>
                                {Array.from(allSubCategories).sort().map((subCat, idx) => (
                                  <th key={idx} className="text-center p-3 text-sm font-semibold border-r">
                                    {subCat}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {Array.from(dateMap.entries()).sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime()).map(([date, subCatMap], idx) => (
                                <tr key={idx} className={`border-b hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                  <td className="p-3 text-sm font-medium border-r">
                                    {new Date(date).toLocaleDateString('en-IN')}
                                  </td>
                                  {Array.from(allSubCategories).sort().map((subCat, subIdx) => {
                                    const values = subCatMap.get(subCat)
                                    if (!values) {
                                      return (
                                        <td key={subIdx} className="p-3 text-center text-sm text-gray-400 border-r">
                                          -
                                        </td>
                                      )
                                    }
                                    
                                    return (
                                      <td key={subIdx} className="p-3 text-center text-sm border-r">
                                        {values.purchases > 0 && (
                                          <span className="text-green-600 font-semibold">
                                            {values.purchases}
                                          </span>
                                        )}
                                        {values.purchases > 0 && values.dumps > 0 && (
                                          <span className="text-gray-400 mx-1">/</span>
                                        )}
                                        {values.dumps > 0 && (
                                          <span className="text-red-600 font-semibold">
                                            {values.dumps}
                                            <span className="text-xs ml-1">(DUMP)</span>
                                          </span>
                                        )}
                                      </td>
                                    )
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      
                      {/* Legend */}
                      <div className="mt-4 flex items-center gap-6 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-600 rounded"></div>
                          <span>Regular Purchase</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-red-600 rounded"></div>
                          <span>Dump</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )
            })()}

            {!selectedPurchaseSupplier && (
              <div className="text-center py-12">
                <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Product</h3>
                <p className="text-sm text-muted-foreground">
                  Choose a product from the dropdown above to view the sub-category report.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
