import React, { useState } from 'react';
import { Lock, FileText, ShoppingCart, Receipt, CreditCard, Eye, EyeOff, CheckCircle, Trash2, Plus, Edit2, Save, ChevronDown, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { PDFSettings } from '../types/index';
import { getCountries, getStatesForCountry } from '../utils/countryData';

const inputCls = "w-full border border-slate-200 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-white transition-all";

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('password');

  const sections = [
    { id: 'password', label: 'Change Password', icon: Lock },
    { id: 'services', label: 'Services & Sub-Categories', icon: Plus },
    { id: 'quote', label: 'Quote PDF Settings', icon: FileText },
    { id: 'po', label: 'PO PDF Settings', icon: ShoppingCart },
    { id: 'pi', label: 'PI PDF Settings', icon: Receipt },
    { id: 'taxinvoice', label: 'Tax Invoice PDF Settings', icon: CreditCard },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Settings</h1>

      <div className="flex gap-6 flex-col lg:flex-row">
        {/* Sidebar */}
        <div className="lg:w-64 flex-shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            {sections.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm text-left transition-all border-l-4 ${activeSection === id
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold'
                  : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                  }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeSection === 'password' && <PasswordSection />}
          {activeSection === 'services' && <ServicesSection />}
          {activeSection === 'quote' && <PDFSettingsSection settingKey="quotePdfSettings" title="Quote PDF Settings" requiredGST={false} showBankDetails={false} />}
          {activeSection === 'po' && <PDFSettingsSection settingKey="poPdfSettings" title="PO PDF Settings" requiredGST={false} showBankDetails={false} />}
          {activeSection === 'pi' && <PDFSettingsSection settingKey="piPdfSettings" title="PI PDF Settings" requiredGST={false} showBankDetails={true} />}
          {activeSection === 'taxinvoice' && <PDFSettingsSection settingKey="taxInvoicePdfSettings" title="Tax Invoice PDF Settings" requiredGST={true} showBankDetails={false} />}
        </div>
      </div>
    </div>
  );
}

