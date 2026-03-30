import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  ServiceCategory, SubCategory, Enquiry, EnquiryService, Quotation, QuotationItem,
  Order, OrderService, Payment, RefundPayment, MarketCompany, AppSettings, PDFSettings
} from '../types/index';
import { generateId, generateQuoteNumber, generateOrderNumber, calculateGST } from '../utils/helpers';
import { api } from '../../lib/api';

interface AppContextType {
  isAuthenticated: boolean;
  currentUser: { id: string; email: string; full_name: string } | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;

  services: ServiceCategory[];
  addService: (name: string, hsnCode: string) => Promise<ServiceCategory>;
  updateService: (id: string, name: string, hsnCode: string) => Promise<void>;
  addSubCategory: (serviceId: string, name: string) => Promise<SubCategory>;
  updateSubCategory: (serviceId: string, subId: string, name: string) => Promise<void>;
  deleteSubCategory: (serviceId: string, subId: string) => Promise<void>;

  enquiries: Enquiry[];
  addEnquiry: (data: Omit<Enquiry, 'id' | 'createdAt' | 'status' | 'convertedToQuote'>) => Promise<Enquiry>;
  updateEnquiry: (id: string, data: Partial<Enquiry>) => Promise<void>;
  deadEnquiry: (id: string) => Promise<void>;
  restoreEnquiry: (id: string) => Promise<void>;
  deleteEnquiry: (id: string) => Promise<void>;

  quotations: Quotation[];
  addQuotation: (enquiryId: string, items: QuotationItem[]) => Promise<Quotation>;
  updateQuotation: (id: string, data: Partial<Quotation>) => Promise<void>;
  deadQuotation: (id: string) => Promise<void>;
  restoreQuotation: (id: string) => Promise<void>;

  orders: Order[];
  addOrder: (quotationId: string, poFile?: string, poFileName?: string) => Promise<Order>;
  updateOrder: (id: string, data: Partial<Order>) => Promise<void>;
  markOrderPaid: (orderId: string, amount: number, type: 'full' | 'partial', notes?: string) => Promise<void>;
  cancelOrderServices: (orderId: string, serviceIds: string[]) => Promise<void>;
  processRefund: (orderId: string, amount: number, notes?: string) => Promise<void>;
  deadOrder: (id: string) => Promise<void>;
  restoreOrder: (id: string) => Promise<void>;
  restoreOrderService: (orderId: string, serviceId: string) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;

  marketResearch: MarketCompany[];
  addMarketCompany: (data: Omit<MarketCompany, 'id' | 'createdAt'>) => Promise<void>;
  updateMarketCompany: (id: string, data: Partial<MarketCompany>) => Promise<void>;
  deleteMarketCompany: (id: string) => Promise<void>;

