import React from 'react';
import { NavLink } from 'react-router';
import { FileQuestion, FileText, ShoppingCart, TrendingUp, BarChart2, Search } from 'lucide-react';

const navItems = [
  { label: 'Enquiry', path: '/enquiry', icon: FileQuestion },
  { label: 'Quotation', path: '/quotation', icon: FileText },
  { label: 'Order', path: '/order', icon: ShoppingCart },
  { label: 'Revenue', path: '/revenue', icon: TrendingUp },
  { label: 'Sales Analytics', path: '/analytics', icon: BarChart2 },
  { label: 'Market Research', path: '/market-research', icon: Search },
];

export default function NavBar() {
  return (
    <nav className="bg-white border-b border-slate-200 shadow-sm sticky top-16 z-40">
      <div className="max-w-screen-2xl mx-auto px-4">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {navItems.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
                  isActive
                    ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                    : 'border-transparent text-slate-600 hover:text-indigo-600 hover:border-indigo-300 hover:bg-slate-50'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}
