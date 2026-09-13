import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Quotation, Order, PDFSettings } from '../types/index';
import { numberToWords } from './helpers';
import { DEFAULT_LOGO_BASE64, DEFAULT_SIGNATURE_BASE64 } from './assetsData';

const FOOTER_TEXT = 'CRM Powered By Pixel Web Pages | www.pixelwebpages.com';

// State Code Mapping for Standard Indian GST Bill Format
const STATE_CODES: Record<string, string> = {
  'karnataka': '29',
  'maharashtra': '27',
  'delhi': '07',
  'tamil nadu': '33',
  'gujarat': '24',
  'telangana': '36',
  'uttar pradesh': '09',
  'haryana': '06',
  'west bengal': '19',
  'rajasthan': '08',
  'kerala': '32',
  'andhra pradesh': '37',
  'punjab': '03',
  'madhya pradesh': '23',
  'bihar': '10',
  'odisha': '21',
  'assam': '18',
  'chandigarh': '04',
  'goa': '30',
};

// Color Theme Structure for Each PDF Type
interface PDFTheme {
  primary: [number, number, number];         // Primary Accent (Headers, Total Bar, Titles)
  secondaryAccent: [number, number, number]; // Secondary Accent (Thin Header Accent Strip)
  lightBg: [number, number, number];         // Fill background for card boxes & alternate rows
  borderColor: [number, number, number];     // Soft Border stroke lines
  blob1: [number, number, number];           // Background corner blob 1
  blob2: [number, number, number];           // Background corner blob 2
}

// Purple Theme (Used for All PDF Document Types)
const PURPLE_THEME: PDFTheme = {
  primary: [109, 40, 217],         // Rich Deep Purple (#6D28D9)
  secondaryAccent: [196, 181, 253], // Soft Secondary Purple (#C4B5FD)
  lightBg: [245, 243, 255],        // Light Purple Tint (#F5F3FF)
  borderColor: [221, 214, 254],    // Soft Purple Border (#DDD6FE)
  blob1: [237, 233, 254],          // Soft Faded Purple Blob (#EDE9FE)
  blob2: [245, 243, 255],          // Ultra Soft Faded Blob (#F5F3FF)
};

const THEMES: Record<string, PDFTheme> = {
  'QUOTATION': PURPLE_THEME,
  'PURCHASE ORDER': PURPLE_THEME,
  'PROFORMA INVOICE': PURPLE_THEME,
  'TAX INVOICE': PURPLE_THEME,
};

function getTheme(titleKey?: string): PDFTheme {
  return PURPLE_THEME;
}

function getStateCode(stateName?: string): string {
  if (!stateName) return '';
  const key = stateName.toLowerCase().trim();
  return STATE_CODES[key] ? ` (Code: ${STATE_CODES[key]})` : '';
}

function getSafeSettings(settings?: PDFSettings, defaultTitle: string = 'TAX INVOICE'): PDFSettings {
  return {
    heading: settings?.heading || defaultTitle,
    companyName: settings?.companyName || 'Pixel Web Pages',
    phone: settings?.phone || '',
    email: settings?.email || '',
    address: settings?.address || '',
    website: settings?.website || 'www.pixelwebpages.com',
    logoUrl: settings?.logoUrl || '',
    gstNumber: settings?.gstNumber || '',
    companyState: settings?.companyState || '',
    country: settings?.country || 'India',
    state: settings?.state || '',
    bankName: (settings as any)?.bankName || '',
    accountNo: (settings as any)?.accountNo || '',
    ifsc: (settings as any)?.ifsc || '',
    branch: (settings as any)?.branch || '',
    upiId: (settings as any)?.upiId || '',
  };
}

/**
 * Draws subtle background design patterns with document-specific color themes
 */