  settings: AppSettings;
  updateSettings: (data: Partial<AppSettings>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const defaultSettings: AppSettings = {
  password: 'Abc@12345',
  quotePdfSettings: {
    heading: 'QUOTATION',
    companyName: 'Pixel Web Pages',
    phone: '',
    email: '',
    address: '',
    website: 'www.pixelwebpages.com',
    logoUrl: '',
    gstNumber: '',
    companyState: '',
    country: 'India',
    state: '',
  },
  poPdfSettings: {
    heading: 'PURCHASE ORDER',
    companyName: 'Pixel Web Pages',
    phone: '',
    email: '',
    address: '',
    website: 'www.pixelwebpages.com',
    logoUrl: '',
    gstNumber: '',
    companyState: '',
    country: 'India',
    state: '',
  },
  piPdfSettings: {
    heading: 'PROFORMA INVOICE',
    companyName: 'Pixel Web Pages',
    phone: '',
    email: '',
    address: '',
    website: 'www.pixelwebpages.com',
    logoUrl: '',
    gstNumber: '',
    companyState: '',
    country: 'India',
    state: '',
    bankName: '',
    accountNo: '',
    ifsc: '',
    branch: '',
    upiId: '',
  },
  taxInvoicePdfSettings: {
    heading: 'TAX INVOICE',
    companyName: 'Pixel Web Pages',
    phone: '',
    email: '',
    address: '',
    website: 'www.pixelwebpages.com',
    logoUrl: '',
    gstNumber: '',
    companyState: '',
    country: 'India',
    state: '',
  },
};

interface StoredState {
  services: ServiceCategory[];
  enquiries: Enquiry[];
  quotations: Quotation[];
  orders: Order[];
  marketResearch: MarketCompany[];
  settings: AppSettings;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string; full_name: string } | null>(null);
  const [state, setState] = useState<StoredState>({
    services: [],
    enquiries: [],
    quotations: [],
    orders: [],
    marketResearch: [],
    settings: defaultSettings,
  });

  const [isLoading, setIsLoading] = useState(true);

  // ── Data mapping helpers ───────────────────────────────────────────────────
  const mapEnqService = (s: any): EnquiryService => ({
    id: s.id,
    serviceId: s.service_id,
    subServiceId: s.sub_service_id || '',
  });

  const mapQItem = (i: any): QuotationItem => ({
    id: i.id,
    serviceId: i.service_id,
    subServiceId: i.sub_service_id || '',
    serviceName: i.service_name || '',
    subServiceName: i.sub_service_name || '',
    hsnCode: i.hsn_code || '',
    quantity: Number(i.quantity),
    basePrice: Number(i.base_price),
    gstRate: Number(i.gst_rate),
    gstAmount: Number(i.gst_amount),
    totalPrice: Number(i.total_price),
  });

  const mapOrderService = (s: any): OrderService => ({
    id: s.id,
    serviceId: s.service_id,
    subServiceId: s.sub_service_id || '',
    serviceName: s.service_name || '',
    subServiceName: s.sub_service_name || '',
    hsnCode: s.hsn_code || '',
    quantity: Number(s.quantity),
    basePrice: Number(s.base_price),
    gstRate: Number(s.gst_rate),
    gstAmount: Number(s.gst_amount),
    totalPrice: Number(s.total_price),
    status: s.status || 'active',
  });

  const mapPayment = (p: any): Payment => ({
    id: p.id,
    orderId: p.order_id,
    amount: Number(p.amount),
    date: p.date,
    type: p.type,
    version: p.version || '',
    notes: p.notes || '',
  });

  const mapRefundPayment = (r: any): RefundPayment => ({
    id: r.id,
    orderId: r.order_id,
    amount: Number(r.amount),
    date: r.date,
    type: r.type,
    notes: r.notes || '',
  });

  // ── Fetch all data ─────────────────────────────────────────────────────────
  const fetchData = async () => {
    try {
      const [services, enquiries, quotations, orders, marketResearch, settingsData] =
        await Promise.all([
          api.getServices(),
          api.getEnquiries(),
          api.getQuotations(),
          api.getOrders(),
          api.getMarketResearch(),
          api.getSettings(),
        ]);

      setState({
        services: (services || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          hsnCode: s.hsn_code || '',
          createdAt: s.created_at,
          subCategories: (s.subCategories || []).map((sc: any) => ({ id: sc.id, name: sc.name })),
        })),
        enquiries: (enquiries || []).map((e: any): Enquiry => ({
          id: e.id,
          date: e.date,
          contactName: e.contact_name,
          companyName: e.company_name,
          mobileNumber: e.mobile_number || '',
          website: e.website || '',
          email: e.email || '',
          companyAddress: e.company_address || '',
          gstNumber: e.gst_number || '',
          gstSlab: Number(e.gst_slab) || 0,
          taxType: e.tax_type || 'Exclusive',
          country: e.country || 'India',
          state: e.state || '',
          description: e.description || '',
          status: e.status,
          convertedToQuote: e.converted_to_quote,
          createdAt: e.created_at,
          services: (e.services || []).map(mapEnqService),
          serviceId: (e.services?.[0]?.service_id) || '',
          subServiceId: (e.services?.[0]?.sub_service_id) || '',
        })),
        quotations: (quotations || []).map((q: any): Quotation => ({
          id: q.id,
          enquiryId: q.enquiry_id || '',
          quoteNumber: q.quote_number,
          date: q.date,
          companyName: q.company_name,
          contactName: q.contact_name,
          email: q.email || '',
          mobileNumber: q.mobile_number || '',
          website: q.website || '',
          companyAddress: q.company_address || '',
          gstNumber: q.gst_number || '',
          gstSlab: Number(q.gst_slab) || 0,
          taxType: q.tax_type || 'Exclusive',
          country: q.country || 'India',
          state: q.state || '',
          baseAmount: Number(q.base_amount) || 0,
          gstAmount: Number(q.gst_amount) || 0,
          totalAmount: Number(q.total_amount) || 0,
          status: q.status,
          convertedToOrder: q.converted_to_order,
          createdAt: q.created_at,
          items: (q.items || []).map(mapQItem),
        })),
        orders: (orders || []).map((o: any): Order => ({
          id: o.id,
          quotationId: o.quotation_id || '',
          orderNumber: o.order_number,
          date: o.date,
          companyName: o.company_name,
          contactName: o.contact_name,
          pocName: o.poc_name || '',
          email: o.email || '',
          mobileNumber: o.mobile_number || '',
          website: o.website || '',
          companyAddress: o.company_address || '',
          gstNumber: o.gst_number || '',
          gstSlab: Number(o.gst_slab) || 0,
          taxType: o.tax_type || 'Exclusive',
          country: o.country || 'India',
          state: o.state || '',
          totalAmount: Number(o.total_amount) || 0,
          baseAmount: Number(o.base_amount) || 0,
          gstAmount: Number(o.gst_amount) || 0,
          paidAmount: Number(o.paid_amount) || 0,
          pendingAmount: Number(o.pending_amount) || 0,
          refundDue: Number(o.refund_due) || 0,
          refundPaid: Number(o.refund_paid) || 0,
          poFile: o.po_file || '',
          poFileName: o.po_file_name || '',
          status: o.status,
          createdAt: o.created_at,
          services: (o.services || []).map(mapOrderService),
          payments: (o.payments || []).map(mapPayment),
          refundPayments: (o.refundPayments || []).map(mapRefundPayment),
        })),
        marketResearch: (marketResearch || []).map((m: any): MarketCompany => ({
          id: m.id,
          companyName: m.company_name,
          website: m.website || '',
          phone: m.phone || '',
          email: m.email || '',
          description: m.description || '',
          pitchPlanning: m.pitch_planning || '',
          createdAt: m.created_at,
        })),
        settings: settingsData ? {
          password: settingsData.password || '',
          quotePdfSettings: settingsData.quote_pdf_settings || defaultSettings.quotePdfSettings,
          poPdfSettings: settingsData.po_pdf_settings || defaultSettings.poPdfSettings,
          piPdfSettings: settingsData.pi_pdf_settings || defaultSettings.piPdfSettings,
          taxInvoicePdfSettings: settingsData.tax_invoice_pdf_settings || defaultSettings.taxInvoicePdfSettings,
        } : defaultSettings,
      });
    } catch (error) {
      // Sliently handle cross-initialization or network gaps
    }
  };

  // ── App initialization ─────────────────────────────────────────────────────
  useEffect(() => {
    const initApp = async () => {
      setIsLoading(true);
      const userStr = localStorage.getItem('crm_user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          setCurrentUser(user);
          setIsAuthenticated(true);
          await fetchData();
        } catch {
          localStorage.removeItem('crm_user');
          setIsAuthenticated(false);
          setCurrentUser(null);
        }
      }
      setIsLoading(false);
    };
    initApp();
  }, []);

  const updateState = useCallback((updates: Partial<StoredState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // ── Auth ───────────────────────────────────────────────────────────────────
  const login = async (email: string, password: string): Promise<boolean> => {
    const { user } = await api.login(email, password);
    localStorage.setItem('crm_user', JSON.stringify(user));
    setCurrentUser(user);
    setIsAuthenticated(true);
    await fetchData();
    return true;
  };

  const logout = async () => {
    localStorage.removeItem('crm_user');
    setIsAuthenticated(false);
    setCurrentUser(null);
    setState({
      services: [],
      enquiries: [],
      quotations: [],
      orders: [],
      marketResearch: [],
      settings: defaultSettings,
    });
  };

  // ── Services ───────────────────────────────────────────────────────────────
  const addService = async (name: string, hsnCode: string): Promise<ServiceCategory> => {
    const data = await api.createService(name, hsnCode);
    const newService: ServiceCategory = {
      id: data.id,
      name: data.name,
      hsnCode: data.hsn_code || '',
      createdAt: data.created_at,
      subCategories: [],
    };
    setState(prev => ({ ...prev, services: [newService, ...prev.services] }));
    return newService;
  };

  const updateService = async (id: string, name: string, hsnCode: string) => {
    await api.updateService(id, name, hsnCode);
    setState(prev => ({
      ...prev,
      services: prev.services.map(s => s.id === id ? { ...s, name, hsnCode } : s),
    }));
  };

  const addSubCategory = async (serviceId: string, name: string): Promise<SubCategory> => {
    const data = await api.createSubCategory(serviceId, name);
    const newSub: SubCategory = { id: data.id, name: data.name };
    setState(prev => ({
      ...prev,
      services: prev.services.map(s =>
        s.id === serviceId ? { ...s, subCategories: [...s.subCategories, newSub] } : s
      ),
    }));
    return newSub;
  };

  const updateSubCategory = async (serviceId: string, subId: string, name: string) => {
    await api.updateSubCategory(subId, name);
    setState(prev => ({
      ...prev,
      services: prev.services.map(s =>
        s.id === serviceId
          ? { ...s, subCategories: s.subCategories.map(sc => sc.id === subId ? { ...sc, name } : sc) }
          : s
      ),
    }));
  };

  const deleteSubCategory = async (serviceId: string, subId: string) => {
    await api.deleteSubCategory(subId);
    setState(prev => ({
      ...prev,
      services: prev.services.map(s =>
        s.id === serviceId
          ? { ...s, subCategories: s.subCategories.filter(sc => sc.id !== subId) }
          : s
      ),
    }));
  };

  // ── Enquiries ──────────────────────────────────────────────────────────────
  const addEnquiry = async (data: Omit<Enquiry, 'id' | 'createdAt' | 'status' | 'convertedToQuote'>): Promise<Enquiry> => {
    let services: EnquiryService[] = data.services ?? [];
    if (services.length === 0 && data.serviceId) {
      services = [{ id: generateId(), serviceId: data.serviceId, subServiceId: data.subServiceId || '' }];
    }

    const enquiryData = await api.createEnquiry({
      contact_name: data.contactName,
      company_name: data.companyName,
      mobile_number: data.mobileNumber,
      website: data.website,
      email: data.email,
      company_address: data.companyAddress,
      gst_number: data.gstNumber,
      gst_slab: data.gstSlab,
      tax_type: data.taxType,
      country: data.country,
      state: data.state,
      description: data.description,
      services: services.map(s => ({ service_id: s.serviceId, sub_service_id: s.subServiceId || null })),
    });

    const enquiry: Enquiry = {
      ...data,
      services,
      id: enquiryData.id,
      status: 'active',
      convertedToQuote: false,
      createdAt: enquiryData.created_at,
    };
    setState(prev => ({ ...prev, enquiries: [enquiry, ...prev.enquiries] }));
    return enquiry;
  };

  const updateEnquiry = async (id: string, data: Partial<Enquiry>) => {
    const updateData: any = {};
    if (data.contactName !== undefined) updateData.contact_name = data.contactName;
    if (data.companyName !== undefined) updateData.company_name = data.companyName;
    if (data.mobileNumber !== undefined) updateData.mobile_number = data.mobileNumber;
    if (data.website !== undefined) updateData.website = data.website;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.companyAddress !== undefined) updateData.company_address = data.companyAddress;
    if (data.gstNumber !== undefined) updateData.gst_number = data.gstNumber;
    if (data.gstSlab !== undefined) updateData.gst_slab = data.gstSlab;
    if (data.taxType !== undefined) updateData.tax_type = data.taxType;
    if (data.country !== undefined) updateData.country = data.country;
    if (data.state !== undefined) updateData.state = data.state;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.convertedToQuote !== undefined) updateData.converted_to_quote = data.convertedToQuote;
    if (data.services !== undefined) {
      updateData.services = data.services.map(s => ({
        service_id: s.serviceId,
        sub_service_id: s.subServiceId || null,
      }));
    }

    await api.updateEnquiry(id, updateData);
    setState(prev => ({
      ...prev,
      enquiries: prev.enquiries.map(e => e.id === id ? { ...e, ...data } : e),
    }));
  };

  const deadEnquiry = async (id: string) => {
    await updateEnquiry(id, { status: 'dead' });
  };

  const restoreEnquiry = async (id: string) => {
    await updateEnquiry(id, { status: 'active' });
  };

  const deleteEnquiry = async (id: string) => {
    await api.deleteEnquiry(id);
    setState(prev => ({
      ...prev,
      enquiries: prev.enquiries.filter(e => e.id !== id)
    }));
  };
  const addQuotation = async (enquiryId: string, items: QuotationItem[]): Promise<Quotation> => {
    const enquiry = state.enquiries.find(e => e.id === enquiryId)!;
    const baseAmount = items.reduce((sum, i) => sum + i.basePrice * i.quantity, 0);
    const gstAmount = items.reduce((sum, i) => sum + i.gstAmount * i.quantity, 0);
    const totalAmount = items.reduce((sum, i) => sum + i.totalPrice * i.quantity, 0);

    const quoteData = await api.createQuotation({
      enquiry_id: enquiryId,
      quote_number: generateQuoteNumber('QT'),
      company_name: enquiry.companyName,
      contact_name: enquiry.contactName,
      email: enquiry.email,
      mobile_number: enquiry.mobileNumber,
      website: enquiry.website,
      company_address: enquiry.companyAddress,
      gst_number: enquiry.gstNumber,
      gst_slab: enquiry.gstSlab,
      tax_type: enquiry.taxType,
      country: enquiry.country,
      state: enquiry.state,
      base_amount: baseAmount,
      gst_amount: gstAmount,
      total_amount: totalAmount,
      items: items.map(it => ({
        service_id: it.serviceId,
        sub_service_id: it.subServiceId || null,
        service_name: it.serviceName,
        sub_service_name: it.subServiceName,
        hsn_code: it.hsnCode,
        quantity: it.quantity,
        base_price: it.basePrice,
        gst_rate: it.gstRate,
        gst_amount: it.gstAmount,
        total_price: it.totalPrice,
      })),
    });

    await updateEnquiry(enquiryId, { convertedToQuote: true });

    const quotation: Quotation = {
      id: quoteData.id,
      enquiryId: quoteData.enquiry_id,
      quoteNumber: quoteData.quote_number,
      date: quoteData.date,
      companyName: quoteData.company_name,
      contactName: quoteData.contact_name,
      email: quoteData.email || '',
      mobileNumber: quoteData.mobile_number || '',
      website: quoteData.website || '',
      companyAddress: quoteData.company_address || '',
      gstNumber: quoteData.gst_number || '',
      gstSlab: Number(quoteData.gst_slab),
      taxType: quoteData.tax_type,
      country: quoteData.country,
      state: quoteData.state || '',
      baseAmount,
      gstAmount,
      totalAmount,
      status: quoteData.status,
      convertedToOrder: quoteData.converted_to_order,
      createdAt: quoteData.created_at,
      items,
    };

    setState(prev => ({ ...prev, quotations: [quotation, ...prev.quotations] }));
    return quotation;
  };

  const updateQuotation = async (id: string, data: Partial<Quotation>) => {
    const updateData: any = {};
    if (data.status !== undefined) updateData.status = data.status;
    if (data.convertedToOrder !== undefined) updateData.converted_to_order = data.convertedToOrder;
    if (data.companyName !== undefined) updateData.company_name = data.companyName;
    if (data.contactName !== undefined) updateData.contact_name = data.contactName;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.mobileNumber !== undefined) updateData.mobile_number = data.mobileNumber;
    if (data.website !== undefined) updateData.website = data.website;
    if (data.companyAddress !== undefined) updateData.company_address = data.companyAddress;
    if (data.gstNumber !== undefined) updateData.gst_number = data.gstNumber;
    if (data.taxType !== undefined) updateData.tax_type = data.taxType;
    if (data.country !== undefined) updateData.country = data.country;
    if (data.state !== undefined) updateData.state = data.state;

    if (data.items) {
      updateData.base_amount = data.items.reduce((sum, i) => sum + i.basePrice * i.quantity, 0);
      updateData.gst_amount = data.items.reduce((sum, i) => sum + i.gstAmount * i.quantity, 0);
      updateData.total_amount = data.items.reduce((sum, i) => sum + i.totalPrice * i.quantity, 0);
      updateData.items = data.items.map(it => ({
        service_id: it.serviceId,
        sub_service_id: it.subServiceId || null,
        service_name: it.serviceName,
        sub_service_name: it.subServiceName,
        hsn_code: it.hsnCode,
        quantity: it.quantity,
        base_price: it.basePrice,
        gst_rate: it.gstRate,
        gst_amount: it.gstAmount,
        total_price: it.totalPrice,
      }));
    }

    await api.updateQuotation(id, updateData);
    setState(prev => ({
      ...prev,
      quotations: prev.quotations.map(q => q.id === id ? {
        ...q, ...data,
        ...(data.items ? {
          baseAmount: data.items.reduce((sum, i) => sum + i.basePrice * i.quantity, 0),
          gstAmount: data.items.reduce((sum, i) => sum + i.gstAmount * i.quantity, 0),
          totalAmount: data.items.reduce((sum, i) => sum + i.totalPrice * i.quantity, 0),
        } : {})
      } : q),
    }));
  };

  const deadQuotation = async (id: string) => {
    await updateQuotation(id, { status: 'dead' });
  };

  const restoreQuotation = async (id: string) => {
    await updateQuotation(id, { status: 'active' });
  };

  // ── Orders ─────────────────────────────────────────────────────────────────
  const addOrder = async (quotationId: string, poFile?: string, poFileName?: string): Promise<Order> => {
    const quotation = state.quotations.find(q => q.id === quotationId)!;

    const orderData = await api.createOrder({
      quotation_id: quotationId,
      order_number: generateOrderNumber(),
      company_name: quotation.companyName,
      contact_name: quotation.contactName,
      poc_name: quotation.contactName,
      email: quotation.email,
      mobile_number: quotation.mobileNumber,
      website: quotation.website || '',
      company_address: quotation.companyAddress,
      gst_number: quotation.gstNumber,
      gst_slab: quotation.gstSlab,
      tax_type: quotation.taxType,
      country: quotation.country,
      state: quotation.state,
      total_amount: quotation.totalAmount,
      base_amount: quotation.baseAmount,
      gst_amount: quotation.gstAmount,
      pending_amount: quotation.totalAmount,
      po_file: poFile || '',
      po_file_name: poFileName || '',
      services: quotation.items.map(item => ({
        service_id: item.serviceId,
        sub_service_id: item.subServiceId || null,
        service_name: item.serviceName,
        sub_service_name: item.subServiceName,
        hsn_code: item.hsnCode,
        quantity: item.quantity,
        base_price: item.basePrice,
        gst_rate: item.gstRate,
        gst_amount: item.gstAmount,
        total_price: item.totalPrice,
      })),
    });

    const services: OrderService[] = quotation.items.map(item => ({
      id: generateId(),
      serviceId: item.serviceId,
      subServiceId: item.subServiceId,
      serviceName: item.serviceName,
      subServiceName: item.subServiceName,
      hsnCode: item.hsnCode,
      quantity: item.quantity,
      basePrice: item.basePrice,
      gstRate: item.gstRate,
      gstAmount: item.gstAmount,
      totalPrice: item.totalPrice,
      status: 'active' as const,
    }));

    await updateQuotation(quotationId, { convertedToOrder: true });

    const order: Order = {
      id: orderData.id,
      quotationId: orderData.quotation_id || '',
      orderNumber: orderData.order_number,
      date: orderData.date,
      companyName: orderData.company_name,
      contactName: orderData.contact_name,
      pocName: orderData.poc_name || '',
      email: orderData.email || '',
      mobileNumber: orderData.mobile_number || '',
      website: orderData.website || '',
      companyAddress: orderData.company_address || '',
      gstNumber: orderData.gst_number || '',
      gstSlab: Number(orderData.gst_slab),
      taxType: orderData.tax_type,
      country: orderData.country,
      state: orderData.state || '',
      totalAmount: Number(orderData.total_amount),
      baseAmount: Number(orderData.base_amount),
      gstAmount: Number(orderData.gst_amount),
      paidAmount: 0,
      pendingAmount: Number(orderData.pending_amount),
      refundDue: 0,
      refundPaid: 0,
      poFile: orderData.po_file || '',
      poFileName: orderData.po_file_name || '',
      status: orderData.status,
      createdAt: orderData.created_at,
      services,
      payments: [],
      refundPayments: [],
    };

    setState(prev => ({ ...prev, orders: [order, ...prev.orders] }));
    return order;
  };

  const updateOrder = async (id: string, data: Partial<Order>) => {
    const updateData: any = {};
    if (data.status !== undefined) updateData.status = data.status;
    if (data.companyName !== undefined) updateData.company_name = data.companyName;
    if (data.contactName !== undefined) updateData.contact_name = data.contactName;
    if (data.pocName !== undefined) updateData.poc_name = data.pocName;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.mobileNumber !== undefined) updateData.mobile_number = data.mobileNumber;
    if (data.website !== undefined) updateData.website = data.website;
    if (data.companyAddress !== undefined) updateData.company_address = data.companyAddress;
    if (data.gstNumber !== undefined) updateData.gst_number = data.gstNumber;
    if (data.gstSlab !== undefined) updateData.gst_slab = data.gstSlab;
    if (data.taxType !== undefined) updateData.tax_type = data.taxType;
    if (data.country !== undefined) updateData.country = data.country;
    if (data.state !== undefined) updateData.state = data.state;
    if (data.totalAmount !== undefined) updateData.total_amount = data.totalAmount;
    if (data.baseAmount !== undefined) updateData.base_amount = data.baseAmount;
    if (data.gstAmount !== undefined) updateData.gst_amount = data.gstAmount;
    if (data.paidAmount !== undefined) updateData.paid_amount = data.paidAmount;
    if (data.pendingAmount !== undefined) updateData.pending_amount = data.pendingAmount;
    if (data.refundDue !== undefined) updateData.refund_due = data.refundDue;
    if (data.refundPaid !== undefined) updateData.refund_paid = data.refundPaid;
    if (data.poFile !== undefined) updateData.po_file = data.poFile;
    if (data.poFileName !== undefined) updateData.po_file_name = data.poFileName;
    if (data.services !== undefined) {
      updateData.services = data.services.map(s => ({
        service_id: s.serviceId,
        sub_service_id: s.subServiceId || null,
        service_name: s.serviceName,
        sub_service_name: s.subServiceName,
        hsn_code: s.hsnCode,
        quantity: s.quantity,
        base_price: s.basePrice,
        gst_rate: s.gstRate,
        gst_amount: s.gstAmount,
        total_price: s.totalPrice,
        status: s.status,
      }));
    }

    await api.updateOrder(id, updateData);
    setState(prev => ({
      ...prev,
      orders: prev.orders.map(o => o.id === id ? { ...o, ...data } : o),
    }));
  };

  const markOrderPaid = async (orderId: string, amount: number, type: 'full' | 'partial', notes?: string) => {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;

    const version = `T${(order.payments.length + 1).toString().padStart(3, '0')}`;
    const payment = await api.createPayment(orderId, { amount, type, version, notes });

    const newPaidAmount = order.paidAmount + amount;
    const newPendingAmount = Math.max(0, order.totalAmount - newPaidAmount);
    const newRefundDue = Math.max(0, newPaidAmount - order.totalAmount);

    await updateOrder(orderId, {
      paidAmount: newPaidAmount,
      pendingAmount: newPendingAmount,
      refundDue: newRefundDue,
    });

    setState(prev => ({
      ...prev,
      orders: prev.orders.map(o =>
        o.id === orderId
          ? {
              ...o,
              payments: [...o.payments, mapPayment(payment)],
              paidAmount: newPaidAmount,
              pendingAmount: newPendingAmount,
              refundDue: newRefundDue,
            }
          : o
      ),
    }));
  };

  const cancelOrderServices = async (orderId: string, serviceIds: string[]) => {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;

    await api.cancelOrderServices(serviceIds);

    const updatedServices = order.services.map(s =>
      serviceIds.includes(s.id) ? { ...s, status: 'canceled' as const } : s
    );
    const activeServices = updatedServices.filter(s => s.status === 'active');
    const newTotalAmount = activeServices.reduce((sum, s) => sum + s.totalPrice * s.quantity, 0);
    const newBaseAmount = activeServices.reduce((sum, s) => sum + s.basePrice * s.quantity, 0);
    const newGstAmount = activeServices.reduce((sum, s) => sum + s.gstAmount * s.quantity, 0);
    const newRefundDue = Math.max(0, order.paidAmount - newTotalAmount);
    const newPendingAmount = Math.max(0, newTotalAmount - order.paidAmount);
    const newStatus = activeServices.length === 0 ? 'dead' as const : order.status;

    await updateOrder(orderId, {
      totalAmount: newTotalAmount,
      baseAmount: newBaseAmount,
      gstAmount: newGstAmount,
      pendingAmount: newPendingAmount,
      refundDue: newRefundDue,
      status: newStatus,
    });

    setState(prev => ({
      ...prev,
      orders: prev.orders.map(o =>
        o.id === orderId
          ? { ...o, services: updatedServices, totalAmount: newTotalAmount, baseAmount: newBaseAmount, gstAmount: newGstAmount, pendingAmount: newPendingAmount, refundDue: newRefundDue, status: newStatus }
          : o
      ),
    }));
  };

  const restoreOrderService = async (orderId: string, serviceId: string) => {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;

    await api.restoreOrderService(serviceId);

    const updatedServices = order.services.map(s =>
      s.id === serviceId ? { ...s, status: 'active' as const } : s
    );
    const activeServices = updatedServices.filter(s => s.status === 'active');
    const newTotalAmount = activeServices.reduce((sum, s) => sum + s.totalPrice * s.quantity, 0);
    const newBaseAmount = activeServices.reduce((sum, s) => sum + s.basePrice * s.quantity, 0);
    const newGstAmount = activeServices.reduce((sum, s) => sum + s.gstAmount * s.quantity, 0);
    const newRefundDue = Math.max(0, order.paidAmount - newTotalAmount);
    const newPendingAmount = Math.max(0, newTotalAmount - order.paidAmount);

    await updateOrder(orderId, {
      totalAmount: newTotalAmount,
      baseAmount: newBaseAmount,
      gstAmount: newGstAmount,
      pendingAmount: newPendingAmount,
      refundDue: newRefundDue,
      status: 'active',
    });

    setState(prev => ({
      ...prev,
      orders: prev.orders.map(o =>
        o.id === orderId
          ? { ...o, services: updatedServices, totalAmount: newTotalAmount, baseAmount: newBaseAmount, gstAmount: newGstAmount, pendingAmount: newPendingAmount, refundDue: newRefundDue, status: 'active' }
          : o
      ),
    }));
  };

  const processRefund = async (orderId: string, amount: number, notes?: string) => {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;

    const type = amount >= order.refundDue ? 'full' : 'partial';
    const refundPayment = await api.createRefund(orderId, { amount, type, notes });

    const newRefundDue = Math.max(0, order.refundDue - amount);
    const newRefundPaid = order.refundPaid + amount;
    const newPaidAmount = Math.max(0, order.paidAmount - amount);
    const newPendingAmount = Math.max(0, order.totalAmount - newPaidAmount);

    await updateOrder(orderId, {
      refundDue: newRefundDue,
      refundPaid: newRefundPaid,
      paidAmount: newPaidAmount,
      pendingAmount: newPendingAmount,
    });

    setState(prev => ({
      ...prev,
      orders: prev.orders.map(o =>
        o.id === orderId
          ? { ...o, refundPayments: [...o.refundPayments, mapRefundPayment(refundPayment)], refundDue: newRefundDue, refundPaid: newRefundPaid, paidAmount: newPaidAmount, pendingAmount: newPendingAmount }
          : o
      ),
    }));
  };

  const deadOrder = async (id: string) => {
    await updateOrder(id, { status: 'dead' });
  };

  const restoreOrder = async (id: string) => {
    const order = state.orders.find(o => o.id === id);
    if (!order) return;

    await api.restoreAllOrderServices(id);

    const updatedServices = order.services.map(s => ({ ...s, status: 'active' as const }));
    const newTotalAmount = updatedServices.reduce((sum, s) => sum + s.totalPrice * s.quantity, 0);
    const newBaseAmount = updatedServices.reduce((sum, s) => sum + s.basePrice * s.quantity, 0);
    const newGstAmount = updatedServices.reduce((sum, s) => sum + s.gstAmount * s.quantity, 0);
    const newRefundDue = Math.max(0, order.paidAmount - newTotalAmount);
    const newPendingAmount = Math.max(0, newTotalAmount - order.paidAmount);

    await updateOrder(id, {
      status: 'active',
      services: updatedServices,
      totalAmount: newTotalAmount,
      baseAmount: newBaseAmount,
      gstAmount: newGstAmount,
      pendingAmount: newPendingAmount,
      refundDue: newRefundDue,
    });
  };

  const deleteOrder = async (id: string) => {
    await api.deleteOrder(id);
    setState(prev => ({ ...prev, orders: prev.orders.filter(o => o.id !== id) }));
  };

  // ── Market Research ────────────────────────────────────────────────────────
  const addMarketCompany = async (data: Omit<MarketCompany, 'id' | 'createdAt'>) => {
    const company = await api.createMarketCompany({
      company_name: data.companyName,
      website: data.website,
      phone: data.phone,
      email: data.email,
      description: data.description,
      pitch_planning: data.pitchPlanning,
    });
    const newCompany: MarketCompany = {
      id: company.id,
      companyName: company.company_name,
      website: company.website || '',
      phone: company.phone || '',
      email: company.email || '',
      description: company.description || '',
      pitchPlanning: company.pitch_planning || '',
      createdAt: company.created_at,
    };
    setState(prev => ({ ...prev, marketResearch: [newCompany, ...prev.marketResearch] }));
  };

  const updateMarketCompany = async (id: string, data: Partial<MarketCompany>) => {
    const updateData: any = {};
    if (data.companyName) updateData.company_name = data.companyName;
    if (data.website !== undefined) updateData.website = data.website;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.pitchPlanning !== undefined) updateData.pitch_planning = data.pitchPlanning;
    await api.updateMarketCompany(id, updateData);
    setState(prev => ({
      ...prev,
      marketResearch: prev.marketResearch.map(c => c.id === id ? { ...c, ...data } : c),
    }));
  };

  const deleteMarketCompany = async (id: string) => {
    await api.deleteMarketCompany(id);
    setState(prev => ({
      ...prev,
      marketResearch: prev.marketResearch.filter(c => c.id !== id),
    }));
  };

  // ── Settings ───────────────────────────────────────────────────────────────
  const updateSettings = async (data: Partial<AppSettings>) => {
    const updateData: any = {};
    if (data.password) updateData.password = data.password;
    if (data.quotePdfSettings) updateData.quote_pdf_settings = data.quotePdfSettings;
    if (data.poPdfSettings) updateData.po_pdf_settings = data.poPdfSettings;
    if (data.piPdfSettings) updateData.pi_pdf_settings = data.piPdfSettings;
    if (data.taxInvoicePdfSettings) updateData.tax_invoice_pdf_settings = data.taxInvoicePdfSettings;
    await api.updateSettings(updateData);
    setState(prev => ({ ...prev, settings: { ...prev.settings, ...data } }));
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!currentUser) throw new Error('Not authenticated');
    await api.changePassword(currentUser.id, currentPassword, newPassword);
    await updateSettings({ password: newPassword });
  };

  const value: AppContextType = {
    isAuthenticated, login, logout, currentUser,
    services: state.services,
    addService, updateService, addSubCategory, updateSubCategory, deleteSubCategory,
    enquiries: state.enquiries,
    addEnquiry, updateEnquiry, deadEnquiry, restoreEnquiry, deleteEnquiry,
    quotations: state.quotations,
    addQuotation, updateQuotation, deadQuotation, restoreQuotation,
    orders: state.orders,
    addOrder, updateOrder, markOrderPaid, cancelOrderServices, processRefund, deadOrder, restoreOrder, restoreOrderService, deleteOrder,
    marketResearch: state.marketResearch,
    addMarketCompany, updateMarketCompany, deleteMarketCompany,
    settings: state.settings,
    updateSettings, changePassword,
  };

  return (
    <AppContext.Provider value={value}>
      {isLoading ? (
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #EEF2FF 0%, #F8FAFC 50%, #E0E7FF 100%)' }}>
          <div className="flex flex-col items-center gap-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-2xl shadow-indigo-200"
                style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
                </svg>
              </div>
              <div className="absolute -bottom-2 -right-2 w-7 h-7 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin bg-transparent" />
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-indigo-700 tracking-tight">PIXEL<span className="text-slate-600">CRM</span></p>
              <p className="text-slate-500 text-sm mt-1 font-medium">Loading your workspace...</p>
            </div>
          </div>
        </div>
      ) : children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
