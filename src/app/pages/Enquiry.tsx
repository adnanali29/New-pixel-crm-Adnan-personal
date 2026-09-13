import React, { useState, useRef, useEffect } from 'react';
import { Plus, Upload, Download, Edit2, ArrowRight, XCircle, RotateCcw, Trash2, FileText, ChevronDown, ArrowUpRight, TrendingUp, Clock, DollarSign, Loader2, Users, CheckCircle2, Search } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { Enquiry, EnquiryService, Customer } from '../types/index';
import StatCard from '../components/StatCard';
import ServiceSelector from '../components/ServiceSelector';
import { formatDate, formatCurrency, generateId } from '../utils/helpers';
import { getCountries, getStatesForCountry } from '../utils/countryData';
import { useNavigate, useLocation } from 'react-router';

const GST_SLABS = [0, 5, 18, 28];
const SAMPLE_CSV = `date,contactName,companyName,mobileNumber,email,companyAddress,gstNumber,gstSlab,taxType,country,state,description
2024-01-15,John Doe,ABC Pvt Ltd,9876543210,john@abc.com,"123 MG Road, Bangalore",29ABCDE1234F1Z5,18,Exclusive,India,Karnataka,Website development project
2024-01-16,Jane Smith,XYZ Corp,8765432109,jane@xyz.com,"456 Park Street, Mumbai",,5,Inclusive,India,Maharashtra,Mobile app development`;

interface EnquiryFormData {
  date: string;
  contactName: string;
  customerId?: string;
  services: EnquiryService[];
  companyName: string;
  mobileNumber: string;
  website: string;
  email: string;
  companyAddress: string;
  gstNumber: string;
  gstSlab: number;
  taxType: 'Inclusive' | 'Exclusive';
  country: string;
  state: string;
  description: string;
}

const emptyForm: EnquiryFormData = {
  date: new Date().toISOString().split('T')[0],
  contactName: '',
  services: [{ id: generateId(), serviceId: '', subServiceId: '', projectName: '' }],
  companyName: '',
  mobileNumber: '',
  website: '',
  email: '',
  companyAddress: '',
  gstNumber: '',
  gstSlab: 18,
  taxType: 'Exclusive',
  country: 'India',
  state: '',
  description: '',
};

