import React, { useState } from 'react';
import { Edit2, XCircle, RotateCcw, CheckCircle, Download, FileText, DollarSign, ShoppingCart, AlertCircle, Trash2, Plus, ChevronDown, ArrowUpRight, TrendingUp, Clock, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { Order, OrderService, QuotationItem } from '../types/index';
import StatCard from '../components/StatCard';
import ServiceSelector from '../components/ServiceSelector';
import { formatDate, formatCurrency, generateId } from '../utils/helpers';
import { generatePOPDF, generatePIPDF, generateTaxInvoicePDF } from '../utils/pdfUtils';

const inputCls = "w-full border border-slate-200 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 bg-white transition-all";
const GST_SLABS = [0, 5, 18, 28];

export default function OrderPage() {
  const { orders, updateOrder, markOrderPaid, cancelOrderServices, processRefund, deadOrder, restoreOrder, deleteOrder, settings, services } = useApp();
  const { showToast } = useToast();
  const [tab, setTab] = useState<'active' | 'dead'>('active');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [payId, setPayId] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [refundId, setRefundId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const active = orders.filter(o => o.status === 'active');
  const dead = orders.filter(o => o.status === 'dead');

  // Calculate displayed items for the dead tab: all dead orders + individual canceled services from active orders
  const canceledServices = orders.flatMap(o =>
    o.status === 'active'
      ? o.services.filter(s => s.status === 'canceled').map(s => ({ ...s, parentOrder: o }))
      : []
  );

  const displayed = tab === 'active' ? active : dead;
  const displayedServices = tab === 'dead' ? canceledServices : [];
  // Order stats (same as Revenue for consistency)
  const allPayments = orders.flatMap(o => o.payments);
  const allRefunds = orders.flatMap(o => o.refundPayments);
  const transactionCount = allPayments.length + allRefunds.length;
  const netRevenue = orders.reduce((sum, o) => sum + o.paidAmount, 0);
  const totalPending = active.reduce((sum, o) => sum + o.pendingAmount, 0);
  const refundPaid = orders.reduce((sum, o) => sum + o.refundPaid, 0);
  const refundDue = orders.reduce((sum, o) => sum + o.refundDue, 0);
  const refundEvents = orders.filter(o => o.refundDue > 0 || o.refundPaid > 0).length;

  const detailOrder = orders.find(o => o.id === detailId);
  const payOrder = payId ? orders.find((o) => o.id === payId) : null;
  const cancelOrder = orders.find(o => o.id === cancelId);
  const refundOrder = orders.find(o => o.id === refundId);
  const editOrder = orders.find(o => o.id === editId);

  return (
    <div className="space-y-6">
      {/* Title Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-2xl font-bold text-slate-800">Order</h1>
          <div className="flex rounded-lg overflow-hidden border border-slate-200">
            <button onClick={() => setTab('active')} className={`px-4 py-1.5 text-sm font-medium transition-colors ${tab === 'active' ? 'bg-amber-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
              Active ({active.length})
            </button>
            <button onClick={() => setTab('dead')} className={`px-4 py-1.5 text-sm font-medium transition-colors ${tab === 'dead' ? 'bg-red-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
              Dead ({dead.length + canceledServices.length})
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard
          label="Total Orders"
          value={orders.length}
          icon={<ShoppingCart size={20} />}
          borderColor="#4F46E5"
          bgColor="#EEF2FF"
          textColor="#4F46E5"
          subtitle="All received orders"
        />
        <StatCard
          label="Active Orders"
          value={active.length}
          icon={<ShoppingCart size={20} />}
          borderColor="#059669"
          bgColor="#ECFDF5"
          textColor="#059669"
          subtitle="Processing/Invoiced"
        />
        <StatCard
          label="Dead / Lost"
          value={dead.length}
          icon={<XCircle size={20} />}
          borderColor="#EF4444"
          bgColor="#FEF2F2"
          textColor="#EF4444"
          subtitle="Cancelled orders"
        />
        <StatCard
          label="Active Order Value"
          value={formatCurrency(active.reduce((sum, o) => sum + o.totalAmount, 0))}
          icon={<DollarSign size={20} />}
          borderColor="#F59E0B"
          bgColor="#FFFBEB"
          textColor="#D97706"
          subtitle="Total pipeline value"
        />
      </div>

      {/* Order Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {tab === 'active' && active.length === 0 && (
          <div className="col-span-full text-center py-16 text-slate-400 font-medium bg-white rounded-2xl border border-dashed border-slate-200">
            No active orders found
          </div>
        )}

        {tab === 'dead' && dead.length === 0 && canceledServices.length === 0 && (
          <div className="col-span-full text-center py-16 text-slate-400 font-medium bg-white rounded-2xl border border-dashed border-slate-200">
            No cancelled orders or services
          </div>
        )}

        {/* Regular Order Cards */}
        {displayed.map(order => (
          <OrderCard
            key={order.id}
            order={order}
            onDetail={() => setDetailId(order.id)}
            onPay={() => setPayId(order.id)}
            onCancel={() => setCancelId(order.id)}
            onRefund={() => setRefundId(order.id)}
            onEdit={() => setEditId(order.id)}
            onRestore={async () => {
              setActionId(order.id);
              try {
                await restoreOrder(order.id);
                showToast('Order restored successfully');
              } catch (err: any) {
                showToast(err.message || 'Failed to restore order', 'error');
              } finally {
                setActionId(null);
              }
            }}
            onDelete={async () => {
              if (window.confirm('Permanently delete this order?')) {
                setActionId(order.id);
                try {
                  await deleteOrder(order.id);
                  showToast('Order permanently deleted', 'info');
                } catch (err: any) {
                  showToast(err.message || 'Failed to delete order', 'error');
                } finally {
                  setActionId(null);
                }
              }
            }}
            onDownloadPO={() => generatePOPDF(order, settings.poPdfSettings)}
            onDownloadPI={() => generatePIPDF(order, settings.piPdfSettings)}
            onDownloadTax={() => generateTaxInvoicePDF(order, settings.taxInvoicePdfSettings)}
          />
        ))}

        {/* Individual Dead Service Cards */}
        {tab === 'dead' && displayedServices.map((svc: any) => (
          <DeadServiceCard
            key={svc.id}
            service={svc}
            order={svc.parentOrder}
            onRefund={() => setRefundId(svc.parentOrder.id)}
          />
        ))}
      </div>

      {/* Detail Modal */}
      {detailId && detailOrder && (
        <OrderDetailModal
          order={detailOrder}
          onClose={() => setDetailId(null)}
          onEdit={() => { setDetailId(null); setEditId(detailId); }}
          onPI={() => generatePIPDF(detailOrder, settings.piPdfSettings)}
        />
      )}

      {/* Payment Modal */}
      {payId && payOrder && (
        <PaymentModal
          order={payOrder}
          onClose={() => setPayId(null)}
          onSubmit={async (amount: number, type: 'full' | 'partial', notes?: string) => {
            try {
              await markOrderPaid(payId!, amount, type, notes);
              showToast(`Payment of ₹${amount.toFixed(2)} recorded successfully`);
              setPayId(null);
            } catch (err: any) {
              showToast(err.message || 'Failed to record payment', 'error');
            }
          }}
        />
      )}

      {/* Cancel Services Modal */}
      {cancelId && cancelOrder && (
        <CancelServicesModal
          order={cancelOrder}
          onClose={() => setCancelId(null)}
          onConfirm={async (ids: string[]) => {
            try {
              await cancelOrderServices(cancelId!, ids);
              showToast('Services cancelled and amounts updated', 'info');
              setCancelId(null);
            } catch (err: any) {
              showToast(err.message || 'Failed to cancel services', 'error');
            }
          }}
        />
      )}

      {/* Refund Modal */}
      {refundId && refundOrder && (
        <RefundModal
          order={refundOrder}
          onClose={() => setRefundId(null)}
          onSubmit={async (amount: number, notes?: string) => {
            try {
              await processRefund(refundId!, amount, notes);
              showToast(`Refund of ₹${amount.toFixed(2)} processed successfully`);
              setRefundId(null);
            } catch (err: any) {
              showToast(err.message || 'Failed to process refund', 'error');
            }
          }}
        />
      )}

      {/* Edit Modal */}
      {editId && editOrder && (
        <EditOrderModal
          order={editOrder}
          onClose={() => setEditId(null)}
          onSave={async (services: OrderService[]) => {
            try {
              const activeServices = services.filter((s) => s.status === 'active');
              const totalAmount = activeServices.reduce((sum: number, s: any) => sum + s.totalPrice * s.quantity, 0);
              const baseAmount = activeServices.reduce((sum: number, s: any) => sum + s.basePrice * s.quantity, 0);
              const gstAmount = activeServices.reduce((sum: number, s: any) => sum + s.gstAmount * s.quantity, 0);
              const pendingAmount = Math.max(0, totalAmount - editOrder.paidAmount);
              const refundDue = Math.max(0, editOrder.paidAmount - totalAmount);
              await updateOrder(editId!, { services, totalAmount, baseAmount, gstAmount, pendingAmount, refundDue });
              showToast('Order updated successfully');
              setEditId(null);
            } catch (err: any) {
              showToast(err.message || 'Failed to update order', 'error');
            }
          }}
        />
      )}
    </div>
  );
}

function OrderCard({ order, onDetail, onPay, onCancel, onRefund, onEdit, onRestore, onDelete, onDownloadPO, onDownloadPI, onDownloadTax }: any) {
  const baseAmount = Number(order.baseAmount) || 0;
  const gstAmount = Number(order.gstAmount) || 0;
  const totalAmount = Number(order.totalAmount) || 0;
  const paidAmount = Number(order.paidAmount) || 0;
  const pendingAmount = Number(order.pendingAmount) || 0;
  const refundDue = Number(order.refundDue) || 0;
  const paidPct = totalAmount > 0 ? Math.min(100, (paidAmount / totalAmount) * 100) : 0;
  const activeServices = (order.services || []).filter((s: OrderService) => s.status === 'active');

  return (
    <div
      className="bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-pointer overflow-hidden"
      style={{ borderLeftWidth: 4, borderLeftColor: order.status === 'dead' ? '#EF4444' : order.refundDue > 0 ? '#F59E0B' : order.pendingAmount === 0 ? '#059669' : '#4F46E5' }}
      onClick={onDetail}
    >
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="font-semibold text-slate-800 leading-tight">{order.companyName}</p>
            <p className="text-xs text-slate-500">{order.contactName} · {formatDate(order.date)}</p>
          </div>
          <span className="text-xs font-mono text-slate-400">{order.orderNumber}</span>
        </div>

        {/* Services */}
        <div className="space-y-1">
          {activeServices.slice(0, 2).map((s: OrderService) => (
            <div key={s.id} className="flex justify-between items-center text-xs">
              <span className="text-slate-600">{s.serviceName} / {s.subServiceName}</span>
              <span className="font-medium text-slate-700">₹{(s.totalPrice * s.quantity).toFixed(0)}</span>
            </div>
          ))}
          {activeServices.length > 2 && <p className="text-xs text-slate-400">+{activeServices.length - 2} more services</p>}
        </div>

        {/* Amounts */}
        <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-50">
          <div className="text-center">
            <p className="text-xs text-slate-500">Base</p>
            <p className="text-xs font-medium text-slate-700">₹{baseAmount.toFixed(0)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500">GST</p>
            <p className="text-xs font-medium text-slate-700">₹{gstAmount.toFixed(0)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500">Total</p>
            <p className="text-xs font-bold text-indigo-700">₹{totalAmount.toFixed(0)}</p>
          </div>
        </div>

        {/* Payment Status */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="text-emerald-600 font-medium">Paid: ₹{paidAmount.toFixed(0)}</span>
            <span className="text-orange-600 font-medium">Pending: ₹{pendingAmount.toFixed(0)}</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${paidPct}%`, background: paidPct === 100 ? '#059669' : 'linear-gradient(to right, #4F46E5, #7C3AED)' }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-1 text-right">{paidPct.toFixed(0)}% paid</p>
        </div>

        {refundDue > 0 && (
          <div className="flex items-center gap-1.5 p-2 bg-amber-50 rounded-lg text-xs text-amber-700">
            <AlertCircle size={13} /> Refund Due: ₹{refundDue.toFixed(2)}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="px-4 pb-4 flex flex-wrap gap-1.5" onClick={e => e.stopPropagation()}>
        {order.status === 'active' ? (
          <>
            <button onClick={onEdit} className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition-colors"><Edit2 size={12} /> Edit</button>
            {order.pendingAmount > 0 && <button onClick={onPay} className="flex items-center gap-1 px-2 py-1 text-xs bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200 transition-colors"><CheckCircle size={12} /> Pay</button>}
            {order.refundDue > 0 && (
              <button
                onClick={onRefund}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-amber-500 text-white rounded hover:bg-amber-600 transition-colors shadow-sm animate-pulse"
              >
                <DollarSign size={12} /> Refund
              </button>
            )}
            <button onClick={onDownloadPO} className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"><Download size={12} /> PO</button>
            <button onClick={onDownloadPI} className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"><FileText size={12} /> PI</button>
            <button onClick={onDownloadTax} className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"><FileText size={12} /> Tax</button>
            <button onClick={onCancel} className="flex items-center gap-1 px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"><XCircle size={12} /> Cancel</button>
          </>
        ) : (
          <div className="flex flex-wrap gap-1.5 w-full">
            <button onClick={onRestore} className="flex-1 flex justify-center items-center gap-1 px-3 py-2 text-xs bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors uppercase font-bold tracking-wider"><RotateCcw size={12} /> Restore Order</button>
            {order.paidAmount > 0 && (
              <button
                onClick={onRefund}
                className="flex-1 flex justify-center items-center gap-1 px-3 py-2 text-xs bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors shadow-sm uppercase font-bold tracking-wider"
              >
                <DollarSign size={12} /> Refund All (₹{order.paidAmount})
              </button>
            )}
            <button onClick={onDelete} className="w-full flex justify-center items-center gap-1 px-3 py-1.5 text-[10px] bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors border border-red-100"><Trash2 size={10} /> Permanent Delete</button>
          </div>
        )}
      </div>
    </div>
  );
}

function DeadServiceCard({ service, order, onRefund }: any) {
  const { restoreOrderService } = useApp();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  return (
    <div className="bg-white rounded-xl border-l-4 border-red-500 border-y border-r border-slate-200 shadow-sm overflow-hidden flex flex-col">
      <div className="p-4 flex-1 space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded uppercase tracking-wider mb-1 inline-block">Canceled Service</span>
            <p className="font-bold text-slate-800 leading-tight">{service.serviceName}</p>
            <p className="text-[11px] text-slate-500">{service.subServiceName}</p>
          </div>
          <p className="text-[10px] font-mono text-slate-400">{order.orderNumber}</p>
        </div>

        <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1">
          <div className="flex justify-between text-slate-600 italic">
            <span>Client:</span>
            <span>{order.companyName}</span>
          </div>
          <div className="flex justify-between font-bold text-slate-800 pt-1 border-t border-slate-100">
            <span>Value:</span>
            <span>₹{(service.totalPrice * service.quantity).toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="px-4 pb-4 flex flex-col gap-1.5">
        <div className="flex gap-1.5">
          <button
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              try {
                await restoreOrderService(order.id, service.id);
                showToast('Service restored to active order');
              } catch (err: any) {
                showToast(err.message || 'Failed to restore service', 'error');
              } finally {
                setLoading(false);
              }
            }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-50 text-emerald-700 text-[11px] font-bold rounded-lg hover:bg-emerald-100 transition-all border border-emerald-100 uppercase tracking-wide"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />} Restore
          </button>
          {order.refundDue > 0 && (
            <button
              onClick={onRefund}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-amber-500 text-white text-[11px] font-bold rounded-lg hover:bg-amber-600 transition-all shadow-md shadow-amber-100 uppercase tracking-wide"
            >
              <DollarSign size={12} /> Refund
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function PaymentModal({ order, onClose, onSubmit }: any) {
  const [type, setType] = useState<'full' | 'partial'>('full');
  const [amount, setAmount] = useState(order.pendingAmount.toFixed(2));
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  function handleSubmit() {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { setError('Enter a valid amount.'); return; }
    if (amt > order.pendingAmount) {
      setError(`Amount cannot exceed pending amount of ₹${order.pendingAmount.toFixed(2)}`);
      return;
    }
    setError('');
    onSubmit(amt, type, notes);
  }

  return (
    <Modal title="Mark Payment" onClose={onClose}>
      <div className="space-y-4">
        <div className="p-3 bg-slate-50 rounded-lg grid grid-cols-2 gap-3 text-sm">
          <div><p className="text-xs text-slate-500">Order Total</p><p className="font-semibold">{formatCurrency(order.totalAmount)}</p></div>
          <div><p className="text-xs text-slate-500">Already Paid</p><p className="font-semibold text-emerald-700">{formatCurrency(order.paidAmount)}</p></div>
          <div><p className="text-xs text-slate-500">Pending</p><p className="font-semibold text-orange-600">{formatCurrency(order.pendingAmount)}</p></div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => { setType('full'); setAmount(order.pendingAmount.toFixed(2)); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium border-2 transition-all ${type === 'full' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600'}`}
          >
            Full Payment
          </button>
          <button
            onClick={() => { setType('partial'); setAmount(''); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium border-2 transition-all ${type === 'partial' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600'}`}
          >
            Partial Payment
          </button>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700 mb-1 block">
            Amount (₹) — Max: ₹{order.pendingAmount.toFixed(2)}
          </label>
          <input
            type="number" min="0.01" max={order.pendingAmount} step="0.01"
            value={amount} onChange={e => { setAmount(e.target.value); setError(''); }}
            className={inputCls}
          />
          {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700 mb-1 block">Notes (Optional)</label>
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className={inputCls} placeholder="Transaction reference..." />
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 text-sm hover:bg-slate-50">Cancel</button>
          <button onClick={handleSubmit} className="px-6 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">Confirm Payment</button>
        </div>
      </div>
    </Modal>
  );
}

function CancelServicesModal({ order, onClose, onConfirm }: any) {
  const [selected, setSelected] = useState<string[]>([]);
  const activeServices = order.services.filter((s: OrderService) => s.status === 'active');

  function toggle(id: string) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  const canceledAmt = order.services
    .filter((s: OrderService) => selected.includes(s.id))
    .reduce((sum: number, s: OrderService) => sum + s.totalPrice * s.quantity, 0);
  const newTotal = order.totalAmount - canceledAmt;
  const newRefund = Math.max(0, order.paidAmount - newTotal);
  const newPending = Math.max(0, newTotal - order.paidAmount);

  return (
    <Modal title="Cancel Services" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-slate-600">Select which services to cancel:</p>

        <div className="space-y-2">
          {activeServices.map((s: OrderService) => (
            <label key={s.id} className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${selected.includes(s.id) ? 'border-red-300 bg-red-50' : 'border-slate-200 hover:border-slate-300'}`}>
              <input type="checkbox" checked={selected.includes(s.id)} onChange={() => toggle(s.id)} className="w-4 h-4" />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-800">{s.serviceName} / {s.subServiceName}</p>
                <p className="text-xs text-slate-500">Qty: {s.quantity} · Total: ₹{(s.totalPrice * s.quantity).toFixed(2)}</p>
              </div>
            </label>
          ))}
        </div>

        {selected.length > 0 && (
          <div className="p-3 bg-slate-50 rounded-lg text-sm space-y-1">
            <div className="flex justify-between"><span className="text-slate-600">Amount Canceling:</span><span className="text-red-600 font-medium">-₹{canceledAmt.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-slate-600">New Order Total:</span><span className="font-medium">₹{newTotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-slate-600">Paid Amount:</span><span className="text-emerald-700 font-medium">₹{order.paidAmount.toFixed(2)}</span></div>
            {newRefund > 0 && <div className="flex justify-between"><span className="text-amber-600 font-medium">Refund Due:</span><span className="text-amber-700 font-bold">₹{newRefund.toFixed(2)}</span></div>}
            {newPending > 0 && <div className="flex justify-between"><span className="text-orange-600">New Pending:</span><span className="text-orange-700 font-medium">₹{newPending.toFixed(2)}</span></div>}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 text-sm">Cancel</button>
          <button onClick={() => onConfirm(selected)} disabled={selected.length === 0}
            className="px-6 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50">
            Confirm Cancellation
          </button>
        </div>
      </div>
    </Modal>
  );
}

function RefundModal({ order, onClose, onSubmit }: any) {
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  function handleSubmit() {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { setError('Enter a valid amount.'); return; }
    if (amt > order.refundDue) {
      setError(`Refund cannot exceed the excess amount of ${formatCurrency(order.refundDue)}`);
      return;
    }
    setError('');
    onSubmit(amt, notes);
  }

  return (
    <Modal title="Process Refund" onClose={onClose}>
      <div className="space-y-4">
        <div className="p-4 bg-slate-50 rounded-xl grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Order Total</p>
            <p className="font-bold text-slate-800">{formatCurrency(order.totalAmount)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Total Paid</p>
            <p className="font-bold text-emerald-700">{formatCurrency(order.paidAmount)}</p>
          </div>
          {order.refundDue > 0 && (
            <div className="col-span-2 p-3 bg-amber-50 border border-amber-100 rounded-lg">
              <p className="text-xs font-semibold text-amber-800">Excess Payment Detected</p>
              <p className="text-xs text-amber-700 mt-0.5">The client has paid {formatCurrency(order.refundDue)} more than the current order total.</p>
            </div>
          )}
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700 mb-1.5 block">
            Refund Amount (₹) — Max: {formatCurrency(order.refundDue)}
          </label>
          <input
            type="number"
            min="0.01"
            max={order.refundDue}
            step="0.01"
            value={amount}
            onChange={e => { setAmount(e.target.value); setError(''); }}
            onFocus={(e) => e.target.select()}
            placeholder="0.00"
            className={inputCls}
            autoFocus
          />
          {error && <p className="text-xs text-red-600 mt-1.5 font-medium">{error}</p>}
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700 mb-1.5 block">Reason / Notes</label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className={inputCls}
            placeholder="e.g., Client requested cancellation..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="px-5 py-2.5 border border-slate-200 rounded-lg text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={handleSubmit} className="px-7 py-2.5 bg-amber-500 text-white rounded-lg text-sm font-bold hover:bg-amber-600 transition-all shadow-lg shadow-amber-100">Process Refund</button>
        </div>
      </div>
    </Modal>
  );
}

function EditOrderModal({ order, onClose, onSave }: any) {
  const { services } = useApp();
  const [items, setItems] = useState(
    order.services.map((s: any) => ({
      ...s,
      inputPrice: order.taxType === 'Inclusive' ? s.totalPrice.toString() : s.basePrice.toString()
    }))
  );

  function calcItem(price: number, gstRate: number) {
    if (order.taxType === 'Exclusive') {
      const gst = price * gstRate / 100;
      return { basePrice: price, gstAmount: gst, totalPrice: price + gst };
    } else {
      const base = price / (1 + gstRate / 100);
      return { basePrice: base, gstAmount: price - base, totalPrice: price };
    }
  }

  function updateItem(idx: number, field: string, value: any) {
    setItems((prev: any[]) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      if (field === 'inputPrice' || field === 'gstRate') {
        const price = parseFloat(field === 'inputPrice' ? value : updated[idx].inputPrice) || 0;
        const rate = field === 'gstRate' ? value : updated[idx].gstRate;
        Object.assign(updated[idx], calcItem(price, rate));
      }
      return updated;
    });
  }

  function addItem() {
    setItems((prev: any[]) => [...prev, {
      id: generateId(), serviceId: '', subServiceId: '', serviceName: '', subServiceName: '',
      hsnCode: '', quantity: 1, inputPrice: '', basePrice: 0, gstRate: order.gstSlab, gstAmount: 0, totalPrice: 0,
      status: 'active',
    }]);
  }

  const activeItems = items.filter((i: any) => i.status !== 'canceled');
  const grandTotal = activeItems.reduce((s: number, i: any) => s + i.totalPrice * i.quantity, 0);

  return (
    <Modal title="Edit Order" onClose={onClose} wide>
      <div className="space-y-4">
        <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">Tax Type: <strong>{order.taxType}</strong> · Editing will recalculate amounts.</p>

        {items.map((item: any, idx: number) => (
          <div key={item.id} className={`p-4 border rounded-xl space-y-3 ${item.status === 'canceled' ? 'opacity-50 bg-slate-50 border-slate-200' : 'border-slate-200'}`}>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-700">
                {item.status === 'canceled'
                  ? <>{item.serviceName} / {item.subServiceName} <span className="ml-2 text-xs text-red-500">(Canceled)</span></>
                  : `Item ${idx + 1}`}
              </span>
              {item.status === 'active' && (
                <button onClick={() => setItems((prev: any[]) => prev.map((it, i) => i === idx ? { ...it, status: 'canceled' } : it))}
                  className="text-red-400 hover:text-red-600">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
            {item.status === 'active' && (
              <>
                <ServiceSelector
                  serviceId={item.serviceId}
                  subServiceId={item.subServiceId}
                  onServiceChange={(sId: string, scId: string) => {
                    const s = services.find((sv: any) => sv.id === sId);
                    const sc = s?.subCategories.find((c: any) => c.id === scId);
                    setItems((prev: any[]) => prev.map((it, i) => i === idx ? {
                      ...it, serviceId: sId, subServiceId: scId,
                      serviceName: s?.name || '', subServiceName: sc?.name || '', hsnCode: s?.hsnCode || ''
                    } : it));
                  }}
                  compact
                />
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-slate-600 mb-1 block">Price (₹)</label>
                    <input type="number" min="0" step="0.01" value={item.inputPrice}
                      onChange={e => updateItem(idx, 'inputPrice', e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-600 mb-1 block">Qty</label>
                    <input type="number" min="1" value={item.quantity}
                      onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)} className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-600 mb-1 block">GST %</label>
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
                  <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded flex gap-4">
                    <span>Base: ₹{(item.basePrice * item.quantity).toFixed(2)}</span>
                    <span>GST: ₹{(item.gstAmount * item.quantity).toFixed(2)}</span>
                    <span className="font-semibold text-indigo-700">Total: ₹{(item.totalPrice * item.quantity).toFixed(2)}</span>
                  </div>
                )}
              </>
            )}
          </div>
        ))}

        <button onClick={addItem} className="w-full py-2 border-2 border-dashed border-amber-200 text-amber-600 rounded-lg hover:bg-amber-50 text-sm flex items-center justify-center gap-2">
          <Plus size={16} /> Add Service
        </button>

        <div className="p-3 bg-indigo-50 rounded-lg text-sm font-semibold text-indigo-700">
          New Grand Total: {formatCurrency(grandTotal)}
          {order.paidAmount > 0 && <span className="ml-4 text-amber-600">Paid: {formatCurrency(order.paidAmount)}</span>}
          {order.paidAmount > grandTotal && <span className="ml-4 text-red-600">Refund Due: {formatCurrency(order.paidAmount - grandTotal)}</span>}
          {order.paidAmount <= grandTotal && <span className="ml-4 text-orange-600">Pending: {formatCurrency(grandTotal - order.paidAmount)}</span>}
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 text-sm">Cancel</button>
          <button onClick={() => onSave(items)} className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">Save Changes</button>
        </div>
      </div>
    </Modal>
  );
}

function OrderDetailModal({ order, onClose, onEdit, onPI }: any) {
  const activeServices = order.services.filter((s: OrderService) => s.status === 'active');
  const paidPct = order.totalAmount > 0 ? Math.min(100, (order.paidAmount / order.totalAmount) * 100) : 0;

  return (
    <Modal title="Order Details" onClose={onClose} wide>
      <div className="space-y-5">
        {/* Company info */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Detail label="Company" value={order.companyName} />
          <Detail label="Contact / POC" value={order.contactName} />
          <Detail label="Order Number" value={order.orderNumber} />
          <Detail label="Date" value={formatDate(order.date)} />
          <Detail label="Country" value={`${order.country}, ${order.state}`} />
          <Detail label="GST" value={`${order.gstSlab}% (${order.taxType})`} />
        </div>

        {/* Services */}
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-2">Services</p>
          <table className="w-full text-sm border border-slate-100 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left px-3 py-2 text-xs text-slate-600">Service</th>
                <th className="text-right px-3 py-2 text-xs text-slate-600">Qty</th>
                <th className="text-right px-3 py-2 text-xs text-slate-600">Base</th>
                <th className="text-right px-3 py-2 text-xs text-slate-600">GST</th>
                <th className="text-right px-3 py-2 text-xs text-slate-600">Total</th>
                <th className="text-center px-3 py-2 text-xs text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {order.services.map((s: OrderService) => (
                <tr key={s.id} className={`border-t border-slate-50 ${s.status === 'canceled' ? 'opacity-50 line-through' : ''}`}>
                  <td className="px-3 py-2"><div>{s.serviceName}</div><div className="text-xs text-slate-500">{s.subServiceName}</div></td>
                  <td className="px-3 py-2 text-right">{s.quantity}</td>
                  <td className="px-3 py-2 text-right">₹{(s.basePrice * s.quantity).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right">₹{(s.gstAmount * s.quantity).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right font-medium">₹{(s.totalPrice * s.quantity).toFixed(2)}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${s.status === 'canceled' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'}`}>
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Payment Summary */}
        <div className="p-4 bg-slate-50 rounded-xl">
          <div className="grid grid-cols-3 gap-4 text-center mb-3">
            <div><p className="text-xs text-slate-500">Total</p><p className="font-bold text-slate-800">{formatCurrency(order.totalAmount)}</p></div>
            <div><p className="text-xs text-slate-500">Paid</p><p className="font-bold text-emerald-700">{formatCurrency(order.paidAmount)}</p></div>
            <div><p className="text-xs text-slate-500">Pending</p><p className="font-bold text-orange-600">{formatCurrency(order.pendingAmount)}</p></div>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${paidPct}%`, background: paidPct === 100 ? '#059669' : 'linear-gradient(to right, #4F46E5, #7C3AED)' }} />
          </div>
          {order.refundDue > 0 && <p className="text-xs text-amber-700 mt-2 font-medium">Refund Due: {formatCurrency(order.refundDue)}</p>}
        </div>

        {/* Payment History */}
        {order.payments.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">Payment History</p>
            <div className="space-y-1">
              {order.payments.map((p: any) => (
                <div key={p.id} className="flex justify-between items-center text-xs p-2 bg-emerald-50 rounded-lg">
                  <span className="font-mono text-slate-500">{p.version}</span>
                  <span className="text-slate-700">{formatDate(p.date)}</span>
                  <span className="font-medium text-emerald-700">₹{p.amount.toFixed(2)}</span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">{p.type}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onEdit} className="px-3 py-2 border border-slate-200 rounded-lg text-slate-600 text-sm flex items-center gap-1.5 hover:bg-slate-50">
            <Edit2 size={14} /> Edit
          </button>
          <button onClick={onPI} className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm flex items-center gap-1.5 hover:bg-indigo-700">
            <FileText size={14} /> Proforma Invoice
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Modal({ title, onClose, children, wide }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"><XCircle size={20} /></button>
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