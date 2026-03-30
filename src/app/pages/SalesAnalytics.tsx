import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { Download, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/helpers';

const COLORS = ['#4F46E5', '#059669', '#F59E0B', '#EF4444', '#7C3AED', '#0EA5E9', '#F97316', '#EC4899'];

function getMonthKey(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthLabel(key: string) {
  const [y, m] = key.split('-');
  return new Date(parseInt(y), parseInt(m) - 1).toLocaleString('default', { month: 'short', year: '2-digit' });
}

export default function SalesAnalyticsPage() {
  const { enquiries, quotations, orders } = useApp();
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  // Generate last 12 months
  const months = useMemo(() => {
    const result = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      result.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return result;
  }, []);

  // Monthly data
  const monthlyData = useMemo(() => {
    return months.map(month => {
      const enq = enquiries.filter(e => getMonthKey(e.createdAt) === month).length;
      const quot = quotations.filter(q => getMonthKey(q.createdAt) === month).length;
      const ord = orders.filter(o => getMonthKey(o.createdAt) === month).length;
      const revenue = orders
        .filter(o => getMonthKey(o.createdAt) === month)
        .reduce((s, o) => s + o.paidAmount, 0);
      const pending = orders
        .filter(o => getMonthKey(o.createdAt) === month)
        .reduce((s, o) => s + o.pendingAmount, 0);
      return { month: getMonthLabel(month), key: month, enquiries: enq, quotations: quot, orders: ord, revenue, pending };
    });
  }, [months, enquiries, quotations, orders]);

  // Current vs previous month comparison
  const currentMonth = months[months.length - 1];
  const prevMonth = months[months.length - 2];
  const current = monthlyData[monthlyData.length - 1];
  const previous = monthlyData[monthlyData.length - 2];

  function pctChange(curr: number, prev: number) {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return ((curr - prev) / prev) * 100;
  }

  // Service-wise revenue
  const serviceRevenue = useMemo(() => {
    const map: Record<string, number> = {};
    orders.forEach(o => {
      o.services.filter(s => s.status === 'active').forEach(s => {
        const key = s.serviceName;
        map[key] = (map[key] || 0) + s.totalPrice * s.quantity;
      });
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [orders]);

  // Conversion funnel
  const funnel = [
    { name: 'Enquiries', value: enquiries.length, color: '#4F46E5' },
    { name: 'Quotations', value: quotations.length, color: '#059669' },
    { name: 'Orders', value: orders.length, color: '#F59E0B' },
  ];

  // Order status pie
  const orderStatus = [
    { name: 'Active', value: orders.filter(o => o.status === 'active' && o.pendingAmount > 0).length },
    { name: 'Fully Paid', value: orders.filter(o => o.pendingAmount === 0 && o.paidAmount > 0).length },
    { name: 'Dead/Lost', value: orders.filter(o => o.status === 'dead').length },
    { name: 'Refund Due', value: orders.filter(o => o.refundDue > 0).length },
  ].filter(d => d.value > 0);

  function downloadData() {
    const rows = monthlyData.map(m => `${m.month},${m.enquiries},${m.quotations},${m.orders},${m.revenue.toFixed(2)},${m.pending.toFixed(2)}`);
    const csv = ['Month,Enquiries,Quotations,Orders,Revenue,Pending', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'sales_analytics.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  function TrendIcon({ val }: { val: number }) {
    if (val > 0) return <TrendingUp size={16} className="text-emerald-600" />;
    if (val < 0) return <TrendingDown size={16} className="text-red-500" />;
    return <Minus size={16} className="text-slate-400" />;
  }

  function CompareCard({ label, curr, prev, prefix = '' }: { label: string; curr: number; prev: number; prefix?: string }) {
    const pct = pctChange(curr, prev);
    return (
      <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-all border-l-4" style={{ borderLeftColor: pct >= 0 ? '#059669' : '#EF4444' }}>
        <p className="text-xs text-slate-500 mb-1">{label}</p>
        <p className="text-xl font-bold text-slate-800">{prefix}{typeof curr === 'number' && curr > 1000 ? formatCurrency(curr) : curr}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <TrendIcon val={pct} />
          <span className={`text-xs font-medium ${pct > 0 ? 'text-emerald-600' : pct < 0 ? 'text-red-500' : 'text-slate-400'}`}>
            {pct > 0 ? '+' : ''}{pct.toFixed(1)}% vs prev month
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-0.5">Prev: {prefix}{typeof prev === 'number' && prev > 1000 ? formatCurrency(prev) : prev}</p>
      </div>
    );
  }

  const customTooltipStyle = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, padding: '8px 12px', fontSize: 12 };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-800">Sales Analytics</h1>
        <button onClick={downloadData} className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-sm">
          <Download size={15} /> Export CSV
        </button>
      </div>

      {/* Month Comparison Cards */}
      <div>
        <p className="text-sm font-semibold text-slate-600 mb-3">Month-over-Month Comparison (Current vs Previous Month)</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <CompareCard label="Enquiries" curr={current?.enquiries || 0} prev={previous?.enquiries || 0} />
          <CompareCard label="Quotations" curr={current?.quotations || 0} prev={previous?.quotations || 0} />
          <CompareCard label="Orders" curr={current?.orders || 0} prev={previous?.orders || 0} />
          <CompareCard label="Revenue" curr={current?.revenue || 0} prev={previous?.revenue || 0} />
        </div>
      </div>

      {/* Revenue Trend */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Revenue Trend (12 Months)</h2>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={monthlyData}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="pendGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} />
            <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
            <Tooltip contentStyle={customTooltipStyle} formatter={(v: any) => formatCurrency(v)} />
            <Legend />
            <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#4F46E5" fill="url(#revGrad)" strokeWidth={2.5} />
            <Area type="monotone" dataKey="pending" name="Pending" stroke="#F59E0B" fill="url(#pendGrad)" strokeWidth={2} strokeDasharray="5 5" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Enquiry / Quote / Order Trend */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Pipeline Activity (12 Months)</h2>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} />
            <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} />
            <Tooltip contentStyle={customTooltipStyle} />
            <Legend />
            <Bar dataKey="enquiries" name="Enquiries" fill="#4F46E5" radius={[4, 4, 0, 0]} />
            <Bar dataKey="quotations" name="Quotations" fill="#059669" radius={[4, 4, 0, 0]} />
            <Bar dataKey="orders" name="Orders" fill="#F59E0B" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Service Revenue Pie */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Revenue by Service</h2>
          {serviceRevenue.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-400">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={serviceRevenue} cx="50%" cy="50%" outerRadius={90} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {serviceRevenue.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={customTooltipStyle} formatter={(v: any) => formatCurrency(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Order Status Pie + Funnel */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-800">Order Status Distribution</h2>
          {orderStatus.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-400">No orders yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <Pie
                  data={orderStatus}
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                  nameKey="name"
                >
                  {orderStatus.map((_, i) => <Cell key={i} fill={['#059669', '#4F46E5', '#EF4444', '#F59E0B'][i % 4]} stroke="none" />)}
                </Pie>
                <Tooltip contentStyle={customTooltipStyle} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          )}

          {/* Conversion Funnel */}
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">Conversion Funnel</p>
            <div className="space-y-2">
              {funnel.map((item, i) => {
                const maxVal = Math.max(...funnel.map(f => f.value), 1);
                const pct = (item.value / maxVal) * 100;
                const conv = i > 0 ? funnel[i - 1].value > 0 ? ((item.value / funnel[i - 1].value) * 100).toFixed(0) : '0' : '100';
                return (
                  <div key={item.name}>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="text-slate-700 font-medium">{item.name}</span>
                      <span className="text-slate-500">{item.value} ({conv}%)</span>
                    </div>
                    <div className="h-6 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full flex items-center pl-3 text-white text-xs font-medium transition-all"
                        style={{ width: `${Math.max(pct, 10)}%`, background: item.color }}>
                        {item.value}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-base font-semibold text-slate-800">Monthly Data Table</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Month</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Enquiries</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Quotations</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Orders</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Revenue</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Pending</th>
              </tr>
            </thead>
            <tbody>
              {monthlyData.map((row, i) => (
                <tr key={row.key} className={`border-b border-slate-50 hover:bg-slate-50 ${i === monthlyData.length - 1 ? 'bg-indigo-50/30 font-medium' : ''}`}>
                  <td className="px-4 py-3 text-slate-700">{row.month} {i === monthlyData.length - 1 ? '(Current)' : ''}</td>
                  <td className="px-4 py-3 text-right">{row.enquiries}</td>
                  <td className="px-4 py-3 text-right">{row.quotations}</td>
                  <td className="px-4 py-3 text-right">{row.orders}</td>
                  <td className="px-4 py-3 text-right text-emerald-700">{formatCurrency(row.revenue)}</td>
                  <td className="px-4 py-3 text-right text-orange-600">{formatCurrency(row.pending)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
