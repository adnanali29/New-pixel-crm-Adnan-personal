import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Search, Settings, LogOut, BarChart3 } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Header() {
  const { logout, enquiries, quotations, orders } = useApp();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);

  const allResults = [
    ...enquiries.map(e => ({ type: 'Enquiry', label: e.companyName, sub: e.contactName, path: '/enquiry' })),
    ...quotations.map(q => ({ type: 'Quotation', label: q.companyName, sub: q.quoteNumber, path: '/quotation' })),
    ...orders.map(o => ({ type: 'Order', label: o.companyName, sub: o.orderNumber, path: '/order' })),
  ];

  const filtered = searchQuery.length > 1
    ? allResults.filter(r => r.label.toLowerCase().includes(searchQuery.toLowerCase()) || r.sub.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-screen-2xl mx-auto px-4 h-16 flex items-center gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2 min-w-fit cursor-pointer" onClick={() => navigate('/enquiry')}>
          <img
            src="https://ibb.co/gLn6jJLX"
            alt="Pixel CRM"
            className="h-8 w-auto object-contain"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <div className="flex items-center gap-1">
            <BarChart3 className="text-indigo-600" size={22} />
            <span className="text-xl font-bold text-indigo-700 tracking-tight">PIXEL</span>
            <span className="text-xl font-bold text-slate-600 tracking-tight">CRM</span>
          </div>
        </div>

        {/* Search */}
        <div className="flex-1 max-w-lg relative mx-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search companies, quotes, orders..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setShowResults(true); }}
              onBlur={() => setTimeout(() => setShowResults(false), 200)}
              onFocus={() => setShowResults(true)}
              className="w-full pl-9 pr-4 py-3 text-base bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all"
            />
          </div>
          {showResults && filtered.length > 0 && (
            <div className="absolute top-full mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
              {filtered.slice(0, 10).map((r, i) => (
                <div
                  key={i}
                  className="px-4 py-2 hover:bg-indigo-50 cursor-pointer flex items-center gap-3"
                  onMouseDown={() => { navigate(r.path); setSearchQuery(''); }}
                >
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">{r.type}</span>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{r.label}</p>
                    <p className="text-xs text-slate-500">{r.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => navigate('/settings')}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Settings size={18} />
            <span className="hidden sm:block">Settings</span>
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={18} />
            <span className="hidden sm:block">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