function addBackgroundDesign(doc: jsPDF, theme: PDFTheme) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // 1. Decorative Corner Background Blobs (Small, Faded & Tucked High Up into Top Corners)
  doc.setFillColor(...theme.blob1);
  doc.circle(pageWidth + 4, -4, 28, 'F'); // Top-Right Corner Blob (Small, Faded, Tucked High Up)

  doc.setFillColor(...theme.blob2);
  doc.circle(-4, -4, 22, 'F'); // Top-Left Soft Layer Blob (Small, Faded, Tucked High Up)

  doc.setFillColor(...theme.lightBg);
  doc.circle(-4, pageHeight + 4, 24, 'F'); // Bottom-Left Soft Corner Accent Blob

  // 2. Header Top Dual Accent Bar
  doc.setFillColor(...theme.primary);
  doc.rect(0, 0, pageWidth, 3.5, 'F');

  doc.setFillColor(...theme.secondaryAccent);
  doc.rect(0, 3.5, pageWidth, 0.8, 'F');

  // 3. Subtle Page Background Center Watermark
  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...theme.lightBg);
  doc.text('PIXEL WEB PAGES', pageWidth / 2, pageHeight / 2, { align: 'center', angle: 30 });
}

/**
 * Draws the logo image in a PERFECT 1:1 SQUARE (24mm x 24mm) with TRANSPARENT background
 */
function drawHeaderLogo(doc: jsPDF, settings: PDFSettings, x: number, y: number, theme: PDFTheme): { width: number; height: number } {
  const logoSquareSize = 24;
  const logoData = settings.logoUrl || DEFAULT_LOGO_BASE64;

  try {
    doc.addImage(logoData, 'PNG', x, y, logoSquareSize, logoSquareSize, undefined, 'FAST');
    return { width: logoSquareSize + 4, height: logoSquareSize };
  } catch {
    doc.setFontSize(15);
    doc.setTextColor(...theme.primary);
    doc.setFont('helvetica', 'bold');
    doc.text(settings.companyName || 'PIXEL WEB PAGES', x, y + 10);
    return { width: 60, height: 12 };
  }
}

function addHeader(doc: jsPDF, rawSettings: PDFSettings, title: string, docNumber: string, docDate: string, theme: PDFTheme): number {
  const settings = getSafeSettings(rawSettings, title);
  const pageWidth = doc.internal.pageSize.getWidth();
  const safeDocNum = docNumber || 'N/A';
  const safeDocDate = docDate ? (typeof docDate === 'string' && docDate.includes('T') ? docDate.split('T')[0] : docDate) : new Date().toISOString().split('T')[0];
  const supplierState = settings.state || settings.companyState || '';

  // Draw Transparent 1:1 Square Header Logo (Top Left)
  const logoDim = drawHeaderLogo(doc, settings, 12, 6, theme);

  // Supplier Contact Details (Left Side below Logo)
  const infoX = 12;
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');
  let y = 6 + logoDim.height + 2;
  const maxWidth = (pageWidth / 2) - infoX;

  if (settings.address) {
    const lines = doc.splitTextToSize(settings.address, maxWidth);
    doc.text(lines, infoX, y);
    y += (lines.length * 3.3);
  }
  if (settings.phone) { doc.text(`Ph: ${settings.phone}`, infoX, y); y += 3.3; }
  if (settings.email) { doc.text(`Email: ${settings.email}`, infoX, y); y += 3.3; }
  if (settings.gstNumber) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...theme.primary);
    doc.text(`GSTIN: ${settings.gstNumber}`, infoX, y);
    y += 3.3;
  }
  if (supplierState) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`State: ${supplierState}${getStateCode(supplierState)}`, infoX, y);
  }

  // Right Side Header Document Title & Metadata
  const headerRightX = pageWidth - 12;
  let rightY = 12;

  // Title: Extra Bold & Big 20pt Text in Document Primary Theme Color
  doc.setFontSize(20);
  doc.setTextColor(...theme.primary);
  doc.setFont('helvetica', 'bold');
  doc.text(title.toUpperCase(), headerRightX, rightY, { align: 'right' });

  // Metadata Text
  rightY += 6.5;
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(`NO: ${safeDocNum}`, headerRightX, rightY, { align: 'right' });

  rightY += 4.5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`DATE: ${safeDocDate}`, headerRightX, rightY, { align: 'right' });

  // Soft Hairline Divider Line
  doc.setDrawColor(...theme.borderColor);
  doc.setLineWidth(0.5);
  const headerBottomY = Math.max(34, y + 3, rightY + 4);
  doc.line(12, headerBottomY, pageWidth - 12, headerBottomY);

  return headerBottomY + 4;
}

