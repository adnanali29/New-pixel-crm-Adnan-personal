import React, { useState } from 'react';
import { TrendingUp, DollarSign, Clock, RotateCcw, ArrowUpRight, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Order, Payment } from '../types/index';
import StatCard from '../components/StatCard';
import { formatDate, formatCurrency } from '../utils/helpers';

export default function RevenuePage() {
  const { orders } = useApp();
  const [showTransactions, setShowTransactions] = useState(false);

  // Revenue calculations
  const allPayments = orders.flatMap(o => o.payments).map(p => ({ ...p, isRefund: false }));
  const allRefunds = orders.flatMap(o => o.refundPayments).map(r => ({ ...r, isRefund: true }));
  const transactions = [...allPayments, ...allRefunds].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const netRevenue = orders.reduce((sum, o) => sum + o.paidAmount, 0);
  const totalPending = orders.filter(o => o.status === 'active').reduce((sum, o) => sum + o.pendingAmount, 0);
  const refundEvents = orders.filter(o => o.refundDue > 0 || o.refundPaid > 0).length;
  const refundPaid = orders.reduce((sum, o) => sum + o.refundPaid, 0);
  const refundDue = orders.reduce((sum, o) => sum + o.refundDue, 0);
  const transactionCount = transactions.length;

  // Group payments by order
  const orderPaymentGroups = orders
    .filter(o => o.payments.length > 0)
    .map(o => ({
      order: o,
      payments: o.payments.map((p, idx) => ({
        ...p,
        displayVersion: `T${(orders.findIndex(or => or.id === o.id) + 1).toString().padStart(3, '0')}`,
        subVersion: idx === 0 ? '' : `.${idx}`,
      }))
    }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Revenue</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="Transactions"
          value={transactionCount}
          icon={<ArrowUpRight size={20} />}
          borderColor="#4F46E5"
          bgColor="#EEF2FF"
          textColor="#4F46E5"
          onClick={() => setShowTransactions(true)}
          subtitle="Click to view all"
        />
        <StatCard
          label="Net Revenue"
          value={formatCurrency(netRevenue)}
          icon={<TrendingUp size={20} />}
          borderColor="#059669"
          bgColor="#ECFDF5"
          textColor="#059669"
          subtitle="Total collected"
        />
        <StatCard
          label="Pending"
          value={formatCurrency(totalPending)}
          icon={<Clock size={20} />}
          borderColor="#F59E0B"
          bgColor="#FFFBEB"
          textColor="#D97706"
          subtitle="To be collected"
        />
        <StatCard
          label="Refund Events"
          value={refundEvents}
          icon={<RotateCcw size={20} />}
          borderColor="#EF4444"
          bgColor="#FEF2F2"
          textColor="#EF4444"
          subtitle="Orders with refunds"
        />
        <StatCard
          label="Refund Value"
          value={formatCurrency(refundPaid)}
          icon={<DollarSign size={20} />}
          borderColor="#7C3AED"
          bgColor="#F5F3FF"
          textColor="#7C3AED"
          subtitle="Total refund amount"
        />
      </div>

      {/* Revenue Breakdown Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-sm font-bold text-slate-800">Order Revenue Breakdown</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Order #</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Company</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Paid</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Pending</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Refund</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400 italic">
                    No orders yet
                  </td>
                </tr>
              ) : orders.map(order => {
                const isDead = order.status === 'dead';
                const isPaid = order.pendingAmount === 0 && order.totalAmount > 0;
                const isPartial = order.paidAmount > 0 && order.pendingAmount > 0;
                const isPending = order.paidAmount === 0 && order.totalAmount > 0;

                let statusLabel = 'Paid';
                let statusCls = 'bg-emerald-50 text-emerald-600 border-emerald-100';

                if (isDead) {
                  statusLabel = 'Dead';
                  statusCls = 'bg-red-50 text-red-600 border-red-100';
                } else if (isPending) {
                  statusLabel = 'Pending';
                  statusCls = 'bg-indigo-50 text-indigo-600 border-indigo-100';
                } else if (isPartial) {
                  statusLabel = 'Partial';
                  statusCls = 'bg-amber-50 text-amber-600 border-amber-100';
                }

                return (
                  <tr key={order.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs font-mono font-bold text-slate-400 group-hover:text-indigo-500 transition-colors uppercase tracking-wider">
                        {order.orderNumber}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-800 uppercase tracking-tight">
                      {order.companyName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {formatDate(order.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-700">
                      {formatCurrency(order.totalAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-emerald-600">
                      {formatCurrency(order.paidAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-orange-600">
                      {formatCurrency(order.pendingAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-red-600">
                      {(order.refundDue > 0 || order.refundPaid > 0) ? formatCurrency(order.refundDue + order.refundPaid) : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter border ${statusCls}`}>
                        {statusLabel}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transactions Modal */}
      {showTransactions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-slate-800">All Transactions ({transactionCount})</h2>
              <button onClick={() => setShowTransactions(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"><X size={20} /></button>
            </div>
            <div className="px-6 py-4 space-y-4">
              {transactions.length === 0 ? (
                <p className="text-center text-slate-400 py-8">No transactions yet</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {transactions.map((t: any) => {
                    const order = orders.find(o => o.id === t.orderId);
                    return (
                      <div key={t.id} className="py-3 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${t.isRefund ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                            {t.isRefund ? <RotateCcw size={16} /> : <DollarSign size={16} />}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{order?.companyName || 'Unknown'}</p>
                            <p className="text-xs text-slate-500">{order?.orderNumber} · {formatDate(t.date)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${t.isRefund ? 'text-red-600' : 'text-emerald-700'}`}>
                            {t.isRefund ? '-' : '+'}{formatCurrency(t.amount)}
                          </p>
                          <p className="text-[10px] uppercase font-bold text-slate-400 leading-none">
                            {t.isRefund ? 'Refund' : t.type}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
