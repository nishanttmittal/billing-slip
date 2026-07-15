import { useState, useRef, useEffect } from 'react'
import html2canvas from 'html2canvas'
import { signInWithGoogle, signOutUser, watchAuth, isAllowed } from './firebase'

const GST = 0.18
const today = () => new Date().toISOString().split('T')[0]
const fmt = (n) => '₹' + Math.round(Number(n)).toLocaleString('en-IN')
const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-IN') : ''

const loadProducts = () => { try { return JSON.parse(localStorage.getItem('productNames') || '[]') } catch { return [] } }
const saveProducts = (list) => localStorage.setItem('productNames', JSON.stringify(list))

let _id = 1
const uid = () => ++_id
const blankRow = () => ({ id: uid(), name: '', qty: '', price1: '', price2: '' })
const blankPayment = () => ({ id: uid(), amount: '', date: today() })

// ── Login Screen (Google sign-in) ──────────────────────────────────────────
function LoginScreen({ error, onSignIn }) {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-80 text-center">
        <div className="text-4xl mb-3">🔒</div>
        <h1 className="text-xl font-bold text-gray-800">Billing Slip</h1>
        <p className="text-sm text-gray-400 mt-1 mb-6">Sign in to continue</p>
        <button onClick={onSignIn} className="w-full bg-blue-700 text-white rounded-lg py-3 font-semibold hover:bg-blue-800 transition-colors">Sign in with Google</button>
        {error && <p className="text-xs text-red-500 font-medium mt-3">{error}</p>}
      </div>
    </div>
  )
}