function addBillToFrom(doc: jsPDF, rawFromSettings: PDFSettings, toData: {
  companyName: string; contactName: string; address: string;
  email: string; mobile: string; gstNumber?: string; state: string; country: string;
}, startY: number, themeTitle: string = 'QUOTATION', theme: PDFTheme = THEMES['QUOTATION']): number {
  const fromSettings = getSafeSettings(rawFromSettings, themeTitle);
  const pageWidth = doc.internal.pageSize.getWidth();
  const colWidth = (pageWidth - 28) / 2; // (210 - 28) / 2 = 91mm

  const safeToData = {
    companyName: toData?.companyName || '',
    contactName: toData?.contactName || '',
    address: toData?.address || '',
    email: toData?.email || '',
    mobile: toData?.mobile || '',
    gstNumber: toData?.gstNumber || '',
    state: toData?.state || '',
    country: toData?.country || 'India',
  };

  doc.setFontSize(7.5);
  const fromAddrLines = fromSettings.address ? doc.splitTextToSize(fromSettings.address, colWidth - 10) : [];
  const toAddrLines = safeToData.address ? doc.splitTextToSize(safeToData.address, colWidth - 10) : [];

  const fromInfoCount = 1 + (fromSettings.phone ? 1 : 0) + (fromSettings.email ? 1 : 0) + (fromSettings.gstNumber ? 1 : 0);
  const toInfoCount = 2 + (safeToData.mobile ? 1 : 0) + (safeToData.email ? 1 : 0) + (safeToData.gstNumber ? 1 : 0) + 0.5;

  const fromHeight = 13 + (fromAddrLines.length * 3.3) + (fromInfoCount * 3.6);
  const toHeight = 13 + (toAddrLines.length * 3.3) + (toInfoCount * 3.6);
  const boxHeight = Math.max(36, fromHeight, toHeight);

  // FROM Box (Left Card)
  const fromX = 12;
  doc.setDrawColor(...theme.borderColor);
  doc.setLineWidth(0.4);
  doc.setFillColor(...theme.lightBg);
  doc.roundedRect(fromX, startY, colWidth, boxHeight, 1.5, 1.5, 'FD');

  // Vertical Accent Line in Primary Theme Color
  doc.setFillColor(...theme.primary);
  doc.roundedRect(fromX, startY, 2.5, boxHeight, 1, 1, 'F');

  // TO Box (Right Card)
  const toX = pageWidth / 2 + 2;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(toX, startY, colWidth, boxHeight, 1.5, 1.5, 'FD');

  // Dark Slate Vertical Accent Line
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(toX, startY, 2.5, boxHeight, 1, 1, 'F');

  // FROM Content
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...theme.primary);
  doc.text('DETAILS OF SUPPLIER (BILL FROM)', fromX + 6, startY + 5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8.5);
  doc.text(fromSettings.companyName || '', fromX + 6, startY + 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  let fy = startY + 14;
  if (fromAddrLines.length > 0) {
    doc.text(fromAddrLines, fromX + 6, fy);
    fy += (fromAddrLines.length * 3.2);
  }
  if (fromSettings.phone) { doc.text(`Ph: ${fromSettings.phone}`, fromX + 6, fy); fy += 3.4; }
  if (fromSettings.email) { doc.text(`Email: ${fromSettings.email}`, fromX + 6, fy); fy += 3.4; }
  if (fromSettings.gstNumber) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...theme.primary);
    doc.text(`GSTIN: ${fromSettings.gstNumber}`, fromX + 6, fy);
    doc.setFont('helvetica', 'normal');
  }

  // TO Content
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('DETAILS OF RECIPIENT (BILL TO)', toX + 6, startY + 5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8.5);
  doc.text(safeToData.companyName || '', toX + 6, startY + 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  let ty = startY + 14;
  if (safeToData.contactName) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`Attn: ${safeToData.contactName}`, toX + 6, ty);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    ty += 3.4;
  }
  if (toAddrLines.length > 0) {
    doc.text(toAddrLines, toX + 6, ty);
    ty += (toAddrLines.length * 3.2);
  }
  if (safeToData.mobile) { doc.text(`Ph: ${safeToData.mobile}`, toX + 6, ty); ty += 3.4; }
  if (safeToData.email) { doc.text(`Email: ${safeToData.email}`, toX + 6, ty); ty += 3.4; }
  if (safeToData.gstNumber) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`GSTIN: ${safeToData.gstNumber}`, toX + 6, ty);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    ty += 3.4;
  }
  doc.text(`State: ${safeToData.state || 'N/A'}${getStateCode(safeToData.state)}, ${safeToData.country || 'India'}`, toX + 6, ty);

  return startY + boxHeight + 4;
}

