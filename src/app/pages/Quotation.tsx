import React, { useState } from 'react';
import { Plus, Download, Edit2, ArrowRight, XCircle, RotateCcw, Trash2, FileText, DollarSign, Upload, ChevronDown, ArrowUpRight, TrendingUp, Clock, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { Quotation, QuotationItem } from '../types/index';
import StatCard from '../components/StatCard';
import ServiceSelector from '../components/ServiceSelector';
import { formatDate, formatCurrency, generateId, calculateGST } from '../utils/helpers';
import { generateQuotationPDF } from '../utils/pdfUtils';
import { getCountries, getStatesForCountry } from '../utils/countryData';

const GST_SLABS = [0, 5, 18, 28];
const inputCls = "w-full border border-slate-200 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-white transition-all";

export default function QuotationPage() {
  const { quotations, updateQuotation, deadQuotation, restoreQuotation, addOrder, services, settings } = useApp();
  const { showToast } = useToast();
  const [tab, setTab] = useState<'active' | 'dead'>('active');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [convertId, setConvertId] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const active = quotations.filter(q => q.status === 'active' && !q.convertedToOrder);
  const dead = quotations.filter(q => q.status === 'dead');
  const converted = quotations.filter(q => q.convertedToOrder);
  const displayed = tab === 'active' ? active : dead;
  const activeValue = active.reduce((s, q) => s + q.totalAmount, 0);
  const conversionRate = quotations.length > 0 ? ((converted.length / quotations.length) * 100).toFixed(1) : 0;

  const detailQ = quotations.find(q => q.id === detailId);
  const editQ = quotations.find(q => q.id === editId);

  function getServiceLabel(item: QuotationItem) {
    return `${item.serviceName}${item.subServiceName ? ` / ${item.subServiceName}` : ''}`;
  }

  function handleDownload(q: Quotation) {
    generateQuotationPDF(q, settings.quotePdfSettings);
  }

  return (
    <div className="space-y-6">
      {/* Title Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-2xl font-bold text-slate-800">Quotation</h1>
          <div className="flex rounded-lg overflow-hidden border border-slate-200">
            <button onClick={() => setTab('active')} className={`px-4 py-1.5 text-sm font-medium transition-colors ${tab === 'active' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
              Active ({active.length})
            </button>
            <button onClick={() => setTab('dead')} className={`px-4 py-1.5 text-sm font-medium transition-colors ${tab === 'dead' ? 'bg-red-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
              Dead ({dead.length})
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard
          label="Total Quotations"
          value={quotations.length}
          icon={<FileText size={20} />}
          borderColor="#4F46E5"
          bgColor="#EEF2FF"
          textColor="#4F46E5"
          subtitle="All time generated"
        />
        <StatCard
          label="Active Quotations"
          value={active.length}
          icon={<FileText size={20} />}
          borderColor="#059669"
          bgColor="#ECFDF5"
          textColor="#059669"
          subtitle="Waiting for approval"
        />
        <StatCard
          label="Dead / Lost"
          value={dead.length}
          icon={<XCircle size={20} />}
          borderColor="#EF4444"
          bgColor="#FEF2F2"
          textColor="#EF4444"
          subtitle="Rejected/Expired"
        />
        <StatCard
          label="Active Quote Value"
          value={formatCurrency(activeValue)}
          icon={<DollarSign size={20} />}
          borderColor="#F59E0B"
          bgColor="#FFFBEB"
          textColor="#D97706"
          subtitle="Pipeline worth"
        />
      </div>

      {/* Quotation Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Company</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Quote #</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Services</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayed.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                    No {tab} quotations found
                  </td>
                </tr>
              ) : displayed.map((q) => (
                <tr
                  key={q.id}
                  onClick={() => setDetailId(q.id)}
                  className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800 uppercase tracking-tight group-hover:text-emerald-600 transition-colors">{q.companyName}</span>
                      <span className="text-xs text-slate-400">{q.contactName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-xs font-mono bg-slate-50 px-2 py-1 rounded text-slate-600 border border-slate-100">{q.quoteNumber}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-slate-600 font-medium">{formatDate(q.date)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      {q.items.slice(0, 2).map((item, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-[11px] text-slate-500">
                          <span className="text-emerald-500 font-bold">•</span>
                          <span className="truncate max-w-[150px]">{item.serviceName}</span>
                          <span className="text-slate-300 font-mono">₹{item.totalPrice * item.quantity}</span>
                        </div>
                      ))}
                      {q.items.length > 2 && (
                        <span className="text-[10px] text-slate-400 italic px-2">+{q.items.length - 2} more...</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800">{formatCurrency(q.totalAmount)}</span>
                      <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">
                        Base: ₹{q.baseAmount} + GST: ₹{q.gstAmount}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      {tab === 'active' ? (
                        <>
                          <button onClick={() => setEditId(q.id)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg shadow-sm transition-all border border-transparent hover:border-indigo-100">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDownload(q)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-white rounded-lg shadow-sm transition-all border border-transparent hover:border-emerald-100">
                            <Download size={16} />
                          </button>
                          <button onClick={() => setConvertId(q.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-600 text-[11px] font-bold rounded-lg transition-all border border-amber-100 uppercase tracking-wide">
                            <ArrowRight size={14} /> Order
                          </button>
                          <button
                            disabled={actionId === q.id}
                            onClick={async () => {
                              setActionId(q.id);
                              try { await deadQuotation(q.id); showToast('Quotation marked as dead', 'info'); }
                              catch (err: any) { showToast(err.message || 'Failed', 'error'); }
                              finally { setActionId(null); }
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-white rounded-lg shadow-sm transition-all border border-transparent hover:border-red-100 disabled:opacity-50"
                          >
                            {actionId === q.id ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                          </button>
                        </>
                      ) : (
                        <button
                          disabled={actionId === q.id}
                          onClick={async () => {
                            setActionId(q.id);
                            try { await restoreQuotation(q.id); showToast('Quotation restored'); }
                            catch (err: any) { showToast(err.message || 'Failed', 'error'); }
                            finally { setActionId(null); }
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 text-[11px] font-bold rounded-lg shadow-sm border border-emerald-100 hover:bg-emerald-100 transition-all disabled:opacity-50 uppercase tracking-wide"
                        >
                          {actionId === q.id ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />} Restore
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {detailId && detailQ && (
        <QuotationDetailModal
          quotation={detailQ}
          onClose={() => setDetailId(null)}
          onEdit={() => { setDetailId(null); setEditId(detailId); }}
          onDownload={() => handleDownload(detailQ)}
          onConvert={() => { setDetailId(null); setConvertId(detailId); }}
          onCancel={async () => {
            try {
              setActionId(detailId);
              await deadQuotation(detailId!);
              showToast('Quotation cancelled', 'info');
              setDetailId(null);
            } catch (err: any) {
              showToast(err.message || 'Failed to cancel quotation', 'error');
            } finally {
              setActionId(null);
            }
          }}
        />
      )}

      {/* Edit Modal */}
      {editId && editQ && (
        <EditQuotationModal
          quotation={editQ}
          onClose={() => setEditId(null)}
          onSave={async (data) => {
            try {
              await updateQuotation(editId!, data);
              showToast('Quotation updated successfully');
              setEditId(null);
            } catch (err: any) {
              showToast(err.message || 'Failed to update quotation', 'error');
            }
          }}
        />
      )}

      {/* Convert to Order */}
      {convertId && (
        <ConvertToOrderModal
          quotationId={convertId}
          onClose={() => setConvertId(null)}
          onConfirm={async (poFile, poFileName) => {
            try {
              await addOrder(convertId, poFile, poFileName);
              showToast('Order created! Go to the Orders tab to view it.', 'success');
              setConvertId(null);
            } catch (err: any) {
              showToast(err.message || 'Failed to convert to order', 'error');
            }
          }}
        />
      )}
    </div>
  );
}

function QuotationDetailModal({ quotation, onClose, onEdit, onDownload, onConvert, onCancel }: any) {
  return (
    <Modal title="Quotation Details" onClose={onClose} wide>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Detail label="Company" value={quotation.companyName} />
          <Detail label="Contact" value={quotation.contactName} />
          <Detail label="Quote Number" value={quotation.quoteNumber} />
          <Detail label="Date" value={formatDate(quotation.date)} />
          <Detail label="GST Slab" value={`${quotation.gstSlab}% (${quotation.taxType})`} />
          <Detail label="GST Number" value={quotation.gstNumber || '—'} />
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-700 mb-2">Services</p>
          <table className="w-full text-sm border border-slate-100 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left px-3 py-2 text-slate-600 text-xs">#</th>
                <th className="text-left px-3 py-2 text-slate-600 text-xs">Service</th>
                <th className="text-right px-3 py-2 text-slate-600 text-xs">Base</th>
                <th className="text-right px-3 py-2 text-slate-600 text-xs">GST</th>
                <th className="text-right px-3 py-2 text-slate-600 text-xs">Total</th>
              </tr>
            </thead>
            <tbody>
              {quotation.items.map((item: QuotationItem, idx: number) => (
                <tr key={item.id} className="border-t border-slate-50">
                  <td className="px-3 py-2 text-slate-500">{idx + 1}</td>
                  <td className="px-3 py-2">
                    <div>{item.serviceName}</div>
                    <div className="text-xs text-slate-500">{item.subServiceName}</div>
                  </td>
                  <td className="px-3 py-2 text-right">₹{(item.basePrice * item.quantity).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right">₹{(item.gstAmount * item.quantity).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right font-medium">₹{(item.totalPrice * item.quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-indigo-50 border-t border-indigo-100">
                <td colSpan={4} className="px-3 py-2 text-right font-semibold text-slate-700">Grand Total</td>
                <td className="px-3 py-2 text-right font-bold text-indigo-700">{formatCurrency(quotation.totalAmount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex justify-end gap-2 flex-wrap pt-2">
          {quotation.status === 'active' && (
            <>
              <button onClick={onEdit} className="px-3 py-2 border border-slate-200 rounded-lg text-slate-600 text-sm flex items-center gap-1.5 hover:bg-slate-50">
                <Edit2 size={14} /> Edit
              </button>
              <button onClick={onDownload} className="px-3 py-2 border border-emerald-200 text-emerald-700 rounded-lg text-sm flex items-center gap-1.5 hover:bg-emerald-50">
                <Download size={14} /> Download PDF
              </button>
              <button onClick={onConvert} className="px-3 py-2 bg-amber-500 text-white rounded-lg text-sm flex items-center gap-1.5 hover:bg-amber-600">
                <ArrowRight size={14} /> Convert to Order
              </button>
              <button onClick={onCancel} className="px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm flex items-center gap-1.5 hover:bg-red-100">
                <XCircle size={14} /> Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

function EditQuotationModal({ quotation, onClose, onSave }: { quotation: Quotation; onClose: () => void; onSave: (data: Partial<Quotation>) => void }) {
  const { services } = useApp();
  const [form, setForm] = useState({
    companyName: quotation.companyName,
    contactName: quotation.contactName,
    email: quotation.email,
    mobileNumber: quotation.mobileNumber,
    website: quotation.website || '',
    companyAddress: quotation.companyAddress,
    gstNumber: quotation.gstNumber || '',
    taxType: quotation.taxType,
    country: quotation.country,
    state: quotation.state,
  });

  const [items, setItems] = useState<(QuotationItem & { inputPrice: string })[]>(
    quotation.items.map(it => ({
      ...it,
      inputPrice: quotation.taxType === 'Inclusive' ? it.totalPrice.toString() : it.basePrice.toString()
    }))
  );

  const countries = getCountries();

  function calcItem(price: number, gstRate: number, taxType: 'Inclusive' | 'Exclusive') {
    if (taxType === 'Exclusive') {
      const gst = price * gstRate / 100;
      return { basePrice: price, gstAmount: gst, totalPrice: price + gst };
    } else {
      const base = price / (1 + gstRate / 100);
      return { basePrice: base, gstAmount: price - base, totalPrice: price };
    }
  }

  function updateItem(idx: number, field: string, value: any) {
    setItems(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      if (field === 'inputPrice' || field === 'gstRate' || field === 'taxType') {
        const price = parseFloat(field === 'inputPrice' ? value : updated[idx].inputPrice) || 0;
        const rate = field === 'gstRate' ? value : updated[idx].gstRate;
        const currentTaxType = field === 'taxType' ? value : form.taxType;
        const calc = calcItem(price, rate, currentTaxType);
        updated[idx] = { ...updated[idx], ...calc };
      }
      return updated;
    });
  }

  // Recalculate all items if tax type changes
  function handleTaxTypeChange(newTaxType: 'Inclusive' | 'Exclusive') {
    setForm(p => ({ ...p, taxType: newTaxType }));
    setItems(prev => prev.map(it => {
      const price = parseFloat(it.inputPrice) || 0;
      const calc = calcItem(price, it.gstRate, newTaxType);
      return { ...it, ...calc };
    }));
  }

  function addItem() {
    setItems(prev => [...prev, {
      id: generateId(), serviceId: '', subServiceId: '', serviceName: '', subServiceName: '',
      hsnCode: '', quantity: 1, basePrice: 0, gstRate: items[0]?.gstRate || 18, gstAmount: 0, totalPrice: 0, inputPrice: ''
    }]);
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx));
  }

  const grandTotal = items.reduce((s, i) => s + i.totalPrice * i.quantity, 0);

  return (
    <Modal title="Edit Quotation" onClose={onClose} wide>
      <div className="space-y-6">
        {/* Client Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Company Name *">
            <input type="text" value={form.companyName} onChange={e => setForm(p => ({ ...p, companyName: e.target.value }))} className={inputCls} required />
          </Field>
          <Field label="Contact Person *">
            <input type="text" value={form.contactName} onChange={e => setForm(p => ({ ...p, contactName: e.target.value }))} className={inputCls} required />
          </Field>
          <Field label="Email Address *">
            <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className={inputCls} required />
          </Field>
          <Field label="Mobile Number *">
            <input type="tel" value={form.mobileNumber} onChange={e => setForm(p => ({ ...p, mobileNumber: e.target.value }))} className={inputCls} required />
          </Field>
          <Field label="Website">
            <input type="text" value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="GST Number">
            <input type="text" value={form.gstNumber} onChange={e => setForm(p => ({ ...p, gstNumber: e.target.value }))} className={inputCls} maxLength={15} />
          </Field>
        </div>

        <Field label="Company Address">
          <textarea value={form.companyAddress} onChange={e => setForm(p => ({ ...p, companyAddress: e.target.value }))} className={inputCls + ' resize-none'} rows={2} />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Tax Type *">
            <div className="relative group">
              <select value={form.taxType} onChange={e => handleTaxTypeChange(e.target.value as any)} className={inputCls + ' appearance-none pr-10'}>
                <option value="Exclusive">Exclusive (+ GST)</option>
                <option value="Inclusive">Inclusive (GST in price)</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                <ChevronDown size={18} />
              </div>
            </div>
          </Field>
          <Field label="Country *">
            <div className="relative group">
              <select value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value, state: '' }))} className={inputCls + ' appearance-none pr-10'} required>
                <option value="">Select Country</option>
                {countries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                <ChevronDown size={18} />
              </div>
            </div>
          </Field>
          <Field label="State *">
            <div className="relative group">
              <select value={form.state} onChange={e => setForm(p => ({ ...p, state: e.target.value }))} className={inputCls + ' appearance-none pr-10'} required>
                <option value="">Select State</option>
                {getStatesForCountry(form.country).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                <ChevronDown size={18} />
              </div>
            </div>
          </Field>
        </div>

        <hr className="border-slate-100" />

        {/* Item Details */}
        <div className="space-y-4">
          <p className="text-sm font-semibold text-slate-700">Services & Pricing</p>
          {items.map((item, idx) => {
            return (
              <div key={item.id} className="p-4 border border-slate-200 rounded-xl space-y-3 bg-slate-50/30">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-700">Item {idx + 1}</span>
                  <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
                <ServiceSelector
                  serviceId={item.serviceId}
                  subServiceId={item.subServiceId}
                  onServiceChange={(sId, scId) => {
                    const s = services.find(sv => sv.id === sId);
                    const sc = s?.subCategories.find(c => c.id === scId);
                    setItems(prev => prev.map((it, i) => i === idx ? {
                      ...it, serviceId: sId, subServiceId: scId,
                      serviceName: s?.name || '', subServiceName: sc?.name || '', hsnCode: s?.hsnCode || ''
                    } : it));
                  }}
                  compact
                />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-xs text-slate-600 mb-1 block">Price (₹)</label>
                    <input type="number" min="0" step="0.01" value={item.inputPrice}
                      onChange={e => updateItem(idx, 'inputPrice', e.target.value)}
                      className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-600 mb-1 block">Qty</label>
                    <input type="number" min="1" value={item.quantity}
                      onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                      className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-600 mb-1 block">GST Rate</label>
                    <div className="relative group">
                      <select value={item.gstRate} onChange={e => updateItem(idx, 'gstRate', parseInt(e.target.value))} className={inputCls + ' appearance-none pr-10 cursor-pointer'}>
                        {GST_SLABS.map(s => <option key={s} value={s}>{s}%</option>)}
                      </select>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                        <ChevronDown size={14} />
                      </div>
                    </div>
                  </div>
                </div>
                {item.totalPrice > 0 && (
                  <div className="text-[11px] text-slate-500 bg-white border border-slate-100 p-2 rounded flex gap-4">
                    <span>Base: ₹{(item.basePrice * item.quantity).toFixed(2)}</span>
                    <span>GST: ₹{(item.gstAmount * item.quantity).toFixed(2)}</span>
                    <span className="font-semibold text-indigo-700">Total: ₹{(item.totalPrice * item.quantity).toFixed(2)}</span>
                  </div>
                )}
              </div>
            );
          })}

          <button onClick={addItem} className="w-full py-2 border-2 border-dashed border-indigo-100 text-indigo-600 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-all text-sm flex items-center justify-center gap-2">
            <Plus size={16} /> Add Service
          </button>
        </div>

        {grandTotal > 0 && (
          <div className="p-4 bg-indigo-600 rounded-xl text-white flex justify-between items-center shadow-md shadow-indigo-200">
            <span className="text-sm font-medium opacity-90">Estimated Total Amount</span>
            <span className="text-xl font-bold">{formatCurrency(grandTotal)}</span>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="px-5 py-2.5 border border-slate-200 rounded-lg text-slate-600 text-sm hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={() => onSave({ ...form, items: items.map(({ inputPrice, ...rest }) => rest) })} className="px-8 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">Save Quotation</button>
        </div>
      </div>
    </Modal>
  );
}

function ConvertToOrderModal({ quotationId, onClose, onConfirm }: { quotationId: string; onClose: () => void; onConfirm: (poFile?: string, poFileName?: string) => void }) {
  const [poFile, setPoFile] = useState<string>('');
  const [poFileName, setPoFileName] = useState<string>('');

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPoFile(ev.target?.result as string);
      setPoFileName(file.name);
    };
    reader.readAsDataURL(file);
  }

  return (
    <Modal title="Convert to Order" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-slate-600">Would you like to upload a Purchase Order (PO)?</p>

        <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center">
          <input type="file" id="po-upload" onChange={handleFileUpload} className="hidden" />
          <label htmlFor="po-upload" className="cursor-pointer">
            <Upload size={24} className="mx-auto mb-2 text-slate-400" />
            <p className="text-sm text-slate-600">{poFileName || 'Click to upload PO document'}</p>
            <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG supported</p>
          </label>
        </div>

        <div className="flex gap-3">
          <button onClick={() => onConfirm(poFile, poFileName)} className="flex-1 py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 text-sm font-medium">
            {poFile ? 'Convert with PO' : 'Continue Without PO'}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 border border-slate-200 rounded-lg text-slate-600 text-sm hover:bg-slate-50">Cancel</button>
        </div>
      </div>
    </Modal>
  );
}

function Modal({ title, onClose, children, wide }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${wide ? 'max-w-3xl' : 'max-w-xl'} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700">
            <XCircle size={20} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-medium text-slate-800 mt-0.5">{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {children}
    </div>
  );
}