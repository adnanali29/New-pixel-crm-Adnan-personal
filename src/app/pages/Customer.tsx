import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2, Users, Building, Mail, Phone, Globe, FileText, MapPin, ChevronDown, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { Customer } from '../types/index';
import StatCard from '../components/StatCard';
import { getCountries, getStatesForCountry } from '../utils/countryData';
import { useNavigate } from 'react-router';

const GST_SLABS = [0, 5, 18, 28];

interface CustomerFormData {
  pocName: string;
  companyName: string;
  companyEmail: string;
  companyNumber: string;
  companyAddress: string;
  website: string;
  notes: string;
  gstNumber: string;
  gstSlab: number;
  taxType: 'Inclusive' | 'Exclusive';
  country: string;
  state: string;
}

const emptyForm: CustomerFormData = {
  pocName: '',
  companyName: '',
  companyEmail: '',
  companyNumber: '',
  companyAddress: '',
  website: '',
  notes: '',
  gstNumber: '',
  gstSlab: 18,
  taxType: 'Exclusive',
  country: 'India',
  state: '',
};

export default function CustomerPage() {
  const { customers = [], addCustomer, updateCustomer, deleteCustomer } = useApp();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CustomerFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const countries = getCountries();

  const filteredCustomers = customers.filter(c =>
    c.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.pocName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.companyEmail && c.companyEmail.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.companyNumber && c.companyNumber.includes(searchTerm))
  );

  function openAdd() {
    setEditId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(c: Customer) {
    setEditId(c.id);
    setForm({
      pocName: c.pocName,
      companyName: c.companyName,
      companyEmail: c.companyEmail || '',
      companyNumber: c.companyNumber || '',
      companyAddress: c.companyAddress || '',
      website: c.website || '',
      notes: c.notes || '',
      gstNumber: c.gstNumber || '',
      gstSlab: c.gstSlab || 18,
      taxType: c.taxType || 'Exclusive',
      country: c.country || 'India',
      state: c.state || '',
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.companyName.trim() || !form.pocName.trim()) {
      showToast('Company Name and POC Name are required.', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editId) {
        await updateCustomer(editId, form);
        showToast('Customer details updated successfully!');
      } else {
        await addCustomer(form);
        showToast('Customer added successfully!');
      }
      setShowForm(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to save customer', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteCustomer(id);
      showToast('Customer deleted.');
      setDeleteConfirmId(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to delete customer', 'error');
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Customers</h1>
          <p className="text-slate-500 text-sm">Manage customer contacts, addresses, and tax details</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm transition-all text-sm"
        >
          <Plus size={18} />
          Add Customer
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Customers" value={customers.length.toString()} icon={Users} color="blue" />
        <StatCard
          title="Registered GST Accounts"
          value={customers.filter(c => Boolean(c.gstNumber)).length.toString()}
          icon={Building}
          color="green"
        />
        <StatCard
          title="Countries Represented"
          value={new Set(customers.map(c => c.country || 'India')).size.toString()}
          icon={Globe}
          color="purple"
        />
      </div>

      {/* Search & Actions */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search by company name, POC, email or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Company & POC</th>
                <th className="px-6 py-4">Contact Info</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">GST / Tax Info</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <Users size={36} className="mx-auto mb-2 opacity-50" />
                    <p className="font-medium text-slate-600">No customers found</p>
                    <p className="text-xs text-slate-400">Add a customer to get started</p>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800">{c.companyName}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Users size={12} className="text-indigo-500" />
                        POC: {c.pocName}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {c.companyEmail && (
                        <div className="text-xs text-slate-600 flex items-center gap-1">
                          <Mail size={12} className="text-slate-400" />
                          {c.companyEmail}
                        </div>
                      )}
                      {c.companyNumber && (
                        <div className="text-xs text-slate-600 flex items-center gap-1 mt-0.5">
                          <Phone size={12} className="text-slate-400" />
                          {c.companyNumber}
                        </div>
                      )}
                      {c.website && (
                        <a
                          href={c.website.startsWith('http') ? c.website : `https://${c.website}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-indigo-600 hover:underline flex items-center gap-1 mt-0.5"
                        >
                          <Globe size={12} />
                          {c.website}
                        </a>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-slate-700 font-medium">
                        {[c.state, c.country].filter(Boolean).join(', ') || 'India'}
                      </div>
                      {c.companyAddress && (
                        <div className="text-xs text-slate-400 truncate max-w-xs mt-0.5">
                          {c.companyAddress}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {c.gstNumber ? (
                        <div>
                          <span className="inline-block px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-xs font-mono font-medium">
                            {c.gstNumber}
                          </span>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {c.gstSlab}% ({c.taxType})
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">No GST</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate('/enquiry', { state: { preselectCustomer: c } })}
                          className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-medium rounded transition-colors"
                          title="Create Enquiry for this customer"
                        >
                          + Enquiry
                        </button>
                        <button
                          onClick={() => openEdit(c)}
                          className="p-1.5 hover:bg-slate-100 text-slate-600 rounded transition-colors"
                          title="Edit Customer"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(c.id)}
                          className="p-1.5 hover:bg-red-50 text-red-500 rounded transition-colors"
                          title="Delete Customer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Customer Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  {editId ? 'Edit Customer Details' : 'Add New Customer'}
                </h3>
                <p className="text-xs text-slate-500">
                  Fill in customer contact, address, and GST details
                </p>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Company Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Corporation"
                    value={form.companyName}
                    onChange={(e) => setForm(p => ({ ...p, companyName: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">POC Name (Contact Person) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={form.pocName}
                    onChange={(e) => setForm(p => ({ ...p, pocName: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Company Email</label>
                  <input
                    type="email"
                    placeholder="contact@company.com"
                    value={form.companyEmail}
                    onChange={(e) => setForm(p => ({ ...p, companyEmail: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Company Phone / Mobile</label>
                  <input
                    type="tel"
                    placeholder="+91 9876543210"
                    value={form.companyNumber}
                    onChange={(e) => setForm(p => ({ ...p, companyNumber: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Website (Optional)</label>
                  <input
                    type="url"
                    placeholder="https://example.com"
                    value={form.website}
                    onChange={(e) => setForm(p => ({ ...p, website: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Country</label>
                  <select
                    value={form.country}
                    onChange={(e) => setForm(p => ({ ...p, country: e.target.value, state: '' }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                  >
                    {countries.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">State / Province</label>
                  {getStatesForCountry(form.country).length > 0 ? (
                    <select
                      value={form.state}
                      onChange={(e) => setForm(p => ({ ...p, state: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                    >
                      <option value="">Select State</option>
                      {getStatesForCountry(form.country).map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="State / Region"
                      value={form.state}
                      onChange={(e) => setForm(p => ({ ...p, state: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                  )}
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Company Address</label>
                  <input
                    type="text"
                    placeholder="Full street address"
                    value={form.companyAddress}
                    onChange={(e) => setForm(p => ({ ...p, companyAddress: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
              </div>

              {/* GST Details Box */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="font-semibold text-slate-700 text-xs uppercase tracking-wider">
                  GST & Tax Details
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">GST Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 29ABCDE1234F1Z5"
                      value={form.gstNumber}
                      onChange={(e) => setForm(p => ({ ...p, gstNumber: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">GST Slab (%)</label>
                    <select
                      value={form.gstSlab}
                      onChange={(e) => setForm(p => ({ ...p, gstSlab: Number(e.target.value) }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                    >
                      {GST_SLABS.map(s => (
                        <option key={s} value={s}>{s}%</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Tax Type</label>
                    <select
                      value={form.taxType}
                      onChange={(e) => setForm(p => ({ ...p, taxType: e.target.value as any }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                    >
                      <option value="Exclusive">Exclusive</option>
                      <option value="Inclusive">Inclusive</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Notes / Preferences</label>
                <textarea
                  rows={2}
                  placeholder="Additional notes about customer requirements..."
                  value={form.notes}
                  onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm text-sm flex items-center gap-2"
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  {editId ? 'Save Changes' : 'Add Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Delete Customer?</h3>
            <p className="text-slate-600 text-sm">
              Are you sure you want to delete this customer? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg shadow-sm text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
