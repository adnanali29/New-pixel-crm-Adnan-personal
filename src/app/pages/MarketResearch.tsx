import React, { useState } from 'react';
import { Plus, Globe, Phone, Mail, FileText, Edit2, Trash2, X, Building2, ChevronRight, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { MarketCompany } from '../types/index';
import { formatDate } from '../utils/helpers';

const inputCls = "w-full border border-slate-200 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-white transition-all";

export default function MarketResearchPage() {
  const { marketResearch, addMarketCompany, updateMarketCompany, deleteMarketCompany } = useApp();
  const { showToast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [form, setForm] = useState({ companyName: '', website: '', phone: '', email: '', description: '', pitchPlanning: '' });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const editCompany = marketResearch.find(c => c.id === editId);
  const detailCompany = marketResearch.find(c => c.id === detailId);

  function openAdd() {
    setEditId(null);
    setForm({ companyName: '', website: '', phone: '', email: '', description: '', pitchPlanning: '' });
    setShowForm(true);
  }

  function openEdit(c: MarketCompany) {
    setEditId(c.id);
    setForm({ companyName: c.companyName, website: c.website || '', phone: c.phone || '', email: c.email || '', description: c.description || '', pitchPlanning: c.pitchPlanning || '' });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editId) {
        await updateMarketCompany(editId, form);
        showToast('Company updated successfully');
      } else {
        await addMarketCompany(form);
        showToast('Company added successfully');
      }
      setShowForm(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to save market company', 'error');
    } finally {
      setSaving(false);
    }
  }

  function getInitials(name: string) {
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }

  const CARD_COLORS = [
    ['#4F46E5', '#EEF2FF'], ['#059669', '#ECFDF5'], ['#F59E0B', '#FFFBEB'],
    ['#EF4444', '#FEF2F2'], ['#7C3AED', '#F5F3FF'], ['#0EA5E9', '#F0F9FF'],
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Market Research</h1>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium shadow-sm">
          <Plus size={16} /> Add Company
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {marketResearch.length === 0 ? (
          <div className="col-span-full text-center py-16">
            <Building2 size={48} className="mx-auto text-slate-200 mb-3" />
            <p className="text-slate-400">No companies yet. Add your first one!</p>
            <button onClick={openAdd} className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">Add Company</button>
          </div>
        ) : marketResearch.map((company, idx) => {
          const [mainColor, bgColor] = CARD_COLORS[idx % CARD_COLORS.length];
          return (
            <div
              key={company.id}
              className="bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-1 cursor-pointer overflow-hidden"
              style={{ borderTopWidth: 3, borderTopColor: mainColor }}
              onClick={() => setDetailId(company.id)}
            >
              <div className="p-5">
                {/* Company Avatar */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0 transition-transform"
                    style={{ background: bgColor, color: mainColor }}>
                    {getInitials(company.companyName)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-800 text-sm leading-tight truncate">{company.companyName}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{formatDate(company.createdAt)}</p>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-1.5">
                  {company.website && (
                    <div className="flex items-center gap-2 text-xs text-slate-600 truncate">
                      <Globe size={12} style={{ color: mainColor, flexShrink: 0 }} />
                      <span className="truncate">{company.website}</span>
                    </div>
                  )}
                  {company.phone && (
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Phone size={12} style={{ color: mainColor, flexShrink: 0 }} />
                      <span>{company.phone}</span>
                    </div>
                  )}
                  {company.email && (
                    <div className="flex items-center gap-2 text-xs text-slate-600 truncate">
                      <Mail size={12} style={{ color: mainColor, flexShrink: 0 }} />
                      <span className="truncate">{company.email}</span>
                    </div>
                  )}
                </div>

                {company.description && (
                  <p className="text-xs text-slate-500 mt-3 line-clamp-2 leading-relaxed">{company.description}</p>
                )}

                {company.pitchPlanning && (
                  <div className="mt-3 p-2 rounded-lg text-xs" style={{ background: bgColor }}>
                    <p className="font-medium" style={{ color: mainColor }}>Pitch Plan:</p>
                    <p className="text-slate-600 mt-0.5 line-clamp-2">{company.pitchPlanning}</p>
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="px-5 py-3 bg-slate-50 flex justify-between items-center" onClick={e => e.stopPropagation()}>
                <button onClick={() => openEdit(company)} className="text-xs text-slate-500 hover:text-indigo-600 flex items-center gap-1 transition-colors">
                  <Edit2 size={12} /> Edit
                </button>
                <button onClick={async (e) => {
                  e.stopPropagation();
                  setDeletingId(company.id);
                  try {
                    await deleteMarketCompany(company.id);
                    showToast('Company deleted', 'info');
                  } catch (err: any) {
                    showToast(err.message || 'Failed to delete company', 'error');
                  } finally {
                    setDeletingId(null);
                  }
                }} disabled={deletingId === company.id} className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors disabled:opacity-50">
                  {deletingId === company.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Delete
                </button>
                <span className="text-xs text-slate-400 flex items-center gap-1">View <ChevronRight size={12} /></span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-slate-800">{editId ? 'Edit Company' : 'Add Company'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company Name *</label>
                <input type="text" value={form.companyName} onChange={e => setForm(p => ({ ...p, companyName: e.target.value }))} className={inputCls} placeholder="Company name" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
                  <input type="text" value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))} className={inputCls} placeholder="www.example.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                  <input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className={inputCls} placeholder="Phone number" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className={inputCls} placeholder="contact@company.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className={inputCls + ' resize-none'} rows={3} placeholder="About this company..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Pitch Planning</label>
                <textarea value={form.pitchPlanning} onChange={e => setForm(p => ({ ...p, pitchPlanning: e.target.value }))} className={inputCls + ' resize-none'} rows={3} placeholder="Pitch strategy and planning notes..." />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} disabled={saving} className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 text-sm hover:bg-slate-50 disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-70">
                  {saving && <Loader2 size={15} className="animate-spin" />}
                  {saving ? 'Saving...' : (editId ? 'Save Changes' : 'Add Company')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailId && detailCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-slate-800">{detailCompany.companyName}</h2>
              <button onClick={() => setDetailId(null)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"><X size={20} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {[
                { icon: Globe, label: 'Website', value: detailCompany.website },
                { icon: Phone, label: 'Phone', value: detailCompany.phone },
                { icon: Mail, label: 'Email', value: detailCompany.email },
              ].filter(f => f.value).map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 rounded-lg"><Icon size={16} className="text-indigo-600" /></div>
                  <div>
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="text-sm font-medium text-slate-800">{value}</p>
                  </div>
                </div>
              ))}

              {detailCompany.description && (
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-1">Description</p>
                  <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg">{detailCompany.description}</p>
                </div>
              )}

              {detailCompany.pitchPlanning && (
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-1">Pitch Planning</p>
                  <p className="text-sm text-slate-600 leading-relaxed bg-indigo-50 p-3 rounded-lg border border-indigo-100">{detailCompany.pitchPlanning}</p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => { setDetailId(null); openEdit(detailCompany); }}
                  className="px-4 py-2 border border-indigo-200 text-indigo-600 rounded-lg text-sm flex items-center gap-1.5 hover:bg-indigo-50">
                  <Edit2 size={14} /> Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