export default function EnquiryPage() {
  const { enquiries = [], addEnquiry, updateEnquiry, deadEnquiry, restoreEnquiry, services = [], customers = [] } = useApp();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [tab, setTab] = useState<'active' | 'dead'>('active');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<EnquiryFormData>(emptyForm);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [convertId, setConvertId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Customer Autocomplete Suggestions state
  const [custSearch, setCustSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const activeEnquiries = enquiries.filter(e => e.status === 'active' && !e.convertedToQuote);
  const deadEnquiries = enquiries.filter(e => e.status === 'dead');
  const converted = enquiries.filter(e => e.convertedToQuote);
  const displayed = tab === 'active' ? activeEnquiries : deadEnquiries;
  const countries = getCountries();

  const conversionRate = enquiries.length > 0 ? ((converted.length / enquiries.length) * 100).toFixed(1) : 0;
  const potentialValue = activeEnquiries.length * 15000;

  // Preselect customer if coming from Customers page
  useEffect(() => {
    if (location.state?.preselectCustomer) {
      selectCustomer(location.state.preselectCustomer);
      setShowForm(true);
    }
  }, [location.state]);

  function openAdd() {
    setEditId(null);
    setForm({ ...emptyForm, services: [{ id: generateId(), serviceId: '', subServiceId: '', projectName: '' }] });
    setCustSearch('');
    setShowForm(true);
  }

  function openEdit(e: Enquiry) {
    setEditId(e.id);
    const svcList: EnquiryService[] =
      e.services && e.services.length > 0
        ? e.services
        : [{ id: generateId(), serviceId: e.serviceId || '', subServiceId: e.subServiceId || '', projectName: '' }];
    setForm({
      date: e.date,
      contactName: e.contactName,
      customerId: e.customerId,
      services: svcList,
      companyName: e.companyName,
      mobileNumber: e.mobileNumber,
      website: e.website || '',
      email: e.email,
      companyAddress: e.companyAddress,
      gstNumber: e.gstNumber || '',
      gstSlab: e.gstSlab,
      taxType: e.taxType,
      country: e.country,
      state: e.state,
      description: e.description,
    });
    setCustSearch(e.companyName);
    setShowForm(true);
  }

  function selectCustomer(c: Customer) {
    setForm(p => ({
      ...p,
      customerId: c.id,
      companyName: c.companyName,
      contactName: c.pocName,
      email: c.companyEmail || '',
      mobileNumber: c.companyNumber || '',
      companyAddress: c.companyAddress || '',
      website: c.website || '',
      gstNumber: c.gstNumber || '',
      gstSlab: c.gstSlab || 18,
      taxType: c.taxType || 'Exclusive',
      country: c.country || 'India',
      state: c.state || '',
    }));
    setCustSearch(c.companyName);
    setShowSuggestions(false);
    showToast(`Customer "${c.companyName}" details auto-filled!`);
  }

  function addServiceRow() {
    setForm(p => ({ ...p, services: [...p.services, { id: generateId(), serviceId: '', subServiceId: '', projectName: '' }] }));
  }

  function removeServiceRow(idx: number) {
    setForm(p => ({ ...p, services: p.services.filter((_, i) => i !== idx) }));
  }

  function updateServiceRow(idx: number, serviceId: string, subServiceId: string, projectName?: string) {
    setForm(p => ({
      ...p,
      services: p.services.map((s, i) => i === idx ? { ...s, serviceId, subServiceId, projectName } : s),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.companyName) {
      showToast('Please specify Customer / Company details', 'error');
      return;
    }
    const finalForm = {
      ...form,
      contactName: form.contactName || form.companyName,
    };
    setSaving(true);
    try {
      if (editId) {
        await updateEnquiry(editId, finalForm);
        showToast('Enquiry updated successfully');
      } else {
        await addEnquiry(finalForm);
        showToast('Enquiry created successfully');
      }
      setShowForm(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to save enquiry', 'error');
    } finally {
      setSaving(false);
    }
  }

  const detailEnquiry = enquiries.find(e => e.id === detailId);
  const convertEnquiry = enquiries.find(e => e.id === convertId);

  // Suggestions for Customer Autocomplete
  const matchingCustomers = customers.filter(c =>
    custSearch.trim() !== '' && (
      c.companyName.toLowerCase().includes(custSearch.toLowerCase()) ||
      c.pocName.toLowerCase().includes(custSearch.toLowerCase()) ||
      (c.companyNumber && c.companyNumber.includes(custSearch))
    )
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Enquiries</h1>
          <p className="text-slate-500 text-sm">Manage sales enquiries and project requirements</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm transition-all text-sm"
          >
            <Plus size={18} />
            Add New Enquiry
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Active Enquiries" value={activeEnquiries.length.toString()} icon={Clock} color="blue" />
        <StatCard title="Converted to Quotes" value={converted.length.toString()} icon={TrendingUp} color="green" />
        <StatCard title="Conversion Rate" value={`${conversionRate}%`} icon={ArrowUpRight} color="purple" />
        <StatCard title="Pipeline Estimate" value={formatCurrency(potentialValue)} icon={DollarSign} color="amber" />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setTab('active')}
          className={`px-4 py-2.5 font-medium text-sm border-b-2 transition-all ${
            tab === 'active'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Active Enquiries ({activeEnquiries.length})
        </button>
        <button
          onClick={() => setTab('dead')}
          className={`px-4 py-2.5 font-medium text-sm border-b-2 transition-all ${
            tab === 'dead'
              ? 'border-red-600 text-red-700 bg-red-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Dead Enquiries ({deadEnquiries.length})
        </button>
      </div>

      {/* Enquiries Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Customer & Company</th>
                <th className="px-6 py-4">Services & Project</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">GST / Tax</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {displayed.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <FileText size={36} className="mx-auto mb-2 opacity-50" />
                    <p className="font-medium text-slate-600">No enquiries found</p>
                    <p className="text-xs text-slate-400">Add an enquiry to start tracking leads</p>
                  </td>
                </tr>
              ) : (
                displayed.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800">{e.companyName}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Users size={12} className="text-indigo-500" />
                        {e.contactName} {e.mobileNumber ? `(${e.mobileNumber})` : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {(e.services && e.services.length > 0 ? e.services : [{ id: '', serviceId: e.serviceId || '', subServiceId: e.subServiceId || '' }]).map((svc, i) => {
                          const s = services.find(x => x.id === svc.serviceId);
                          const sc = s?.subCategories.find((c: any) => c.id === svc.subServiceId);
                          return (
                            <div key={i} className="text-xs text-slate-700 flex flex-wrap items-center gap-1">
                              <span className="font-medium text-indigo-700">{s?.name || '—'}</span>
                              {sc && <span className="text-slate-500">/ {sc.name}</span>}
                              {svc.projectName && (
                                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-semibold border border-slate-200">
                                  Project: {svc.projectName}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600">{formatDate(e.date)}</td>
                    <td className="px-6 py-4 text-xs text-slate-600">
                      {e.gstSlab}% ({e.taxType})
                      {e.gstNumber && <div className="text-[11px] text-slate-400 font-mono">{e.gstNumber}</div>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setDetailId(e.id)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded transition-colors"
                        >
                          View
                        </button>
                        {tab === 'active' && (
                          <>
                            <button
                              onClick={() => setConvertId(e.id)}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-medium rounded transition-colors flex items-center gap-1"
                            >
                              Quote <ArrowRight size={12} />
                            </button>
                            <button
                              onClick={() => openEdit(e)}
                              className="p-1 hover:bg-slate-100 text-slate-600 rounded transition-colors"
                              title="Edit Enquiry"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={async () => {
                                await deadEnquiry(e.id);
                                showToast('Enquiry marked as dead.');
                              }}
                              className="p-1 hover:bg-red-50 text-red-500 rounded transition-colors"
                              title="Mark Dead"
                            >
                              <XCircle size={16} />
                            </button>
                          </>
                        )}
                        {tab === 'dead' && (
                          <button
                            onClick={async () => {
                              await restoreEnquiry(e.id);
                              showToast('Enquiry restored to active.');
                            }}
                            className="p-1 hover:bg-indigo-50 text-indigo-600 rounded transition-colors"
                            title="Restore Enquiry"
                          >
                            <RotateCcw size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Enquiry Modal */}
      {showForm && (
        <Modal title={editId ? "Edit Enquiry" : "Add New Enquiry"} onClose={() => setShowForm(false)} wide>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Step 1: Select Customer */}
            <div className="p-4 bg-indigo-50/70 rounded-xl border border-indigo-100 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Users size={15} /> 1. Customer Selection
                </span>
                {form.companyName && (
                  <span className="text-xs text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                    <CheckCircle2 size={12} /> Details Loaded
                  </span>
                )}
              </div>

              {/* Select Customer Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Select Saved Customer (Search by Company / POC Name) *
                </label>
                <select
                  value={form.customerId || ''}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    if (selectedId === '') {
                      setForm(p => ({ ...p, customerId: undefined, companyName: '', contactName: '' }));
                    } else {
                      const found = customers.find(c => c.id === selectedId);
                      if (found) selectCustomer(found);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 text-sm border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-300 bg-white font-medium text-slate-800 shadow-sm cursor-pointer"
                  required
                >
                  <option value="">-- Choose a Saved Customer --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.companyName} (POC: {c.pocName}) — {c.companyNumber || c.companyEmail || 'No contact'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Display Customer Details Card when customer selected */}
              {form.companyName && (
                <div className="p-4 bg-white rounded-xl border border-indigo-100 shadow-sm space-y-2 text-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-bold text-slate-800 text-sm">{form.companyName}</span>
                      {form.contactName && <span className="text-slate-500 ml-2">(POC: <strong>{form.contactName}</strong>)</span>}
                    </div>
                    <span className="text-[11px] px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-semibold border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 size={12} /> Loaded from Customers
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-slate-600 pt-2 border-t border-slate-100">
                    <div><span className="text-slate-400">Mobile:</span> <strong>{form.mobileNumber || 'N/A'}</strong></div>
                    <div><span className="text-slate-400">Email:</span> <strong>{form.email || 'N/A'}</strong></div>
                    <div><span className="text-slate-400">Address:</span> <strong>{form.companyAddress || 'N/A'}</strong></div>
                    <div><span className="text-slate-400">GSTIN:</span> <strong>{form.gstNumber || 'N/A'}</strong></div>
                    <div><span className="text-slate-400">Location:</span> <strong>{form.state ? `${form.state}, ` : ''}{form.country}</strong></div>
                    {form.website && <div><span className="text-slate-400">Website:</span> <strong>{form.website}</strong></div>}
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: GST & Tax Calculation Option */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                2. GST & Tax Options
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="GST Slab *">
                  <select
                    value={form.gstSlab}
                    onChange={e => setForm(p => ({ ...p, gstSlab: parseInt(e.target.value) }))}
                    className={inputCls + ' cursor-pointer'}
                  >
                    {GST_SLABS.map(s => <option key={s} value={s}>{s}% GST</option>)}
                  </select>
                </Field>
                <Field label="Tax Calculation Type *">
                  <select
                    value={form.taxType}
                    onChange={e => setForm(p => ({ ...p, taxType: e.target.value as any }))}
                    className={inputCls + ' cursor-pointer'}
                  >
                    <option value="Exclusive">Exclusive (+ GST added to price)</option>
                    <option value="Inclusive">Inclusive (GST included in price)</option>
                  </select>
                </Field>
              </div>
            </div>

            {/* Step 3: Services & Project Details Section */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  3. Project Details & Services *
                </span>
                <span className="text-xs text-slate-500">
                  Date: <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className="px-2 py-1 border rounded text-xs bg-white" required />
                </span>
              </div>

              {/* Service rows */}
              {form.services.map((svc, idx) => (
                <div key={svc.id} className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-600">
                    <span>Service Item #{idx + 1}</span>
                    {form.services.length > 1 && (
                      <button type="button" onClick={() => removeServiceRow(idx)} className="text-red-400 hover:text-red-600 flex items-center gap-1">
                        <Trash2 size={14} /> Remove
                      </button>
                    )}
                  </div>
                  <ServiceSelector
                    serviceId={svc.serviceId}
                    subServiceId={svc.subServiceId}
                    projectName={svc.projectName}
                    onServiceChange={(sId, scId, pName) => updateServiceRow(idx, sId, scId, pName)}
                    compact
                  />
                </div>
              ))}

              <button type="button" onClick={addServiceRow} className="flex items-center gap-1.5 text-sm text-indigo-600 font-medium hover:text-indigo-800 transition-colors">
                <Plus size={16} /> Add another service to this enquiry
              </button>

              <Field label="Project Scope / Description">
                <textarea
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  className={inputCls + ' resize-none'}
                  rows={3}
                  placeholder="Describe project requirements, milestones or specifications..."
                />
              </Field>
            </div>

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
    : enquiry.serviceId ? [{ id: '', serviceId: enquiry.serviceId, subServiceId: enquiry.subServiceId || '', projectName: '' }] : [];

  function svcLabel(svc: { serviceId: string; subServiceId?: string; projectName?: string }) {
    const s = services.find(x => x.id === svc.serviceId);
    const sc = s?.subCategories.find((c: any) => c.id === svc.subServiceId);
    const pName = svc.projectName ? ` [Project: ${svc.projectName}]` : '';
    return s ? `${s.name}${sc ? ` / ${sc.name}` : ''}${pName}` : '—';
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
        <p className="text-xs text-slate-500 mb-1 font-semibold">Services & Project Names</p>
        <div className="space-y-1">
          {svcList.length === 0 ? <p className="text-sm text-slate-400">—</p> : svcList.map((s, i) => (
            <span key={i} className="inline-block mr-2 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium border border-indigo-100">{svcLabel(s)}</span>
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
      : enquiry.serviceId ? [{ id: generateId(), serviceId: enquiry.serviceId, subServiceId: enquiry.subServiceId || '', projectName: '' }] : [{ id: generateId(), serviceId: '', subServiceId: '', projectName: '' }];

    return svcList.map(es => {
      const svc = services.find(s => s.id === es.serviceId);
      const sub = svc?.subCategories.find(sc => sc.id === es.subServiceId);
      return {
        id: generateId(),
        serviceId: es.serviceId,
        subServiceId: es.subServiceId,
        serviceName: svc?.name || '',
        subServiceName: sub?.name || '',
        projectName: es.projectName || '',
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

  function updateService(idx: number, serviceId: string, subServiceId: string, projectName?: string) {
    const svc = services.find(s => s.id === serviceId);
    const sub = svc?.subCategories.find(sc => sc.id === subServiceId);
    setItems(prev => prev.map((it, i) => i === idx ? {
      ...it, serviceId, subServiceId, projectName,
      serviceName: svc?.name || '', subServiceName: sub?.name || '', hsnCode: svc?.hsnCode || ''
    } : it));
  }

  function addItem() {
    setItems(prev => [...prev, {
      id: generateId(), serviceId: '', subServiceId: '', serviceName: '', subServiceName: '', projectName: '',
      hsnCode: '', quantity: 1, inputPrice: '', basePrice: 0, gstRate: enquiry.gstSlab, gstAmount: 0, totalPrice: 0,
    }]);
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit() {
    const quotationItems = items.map(it => ({
      id: it.id, serviceId: it.serviceId, subServiceId: it.subServiceId,
      serviceName: it.serviceName, subServiceName: it.subServiceName, projectName: it.projectName,
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
                projectName={item.projectName}
                onServiceChange={(sId, scId, pName) => updateService(idx, sId, scId, pName)}
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