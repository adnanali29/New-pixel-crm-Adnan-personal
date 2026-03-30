// Neon-backed REST API client — replaces the Supabase client

const API_BASE = '/api';

// ── Core fetch wrapper ────────────────────────────────────────────────────────
async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ── API methods ───────────────────────────────────────────────────────────────
export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<{ user: { id: string; email: string; full_name: string } }>(
      'POST', '/auth/login', { email, password }
    ),
  verifyToken: () =>
    request<{ valid: boolean }>('POST', '/auth/verify'),
  changePassword: (userId: string, currentPassword: string, newPassword: string) =>
    request<void>('POST', '/auth/change-password', { userId, currentPassword, newPassword }),

  // Services
  getServices: () => request<any[]>('GET', '/services'),
  createService: (name: string, hsn_code: string) =>
    request<any>('POST', '/services', { name, hsn_code }),
  updateService: (id: string, name: string, hsn_code: string) =>
    request<void>('PUT', `/services/${id}`, { name, hsn_code }),
  createSubCategory: (service_id: string, name: string) =>
    request<any>('POST', '/sub-categories', { service_id, name }),
  updateSubCategory: (id: string, name: string) =>
    request<void>('PUT', `/sub-categories/${id}`, { name }),
  deleteSubCategory: (id: string) =>
    request<void>('DELETE', `/sub-categories/${id}`),

  // Enquiries
  getEnquiries: () => request<any[]>('GET', '/enquiries'),
  createEnquiry: (data: any) => request<any>('POST', '/enquiries', data),
  updateEnquiry: (id: string, data: any) => request<void>('PUT', `/enquiries/${id}`, data),
  deleteEnquiry: (id: string) => request<void>('DELETE', `/enquiries/${id}`),

  // Quotations
  getQuotations: () => request<any[]>('GET', '/quotations'),
  createQuotation: (data: any) => request<any>('POST', '/quotations', data),
  updateQuotation: (id: string, data: any) => request<void>('PUT', `/quotations/${id}`, data),

  // Orders
  getOrders: () => request<any[]>('GET', '/orders'),
  createOrder: (data: any) => request<any>('POST', '/orders', data),
  updateOrder: (id: string, data: any) => request<void>('PUT', `/orders/${id}`, data),
  deleteOrder: (id: string) => request<void>('DELETE', `/orders/${id}`),
  createPayment: (orderId: string, data: any) =>
    request<any>('POST', `/orders/${orderId}/payments`, data),
  createRefund: (orderId: string, data: any) =>
    request<any>('POST', `/orders/${orderId}/refunds`, data),
  cancelOrderServices: (ids: string[]) =>
    request<void>('PUT', '/order-services/cancel', { ids }),
  restoreOrderService: (id: string) =>
    request<void>('PUT', `/order-services/${id}/restore`),
  restoreAllOrderServices: (orderId: string) =>
    request<void>('PUT', `/orders/${orderId}/restore-all-services`),

  // Market Research
  getMarketResearch: () => request<any[]>('GET', '/market-research'),
  createMarketCompany: (data: any) => request<any>('POST', '/market-research', data),
  updateMarketCompany: (id: string, data: any) =>
    request<void>('PUT', `/market-research/${id}`, data),
  deleteMarketCompany: (id: string) =>
    request<void>('DELETE', `/market-research/${id}`),

  // Settings
  getSettings: () => request<any>('GET', '/settings'),
  updateSettings: (data: any) => request<void>('PUT', '/settings', data),
};