function getProjectName(item: any, quotations?: Quotation[], order?: Order): string {
  if (!item) return '';

  // 1. Direct item property check (camelCase or snake_case)
  if (item.projectName && typeof item.projectName === 'string' && item.projectName.trim()) {
    return item.projectName.trim();
  }
  if (item.project_name && typeof item.project_name === 'string' && item.project_name.trim()) {
    return item.project_name.trim();
  }

  // 2. Check quotations list lookup
  if (quotations && Array.isArray(quotations) && quotations.length > 0) {
    if (order?.quotationId) {
      const matchQuote = quotations.find(q => q.id === order.quotationId);
      if (matchQuote?.items) {
        const itemMatch = matchQuote.items.find((qi: any) =>
          (qi.serviceId === item.serviceId || qi.serviceId === item.service_id) &&
          (!item.subServiceId || qi.subServiceId === item.subServiceId || qi.subServiceId === item.sub_service_id)
        );
        if (itemMatch?.projectName && itemMatch.projectName.trim()) {
          return itemMatch.projectName.trim();
        }
      }
    }

    if (order?.companyName) {
      const companyQuotes = quotations.filter(q => q.companyName?.toLowerCase() === order.companyName?.toLowerCase());
      for (const q of companyQuotes) {
        if (q.items) {
          const match = q.items.find((qi: any) =>
            (qi.serviceId === item.serviceId || qi.serviceId === item.service_id) ||
            (qi.serviceName?.toLowerCase() === (item.serviceName || item.service_name)?.toLowerCase())
          );
          if (match?.projectName && match.projectName.trim()) {
            return match.projectName.trim();
          }
        }
      }
    }

    for (const q of quotations) {
      if (q.items && Array.isArray(q.items)) {
        const match = q.items.find((qi: any) =>
          (qi.serviceId === item.serviceId || qi.serviceId === item.service_id) ||
          (qi.serviceName && item.serviceName && qi.serviceName.toLowerCase() === item.serviceName.toLowerCase())
        );
        if (match?.projectName && match.projectName.trim()) {
          return match.projectName.trim();
        }
      }
    }
  }

  return '';
}

function addItemsTable(doc: jsPDF, items: any[], gstSlab: number, taxType: string,
  supplierState: string, clientState: string, startY: number, title: string = 'QUOTATION',
  quotations?: Quotation[], order?: Order, theme: PDFTheme = THEMES['QUOTATION']): number {

  const isSameState = supplierState && clientState && supplierState.toLowerCase() === clientState.toLowerCase();
  const safeItems = Array.isArray(items) ? items : [];

  const tableBody = safeItems.filter(i => i && i.status !== 'canceled').map((item, idx) => {
    const qty = Number(item.quantity || 1);
    const basePrice = Number(item.basePrice ?? item.base_price ?? 0);
    const gstRate = Number(item.gstRate ?? item.gst_rate ?? 0);
    const gstAmount = Number(item.gstAmount ?? item.gst_amount ?? 0);
    const totalPrice = Number(item.totalPrice ?? item.total_price ?? (basePrice + gstAmount));

    const sName = (item.serviceName || item.service_name || item.name || '').trim();
    const subName = (item.subServiceName || item.sub_service_name || '').trim();
    const projName = getProjectName(item, quotations, order).trim();

    // FORMAT: Service - Sub category - Project name (Single line)
    let description = sName;
    if (subName) description += ` - ${subName}`;
    if (projName) description += ` - ${projName}`;

    const totalBase = (basePrice * qty).toFixed(2);
    const totalGst = (gstAmount * qty).toFixed(2);
    const totalAmount = (totalPrice * qty).toFixed(2);

    return [
      idx + 1,
      description,
      item.hsnCode || item.hsn_code || '-',
      qty,
      `Rs.${basePrice.toFixed(2)}`,
      `Rs.${totalBase}`,
      `${gstRate}%`,
      `Rs.${totalGst}`,
      `Rs.${totalAmount}`,
    ];
  });

  const gstHeader = isSameState ? 'CGST+SGST' : 'IGST';

  autoTable(doc, {
    startY,
    theme: 'grid',
    head: [['#', 'Description of Services', 'HSN/SAC', 'Qty', 'Rate', 'Taxable Val', 'GST%', gstHeader, 'Total (Rs.)']],
    body: tableBody,
    styles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      cellPadding: 1.8,
      lineWidth: 0.3,
      lineColor: [203, 213, 225], // Slate-300 grid lines for body
      valign: 'middle',
    },
    headStyles: {
      fillColor: [...theme.primary], // Theme Primary Color for Table Header
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 6.5,
      cellPadding: 1.8,
      lineWidth: 0.3,
      lineColor: [255, 255, 255], // White vertical grid lines separating header columns
      halign: 'center',
      valign: 'middle',
    },
    alternateRowStyles: { fillColor: [...theme.lightBg] },
    columnStyles: {
      0: { cellWidth: 6, halign: 'center' },
      1: { cellWidth: 52, halign: 'left' },
      2: { cellWidth: 17, halign: 'center' }, // 17mm guarantees "HSN/SAC" on 1 line!
      3: { cellWidth: 9, halign: 'center' },  // 9mm guarantees "Qty" on 1 line!
      4: { cellWidth: 21, halign: 'right' },  // 21mm guarantees "Rs.111.00" on 1 line!
      5: { cellWidth: 21, halign: 'right' },  // 21mm guarantees "Rs.111.00" on 1 line!
      6: { cellWidth: 11, halign: 'center' }, // 11mm guarantees "GST%" on 1 line!
      7: { cellWidth: 21, halign: 'right' },  // 21mm guarantees "Rs.19.98" on 1 line!
      8: { cellWidth: 28, halign: 'right' },  // 28mm guarantees "Rs.130.98" on 1 line!
    },
    margin: { left: 12, right: 12 },
  });

  return (doc as any).lastAutoTable.finalY + 6;
}

