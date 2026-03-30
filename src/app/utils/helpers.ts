export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const calculateGST = (
  price: number,
  gstRate: number,
  taxType: 'Inclusive' | 'Exclusive'
): { basePrice: number; gstAmount: number; totalPrice: number } => {
  if (taxType === 'Exclusive') {
    const basePrice = price;
    const gstAmount = (price * gstRate) / 100;
    const totalPrice = price + gstAmount;
    return { basePrice, gstAmount, totalPrice };
  } else {
    // Inclusive: price is the total, extract base and GST
    const basePrice = price / (1 + gstRate / 100);
    const gstAmount = price - basePrice;
    const totalPrice = price;
    return { basePrice, gstAmount, totalPrice };
  }
};

export const numberToWords = (num: number): string => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen',
    'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertHundreds = (n: number): string => {
    if (n === 0) return '';
    if (n < 20) return ones[n] + ' ';
    if (n < 100) return tens[Math.floor(n / 10)] + ' ' + ones[n % 10] + ' ';
    return ones[Math.floor(n / 100)] + ' Hundred ' + convertHundreds(n % 100);
  };

  if (num === 0) return 'Zero Rupees Only';

  const intPart = Math.floor(num);
  const decPart = Math.round((num - intPart) * 100);

  let result = '';
  if (intPart >= 10000000) {
    result += convertHundreds(Math.floor(intPart / 10000000)) + 'Crore ';
    result += convertHundreds(Math.floor((intPart % 10000000) / 100000)) + (Math.floor((intPart % 10000000) / 100000) > 0 ? 'Lakh ' : '');
  } else if (intPart >= 100000) {
    result += convertHundreds(Math.floor(intPart / 100000)) + 'Lakh ';
  }
  if (intPart % 100000 >= 1000) {
    result += convertHundreds(Math.floor((intPart % 100000) / 1000)) + 'Thousand ';
  }
  result += convertHundreds(intPart % 1000);

  result = result.trim() + ' Rupees';
  if (decPart > 0) {
    result += ' and ' + convertHundreds(decPart).trim() + ' Paise';
  }
  result += ' Only';
  return result;
};

export const generateQuoteNumber = (prefix: string = 'QT'): string => {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}-${year}${month}-${rand}`;
};

export const generateOrderNumber = (): string => {
  return generateQuoteNumber('ORD');
};

export const recalculateOrderAmounts = (services: any[], gstSlab: number, taxType: 'Inclusive' | 'Exclusive') => {
  const activeServices = services.filter(s => s.status === 'active');
  let baseAmount = 0;
  let gstAmount = 0;
  let totalAmount = 0;

  activeServices.forEach(service => {
    baseAmount += service.basePrice * service.quantity;
    gstAmount += service.gstAmount * service.quantity;
    totalAmount += service.totalPrice * service.quantity;
  });

  return { baseAmount, gstAmount, totalAmount };
};
