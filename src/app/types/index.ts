export interface Customer {
  id: string;
  pocName: string;
  companyName: string;
  companyEmail?: string;
  companyNumber?: string;
  companyAddress?: string;
  website?: string;
  notes?: string;
  gstNumber?: string;
  gstSlab?: number;
  taxType?: 'Inclusive' | 'Exclusive';
  country?: string;
  state?: string;
  createdAt: string;
}

export interface EnquiryService {
  id: string;
  serviceId: string;
  subServiceId: string;
  projectName?: string;
}

export interface ServiceCategory {
  id: string;
  name: string;
  hsnCode: string;
  subCategories: SubCategory[];
  createdAt: string;
}

export interface Enquiry {
  id: string;
  date: string;
  contactName: string;
  customerId?: string;
  services: EnquiryService[];  // multiple services
  serviceId?: string;          // legacy / CSV compat
  subServiceId?: string;       // legacy / CSV compat
  companyName: string;
  mobileNumber: string;
  website?: string;
  email: string;
  companyAddress: string;
  gstNumber?: string;
  gstSlab: number; // 0, 5, 18, 40
  taxType: 'Inclusive' | 'Exclusive';
  country: string;
  state: string;
  description: string;
  status: 'active' | 'dead';
  convertedToQuote?: boolean;
  createdAt: string;
}

export interface QuotationItem {
  id: string;
  serviceId: string;
  subServiceId: string;
  serviceName: string;
  subServiceName: string;
  projectName?: string;
  hsnCode: string;
  quantity: number;
  basePrice: number;
  gstRate: number;
  gstAmount: number;
  totalPrice: number;
}

export interface Quotation {
  id: string;
  enquiryId: string;
  quoteNumber: string;
  date: string;
  companyName: string;
  contactName: string;
  email: string;
  mobileNumber: string;
  website?: string;
  companyAddress: string;
  gstNumber?: string;
  gstSlab: number;
  taxType: 'Inclusive' | 'Exclusive';
  country: string;
  state: string;
  items: QuotationItem[];
  baseAmount: number;
  gstAmount: number;
  totalAmount: number;
  status: 'active' | 'dead';
  convertedToOrder?: boolean;
  createdAt: string;
}

export interface OrderService {
  id: string;
  serviceId: string;
  subServiceId: string;
  serviceName: string;
  subServiceName: string;
  projectName?: string;
  hsnCode: string;
  quantity: number;
  basePrice: number;
  gstRate: number;
  gstAmount: number;
  totalPrice: number;
  status: 'active' | 'canceled';
}

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  date: string;
  type: 'full' | 'partial';
  version: string;
  notes?: string;
}

export interface RefundPayment {
  id: string;
  orderId: string;
  amount: number;
  date: string;
  type: 'full' | 'partial';
  notes?: string;
}

export interface Order {
  id: string;
  quotationId: string;
  orderNumber: string;
  date: string;
  companyName: string;
  contactName: string;
  pocName: string;
  email: string;
  mobileNumber: string;
  website?: string;
  companyAddress: string;
  gstNumber?: string;
  gstSlab: number;
  taxType: 'Inclusive' | 'Exclusive';
  country: string;
  state: string;
  services: OrderService[];
  totalAmount: number;
  baseAmount: number;
  gstAmount: number;
  paidAmount: number;
  pendingAmount: number;
  refundDue: number;
  refundPaid: number;
  payments: Payment[];
  refundPayments: RefundPayment[];
  poFile?: string;
  poFileName?: string;
  status: 'active' | 'dead';
  createdAt: string;
}

export interface MarketCompany {
  id: string;
  companyName: string;
  website?: string;
  phone?: string;
  email?: string;
  description?: string;
  pitchPlanning?: string;
  createdAt: string;
}

export interface PDFSettings {
  heading: string;
  companyName: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  logoUrl?: string;
  gstNumber?: string;
  companyState: string;
  country: string;
  state: string;
  bankName?: string;
  accountNo?: string;
  ifsc?: string;
  branch?: string;
  upiId?: string;
}

export interface AppSettings {
  password: string;
  quotePdfSettings: PDFSettings;
  poPdfSettings: PDFSettings;
  piPdfSettings: PDFSettings;
  taxInvoicePdfSettings: PDFSettings;
}