/**
 * Perfectly aligned side-by-side Summary & Left Information Cards.
 */
function addSummaryBlock(doc: jsPDF, baseAmount: number, gstAmount: number, totalAmount: number,
  supplierState: string, clientState: string, startY: number, title: string = 'QUOTATION',
  bankSettings?: PDFSettings, order?: Order, theme: PDFTheme = THEMES['QUOTATION']): number {

  const pageWidth = doc.internal.pageSize.getWidth();
  const isSameState = supplierState && clientState && supplierState.toLowerCase() === clientState.toLowerCase();

  const safeBase = Number(baseAmount || 0);
  const safeGst = Number(gstAmount || 0);
  const safeTotal = Number(totalAmount || 0);

  // Geometry Coordinates
  const leftX = 12;
  const leftWidth = 98; // X: 12 to 110mm

  const rightWidth = 82; // X: 116 to 198mm
  const rightX = pageWidth - 12 - rightWidth; // 116mm

  let currentY = startY;

  // 1. Right Side: Tax Summary Box
  const summaryBoxHeight = isSameState ? 34 : 28;
  const pillHeight = 9.5;
  const topSectionHeight = summaryBoxHeight - pillHeight;
  const pillY = currentY + topSectionHeight;

  // Step A: Draw full card background with 2mm rounded corners filled in Primary Theme Color
  doc.setFillColor(...theme.primary);
  doc.roundedRect(rightX, currentY, rightWidth, summaryBoxHeight, 2, 2, 'F');

  // Step B: Draw top section in White with 2mm top rounded corners
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(rightX, currentY, rightWidth, topSectionHeight, 2, 2, 'F');
  doc.rect(rightX, currentY + 2, rightWidth, topSectionHeight - 2, 'F'); // Flatten bottom of top white section

  // Step C: Draw outer rounded border stroke over the entire card
  doc.setDrawColor(...theme.borderColor);
  doc.setLineWidth(0.4);
  doc.roundedRect(rightX, currentY, rightWidth, summaryBoxHeight, 2, 2, 'S');

  // Step D: Draw horizontal divider line separating top section from bottom banner
  doc.line(rightX, pillY, rightX + rightWidth, pillY);

  const rightPadding = 5;
  const rightLabelX = rightX + rightPadding;
  const rightValueX = rightX + rightWidth - rightPadding;

  let ry = currentY + 5.5;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);

  doc.text('Taxable Value (Sub Total):', rightLabelX, ry);
  doc.text(`Rs.${safeBase.toFixed(2)}`, rightValueX, ry, { align: 'right' });
  ry += 4.5;

  if (isSameState) {
    const halfGst = safeGst / 2;
    const gstPctHalf = safeBase > 0 ? (safeGst / safeBase * 50).toFixed(1) : '0.0';
    doc.text(`CGST (${gstPctHalf}%):`, rightLabelX, ry);
    doc.text(`Rs.${halfGst.toFixed(2)}`, rightValueX, ry, { align: 'right' });
    ry += 4.5;
    doc.text(`SGST (${gstPctHalf}%):`, rightLabelX, ry);
    doc.text(`Rs.${halfGst.toFixed(2)}`, rightValueX, ry, { align: 'right' });
  } else {
    const gstPct = safeBase > 0 ? (safeGst / safeBase * 100).toFixed(1) : '0.0';
    doc.text(`IGST (${gstPct}%):`, rightLabelX, ry);
    doc.text(`Rs.${safeGst.toFixed(2)}`, rightValueX, ry, { align: 'right' });
  }

  // TOTAL AMOUNT Text inside Bottom Banner
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.text('TOTAL AMOUNT:', rightLabelX, pillY + 6.2);
  doc.text(`Rs.${safeTotal.toFixed(2)}`, rightValueX, pillY + 6.2, { align: 'right' });

  // 2. Left Side: Amount In Words Card
  doc.setDrawColor(...theme.borderColor);
  doc.setFillColor(...theme.lightBg);
  const words = numberToWords(safeTotal);
  const wordsLines = doc.splitTextToSize(`Amount in words: ${words}`, leftWidth - 8);
  const wordsBoxHeight = Math.max(12, (wordsLines.length * 3.3) + 4);

  doc.roundedRect(leftX, currentY, leftWidth, wordsBoxHeight, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...theme.primary);
  doc.text(wordsLines, leftX + 4, currentY + 4.5);

  let leftY = currentY + wordsBoxHeight + 3;

  // 3. Left Side: Bank Details / Payment Status Box
  if (title === 'PROFORMA INVOICE' && bankSettings) {
    let bankFields = [];
    if (bankSettings.bankName) bankFields.push(`Bank: ${bankSettings.bankName}`);
    if (bankSettings.accountNo) bankFields.push(`A/C No: ${bankSettings.accountNo}`);
    if (bankSettings.ifsc) bankFields.push(`IFSC: ${bankSettings.ifsc}`);
    if (bankSettings.branch) bankFields.push(`Branch: ${bankSettings.branch}`);
    if (bankSettings.upiId) bankFields.push(`UPI: ${bankSettings.upiId}`);

    const piNoteText = "Note : Pixel Web Pages is a unit of addy fitness group so you can pay using this Account";
    const piNoteLines = doc.splitTextToSize(piNoteText, leftWidth - 8);

    const bankHeight = 8 + (bankFields.length * 3.5) + (piNoteLines.length * 3.2) + 2;
    doc.setDrawColor(...theme.borderColor);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(leftX, leftY, leftWidth, bankHeight, 1.5, 1.5, 'FD');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...theme.primary);
    doc.text('BANK DETAILS FOR PAYMENT', leftX + 4, leftY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(7);
    let bty = leftY + 8.5;
    bankFields.forEach(field => {
      doc.text(field, leftX + 4, bty);
      bty += 3.5;
    });

    // Proforma Invoice Note
    bty += 1;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...theme.primary);
    doc.setFontSize(6.8);
    doc.text(piNoteLines, leftX + 4, bty);

    leftY += bankHeight + 3;
  } else if (title === 'PURCHASE ORDER' && order) {
    const paidAmt = Number(order.paidAmount || 0);
    const pendAmt = Number(order.pendingAmount || 0);
    const poBoxHeight = 13;

    doc.setDrawColor(...theme.borderColor);
    doc.setFillColor(...theme.lightBg);
    doc.roundedRect(leftX, leftY, leftWidth, poBoxHeight, 1.5, 1.5, 'FD');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...theme.primary);
    doc.text(`Paid Amount: Rs.${paidAmt.toFixed(2)}`, leftX + 4, leftY + 5);
    doc.text(`Pending Balance: Rs.${pendAmt.toFixed(2)}`, leftX + 4, leftY + 9.5);
    leftY += poBoxHeight + 3;
  }

  const nextY = Math.max(leftY, currentY + summaryBoxHeight + 4);
  return nextY;
}

