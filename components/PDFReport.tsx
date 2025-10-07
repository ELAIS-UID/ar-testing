import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { flexDirection: 'column', backgroundColor: '#ffffff', padding: 24 },
  headerBar: { backgroundColor: '#0b4ea2', padding: 8, borderRadius: 4, marginBottom: 8 },
  headerTitle: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' },
  subHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  subHeaderLeft: { fontSize: 10, color: '#111827', fontWeight: 'bold' },
  subHeaderRight: { fontSize: 9, color: '#6b7280' },
  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  summaryBox: { flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 4, padding: 6, backgroundColor: '#f9fafb' },
  summaryLabel: { fontSize: 8, color: '#6b7280' },
  summaryValue: { fontSize: 12, fontWeight: 'bold', marginTop: 2 },
  netCr: { color: '#16a34a' },
  netDr: { color: '#dc2626' },
  table: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 3 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#eef2ff', borderBottomWidth: 1, borderBottomColor: '#d1d5db' },
  th: { fontSize: 9, fontWeight: 'bold', color: '#111827', paddingVertical: 6, paddingHorizontal: 6, textAlign: 'left' },
  colDate: { width: 70 },
  colDetails: { flex: 1 },
  colDebit: { width: 80, textAlign: 'right' as const },
  colCredit: { width: 80, textAlign: 'right' as const },
  colBalance: { width: 80, textAlign: 'right' as const },
  tr: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  td: { fontSize: 9, color: '#374151', paddingVertical: 6, paddingHorizontal: 6 },
  rowAlt: { backgroundColor: '#fafafa' },
  monthHeader: { backgroundColor: '#f3f4f6' },
  monthTitle: { fontSize: 9, fontWeight: 'bold', color: '#111827', paddingVertical: 6, paddingHorizontal: 6 },
  debitText: { color: '#dc2626', fontWeight: 'bold' },
  creditText: { color: '#16a34a', fontWeight: 'bold' },
  balanceDr: { color: '#dc2626', fontWeight: 'bold' },
  balanceCr: { color: '#16a34a', fontWeight: 'bold' },
  totalsRow: { backgroundColor: '#fef3c7' },
  smallMuted: { fontSize: 8, color: '#6b7280' },
})

type TxType = 'sale' | 'payment'

interface Transaction {
  id: string
  type: TxType
  date: string
  amount: number
  bags?: number
  location?: string
  description: string
  account?: string
  subCategory?: string
  notes?: string
}

interface Customer {
  name: string
  phone: string
  category: string
  balance: number
  transactions: Transaction[]
}

interface PDFReportProps {
  customer: Customer
  transactions: Transaction[]
  dateRange?: { from: string; to: string }
}

function formatINRCurrency(n: number): string {
  return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0 }).format(n)
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function monthKey(d: string): string {
  const dt = new Date(d)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
}