function PasswordSection() {
  const { changePassword } = useApp();
  const { showToast } = useToast();
  const [current, setCurrent] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPass.length < 4) { setError('New password must be at least 4 characters.'); return; }
    if (newPass !== confirm) { setError('Passwords do not match.'); return; }
    setSaving(true);
    try {
      await changePassword(current, newPass);
      setCurrent(''); setNewPass(''); setConfirm('');
      setError('');
      showToast('Password changed successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
      <h2 className="text-base font-semibold text-slate-800 mb-5">Change Password</h2>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        {[
          { label: 'Current Password', value: current, onChange: setCurrent },
          { label: 'New Password', value: newPass, onChange: setNewPass },
          { label: 'Confirm New Password', value: confirm, onChange: setConfirm },
        ].map(({ label, value, onChange }) => (
          <div key={label}>
            <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={value}
                onChange={e => onChange(e.target.value)}
                className={inputCls + ' pr-10'}
                placeholder="••••••••"
                required
              />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
        ))}

        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

        <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium disabled:opacity-70">
          {saving ? <Loader2 size={15} className="animate-spin" /> : null}
          {saving ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </div>
  );
}

function ServicesSection() {
  const { services, addService, updateService, addSubCategory, updateSubCategory, deleteSubCategory } = useApp();
  const { showToast } = useToast();
  const [newSvc, setNewSvc] = useState({ name: '', hsn: '' });
  const [editSvcId, setEditSvcId] = useState<string | null>(null);
  const [editSvcForm, setEditSvcForm] = useState({ name: '', hsn: '' });
  const [expandedSvc, setExpandedSvc] = useState<string | null>(null);
  const [newSubForm, setNewSubForm] = useState<{ serviceId: string; name: string } | null>(null);
  const [editSubId, setEditSubId] = useState<{ svcId: string; subId: string } | null>(null);
  const [editSubName, setEditSubName] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-5">
      <h2 className="text-base font-semibold text-slate-800">Services & Sub-Categories</h2>

      {/* Add Service */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newSvc.name}
          onChange={e => setNewSvc(p => ({ ...p, name: e.target.value }))}
          className={inputCls}
          placeholder="New service name..."
        />
        <input
          type="text"
          value={newSvc.hsn}
          onChange={e => setNewSvc(p => ({ ...p, hsn: e.target.value }))}
          className="w-28 border border-slate-200 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-white transition-all"
          placeholder="HSN"
        />
        <button
          onClick={async () => {
            if (newSvc.name.trim()) {
              setSavingId('new-service');
              try {
                await addService(newSvc.name.trim(), newSvc.hsn.trim());
                setNewSvc({ name: '', hsn: '' });
                showToast('Service added successfully');
              } catch (err: any) {
                showToast(err.message || 'Failed to add service', 'error');
              } finally {
                setSavingId(null);
              }
            }
          }}
          disabled={savingId === 'new-service'}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 whitespace-nowrap disabled:opacity-70"
        >
          {savingId === 'new-service' ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
        </button>
      </div>

      {/* Services List */}
      <div className="space-y-2">
        {services.length === 0 && (
          <p className="text-sm text-slate-400 py-4 text-center">No services added yet</p>
        )}
        {services.map(svc => (
          <div key={svc.id} className="border border-slate-200 rounded-xl overflow-hidden">
            <div
              className="flex items-center justify-between px-4 py-3 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
              onClick={() => setExpandedSvc(expandedSvc === svc.id ? null : svc.id)}
            >
              {editSvcId === svc.id ? (
                <div className="flex items-center gap-2 flex-1" onClick={e => e.stopPropagation()}>
                  <input
                    type="text"
                    value={editSvcForm.name}
                    onChange={e => setEditSvcForm(p => ({ ...p, name: e.target.value }))}
                    className="flex-1 border border-indigo-300 rounded px-2 py-1 text-sm"
                    autoFocus
                  />
                  <input
                    type="text"
                    value={editSvcForm.hsn}
                    onChange={e => setEditSvcForm(p => ({ ...p, hsn: e.target.value }))}
                    className="w-20 border border-indigo-300 rounded px-2 py-1 text-sm"
                    placeholder="HSN"
                  />
                  <button onClick={async () => {
                    setSavingId(svc.id);
                    try {
                      await updateService(svc.id, editSvcForm.name, editSvcForm.hsn);
                      setEditSvcId(null);
                      showToast('Service updated');
                    } catch (err: any) {
                      showToast(err.message || 'Failed to update service', 'error');
                    } finally {
                      setSavingId(null);
                    }
                  }}
                    disabled={savingId === svc.id}
                    className="flex items-center gap-1 px-3 py-1 bg-indigo-600 text-white rounded text-xs disabled:opacity-70">
                    {savingId === svc.id ? <Loader2 size={12} className="animate-spin" /> : null}Save
                  </button>
                  <button onClick={() => setEditSvcId(null)} className="px-3 py-1 bg-slate-200 rounded text-xs">Cancel</button>
                </div>
              ) : (
                <div className="flex items-center gap-3 flex-1">
                  <span className="font-medium text-slate-800">{svc.name}</span>
                  {svc.hsnCode && <span className="text-xs text-slate-400 font-mono">HSN: {svc.hsnCode}</span>}
                  <span className="text-xs text-slate-200">|</span>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">{svc.subCategories.length} sub-categories</span>
                </div>
              )}
              {editSvcId !== svc.id && (
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  <button onClick={() => { setEditSvcId(svc.id); setEditSvcForm({ name: svc.name, hsn: svc.hsnCode || '' }); }}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 rounded hover:bg-indigo-50">
                    <Edit2 size={14} />
                  </button>
                  <span className="text-slate-300 text-xs ml-1">{expandedSvc === svc.id ? '▲' : '▼'}</span>
                </div>
              )}
            </div>

            {expandedSvc === svc.id && (
              <div className="px-4 py-3 space-y-2">
                {svc.subCategories.map(sub => (
                  <div key={sub.id} className="flex items-center gap-3 py-1.5 border-b border-slate-50">
                    {editSubId?.subId === sub.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input value={editSubName} onChange={e => setEditSubName(e.target.value)} className="flex-1 border border-indigo-300 rounded px-2 py-1 text-sm" placeholder="Sub-category name" />
                        <button onClick={async () => {
                          setSavingId(sub.id);
                          try {
                            await updateSubCategory(svc.id, sub.id, editSubName);
                            setEditSubId(null);
                            showToast('Sub-category updated');
                          } catch (err: any) {
                            showToast(err.message || 'Failed to update sub-category', 'error');
                          } finally {
                            setSavingId(null);
                          }
                        }} disabled={savingId === sub.id} className="flex items-center gap-1 px-2 py-1 bg-indigo-600 text-white rounded text-xs disabled:opacity-70">
                          {savingId === sub.id ? <Loader2 size={11} className="animate-spin" /> : null}Save
                        </button>
                        <button onClick={() => setEditSubId(null)} className="px-2 py-1 bg-slate-200 rounded text-xs">Cancel</button>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1">
                          <span className="text-sm text-slate-700">{sub.name}</span>
                        </div>
                        <button onClick={() => { setEditSubId({ svcId: svc.id, subId: sub.id }); setEditSubName(sub.name); }}
                          className="p-1 text-slate-400 hover:text-indigo-600">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={async () => {
                          setSavingId(sub.id + '-del');
                          try {
                            await deleteSubCategory(svc.id, sub.id);
                            showToast('Sub-category deleted', 'info');
                          } catch (err: any) {
                            showToast(err.message || 'Failed to delete sub-category', 'error');
                          } finally {
                            setSavingId(null);
                          }
                        }}
                          disabled={savingId === sub.id + '-del'}
                          className="p-1 text-slate-400 hover:text-red-500 disabled:opacity-50">
                          {savingId === sub.id + '-del' ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                        </button>
                      </>
                    )}
                  </div>
                ))}

                {/* Add Sub Category */}
                {newSubForm?.serviceId === svc.id ? (
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      value={newSubForm.name}
                      onChange={e => setNewSubForm(p => p ? { ...p, name: e.target.value } : p)}
                      className="flex-1 border border-emerald-300 rounded-lg px-3 py-1.5 text-sm"
                      placeholder="Sub-category name"
                    />
                    <button onClick={async () => {
                      setSavingId(svc.id + '-sub');
                      try {
                        await addSubCategory(svc.id, newSubForm.name);
                        setNewSubForm(null);
                        showToast('Sub-category added');
                      } catch (err: any) {
                        showToast(err.message || 'Failed to add sub-category', 'error');
                      } finally {
                        setSavingId(null);
                      }
                    }}
                      disabled={savingId === svc.id + '-sub'}
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm disabled:opacity-70">
                      {savingId === svc.id + '-sub' ? <Loader2 size={13} className="animate-spin" /> : null}Add
                    </button>
                    <button onClick={() => setNewSubForm(null)} className="px-3 py-1.5 bg-slate-200 rounded-lg text-sm">Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setNewSubForm({ serviceId: svc.id, name: '' })}
                    className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 mt-1">
                    <Plus size={13} /> Add Sub-Category
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PDFSettingsSection({ settingKey, title, requiredGST, showBankDetails }: {
  settingKey: 'quotePdfSettings' | 'poPdfSettings' | 'piPdfSettings' | 'taxInvoicePdfSettings';
  title: string;
  requiredGST: boolean;
  showBankDetails: boolean;
}) {
  const { settings, updateSettings } = useApp();
  const { showToast } = useToast();
  const pdfSettings = settings[settingKey] as PDFSettings;
  const [form, setForm] = useState({ ...pdfSettings });
  const [saving, setSaving] = useState(false);
  const [logoMode, setLogoMode] = useState<'url' | 'upload'>('url');

  const countries = getCountries();

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSettings({ [settingKey]: form });
      showToast('Settings saved successfully');
    } catch (err: any) {
      showToast(err.message || 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setForm(p => ({ ...p, logoUrl: ev.target?.result as string }));
    reader.readAsDataURL(file);
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
      <h2 className="text-base font-semibold text-slate-800 mb-5">{title}</h2>
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Document Heading" value={form.heading} onChange={v => setForm(p => ({ ...p, heading: v }))} placeholder="e.g., QUOTATION" />
          <FormField label="Company Name" value={form.companyName} onChange={v => setForm(p => ({ ...p, companyName: v }))} placeholder="Your company name" />
          <FormField label="Phone" value={form.phone} onChange={v => setForm(p => ({ ...p, phone: v }))} placeholder="+91 98765 43210" />
          <FormField label="Email" value={form.email} onChange={v => setForm(p => ({ ...p, email: v }))} placeholder="info@company.com" type="email" />
          <FormField label="Website" value={form.website} onChange={v => setForm(p => ({ ...p, website: v }))} placeholder="www.company.com" />
          <FormField
            label={`GST Number${requiredGST ? ' *' : ''}`}
            value={form.gstNumber || ''}
            onChange={v => setForm(p => ({ ...p, gstNumber: v }))}
            placeholder="15-digit GSTIN"
            required={requiredGST}
            maxLength={15}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
          <textarea value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} className={inputCls + ' resize-none'} rows={2} placeholder="Full company address" />
        </div>

        {/* Logo */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Company Logo</label>
          <div className="flex gap-3 mb-2">
            <button type="button" onClick={() => setLogoMode('url')} className={`px-3 py-1.5 text-sm rounded-lg border ${logoMode === 'url' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600'}`}>URL</button>
            <button type="button" onClick={() => setLogoMode('upload')} className={`px-3 py-1.5 text-sm rounded-lg border ${logoMode === 'upload' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600'}`}>Upload</button>
          </div>
          {logoMode === 'url' ? (
            <input type="url" value={form.logoUrl || ''} onChange={e => setForm(p => ({ ...p, logoUrl: e.target.value }))} className={inputCls} placeholder="https://example.com/logo.png" />
          ) : (
            <input type="file" accept="image/*" onChange={handleLogoUpload} className={inputCls} />
          )}
          {form.logoUrl && (
            <img src={form.logoUrl} alt="Logo preview" className="mt-2 h-10 object-contain border border-slate-200 rounded p-1" onError={e => (e.target as HTMLImageElement).style.display = 'none'} />
          )}
        </div>

        {/* Location */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
            <div className="relative group">
              <select value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value, state: '' }))} className={inputCls + ' appearance-none pr-10 cursor-pointer'}>
                <option value="">Select Country</option>
                {countries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                <ChevronDown size={18} />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">State (for GST)</label>
            <div className="relative group">
              <select value={form.state} onChange={e => setForm(p => ({ ...p, state: e.target.value }))} className={inputCls + ' appearance-none pr-10 cursor-pointer'}>
                <option value="">Select State</option>
                {getStatesForCountry(form.country).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                <ChevronDown size={18} />
              </div>
            </div>
          </div>
        </div>

        {/* Bank Details for PI */}
        {showBankDetails && (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <p className="text-sm font-semibold text-slate-700">Bank Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Bank Name" value={(form as any).bankName || ''} onChange={v => setForm(p => ({ ...p, bankName: v }))} placeholder="Bank name" />
              <FormField label="Account No" value={(form as any).accountNo || ''} onChange={v => setForm(p => ({ ...p, accountNo: v }))} placeholder="Account number" />
              <FormField label="IFSC Code" value={(form as any).ifsc || ''} onChange={v => setForm(p => ({ ...p, ifsc: v }))} placeholder="IFSC code" />
              <FormField label="Branch" value={(form as any).branch || ''} onChange={v => setForm(p => ({ ...p, branch: v }))} placeholder="Branch name" />
              <FormField label="UPI ID" value={(form as any).upiId || ''} onChange={v => setForm(p => ({ ...p, upiId: v }))} placeholder="UPI ID" />
            </div>
          </div>
        )}

        <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium disabled:opacity-70">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}

function FormField({ label, value, onChange, placeholder, type = 'text', required, maxLength }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; required?: boolean; maxLength?: number;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={inputCls}
        placeholder={placeholder}
        required={required}
        maxLength={maxLength}
      />
    </div>
  );
}
