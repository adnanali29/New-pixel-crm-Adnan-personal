import React, { useState, useRef } from 'react';
import { Plus, Upload, Download, Edit2, ArrowRight, XCircle, RotateCcw, Trash2, FileText, ChevronDown, ArrowUpRight, TrendingUp, Clock, DollarSign, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { Enquiry, EnquiryService } from '../types/index';
import StatCard from '../components/StatCard';
import ServiceSelector from '../components/ServiceSelector';
import { formatDate, formatCurrency, generateId } from '../utils/helpers';
import { getCountries, getStatesForCountry } from '../utils/countryData';
import { useNavigate } from 'react-router';

const GST_SLABS = [0, 5, 18, 28];
const SAMPLE_CSV = `date,contactName,companyName,mobileNumber,email,companyAddress,gstNumber,gstSlab,taxType,country,state,description
2024-01-15,John Doe,ABC Pvt Ltd,9876543210,john@abc.com,"123 MG Road, Bangalore",29ABCDE1234F1Z5,18,Exclusive,India,Karnataka,Website development project
2024-01-16,Jane Smith,XYZ Corp,8765432109,jane@xyz.com,"456 Park Street, Mumbai",,5,Inclusive,India,Maharashtra,Mobile app development`;

interface EnquiryFormData {
  date: string; contactName: string;
  services: EnquiryService[];
  companyName: string; mobileNumber: string; website: string; email: string;
  companyAddress: string; gstNumber: string; gstSlab: number; taxType: 'Inclusive' | 'Exclusive';
  country: string; state: string; description: string;
}

const emptyForm: EnquiryFormData = {
  date: new Date().toISOString().split('T')[0], contactName: '',
  services: [{ id: generateId(), serviceId: '', subServiceId: '' }],
  companyName: '', mobileNumber: '', website: '', email: '',
  companyAddress: '', gstNumber: '', gstSlab: 18, taxType: 'Exclusive',
  country: 'India', state: '', description: '',
};

export default function EnquiryPage() {
  const { enquiries, addEnquiry, updateEnquiry, deadEnquiry, restoreEnquiry, services } = useApp();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'active' | 'dead'>('active');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<EnquiryFormData>(emptyForm);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [convertId, setConvertId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const activeEnquiries = enquiries.filter(e => e.status === 'active' && !e.convertedToQuote);
  const deadEnquiries = enquiries.filter(e => e.status === 'dead');
  const converted = enquiries.filter(e => e.convertedToQuote);
  const displayed = tab === 'active' ? activeEnquiries : deadEnquiries;
  const countries = getCountries();

  const conversionRate = enquiries.length > 0 ? ((converted.length / enquiries.length) * 100).toFixed(1) : 0;
  const potentialValue = activeEnquiries.length * 15000; // Estimated potential pipeline value

  function openAdd() {
    setEditId(null);
    setForm({ ...emptyForm, services: [{ id: generateId(), serviceId: '', subServiceId: '' }] });
    setShowForm(true);
  }

  function openEdit(e: Enquiry) {
    setEditId(e.id);
    const svcList: EnquiryService[] =
      e.services && e.services.length > 0
        ? e.services
        : [{ id: generateId(), serviceId: e.serviceId || '', subServiceId: e.subServiceId || '' }];
    setForm({
      date: e.date, contactName: e.contactName,
      services: svcList,
      companyName: e.companyName, mobileNumber: e.mobileNumber,
      website: e.website || '', email: e.email,
      companyAddress: e.companyAddress, gstNumber: e.gstNumber || '',
      gstSlab: e.gstSlab, taxType: e.taxType, country: e.country,
      state: e.state, description: e.description,
    });
    setShowForm(true);
  }

  function addServiceRow() {
    setForm(p => ({ ...p, services: [...p.services, { id: generateId(), serviceId: '', subServiceId: '' }] }));
  }

  function removeServiceRow(idx: number) {
    setForm(p => ({ ...p, services: p.services.filter((_, i) => i !== idx) }));
  }

  function updateServiceRow(idx: number, serviceId: string, subServiceId: string) {
    setForm(p => ({
      ...p,
      services: p.services.map((s, i) => i === idx ? { ...s, serviceId, subServiceId } : s),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editId) {
        await updateEnquiry(editId, { ...form });
        showToast('Enquiry updated successfully');
      } else {
        await addEnquiry({ ...form });
        showToast('Enquiry created successfully');
      }
      setShowForm(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to save enquiry', 'error');
    } finally {
      setSaving(false);
    }
  }

  function handleDownloadSample() {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'enquiry_sample.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  function handleUploadCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').slice(1);
      for (const line of lines) {
        const [date, contactName, companyName, mobileNumber, email, companyAddress, gstNumber, gstSlab, taxType, country, state, description] = line.split(',');
        if (companyName && contactName) {
          try {
            await addEnquiry({
              date: date?.trim() || new Date().toISOString().split('T')[0],
              contactName: contactName?.trim() || '',
              services: [{ id: generateId(), serviceId: '', subServiceId: '' }],
              companyName: companyName?.trim() || '',
              mobileNumber: mobileNumber?.trim() || '',
              website: '',
              email: email?.trim() || '',
              companyAddress: companyAddress?.replace(/"/g, '').trim() || '',
              gstNumber: gstNumber?.trim() || '',
              gstSlab: parseInt(gstSlab?.trim() || '18') || 18,
              taxType: (taxType?.trim() as any) || 'Exclusive',
              country: country?.trim() || 'India',
              state: state?.trim() || '',
              description: description?.trim() || '',
            });
          } catch (err) {
            console.error('Error adding enquiry from CSV:', err);
          }
        }
      }
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = '';
  }

  function getServiceLabel(enq: Enquiry) {
    const svcList = enq.services && enq.services.length > 0
      ? enq.services
      : enq.serviceId ? [{ serviceId: enq.serviceId, subServiceId: enq.subServiceId || '' }] : [];
    if (svcList.length === 0) return '—';
    const first = svcList[0];
    const svc = services.find(s => s.id === first.serviceId);
    const sub = svc?.subCategories.find(sc => sc.id === first.subServiceId);
    const label = svc ? `${svc.name}${sub ? ` / ${sub.name}` : ''}` : '—';
    return svcList.length > 1 ? `${label} +${svcList.length - 1}` : label;
  }

  const detailEnquiry = enquiries.find(e => e.id === detailId);
  const convertEnquiry = enquiries.find(e => e.id === convertId);

  return (
    <div className="space-y-6">
      {/* Title Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-2xl font-bold text-slate-800">Enquiry</h1>
          <div className="flex rounded-lg overflow-hidden border border-slate-200">
            <button onClick={() => setTab('active')} className={`px-4 py-1.5 text-sm font-medium transition-colors ${tab === 'active' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
              Active ({activeEnquiries.length})
            </button>
            <button onClick={() => setTab('dead')} className={`px-4 py-1.5 text-sm font-medium transition-colors ${tab === 'dead' ? 'bg-red-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
              Dead ({deadEnquiries.length})
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input ref={fileRef} type="file" accept=".csv" onChange={handleUploadCSV} className="hidden" />
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors">
            <Upload size={15} /> Upload CSV
          </button>
          <button onClick={handleDownloadSample} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors">
            <Download size={15} /> Sample CSV
          </button>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium shadow-sm">
            <Plus size={16} /> Add Enquiry
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard
          label="Total Enquiries"
          value={enquiries.length}
          icon={<FileText size={20} />}
          borderColor="#4F46E5"
          bgColor="#EEF2FF"
          textColor="#4F46E5"
          subtitle="All incoming leads"
        />
        <StatCard
          label="Active"
          value={activeEnquiries.length}
          icon={<Clock size={20} />}
          borderColor="#059669"
          bgColor="#ECFDF5"
          textColor="#059669"
          subtitle="Currently in pipeline"
        />
        <StatCard
          label="Dead / Lost"
          value={deadEnquiries.length}
          icon={<XCircle size={20} />}
          borderColor="#EF4444"
          bgColor="#FEF2F2"
          textColor="#EF4444"
          subtitle="Unqualified leads"
        />
        <StatCard
          label="Conversion"
          value={`${conversionRate}%`}
          icon={<ArrowUpRight size={20} />}
          borderColor="#7C3AED"
          bgColor="#F5F3FF"
          textColor="#7C3AED"
          subtitle={`${converted.length} converted`}
        />
      </div>

      {/* Enquiry Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Company</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Service</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayed.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                    No {tab} enquiries found
                  </td>
                </tr>
              ) : displayed.map((enq) => (
                <tr
                  key={enq.id}
                  onClick={() => setDetailId(enq.id)}
                  className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">{enq.companyName}</span>
                      <span className="text-xs text-slate-400">{enq.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-slate-600">{formatDate(enq.date)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[11px] font-medium border border-indigo-100">
                        {getServiceLabel(enq)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-slate-600 font-medium">{enq.contactName}</span>
                  </td>
                  <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      {tab === 'active' ? (
                        <>
                          <button onClick={() => openEdit(enq)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg shadow-sm transition-all border border-transparent hover:border-indigo-100">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => setConvertId(enq.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 text-[11px] font-bold rounded-lg transition-all border border-emerald-100 uppercase tracking-wide">
                            <ArrowRight size={14} /> Quote
                          </button>
                          <button
                            disabled={actionId === enq.id}
                            onClick={async () => {
                              setActionId(enq.id);
                              try { await deadEnquiry(enq.id); showToast('Enquiry marked as dead', 'info'); }
                              catch (err: any) { showToast(err.message || 'Failed', 'error'); }
                              finally { setActionId(null); }
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-white rounded-lg shadow-sm transition-all border border-transparent hover:border-red-100 disabled:opacity-50"
                          >
                            {actionId === enq.id ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                          </button>
                        </>
                      ) : (
                        <button
                          disabled={actionId === enq.id}
                          onClick={async () => {
                            setActionId(enq.id);
                            try { await restoreEnquiry(enq.id); showToast('Enquiry restored successfully'); }
                            catch (err: any) { showToast(err.message || 'Failed', 'error'); }
                            finally { setActionId(null); }
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 text-[11px] font-bold rounded-lg shadow-sm border border-indigo-100 hover:bg-indigo-100 transition-all disabled:opacity-50 uppercase tracking-wide"
                        >
                          {actionId === enq.id ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />} Restore
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

      {/* Add/Edit Form Modal */}
      {showForm && (
        <Modal title={editId ? 'Edit Enquiry' : 'Add New Enquiry'} onClose={() => setShowForm(false)} wide>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Date *">
                <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className={inputCls} required />
              </Field>
              <Field label="Contact Name *">
                <input type="text" value={form.contactName} onChange={e => setForm(p => ({ ...p, contactName: e.target.value }))} className={inputCls} placeholder="Full name" required />
              </Field>
            </div>

            {/* Multi-service rows */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-700">Services *</p>
              {form.services.map((svc, idx) => (
                <div key={svc.id} className="flex items-center gap-2">
                  <div className="flex-1">
                    <ServiceSelector
                      serviceId={svc.serviceId}
                      subServiceId={svc.subServiceId}
                      onServiceChange={(sId, scId) => updateServiceRow(idx, sId, scId)}
                      compact
                    />
                  </div>
                  {form.services.length > 1 && (
                    <button type="button" onClick={() => removeServiceRow(idx)} className="text-red-400 hover:text-red-600 flex-shrink-0">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addServiceRow} className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 transition-colors">
                <Plus size={14} /> Add another service
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Company Name *">
                <input type="text" value={form.companyName} onChange={e => setForm(p => ({ ...p, companyName: e.target.value }))} className={inputCls} placeholder="Company name" required />
              </Field>
              <Field label="Mobile Number *">
                <input type="tel" value={form.mobileNumber} onChange={e => setForm(p => ({ ...p, mobileNumber: e.target.value }))} className={inputCls} placeholder="10-digit number" required />
              </Field>
              <Field label="Email Address *">
                <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className={inputCls} placeholder="email@company.com" required />
              </Field>
              <Field label="Website (Optional)">
                <input type="url" value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))} className={inputCls} placeholder="https://example.com" />
              </Field>
            </div>

            <Field label="Company Address *">
              <textarea value={form.companyAddress} onChange={e => setForm(p => ({ ...p, companyAddress: e.target.value }))} className={inputCls + ' resize-none'} rows={2} placeholder="Full address" required />
            </Field>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <p className="text-sm font-semibold text-slate-700">GST Details</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="GST Number">
                  <input type="text" value={form.gstNumber} onChange={e => setForm(p => ({ ...p, gstNumber: e.target.value }))} className={inputCls} placeholder="15-digit GSTIN" maxLength={15} />
                </Field>
                <Field label="GST Slab *">
                  <div className="relative group">
                    <select value={form.gstSlab} onChange={e => setForm(p => ({ ...p, gstSlab: parseInt(e.target.value) }))} className={inputCls + ' appearance-none pr-10 cursor-pointer'}>
                      {GST_SLABS.map(s => <option key={s} value={s}>{s}%</option>)}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                      <ChevronDown size={18} />
                    </div>
                  </div>
                </Field>
                <Field label="Tax Type *">
                  <div className="relative group">
                    <select value={form.taxType} onChange={e => setForm(p => ({ ...p, taxType: e.target.value as any }))} className={inputCls + ' appearance-none pr-10 cursor-pointer'}>
                      <option value="Exclusive">Exclusive (+ GST)</option>
                      <option value="Inclusive">Inclusive (GST in price)</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                      <ChevronDown size={18} />
                    </div>
                  </div>
                </Field>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Country *">
                <div className="relative group">
                  <select value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value, state: '' }))} className={inputCls + ' appearance-none pr-10 cursor-pointer'} required>
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
                  <select value={form.state} onChange={e => setForm(p => ({ ...p, state: e.target.value }))} className={inputCls + ' appearance-none pr-10 cursor-pointer'} required>
                    <option value="">Select State</option>
                    {getStatesForCountry(form.country).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                    <ChevronDown size={18} />
                  </div>
                </div>
              </Field>
            </div>

            <Field label="Description">
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className={inputCls + ' resize-none'} rows={3} placeholder="Project details..." />
            </Field>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowForm(false)} disabled={saving} className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-sm disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium shadow-sm disabled:opacity-70">
                {saving && <Loader2 size={15} className="animate-spin" />}
                {saving ? 'Saving...' : (editId ? 'Save Changes' : 'Create Enquiry')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Detail View */}
      {detailId && detailEnquiry && (
        <Modal title="Enquiry Details" onClose={() => setDetailId(null)}>
          <EnquiryDetailBody
            enquiry={detailEnquiry}
            services={services}
            onEdit={() => { setDetailId(null); openEdit(detailEnquiry); }}
            onConvert={() => { setDetailId(null); setConvertId(detailId); }}
          />
        </Modal>
      )}

      {/* Convert to Quote Modal */}
      {convertId && convertEnquiry && (
        <ConvertToQuoteModal enquiry={convertEnquiry} onClose={() => setConvertId(null)} />
      )}
    </div>
  );
}

function EnquiryDetailBody({ enquiry, services, onEdit, onConvert }: { enquiry: Enquiry; services: any[]; onEdit: () => void; onConvert: () => void }) {
  const svcList = enquiry.services && enquiry.services.length > 0
    ? enquiry.services
    : enquiry.serviceId ? [{ id: '', serviceId: enquiry.serviceId, subServiceId: enquiry.subServiceId || '' }] : [];

  function svcLabel(svc: { serviceId: string; subServiceId?: string }) {
    const s = services.find(x => x.id === svc.serviceId);
    const sc = s?.subCategories.find((c: any) => c.id === svc.subServiceId);
    return s ? `${s.name}${sc ? ` / ${sc.name}` : ''}` : '—';
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Detail label="Company" value={enquiry.companyName} />
        <Detail label="Contact" value={enquiry.contactName} />
        <Detail label="Date" value={formatDate(enquiry.date)} />
        <Detail label="GST Slab" value={`${enquiry.gstSlab}% (${enquiry.taxType})`} />
        <Detail label="Mobile" value={enquiry.mobileNumber} />
        <Detail label="Email" value={enquiry.email} />
        <Detail label="Country" value={enquiry.country} />
        <Detail label="State" value={enquiry.state} />
        <Detail label="GST Number" value={enquiry.gstNumber || '—'} />
      </div>
      <div>
        <p className="text-xs text-slate-500 mb-1">Services</p>
        <div className="space-y-1">
          {svcList.length === 0 ? <p className="text-sm text-slate-400">—</p> : svcList.map((s, i) => (
            <span key={i} className="inline-block mr-2 px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs font-medium">{svcLabel(s)}</span>
          ))}
        </div>
      </div>
      <Detail label="Address" value={enquiry.companyAddress} />
      <Detail label="Description" value={enquiry.description || '—'} />
      <div className="flex justify-end gap-3 pt-2">
        <button onClick={onEdit} className="px-4 py-2 border border-indigo-200 text-indigo-600 rounded-lg hover:bg-indigo-50 text-sm flex items-center gap-1.5">
          <Edit2 size={14} /> Edit
        </button>
        {enquiry.status === 'active' && (
          <button onClick={onConvert} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm flex items-center gap-1.5">
            <ArrowRight size={14} /> Convert to Quote
          </button>
        )}
      </div>
    </div>
  );
}

function ConvertToQuoteModal({ enquiry, onClose }: { enquiry: Enquiry; onClose: () => void }) {
  const { services, addQuotation } = useApp();
  const { showToast } = useToast();

  const buildInitial = () => {
    const svcList = enquiry.services && enquiry.services.length > 0
      ? enquiry.services
      : enquiry.serviceId ? [{ id: generateId(), serviceId: enquiry.serviceId, subServiceId: enquiry.subServiceId || '' }] : [{ id: generateId(), serviceId: '', subServiceId: '' }];

    return svcList.map(es => {
      const svc = services.find(s => s.id === es.serviceId);
      const sub = svc?.subCategories.find(sc => sc.id === es.subServiceId);
      return {
        id: generateId(),
        serviceId: es.serviceId,
        subServiceId: es.subServiceId,
        serviceName: svc?.name || '',
        subServiceName: sub?.name || '',
        hsnCode: svc?.hsnCode || '',
        quantity: 1,
        inputPrice: '',
        basePrice: 0,
        gstRate: enquiry.gstSlab,
        gstAmount: 0,
        totalPrice: 0,
      };
    });
  };

  const [items, setItems] = useState(buildInitial);

  function calc(price: number, gstRate: number) {
    if (enquiry.taxType === 'Exclusive') {
      const gst = price * gstRate / 100;
      return { basePrice: price, gstAmount: gst, totalPrice: price + gst };
    } else {
      const base = price / (1 + gstRate / 100);
      return { basePrice: base, gstAmount: price - base, totalPrice: price };
    }
  }

  function updatePrice(idx: number, val: string) {
    const price = parseFloat(val) || 0;
    const { basePrice, gstAmount, totalPrice } = calc(price, items[idx].gstRate);
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, inputPrice: val, basePrice, gstAmount, totalPrice } : it));
  }

  function updateGstRate(idx: number, gstRate: number) {
    const price = parseFloat(items[idx].inputPrice) || 0;
    const { basePrice, gstAmount, totalPrice } = calc(price, gstRate);
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, gstRate, basePrice, gstAmount, totalPrice } : it));
  }

  function updateService(idx: number, serviceId: string, subServiceId: string) {
    const svc = services.find(s => s.id === serviceId);
    const sub = svc?.subCategories.find(sc => sc.id === subServiceId);
    setItems(prev => prev.map((it, i) => i === idx ? {
      ...it, serviceId, subServiceId,
      serviceName: svc?.name || '', subServiceName: sub?.name || '', hsnCode: svc?.hsnCode || ''
    } : it));
  }

  function addItem() {
    setItems(prev => [...prev, {
      id: generateId(), serviceId: '', subServiceId: '', serviceName: '', subServiceName: '',
      hsnCode: '', quantity: 1, inputPrice: '', basePrice: 0, gstRate: enquiry.gstSlab, gstAmount: 0, totalPrice: 0,
    }]);
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit() {
    const quotationItems = items.map(it => ({
      id: it.id, serviceId: it.serviceId, subServiceId: it.subServiceId,
      serviceName: it.serviceName, subServiceName: it.subServiceName,
      hsnCode: it.hsnCode, quantity: it.quantity,
      basePrice: it.basePrice, gstRate: it.gstRate,
      gstAmount: it.gstAmount, totalPrice: it.totalPrice,
    }));
    try {
      await addQuotation(enquiry.id, quotationItems);
      showToast('Quotation created! Go to Quotation tab to view it.', 'success');
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to create quotation', 'error');
    }
  }

  const grandTotal = items.reduce((sum, it) => sum + it.totalPrice * it.quantity, 0);
  const totalBase = items.reduce((sum, it) => sum + it.basePrice * it.quantity, 0);
  const totalGst = items.reduce((sum, it) => sum + it.gstAmount * it.quantity, 0);

  return (
    <Modal title="Convert to Quotation" onClose={onClose} wide>
      <div className="space-y-4">
        <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-600">
          Converting enquiry for <strong>{enquiry.companyName}</strong> — Tax Type: <strong>{enquiry.taxType}</strong>, GST: <strong>{enquiry.gstSlab}%</strong>
        </div>

        <div className="space-y-3">
          {items.map((item, idx) => (
            <div key={item.id} className="p-4 border border-slate-200 rounded-xl space-y-3 bg-slate-50">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-700">Item {idx + 1}</span>
                {items.length > 1 && (
                  <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <ServiceSelector
                serviceId={item.serviceId}
                subServiceId={item.subServiceId}
                onServiceChange={(sId, scId) => updateService(idx, sId, scId)}
                compact
              />
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-600 mb-1 block">Price (₹) *</label>
                  <input type="number" min="0" step="0.01" value={item.inputPrice}
                    onChange={e => updatePrice(idx, e.target.value)}
                    className={inputCls} placeholder={enquiry.taxType === 'Inclusive' ? 'MRP (incl. GST)' : 'Base price'} />
                </div>
                <div>
                  <label className="text-xs text-slate-600 mb-1 block">Quantity</label>
                  <input type="number" min="1" value={item.quantity}
                    onChange={e => setItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: parseInt(e.target.value) || 1 } : it))}
                    className={inputCls} />
                </div>
                <div>
                  <label className="text-xs text-slate-600 mb-1 block">GST Rate</label>
                  <select value={item.gstRate} onChange={e => updateGstRate(idx, parseInt(e.target.value))} className={inputCls}>
                    {GST_SLABS.map(s => <option key={s} value={s}>{s}%</option>)}
                  </select>
                </div>
              </div>
              {parseFloat(item.inputPrice) > 0 && (
                <div className="flex gap-4 text-xs text-slate-600 bg-white p-2 rounded-lg">
                  <span>Base: <strong>₹{(item.basePrice * item.quantity).toFixed(2)}</strong></span>
                  <span>GST ({item.gstRate}%): <strong>₹{(item.gstAmount * item.quantity).toFixed(2)}</strong></span>
                  <span className="text-indigo-700 font-semibold">Total: ₹{(item.totalPrice * item.quantity).toFixed(2)}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        <button onClick={addItem} className="w-full py-2 border-2 border-dashed border-indigo-200 text-indigo-600 rounded-lg hover:bg-indigo-50 text-sm flex items-center justify-center gap-2">
          <Plus size={16} /> Add Service
        </button>

        {grandTotal > 0 && (
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg flex gap-6 text-sm">
            <span>Subtotal: <strong>₹{totalBase.toFixed(2)}</strong></span>
            <span>GST: <strong>₹{totalGst.toFixed(2)}</strong></span>
            <span className="text-indigo-700 font-bold text-base">Grand Total: ₹{grandTotal.toFixed(2)}</span>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 text-sm hover:bg-slate-50">Cancel</button>
          <button onClick={handleSubmit} disabled={grandTotal <= 0} className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium disabled:opacity-50">
            Create Quotation
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${wide ? 'max-w-3xl' : 'max-w-xl'} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 transition-colors">
            <XCircle size={20} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
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

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-medium text-slate-800 mt-0.5">{value}</p>
    </div>
  );
}

const inputCls = "w-full border border-slate-200 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-white transition-all";