function addDeclarationAndSignatory(doc: jsPDF, rawSettings: PDFSettings, startY: number, theme: PDFTheme = THEMES['QUOTATION']) {
  const settings = getSafeSettings(rawSettings);
  const pageWidth = doc.internal.pageSize.getWidth();

  let dy = startY + 6;

  // Left Side: Declaration Text
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 116, 139);
  doc.text('Declaration: We declare that this invoice shows the actual price of the goods/services', 12, dy + 4);
  doc.text('described above and that all particulars are true and correct.', 12, dy + 7.5);

  // Right Side: Authorized Signatory Box (With Embedded Signature Image)
  const sigBoxX = pageWidth - 12 - 60; // X: 138 to 198mm
  const sigBoxWidth = 60;
  const sigBoxHeight = 26;

  doc.setDrawColor(...theme.borderColor);
  doc.setFillColor(255, 255, 255);
  doc.setLineWidth(0.4);
  doc.roundedRect(sigBoxX, dy, sigBoxWidth, sigBoxHeight, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('For ' + (settings.companyName || 'PIXEL WEB PAGES'), sigBoxX + (sigBoxWidth / 2), dy + 4.5, { align: 'center' });

  // Draw Signature Image (Square 1:1 Aspect Ratio, Unsquished)
  try {
    const sigImgSquareSize = 15; // 15mm x 15mm Perfect Square
    const sigImgX = sigBoxX + (sigBoxWidth - sigImgSquareSize) / 2;
    doc.addImage(DEFAULT_SIGNATURE_BASE64, 'PNG', sigImgX, dy + 5.5, sigImgSquareSize, sigImgSquareSize, undefined, 'FAST');
  } catch {
    // Fallback space for signature
  }

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(7.5);
  doc.text('Authorized Signatory', sigBoxX + (sigBoxWidth / 2), dy + 22.5, { align: 'center' });
}