// ── Autocomplete product input ────────────────────────────────────────────
function ProductInput({ value, onChange, suggestions }) {
  const [open, setOpen] = useState(false)
  const filtered = suggestions.filter(
    s => s.toLowerCase().includes(value.toLowerCase()) && s.toLowerCase() !== value.toLowerCase()
  )
  return (
    <div className="relative">
      <input type="text" value={value} placeholder="Product name"
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="w-full min-w-[200px] border border-gray-300 rounded-lg px-3 py-2.5 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 w-full max-h-48 overflow-y-auto">
          {filtered.map((s, i) => (
            <li key={i} onMouseDown={() => { onChange(s); setOpen(false) }}
              className="px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer">{s}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Payment entries UI ────────────────────────────────────────────────────
function PaymentSection({ label, total, balance, payments, setPayments, oldBalance, setOldBalance, color }) {
  const totalPaid = payments.reduce((s, p) => s + Number(p.amount || 0), 0)
  const grandTotal = total + Number(oldBalance || 0)
  const addPayment = () => setPayments([...payments, blankPayment()])
  const setP = (id, field, val) => setPayments(payments.map(p => p.id === id ? { ...p, [field]: val } : p))
  const removeP = (id) => payments.length > 1 && setPayments(payments.filter(p => p.id !== id))
  const isBlue = color === 'blue'

  return (
    <div className={`border-2 ${isBlue ? 'border-blue-200' : 'border-green-200'} rounded-xl overflow-hidden`}>
      <div className={`${isBlue ? 'bg-blue-700' : 'bg-green-700'} text-white px-4 py-2.5 flex items-center justify-between`}>
        <span className="text-sm font-bold">{label}</span>
        <span className="text-xs font-mono opacity-90">Current: {fmt(total)}</span>
      </div>

      {/* Old Balance */}
      <div className="px-4 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-3">
        <span className="text-xs font-semibold text-amber-700 whitespace-nowrap">Old Balance</span>
        <input type="number" value={oldBalance} min="0" placeholder="0.00"
          onChange={e => setOldBalance(e.target.value)}
          style={{ minWidth: '11ch' }}
          className="flex-1 border border-amber-300 rounded-lg px-2 py-2 text-base font-mono bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        {Number(oldBalance) > 0 && (
          <span className="text-xs text-amber-600 font-semibold whitespace-nowrap">
            Grand: {fmt(grandTotal)}
          </span>
        )}
      </div>

      <div className="p-3 space-y-2">
        {payments.map((p, i) => (
          <div key={p.id} className="flex gap-2 items-center">
            <span className="text-xs text-gray-400 w-4">{i + 1}.</span>
            <input type="number" value={p.amount} min="0" placeholder="Amount"
              onChange={e => setP(p.id, 'amount', e.target.value)}
              style={{ minWidth: '9ch' }}
              className={`flex-1 border border-gray-300 rounded-lg px-2 py-2 text-base font-mono focus:outline-none focus:ring-2 ${isBlue ? 'focus:ring-blue-400' : 'focus:ring-green-400'}`}
            />
            <input type="date" value={p.date}
              onChange={e => setP(p.id, 'date', e.target.value)}
              className={`border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 ${isBlue ? 'focus:ring-blue-400' : 'focus:ring-green-400'}`}
            />
            <button onClick={() => removeP(p.id)} className="text-gray-300 hover:text-red-500 text-lg leading-none">×</button>
          </div>
        ))}
        <button onClick={addPayment}
          className={`text-xs px-3 py-1.5 rounded-lg border-2 font-semibold ${isBlue ? 'border-blue-400 text-blue-600 hover:bg-blue-50' : 'border-green-400 text-green-600 hover:bg-green-50'}`}>
          + Add Payment
        </button>
      </div>
      <div className={`px-4 py-2.5 border-t ${isBlue ? 'border-blue-100' : 'border-green-100'} flex justify-end`}>
        <span className={`text-sm font-bold px-3 py-1 rounded-lg ${balance > 0 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          Due: {fmt(balance)}
        </span>
      </div>
    </div>
  )
}

// ── Clean slip for JPEG export ─────────────────────────────────────────────
function SlipExport({ date, customer, rows, taxPayments, cashPayments, taxOldBalance, cashOldBalance, subtotal, gstAmount, grandTotal, taxColumnTotal, cashColumnTotal, taxBalance, cashBalance }) {
  const validRows = rows.filter(r => r.name && Number(r.qty) > 0 && Number(r.price1) > 0)

  const cellStyle = (opts = {}) => ({
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    textAlign: opts.right ? 'right' : opts.center ? 'center' : 'left',
    fontWeight: opts.bold ? 'bold' : 'normal',
    fontSize: '13px',
    color: opts.muted ? '#6b7280' : '#111827',
    background: opts.bg || 'transparent',
    whiteSpace: 'nowrap',
  })

  const BalanceCol = ({ label, total, oldBalance, payments, balance, borderColor, headerBg }) => {
    const totalPaid = payments.reduce((s, p) => s + Number(p.amount || 0), 0)
    const grandTotal = total + Number(oldBalance || 0)
    const isBlue = label === 'TAX AMOUNT'
    return (
      <div style={{ flex: 1, border: `2px solid ${borderColor}`, borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ background: headerBg, color: '#fff', padding: '8px 14px', fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {label}
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr style={{ background: isBlue ? '#eff6ff' : '#f0fdf4' }}>
              <td style={{ padding: '7px 12px', fontSize: '12px', color: '#374151' }}>Current Amount</td>
              <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 'bold', fontSize: '13px' }}>{fmt(total)}</td>
            </tr>
            {Number(oldBalance) > 0 && (
              <tr style={{ background: '#fffbeb', borderTop: '1px solid #fde68a' }}>
                <td style={{ padding: '7px 12px', fontSize: '12px', color: '#92400e', fontWeight: 'bold' }}>Old Balance</td>
                <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 'bold', fontSize: '13px', color: '#92400e' }}>{fmt(Number(oldBalance))}</td>
              </tr>
            )}
            {Number(oldBalance) > 0 && (
              <tr style={{ background: '#f3f4f6', borderTop: '1px solid #e5e7eb' }}>
                <td style={{ padding: '7px 12px', fontSize: '12px', fontWeight: 'bold', color: '#374151' }}>Grand Total</td>
                <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 'bold', fontSize: '13px' }}>{fmt(grandTotal)}</td>
              </tr>
            )}
            {payments.filter(p => Number(p.amount) > 0).map((p, i) => (
              <tr key={p.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                <td style={{ padding: '6px 12px', fontSize: '11px', color: '#059669' }}>Received {i + 1} ({fmtDate(p.date)})</td>
                <td style={{ padding: '6px 12px', textAlign: 'right', color: '#059669', fontWeight: 'bold', fontSize: '12px' }}>{fmt(Number(p.amount))}</td>
              </tr>
            ))}
            <tr style={{ background: balance > 0 ? '#fef2f2' : '#f0fdf4', borderTop: '2px solid #e5e7eb' }}>
              <td style={{ padding: '8px 12px', fontWeight: 'bold', fontSize: '12px', color: balance > 0 ? '#dc2626' : '#059669' }}>Balance Due</td>
              <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 'bold', fontSize: '14px', color: balance > 0 ? '#dc2626' : '#059669' }}>{fmt(balance)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div style={{ background: '#ffffff', padding: '32px', width: '720px', fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: '13px', color: '#111827' }}>

      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: '24px', borderBottom: '3px solid #1e3a5f', paddingBottom: '16px' }}>
        <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#1e3a5f', letterSpacing: '2px' }}>BILLING SLIP</div>
        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
          Date: {fmtDate(date)}{customer ? `  ·  Party: ${customer}` : ''}
        </div>
      </div>

      {/* Products table with subtotal, GST, total */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {['Sr.', 'Product Name', 'Qty', 'Price 1', 'Amount (₹)'].map((h, i) => (
              <th key={h} style={{ ...cellStyle(), background: '#1e3a5f', color: '#fff', fontWeight: 'bold', textAlign: i === 0 ? 'center' : i >= 2 ? 'right' : 'left', padding: '10px 12px', fontSize: '12px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {validRows.map((r, i) => {
            const amt = Number(r.qty) * Number(r.price1)
            return (
              <tr key={r.id} style={{ background: i % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                <td style={{ ...cellStyle({ center: true }), width: '40px' }}>{i + 1}</td>
                <td style={cellStyle({})}>{r.name}</td>
                <td style={{ ...cellStyle({ right: true }), width: '60px' }}>{r.qty}</td>
                <td style={{ ...cellStyle({ right: true }), width: '100px' }}>{fmt(r.price1)}</td>
                <td style={{ ...cellStyle({ right: true, bold: true }), width: '120px' }}>{fmt(amt)}</td>
              </tr>
            )
          })}
          {/* Subtotal */}
          <tr style={{ background: '#dbeafe' }}>
            <td colSpan={4} style={{ ...cellStyle({ right: true, bold: true }) }}>SUBTOTAL</td>
            <td style={{ ...cellStyle({ right: true, bold: true }) }}>{fmt(subtotal)}</td>
          </tr>
          {/* GST */}
          <tr style={{ background: '#fefce8' }}>
            <td colSpan={4} style={{ ...cellStyle({ right: true, muted: true }) }}>GST @ 18%</td>
            <td style={{ ...cellStyle({ right: true, muted: true }) }}>{fmt(gstAmount)}</td>
          </tr>
          {/* Grand Total */}
          <tr style={{ background: '#1e3a5f' }}>
            <td colSpan={4} style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 'bold', fontSize: '14px', color: '#fff', border: '1px solid #1e3a5f' }}>TOTAL</td>
            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 'bold', fontSize: '14px', color: '#fff', border: '1px solid #1e3a5f' }}>{fmt(grandTotal)}</td>
          </tr>
        </tbody>
      </table>

      {/* Balance columns */}
      <div style={{ display: 'flex', gap: '16px', marginTop: '20px' }}>
        <BalanceCol label="TAX AMOUNT"   total={taxColumnTotal}  oldBalance={taxOldBalance}  payments={taxPayments}  balance={taxBalance}  borderColor="#1e3a5f" headerBg="#1e3a5f" />
        <BalanceCol label="CR BALANCE" total={cashColumnTotal} oldBalance={cashOldBalance} payments={cashPayments} balance={cashBalance} borderColor="#059669" headerBg="#059669" />
      </div>

      {/* Footer */}
      <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '10px', color: '#9ca3af', borderTop: '1px solid #e5e7eb', paddingTop: '10px' }}>
        {fmtDate(date)}{customer ? ` · ${customer}` : ''}
      </div>
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [authError, setAuthError] = useState('')
  const [date, setDate] = useState(today())
  const [customer, setCustomer] = useState('')
  const [rows, setRows] = useState([blankRow()])
  const [taxPayments, setTaxPayments] = useState([blankPayment()])
  const [cashPayments, setCashPayments] = useState([blankPayment()])
  const [taxOldBalance, setTaxOldBalance] = useState('')
  const [cashOldBalance, setCashOldBalance] = useState('')
  const [productNames, setProductNames] = useState(loadProducts)
  const [exporting, setExporting] = useState(false)
  const exportRef = useRef()

  useEffect(() => watchAuth(u => { setUser(u); setAuthReady(true) }), [])

  const handleSignIn = async () => {
    setAuthError('')
    try {
      const { user: u } = await signInWithGoogle()
      if (!isAllowed(u?.email)) {
        await signOutUser()
        setAuthError('This Google account is not authorised. Contact the owner.')
      }
    } catch {
      setAuthError('Sign-in failed. Please try again.')
    }
  }

  if (!authReady)
    return <div className="min-h-screen bg-slate-100 flex items-center justify-center text-gray-400">Loading…</div>
  if (!user || !isAllowed(user.email))
    return <LoginScreen error={authError} onSignIn={handleSignIn} />

  // Calculations
  const validRows = rows.filter(r => r.name && Number(r.qty) > 0 && Number(r.price1) > 0)
  const subtotal = validRows.reduce((s, r) => s + Number(r.qty) * Number(r.price1), 0)
  const taxableTotal = validRows.reduce((s, r) => s + Number(r.qty) * Number(r.price2 || 0), 0)
  const gstAmount = taxableTotal * GST
  const grandTotal = subtotal + gstAmount
  const taxColumnTotal = taxableTotal + gstAmount
  const cashColumnTotal = subtotal - taxableTotal
  const taxTotalPaid = taxPayments.reduce((s, p) => s + Number(p.amount || 0), 0)
  const cashTotalPaid = cashPayments.reduce((s, p) => s + Number(p.amount || 0), 0)
  const taxGrandTotal = taxColumnTotal + Number(taxOldBalance || 0)
  const cashGrandTotal = cashColumnTotal + Number(cashOldBalance || 0)
  const taxBalance = taxGrandTotal - taxTotalPaid
  const cashBalance = cashGrandTotal - cashTotalPaid

  const setRow = (id, field, val) => setRows(rows.map(r => r.id === id ? { ...r, [field]: val } : r))
  const removeRow = (id) => rows.length > 1 && setRows(rows.filter(r => r.id !== id))
  const addRow = () => setRows([...rows, blankRow()])

  const exportJPEG = async () => {
    const newNames = rows.map(r => r.name.trim()).filter(Boolean)
    const merged = [...new Set([...productNames, ...newNames])]
    setProductNames(merged)
    saveProducts(merged)
    setExporting(true)
    await new Promise(r => setTimeout(r, 150))
    try {
      const canvas = await html2canvas(exportRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false })
      const fileName = `slip-${date}.jpg`

      // Try native share (iPhone / Android)
      canvas.toBlob(async (blob) => {
        const file = new File([blob], fileName, { type: 'image/jpeg' })
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: 'Billing Slip',
              text: `Billing Slip – ${fmtDate(date)}${customer ? ' · ' + customer : ''}`,
            })
          } catch (e) {
            if (e.name !== 'AbortError') {
              // Share failed — fall back to download
              const url = URL.createObjectURL(blob)
              const link = document.createElement('a')
              link.download = fileName; link.href = url; link.click()
              URL.revokeObjectURL(url)
            }
          }
        } else {
          // Desktop fallback — download
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.download = fileName; link.href = url; link.click()
          URL.revokeObjectURL(url)
        }
      }, 'image/jpeg', 0.95)
    } finally { setExporting(false) }
  }

  const newSlip = () => {
    setCustomer(''); setDate(today()); setRows([blankRow()])
    setTaxPayments([blankPayment()]); setCashPayments([blankPayment()])
    setTaxOldBalance(''); setCashOldBalance('')
  }

  const slipProps = { date, customer, rows, taxPayments, cashPayments, taxOldBalance, cashOldBalance, subtotal, taxableTotal, gstAmount, grandTotal, taxColumnTotal, cashColumnTotal, taxBalance, cashBalance }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-blue-900 text-white px-6 py-4 shadow-xl">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Billing Slip</h1>
            <p className="text-blue-300 text-sm">Enter details · Export as JPEG</p>
          </div>
          <button onClick={signOutUser} className="text-blue-300 hover:text-white text-xs underline">Sign out</button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-4">

        {/* Slip meta */}
        <div className="bg-white rounded-xl shadow p-5 flex flex-wrap gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-gray-500">Date</span>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </label>
          <label className="flex flex-col gap-1.5 flex-1 min-w-48">
            <span className="text-xs font-semibold text-gray-500">Customer / Party Name (optional)</span>
            <input type="text" value={customer} onChange={e => setCustomer(e.target.value)} placeholder="e.g. Ramesh Traders"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </label>
        </div>

        {/* Products */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-5 pt-4 pb-2 border-b border-gray-100">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Products</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="py-2.5 px-3 text-left">Product Name</th>
                  <th className="py-2.5 px-2 text-right w-24">Qty</th>
                  <th className="py-2.5 px-2 text-right w-28">Price 1</th>
                  <th className="py-2.5 px-2 text-right w-28">Price 2 (Tax)</th>
                  <th className="py-2.5 px-3 text-right w-40">Amount</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const amt = Number(r.qty) * Number(r.price1)
                  return (
                    <tr key={r.id} className="border-t border-gray-100">
                      <td className="py-2 px-3"><ProductInput value={r.name} onChange={v => setRow(r.id, 'name', v)} suggestions={productNames} /></td>
                      <td className="py-2 px-2"><input type="number" value={r.qty} min="0" placeholder="0" onChange={e => setRow(r.id, 'qty', e.target.value)} className="w-full border border-gray-300 rounded-lg px-2 py-2 text-base text-right font-mono focus:outline-none focus:ring-2 focus:ring-blue-400" /></td>
                      <td className="py-2 px-2"><input type="number" value={r.price1} min="0" placeholder="0.00" onChange={e => setRow(r.id, 'price1', e.target.value)} className="w-full border border-gray-300 rounded-lg px-2 py-2 text-base text-right font-mono focus:outline-none focus:ring-2 focus:ring-blue-400" /></td>
                      <td className="py-2 px-2"><input type="number" value={r.price2} min="0" placeholder="0.00" onChange={e => setRow(r.id, 'price2', e.target.value)} className="w-full border border-gray-300 rounded-lg px-2 py-2 text-base text-right font-mono focus:outline-none focus:ring-2 focus:ring-blue-400" /></td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-gray-800 text-base whitespace-nowrap">{amt > 0 ? fmt(amt) : '—'}</td>
                      <td className="py-2 px-2"><button onClick={() => removeRow(r.id)} className="text-gray-300 hover:text-red-500 text-xl leading-none">×</button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-gray-100">
            <button onClick={addRow} className="text-sm px-4 py-2 border-2 border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50 font-semibold">+ Add Product</button>
          </div>
        </div>

        {/* Totals preview */}
        {validRows.length > 0 && (
          <div className="bg-white rounded-xl shadow p-5 space-y-2 text-sm">
            <div className="flex justify-between text-gray-600"><span>Subtotal</span><span className="font-mono font-semibold">{fmt(subtotal)}</span></div>
            <div className="flex justify-between text-gray-400"><span>GST @ 18%</span><span className="font-mono">{fmt(gstAmount)}</span></div>
            <div className="flex justify-between font-bold text-gray-800 border-t pt-2 text-base"><span>Total</span><span className="font-mono">{fmt(grandTotal)}</span></div>
            <div className="flex justify-between text-xs text-gray-400 pt-1 border-t">
              <span>Tax Amount (taxable + GST): <strong className="text-gray-600">{fmt(taxColumnTotal)}</strong></span>
              <span>CR Balance: <strong className="text-gray-600">{fmt(cashColumnTotal)}</strong></span>
            </div>
          </div>
        )}

        {/* Payments */}
        <div className="bg-white rounded-xl shadow p-5">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Payment Received</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <PaymentSection label="Tax Amount"   total={taxColumnTotal}  balance={taxBalance}  payments={taxPayments}  setPayments={setTaxPayments}  oldBalance={taxOldBalance}  setOldBalance={setTaxOldBalance}  color="blue" />
            <PaymentSection label="CR Balance" total={cashColumnTotal} balance={cashBalance} payments={cashPayments} setPayments={setCashPayments} oldBalance={cashOldBalance} setOldBalance={setCashOldBalance} color="green" />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pb-8">
          <button onClick={exportJPEG} disabled={exporting || validRows.length === 0}
            className={`flex-1 py-3 rounded-xl font-bold text-sm shadow transition-colors text-white ${exporting || validRows.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-700 hover:bg-blue-800'}`}>
            {exporting ? 'Preparing...' : '📤 Share / Send to WhatsApp'}
          </button>
          <button onClick={newSlip} className="px-6 py-3 border-2 border-gray-400 text-gray-600 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors">
            + New Slip
          </button>
        </div>
      </div>

      {/* Hidden export canvas */}
      <div style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -1 }}>
        <div ref={exportRef}><SlipExport {...slipProps} /></div>
      </div>
    </div>
  )
}
