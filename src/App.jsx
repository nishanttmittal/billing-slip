import { useState, useRef } from 'react'
import html2canvas from 'html2canvas'

const GST = 0.18
const today = () => new Date().toISOString().split('T')[0]
const fmt = (n) => '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-IN') : ''

const loadProducts = () => { try { return JSON.parse(localStorage.getItem('productNames') || '[]') } catch { return [] } }
const saveProducts = (list) => localStorage.setItem('productNames', JSON.stringify(list))

let _id = 1
const uid = () => ++_id
const blankRow = () => ({ id: uid(), name: '', qty: '', price1: '', price2: '' })

// ── Autocomplete product input ────────────────────────────────────────────
function ProductInput({ value, onChange, suggestions }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()
  const filtered = suggestions.filter(
    s => s.toLowerCase().includes(value.toLowerCase()) && s.toLowerCase() !== value.toLowerCase()
  )
  return (
    <div className="relative" ref={ref}>
      <input
        type="text" value={value} placeholder="Product name"
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
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

// ── Clean slip for JPEG export ─────────────────────────────────────────────
function SlipExport({ date, customer, rows, taxPaid, taxDate, cashPaid, cashDate, subtotal, taxableTotal, gstAmount, grandTotal, taxColumnTotal, cashColumnTotal, taxBalance, cashBalance }) {
  const validRows = rows.filter(r => r.name && Number(r.qty) > 0 && Number(r.price1) > 0)

  const cell = (content, opts = {}) => ({
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    textAlign: opts.right ? 'right' : opts.center ? 'center' : 'left',
    fontWeight: opts.bold ? 'bold' : 'normal',
    fontSize: opts.small ? '11px' : '13px',
    color: opts.muted ? '#6b7280' : opts.red ? '#dc2626' : opts.green ? '#059669' : '#111827',
    background: opts.bg || 'transparent',
    whiteSpace: 'nowrap',
  })

  return (
    <div style={{ background: '#ffffff', padding: '32px', width: '720px', fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: '13px', color: '#111827' }}>

      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: '24px', borderBottom: '3px solid #1e3a5f', paddingBottom: '16px' }}>
        <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#1e3a5f', letterSpacing: '2px' }}>BILLING SLIP</div>
        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
          Date: {fmtDate(date)}{customer ? `  ·  Party: ${customer}` : ''}
        </div>
      </div>

      {/* Products table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '0' }}>
        <thead>
          <tr>
            {['Sr.', 'Product Name', 'Qty', 'Price 1', 'Amount (₹)'].map((h, i) => (
              <th key={h} style={{ ...cell({}, {}), background: '#1e3a5f', color: '#ffffff', fontWeight: 'bold', textAlign: i === 0 ? 'center' : i >= 2 ? 'right' : 'left', padding: '10px 12px', fontSize: '12px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {validRows.map((r, i) => {
            const amt = Number(r.qty) * Number(r.price1)
            return (
              <tr key={r.id} style={{ background: i % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                <td style={{ ...cell({ center: true }), width: '40px' }}>{i + 1}</td>
                <td style={cell({})}>{r.name}</td>
                <td style={{ ...cell({ right: true }), width: '60px' }}>{r.qty}</td>
                <td style={{ ...cell({ right: true }), width: '100px' }}>{fmt(r.price1)}</td>
                <td style={{ ...cell({ right: true, bold: true }), width: '120px' }}>{fmt(amt)}</td>
              </tr>
            )
          })}
          {/* Subtotal */}
          <tr style={{ background: '#dbeafe' }}>
            <td colSpan={4} style={{ ...cell({ right: true, bold: true }), fontSize: '13px' }}>SUBTOTAL</td>
            <td style={{ ...cell({ right: true, bold: true }), fontSize: '13px' }}>{fmt(subtotal)}</td>
          </tr>
        </tbody>
      </table>

      {/* Tax section */}
      <div style={{ marginTop: '16px', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ background: '#374151', color: '#fff', padding: '8px 12px', fontSize: '12px', fontWeight: 'bold', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
          Tax Calculation
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              <th style={{ ...cell({}), fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#6b7280' }}>Product</th>
              <th style={{ ...cell({ right: true }), fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#6b7280' }}>Qty × Price 2</th>
              <th style={{ ...cell({ right: true }), fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#6b7280' }}>Taxable Amount</th>
            </tr>
          </thead>
          <tbody>
            {validRows.filter(r => Number(r.price2) > 0).map((r, i) => {
              const taxable = Number(r.qty) * Number(r.price2)
              return (
                <tr key={r.id} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                  <td style={cell({})}>{r.name}</td>
                  <td style={{ ...cell({ right: true, muted: true }) }}>{r.qty} × {fmt(r.price2)}</td>
                  <td style={{ ...cell({ right: true }) }}>{fmt(taxable)}</td>
                </tr>
              )
            })}
            <tr style={{ background: '#f3f4f6' }}>
              <td colSpan={2} style={{ ...cell({ bold: true }) }}>Total Taxable Amount</td>
              <td style={{ ...cell({ right: true, bold: true }) }}>{fmt(taxableTotal)}</td>
            </tr>
            <tr>
              <td colSpan={2} style={cell({ muted: true })}>GST @ 18%</td>
              <td style={{ ...cell({ right: true }) }}>{fmt(gstAmount)}</td>
            </tr>
            <tr style={{ background: '#1e3a5f' }}>
              <td colSpan={2} style={{ ...cell({ bold: true }), color: '#fff', fontSize: '14px' }}>GRAND TOTAL</td>
              <td style={{ ...cell({ right: true, bold: true }), color: '#fff', fontSize: '14px' }}>{fmt(grandTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Balance columns */}
      <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>

        {/* Tax column */}
        <div style={{ flex: 1, border: '2px solid #1e3a5f', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ background: '#1e3a5f', color: '#fff', padding: '8px 14px', fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Tax Amount
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr style={{ background: '#eff6ff' }}>
                <td style={{ padding: '8px 12px', fontSize: '12px', color: '#374151' }}>Taxable + GST</td>
                <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 'bold', fontSize: '13px' }}>{fmt(taxColumnTotal)}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px 12px', fontSize: '12px', color: '#059669' }}>Received ({fmtDate(taxDate)})</td>
                <td style={{ padding: '8px 12px', textAlign: 'right', color: '#059669', fontWeight: 'bold' }}>{fmt(Number(taxPaid || 0))}</td>
              </tr>
              <tr style={{ background: taxBalance > 0 ? '#fef2f2' : '#f0fdf4', borderTop: '2px solid #e5e7eb' }}>
                <td style={{ padding: '8px 12px', fontWeight: 'bold', fontSize: '12px', color: taxBalance > 0 ? '#dc2626' : '#059669' }}>Balance Due</td>
                <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 'bold', fontSize: '14px', color: taxBalance > 0 ? '#dc2626' : '#059669' }}>{fmt(taxBalance)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Cash column */}
        <div style={{ flex: 1, border: '2px solid #059669', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ background: '#059669', color: '#fff', padding: '8px 14px', fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Cash Balance
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr style={{ background: '#f0fdf4' }}>
                <td style={{ padding: '8px 12px', fontSize: '12px', color: '#374151' }}>Cash Amount</td>
                <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 'bold', fontSize: '13px' }}>{fmt(cashColumnTotal)}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px 12px', fontSize: '12px', color: '#059669' }}>Received ({fmtDate(cashDate)})</td>
                <td style={{ padding: '8px 12px', textAlign: 'right', color: '#059669', fontWeight: 'bold' }}>{fmt(Number(cashPaid || 0))}</td>
              </tr>
              <tr style={{ background: cashBalance > 0 ? '#fef2f2' : '#f0fdf4', borderTop: '2px solid #e5e7eb' }}>
                <td style={{ padding: '8px 12px', fontWeight: 'bold', fontSize: '12px', color: cashBalance > 0 ? '#dc2626' : '#059669' }}>Balance Due</td>
                <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 'bold', fontSize: '14px', color: cashBalance > 0 ? '#dc2626' : '#059669' }}>{fmt(cashBalance)}</td>
              </tr>
            </tbody>
          </table>
        </div>
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
  const [date, setDate] = useState(today())
  const [customer, setCustomer] = useState('')
  const [rows, setRows] = useState([blankRow()])
  const [taxPaid, setTaxPaid] = useState('')
  const [taxDate, setTaxDate] = useState(today())
  const [cashPaid, setCashPaid] = useState('')
  const [cashDate, setCashDate] = useState(today())
  const [productNames, setProductNames] = useState(loadProducts)
  const [exporting, setExporting] = useState(false)
  const exportRef = useRef()

  // Calculations
  const validRows = rows.filter(r => r.name && Number(r.qty) > 0 && Number(r.price1) > 0)
  const subtotal = validRows.reduce((s, r) => s + Number(r.qty) * Number(r.price1), 0)
  const taxableTotal = validRows.reduce((s, r) => s + Number(r.qty) * Number(r.price2 || 0), 0)
  const gstAmount = taxableTotal * GST
  const grandTotal = subtotal + gstAmount
  const taxColumnTotal = taxableTotal + gstAmount
  const cashColumnTotal = subtotal - taxableTotal
  const taxBalance = taxColumnTotal - Number(taxPaid || 0)
  const cashBalance = cashColumnTotal - Number(cashPaid || 0)

  const setRow = (id, field, val) => setRows(rows.map(r => r.id === id ? { ...r, [field]: val } : r))
  const removeRow = (id) => rows.length > 1 && setRows(rows.filter(r => r.id !== id))
  const addRow = () => setRows([...rows, blankRow()])

  const exportJPEG = async () => {
    // Save product names
    const newNames = rows.map(r => r.name.trim()).filter(Boolean)
    const merged = [...new Set([...productNames, ...newNames])]
    setProductNames(merged)
    saveProducts(merged)

    setExporting(true)
    await new Promise(r => setTimeout(r, 100))
    try {
      const canvas = await html2canvas(exportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      })
      const link = document.createElement('a')
      link.download = `slip-${date}.jpg`
      link.href = canvas.toDataURL('image/jpeg', 0.95)
      link.click()
    } finally {
      setExporting(false)
    }
  }

  const newSlip = () => {
    setCustomer('')
    setDate(today())
    setRows([blankRow()])
    setTaxPaid('')
    setTaxDate(today())
    setCashPaid('')
    setCashDate(today())
  }

  const slipProps = { date, customer, rows, taxPaid, taxDate, cashPaid, cashDate, subtotal, taxableTotal, gstAmount, grandTotal, taxColumnTotal, cashColumnTotal, taxBalance, cashBalance }

  return (
    <div className="min-h-screen bg-slate-100">

      {/* Header */}
      <header className="bg-blue-900 text-white px-6 py-4 shadow-xl">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-xl font-bold">Billing Slip</h1>
          <p className="text-blue-300 text-sm">Enter details · Export as JPEG</p>
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
            <input type="text" value={customer} onChange={e => setCustomer(e.target.value)}
              placeholder="e.g. Ramesh Traders"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </label>
        </div>

        {/* Products table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-5 pt-4 pb-2 border-b border-gray-100">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Products</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="py-2.5 px-3 text-left">Product Name</th>
                  <th className="py-2.5 px-2 text-right w-20">Qty</th>
                  <th className="py-2.5 px-2 text-right w-28">Price 1</th>
                  <th className="py-2.5 px-2 text-right w-28">Price 2 (Tax)</th>
                  <th className="py-2.5 px-3 text-right w-28">Amount</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const amt = Number(r.qty) * Number(r.price1)
                  return (
                    <tr key={r.id} className="border-t border-gray-100">
                      <td className="py-2 px-3">
                        <ProductInput value={r.name} onChange={v => setRow(r.id, 'name', v)} suggestions={productNames} />
                      </td>
                      <td className="py-2 px-2">
                        <input type="number" value={r.qty} min="0" placeholder="0" onChange={e => setRow(r.id, 'qty', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm text-right font-mono focus:outline-none focus:ring-2 focus:ring-blue-400" />
                      </td>
                      <td className="py-2 px-2">
                        <input type="number" value={r.price1} min="0" placeholder="0.00" onChange={e => setRow(r.id, 'price1', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm text-right font-mono focus:outline-none focus:ring-2 focus:ring-blue-400" />
                      </td>
                      <td className="py-2 px-2">
                        <input type="number" value={r.price2} min="0" placeholder="0.00" onChange={e => setRow(r.id, 'price2', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm text-right font-mono focus:outline-none focus:ring-2 focus:ring-blue-400" />
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-semibold text-gray-700 text-sm">
                        {amt > 0 ? fmt(amt) : '—'}
                      </td>
                      <td className="py-2 px-2">
                        <button onClick={() => removeRow(r.id)} className="text-gray-300 hover:text-red-500 text-xl leading-none">×</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-gray-100">
            <button onClick={addRow} className="text-sm px-4 py-2 border-2 border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50 font-semibold">
              + Add Product
            </button>
          </div>
        </div>

        {/* Totals */}
        {validRows.length > 0 && (
          <div className="bg-white rounded-xl shadow p-5 space-y-2 text-sm">
            <div className="flex justify-between text-gray-600"><span>Subtotal</span><span className="font-mono font-semibold">{fmt(subtotal)}</span></div>
            <div className="flex justify-between text-gray-500"><span>Total Taxable (Price 2 × Qty)</span><span className="font-mono">{fmt(taxableTotal)}</span></div>
            <div className="flex justify-between text-gray-500"><span>GST @ 18%</span><span className="font-mono">{fmt(gstAmount)}</span></div>
            <div className="flex justify-between font-bold text-gray-800 border-t pt-2 text-base"><span>Grand Total</span><span className="font-mono">{fmt(grandTotal)}</span></div>
          </div>
        )}

        {/* Payments */}
        <div className="bg-white rounded-xl shadow p-5">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Payment Received</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'Tax Amount', total: taxColumnTotal, paid: taxPaid, setPaid: setTaxPaid, pDate: taxDate, setPDate: setTaxDate, balance: taxBalance, color: 'blue' },
              { label: 'Cash Balance', total: cashColumnTotal, paid: cashPaid, setPaid: setCashPaid, pDate: cashDate, setPDate: setCashDate, balance: cashBalance, color: 'green' },
            ].map(({ label, total, paid, setPaid, pDate, setPDate, balance, color }) => (
              <div key={label} className={`border-2 ${color === 'blue' ? 'border-blue-200' : 'border-green-200'} rounded-xl p-4 space-y-3`}>
                <div className={`text-sm font-bold ${color === 'blue' ? 'text-blue-700' : 'text-green-700'}`}>{label}</div>
                <div className="text-xs text-gray-500">Total: <span className="font-mono font-semibold text-gray-800">{fmt(total)}</span></div>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-gray-500">Amount Received</span>
                  <input type="number" value={paid} onChange={e => setPaid(e.target.value)} min="0" placeholder="0.00"
                    className={`border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 ${color === 'blue' ? 'focus:ring-blue-400' : 'focus:ring-green-400'}`} />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-gray-500">Date of Receipt</span>
                  <input type="date" value={pDate} onChange={e => setPDate(e.target.value)}
                    className={`border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${color === 'blue' ? 'focus:ring-blue-400' : 'focus:ring-green-400'}`} />
                </label>
                <div className={`text-sm font-bold px-3 py-2 rounded-lg ${balance > 0 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                  Balance Due: {fmt(balance)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pb-8">
          <button onClick={exportJPEG} disabled={exporting || validRows.length === 0}
            className={`flex-1 py-3 rounded-xl font-bold text-sm shadow transition-colors text-white ${
              exporting || validRows.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-700 hover:bg-blue-800'
            }`}>
            {exporting ? 'Exporting...' : '📷 Export as JPEG'}
          </button>
          <button onClick={newSlip}
            className="px-6 py-3 border-2 border-gray-400 text-gray-600 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors">
            + New Slip
          </button>
        </div>
      </div>

      {/* Hidden export canvas */}
      <div style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -1 }}>
        <div ref={exportRef}>
          <SlipExport {...slipProps} />
        </div>
      </div>
    </div>
  )
}