function addFooter(doc: jsPDF, notes?: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;

  if (notes) {
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.text('Terms & Conditions:', margin, pageHeight - 16);
    doc.text(notes.substring(0, 120), margin, pageHeight - 12);
  }

  // Footer Divider Line
  doc.setDrawColor(221, 214, 254);
  doc.setLineWidth(0.4);
  doc.line(12, pageHeight - 10, pageWidth - 12, pageHeight - 10);

  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'italic');
  doc.text(FOOTER_TEXT, pageWidth / 2, pageHeight - 5, { align: 'center' });
}

// ─── EXPORT PDF GENERATION FUNCTIONS ──────────────────────────────────────────

export function generateQuotationPDF(quotation: Quotation, rawSettings?: PDFSettings) {
  try {
    const settings = getSafeSettings(rawSettings, 'QUOTATION');
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const title = settings.heading || 'QUOTATION';
    const theme = getTheme('QUOTATION');

    addBackgroundDesign(doc, theme);
    const yStart = addHeader(doc, settings, title, quotation.quoteNumber, quotation.date, theme);

    const y1 = addBillToFrom(doc, settings, {
      companyName: quotation.companyName,
      contactName: quotation.contactName,
      address: quotation.companyAddress,
      email: quotation.email,
      mobile: quotation.mobileNumber,
      gstNumber: quotation.gstNumber,
      state: quotation.state,
      country: quotation.country,
    }, yStart, title, theme);

    const supplierState = settings.state || settings.companyState || '';
    const y2 = addItemsTable(doc, quotation.items || [], quotation.gstSlab, quotation.taxType,
      supplierState, quotation.state, y1, title, [quotation], undefined, theme);

    const y3 = addSummaryBlock(doc, quotation.baseAmount, quotation.gstAmount, quotation.totalAmount,
      supplierState, quotation.state, y2, title, settings, undefined, theme);

    addDeclarationAndSignatory(doc, settings, y3, theme);
    addFooter(doc);
    doc.save(`Quotation_${quotation.quoteNumber || 'Document'}.pdf`);
  } catch (err) {
    console.error('Error generating Quotation PDF:', err);
    alert('Failed to generate Quotation PDF. Please check console for details.');
  }
}