const PDFReport: React.FC<PDFReportProps> = ({ customer, transactions, dateRange }) => {
  const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // Opening balance assumed 0 unless you later add historical opening
  const openingBalance = 0

  // Precompute totals
  const totals = sorted.reduce(
    (acc, t) => {
      if (t.type === 'sale') acc.debit += t.amount
      else acc.credit += Math.abs(t.amount)
      return acc
    },
    { debit: 0, credit: 0 }
  )
  const netBalance = openingBalance + (totals.debit - totals.credit)

  // Group by month
  const groups: Record<string, Transaction[]> = {}
  sorted.forEach(t => {
    const k = monthKey(t.date)
    groups[k] = groups[k] || []
    groups[k].push(t)
  })

  // Helper for month label
  const monthLabel = (k: string) => {
    const [y, m] = k.split('-').map(Number)
    return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  }

  // Running balance starts at opening
  let running = openingBalance

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBar}>
          <Text style={styles.headerTitle}>A R ENTERPRISES</Text>
        </View>
        <View style={styles.subHeaderRow}>
          <Text style={styles.subHeaderLeft}>{customer.name} Statement</Text>
          <Text style={styles.subHeaderRight}>
            {dateRange ? `${formatDate(dateRange.from)} - ${formatDate(dateRange.to)}` : ''}
          </Text>
        </View>
        <View style={{ marginBottom: 8 }}>
          <Text style={styles.smallMuted}>Phone: {customer.phone || '-'}</Text>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Opening Balance</Text>
            <Text style={styles.summaryValue}>{`₹${formatINRCurrency(Math.abs(openingBalance))} ${openingBalance > 0 ? 'Dr' : openingBalance < 0 ? 'Cr' : ''}`}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Total Debit(-)</Text>
            <Text style={styles.summaryValue}>{`₹${formatINRCurrency(totals.debit)}`}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Total Credit(+)</Text>
            <Text style={styles.summaryValue}>{`₹${formatINRCurrency(totals.credit)}`}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Net Balance</Text>
            <Text style={[styles.summaryValue, netBalance >= 0 ? styles.netDr : styles.netCr]}>
              {`₹${formatINRCurrency(Math.abs(netBalance))} ${netBalance >= 0 ? 'Dr' : 'Cr'}`}
            </Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.colDate]}>Date</Text>
            <Text style={[styles.th, styles.colDetails]}>Details</Text>
            <Text style={[styles.th, styles.colDebit]}>Debit(-)</Text>
            <Text style={[styles.th, styles.colCredit]}>Credit(+)</Text>
            <Text style={[styles.th, styles.colBalance]}>Balance</Text>
          </View>

          {/* Opening balance row */}
          <View style={[styles.tr, styles.rowAlt]}>
            <Text style={[styles.td, styles.colDate]}></Text>
            <Text style={[styles.td, styles.colDetails]}>Opening Balance</Text>
            <Text style={[styles.td, styles.colDebit]}></Text>
            <Text style={[styles.td, styles.colCredit]}></Text>
            <Text style={[styles.td, styles.colBalance]}>
              {`₹${formatINRCurrency(Math.abs(running))} ${running > 0 ? 'Dr' : running < 0 ? 'Cr' : ''}`}
            </Text>
          </View>

          {Object.keys(groups)
            .sort()
            .map((k) => {
              const monthRows: React.ReactNode[] = []
              let monthDebit = 0
              let monthCredit = 0

              // Month header
              monthRows.push(
                <View key={`${k}-header`} style={[styles.tr, styles.monthHeader]}>
                  <Text style={[styles.monthTitle]}> {monthLabel(k)} </Text>
                </View>
              )

              groups[k].forEach((t, idx) => {
                const isSale = t.type === 'sale'
                const debit = isSale ? t.amount : 0
                const credit = !isSale ? Math.abs(t.amount) : 0
                monthDebit += debit
                monthCredit += credit
                running += debit
                running -= credit

                monthRows.push(
                  <View key={t.id} style={[styles.tr, idx % 2 === 0 ? styles.rowAlt : {}]}>
                    <Text style={[styles.td, styles.colDate]}>{formatDate(t.date)}</Text>
                    <View style={[styles.colDetails]}>
                      <Text style={[styles.td]}>{t.notes ? t.notes : t.description}</Text>
                    </View>
                    <Text style={[styles.td, styles.colDebit]}>
                      {debit ? <Text style={styles.debitText}>{formatINRCurrency(debit)}</Text> : ''}
                    </Text>
                    <Text style={[styles.td, styles.colCredit]}>
                      {credit ? <Text style={styles.creditText}>{formatINRCurrency(credit)}</Text> : ''}
                    </Text>
                    <Text style={[styles.td, styles.colBalance]}>
                      <Text style={running >= 0 ? styles.balanceDr : styles.balanceCr}>
                        {`${formatINRCurrency(Math.abs(running))} ${running >= 0 ? 'Dr' : 'Cr'}`}
                      </Text>
                    </Text>
                  </View>
                )
              })

              // Month total row
              monthRows.push(
                <View key={`${k}-totals`} style={[styles.tr, styles.totalsRow]}>
                  <Text style={[styles.td, styles.colDate]}></Text>
                  <Text style={[styles.td, styles.colDetails]}> {monthLabel(k)} Total </Text>
                  <Text style={[styles.td, styles.colDebit]}>{formatINRCurrency(monthDebit)}</Text>
                  <Text style={[styles.td, styles.colCredit]}>{formatINRCurrency(monthCredit)}</Text>
                  <Text style={[styles.td, styles.colBalance]}></Text>
                </View>
              )

              return <View key={k}>{monthRows}</View>
            })}
        </View>

        <View style={{ marginTop: 10 }}>
          <Text style={styles.smallMuted}>Report generated by A R ENTERPRISES</Text>
        </View>
      </Page>
    </Document>
  )
}

export default PDFReport
