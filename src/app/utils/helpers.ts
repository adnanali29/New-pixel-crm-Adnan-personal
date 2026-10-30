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
    n = Math.floor(n);
    if (isNaN(n) || n <= 0) return '';
    if (n < 20) return ones[n] ? ones[n] + ' ' : '';
    if (n < 100) return tens[Math.floor(n / 10)] + ' ' + (ones[n % 10] ? ones[n % 10] + ' ' : '');
    return (ones[Math.floor(n / 100)] ? ones[Math.floor(n / 100)] + ' Hundred ' : '') + convertHundreds(n % 100);
  };

  if (num === null || num === undefined || isNaN(num) || num <= 0) return 'Zero Rupees Only';
  const cleanNum = Math.abs(Number(num));
  if (!isFinite(cleanNum) || cleanNum === 0) return 'Zero Rupees Only';

  const intPart = Math.floor(cleanNum);
  const decPart = Math.round((cleanNum - intPart) * 100);

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

export const MONTH_CODES: Record<number, string> = {
  0: 'JA', // January
  1: 'FE', // February
  2: 'MR', // March
  3: 'AP', // April
  4: 'MY', // May
  5: 'JU', // June
  6: 'JL', // July
  7: 'AU', // August
  8: 'SE', // September
  9: 'OC', // October
  10: 'NO', // November (PPNO01, PPNO02)
  11: 'DE', // December
};

export const generateDocumentNumber = (prefix: string = 'PP', count: number = 1, date: Date = new Date()): string => {
  const monthCode = MONTH_CODES[date.getMonth()] || 'OC';
  const seq = Math.max(1, count);
  const numStr = String(seq).padStart(2, '0');
  return `${prefix}${monthCode}${numStr}`;
};

export const generateQuoteNumber = (existingQuotes: any[] = [], date: Date = new Date()): string => {
  const monthCode = MONTH_CODES[date.getMonth()] || 'OC';
  let altMonthCode = '';
  if (monthCode === 'NO') altMonthCode = '|NV';
  else if (monthCode === 'SE') altMonthCode = '|SP';
  else if (monthCode === 'FE') altMonthCode = '|FB';
  else if (monthCode === 'DE') altMonthCode = '|DC';

  const monthPattern = monthCode === 'OC' ? '(?:OC|0C)' : `(?:${monthCode}${altMonthCode})`;
  const regex = new RegExp(`^PP${monthPattern}(\\d+)$`, 'i');

  let maxSeq = 0;
  if (Array.isArray(existingQuotes)) {
    existingQuotes.forEach(q => {
      const num = typeof q === 'string' ? q : (q?.quoteNumber || q?.quote_number || '');
      if (!num) return;
      const match = num.trim().match(regex);
      if (match) {
        const val = parseInt(match[1], 10);
        // Sequential numbers in a month start from 1, 2, ...
        // Ignore legacy random numbers (>= 1000) so they don't corrupt the sequence
        if (!isNaN(val) && val < 1000 && val > maxSeq) {
          maxSeq = val;
        }
      }
    });
  }

  const nextSeq = maxSeq + 1;
  return generateDocumentNumber('PP', nextSeq, date);
};

export const generateOrderNumber = (existingOrders: any[] = [], date: Date = new Date()): string => {
  const monthCode = MONTH_CODES[date.getMonth()] || 'OC';
  let altMonthCode = '';
  if (monthCode === 'NO') altMonthCode = '|NV';
  else if (monthCode === 'SE') altMonthCode = '|SP';
  else if (monthCode === 'FE') altMonthCode = '|FB';
  else if (monthCode === 'DE') altMonthCode = '|DC';

  const monthPattern = monthCode === 'OC' ? '(?:OC|0C)' : `(?:${monthCode}${altMonthCode})`;
  const regex = new RegExp(`^PP${monthPattern}(\\d+)$`, 'i');

  let maxSeq = 0;
  if (Array.isArray(existingOrders)) {
    existingOrders.forEach(o => {
      const num = typeof o === 'string' ? o : (o?.orderNumber || o?.order_number || '');
      if (!num) return;
      const match = num.trim().match(regex);
      if (match) {
        const val = parseInt(match[1], 10);
        // Sequential numbers in a month start from 1, 2, ...
        // Ignore legacy random numbers (>= 1000) so they don't corrupt the sequence
        if (!isNaN(val) && val < 1000 && val > maxSeq) {
          maxSeq = val;
        }
      }
    });
  }

  const nextSeq = maxSeq + 1;
  return generateDocumentNumber('PP', nextSeq, date);
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