export function generatePOPDF(order: Order, rawSettings?: PDFSettings, quotations?: Quotation[]) {
  try {
    const settings = getSafeSettings(rawSettings, 'PURCHASE ORDER');
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const title = settings.heading || 'PURCHASE ORDER';
    const theme = getTheme('PURCHASE ORDER');

    addBackgroundDesign(doc, theme);
    const yStart = addHeader(doc, settings, title, order.orderNumber, order.date, theme);
    const supplierState = settings.state || settings.companyState || '';

    const y1 = addBillToFrom(doc, settings, {
      companyName: order.companyName,
      contactName: order.contactName,
      address: order.companyAddress,
      email: order.email,
      mobile: order.mobileNumber,
      gstNumber: order.gstNumber,
      state: order.state,
      country: order.country,
    }, yStart, title, theme);

    const y2 = addItemsTable(doc, order.services || [], order.gstSlab, order.taxType,
      supplierState, order.state, y1, title, quotations, order, theme);

    const y3 = addSummaryBlock(doc, order.baseAmount, order.gstAmount, order.totalAmount,
      supplierState, order.state, y2, title, settings, order, theme);

    addDeclarationAndSignatory(doc, settings, y3, theme);
    addFooter(doc);
    doc.save(`PO_${order.orderNumber || 'Document'}.pdf`);
  } catch (err) {
    console.error('Error generating Purchase Order PDF:', err);
    alert('Failed to generate Purchase Order PDF. Please check console for details.');
  }
}

export function generatePIPDF(order: Order, rawSettings?: PDFSettings, quotations?: Quotation[]) {
  try {
    const settings = getSafeSettings(rawSettings, 'PROFORMA INVOICE');
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const title = settings.heading || 'PROFORMA INVOICE';
    const theme = getTheme('PROFORMA INVOICE');

    addBackgroundDesign(doc, theme);
    const yStart = addHeader(doc, settings, title, order.orderNumber, order.date, theme);
    const supplierState = settings.state || settings.companyState || '';

    const y1 = addBillToFrom(doc, settings, {
      companyName: order.companyName,
      contactName: order.contactName,
      address: order.companyAddress,
      email: order.email,
      mobile: order.mobileNumber,
      gstNumber: order.gstNumber,
      state: order.state,
      country: order.country,
    }, yStart, title, theme);

    const y2 = addItemsTable(doc, order.services || [], order.gstSlab, order.taxType,
      supplierState, order.state, y1, title, quotations, order, theme);

    const y3 = addSummaryBlock(doc, order.baseAmount, order.gstAmount, order.totalAmount,
      supplierState, order.state, y2, title, settings, order, theme);

    addDeclarationAndSignatory(doc, settings, y3, theme);
    addFooter(doc);
    doc.save(`PI_${order.orderNumber || 'Document'}.pdf`);
  } catch (err) {
    console.error('Error generating Proforma Invoice PDF:', err);
    alert('Failed to generate Proforma Invoice PDF. Please check console for details.');
  }
}

export function generateTaxInvoicePDF(order: Order, rawSettings?: PDFSettings, quotations?: Quotation[]) {
  try {
    const settings = getSafeSettings(rawSettings, 'TAX INVOICE');
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const title = settings.heading || 'TAX INVOICE';
    const theme = getTheme('TAX INVOICE');

    addBackgroundDesign(doc, theme);
    const yStart = addHeader(doc, settings, title, order.orderNumber, order.date, theme);
    const supplierState = settings.state || settings.companyState || '';

    const y1 = addBillToFrom(doc, settings, {
      companyName: order.companyName,
      contactName: order.contactName,
      address: order.companyAddress,
      email: order.email,
      mobile: order.mobileNumber,
      gstNumber: order.gstNumber,
      state: order.state,
      country: order.country,
    }, yStart, title, theme);

    const y2 = addItemsTable(doc, order.services || [], order.gstSlab, order.taxType,
      supplierState, order.state, y1, title, quotations, order, theme);

    const y3 = addSummaryBlock(doc, order.baseAmount, order.gstAmount, order.totalAmount,
      supplierState, order.state, y2, title, settings, order, theme);

    addDeclarationAndSignatory(doc, settings, y3, theme);
    addFooter(doc);
    doc.save(`TaxInvoice_${order.orderNumber || 'Document'}.pdf`);
  } catch (err) {
    console.error('Error generating Tax Invoice PDF:', err);
    alert('Failed to generate Tax Invoice PDF. Please check console for details.');
  }
}
