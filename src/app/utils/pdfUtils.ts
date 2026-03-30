import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Quotation, Order, PDFSettings } from '../types/index';
import { numberToWords } from './helpers';

const FOOTER_TEXT = 'CRM Powered By Pixel Web Pages | www.pixelwebpages.com';
const BRAND_R = 79, BRAND_G = 70, BRAND_B = 229; // Indigo

function setColor(doc: jsPDF, method: 'fill' | 'text' | 'draw', r: number, g: number, b: number) {
  if (method === 'fill') doc.setFillColor(r, g, b);
  else if (method === 'text') doc.setTextColor(r, g, b);
  else doc.setDrawColor(r, g, b);
}

function addHeader(doc: jsPDF, settings: PDFSettings, title: string, docNumber: string, docDate: string) {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Background header bar
  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, pageWidth, 42, 'F');

  // Logo area (left) - Proper square-ish logo size
  const logoSize = 18;
  if (settings.logoUrl) {
    try {
      doc.addImage(settings.logoUrl, 'PNG', 12, 12, logoSize, logoSize);
    } catch {
      doc.setFontSize(16);
      setColor(doc, 'text', BRAND_R, BRAND_G, BRAND_B);
      doc.setFont('helvetica', 'bold');
      doc.text(settings.companyName || 'PIXEL', 12, 22);
    }
  } else {
    doc.setFontSize(16);
    setColor(doc, 'text', BRAND_R, BRAND_G, BRAND_B);
    doc.setFont('helvetica', 'bold');
    doc.text(settings.companyName || 'PIXEL', 12, 22);
  }

  // Title (right, large)
  doc.setFontSize(24);
  setColor(doc, 'text', BRAND_R, BRAND_G, BRAND_B);
  doc.setFont('helvetica', 'bold');
  doc.text(title, pageWidth - 12, 22, { align: 'right' });

  // Document number and date
  doc.setFontSize(9.5);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.text(`NO: ${docNumber}`, pageWidth - 12, 30, { align: 'right' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`DATE: ${docDate}`, pageWidth - 12, 36, { align: 'right' });

  // Company details (Beside Logo)
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');
  let y = 15;
  const infoX = 12 + logoSize + 4;
  const maxWidth = (pageWidth / 2) - infoX;

  if (settings.address) {
    const lines = doc.splitTextToSize(settings.address, maxWidth);
    doc.text(lines, infoX, y);
    y += (lines.length * 3.5);
  }
  if (settings.phone) { doc.text(`Ph: ${settings.phone}`, infoX, y); y += 3.5; }
  if (settings.email) { doc.text(`Email: ${settings.email}`, infoX, y); y += 3.5; }
  if (settings.gstNumber) {
    doc.setFont('helvetica', 'bold');
    doc.text(`GSTIN: ${settings.gstNumber}`, infoX, y);
  }

  // Divider
  setColor(doc, 'draw', BRAND_R, BRAND_G, BRAND_B);
  doc.setLineWidth(0.6);
  doc.line(12, 45, pageWidth - 12, 45);
}

function addBillToFrom(doc: jsPDF, fromSettings: PDFSettings, toData: {
  companyName: string; contactName: string; address: string;
  email: string; mobile: string; gstNumber?: string; state: string; country: string;
}, startY: number): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const colWidth = (pageWidth - 20) / 2 - 5;
  const padding = 4;

  // Calculate heights
  doc.setFontSize(8);
  const fromAddrLines = fromSettings.address ? doc.splitTextToSize(fromSettings.address, colWidth - 8) : [];
  const toAddrLines = toData.address ? doc.splitTextToSize(toData.address, colWidth - 8) : [];

  const fromInfoCount = 1 + (fromSettings.phone ? 1 : 0) + (fromSettings.email ? 1 : 0) + (fromSettings.gstNumber ? 1 : 0);
  const toInfoCount = 2 + (toData.mobile ? 1 : 0) + (toData.email ? 1 : 0) + (toData.gstNumber ? 1 : 0) + 0.5; // Adjusted

  const fromHeight = 12 + (fromAddrLines.length * 3.8) + (fromInfoCount * 4.2);
  const toHeight = 12 + (toAddrLines.length * 3.8) + (toInfoCount * 4.2);
  const boxHeight = Math.max(38, fromHeight, toHeight);

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  setColor(doc, 'text', BRAND_R, BRAND_G, BRAND_B);
  doc.text('BILL FROM', 12, startY + 5);
  doc.text('BILL TO', pageWidth / 2 + 5, startY + 5);

  // From box
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(12, startY + 8, colWidth, boxHeight, 1.5, 1.5, 'FD');

  // To box
  doc.roundedRect(pageWidth / 2 + 5, startY + 8, colWidth, boxHeight, 1.5, 1.5, 'FD');

  // FROM content
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.text(fromSettings.companyName || '', 16, startY + 15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  let fy = startY + 20;
  if (fromAddrLines.length > 0) {
    doc.text(fromAddrLines, 16, fy);
    fy += (fromAddrLines.length * 3.8);
  }
  fy += 2;
  if (fromSettings.phone) { doc.text(`Ph: ${fromSettings.phone}`, 16, fy); fy += 4; }
  if (fromSettings.email) { doc.text(fromSettings.email, 16, fy); fy += 4; }
  if (fromSettings.gstNumber) {
    doc.setFont('helvetica', 'bold');
    doc.text(`GSTIN: ${fromSettings.gstNumber}`, 16, fy);
    doc.setFont('helvetica', 'normal');
  }

  // TO content
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.text(toData.companyName || '', pageWidth / 2 + 9, startY + 15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  let ty = startY + 20;
  doc.setFont('helvetica', 'bold');
  doc.text(toData.contactName || '', pageWidth / 2 + 9, ty); ty += 4.5;
  doc.setFont('helvetica', 'normal');
  if (toAddrLines.length > 0) {
    doc.text(toAddrLines, pageWidth / 2 + 9, ty);
    ty += (toAddrLines.length * 3.8);
  }
  ty += 2;
  if (toData.mobile) { doc.text(`Ph: ${toData.mobile}`, pageWidth / 2 + 9, ty); ty += 4; }
  if (toData.email) { doc.text(toData.email, pageWidth / 2 + 9, ty); ty += 4; }
  if (toData.gstNumber) {
    doc.setFont('helvetica', 'bold');
    doc.text(`GSTIN: ${toData.gstNumber}`, pageWidth / 2 + 9, ty);
    doc.setFont('helvetica', 'normal');
    ty += 4;
  }
  doc.text(`${toData.state}, ${toData.country}`, pageWidth / 2 + 9, ty);

  return startY + 7 + boxHeight + 5;
}

function addItemsTable(doc: jsPDF, items: any[], gstSlab: number, taxType: string,
  supplierState: string, clientState: string, startY: number): number {

  const isSameState = supplierState && clientState && supplierState.toLowerCase() === clientState.toLowerCase();

  const tableBody = items.filter(i => i.status !== 'canceled').map((item, idx) => {
    const totalGst = (item.gstAmount * item.quantity).toFixed(2);
    return [
      idx + 1,
      `${item.serviceName || item.name || ''}\n${item.subServiceName || ''}`,
      item.hsnCode || '-',
      item.quantity,
      `Rs.${(item.basePrice).toFixed(2)}`,
      `${item.gstRate}%`,
      `Rs.${totalGst}`,
      `Rs.${(item.totalPrice * item.quantity).toFixed(2)}`,
    ];
  });

  const gstHeader = isSameState ? 'CGST+SGST' : 'IGST';

  autoTable(doc, {
    startY,
    head: [['#', 'Description', 'HSN/SAC', 'Qty', 'Rate (Rs.)', 'GST%', gstHeader, 'Amount (Rs.)']],
    body: tableBody,
    headStyles: {
      fillColor: [BRAND_R, BRAND_G, BRAND_B],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 50 },
      2: { cellWidth: 22, halign: 'center' },
      3: { cellWidth: 10, halign: 'center' },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 15, halign: 'center' },
      6: { cellWidth: 28, halign: 'right' },
      7: { cellWidth: 28, halign: 'right' },
    },
    margin: { left: 12, right: 12 },
  });

  return (doc as any).lastAutoTable.finalY + 12;
}

function addSummary(doc: jsPDF, baseAmount: number, gstAmount: number, totalAmount: number,
  supplierState: string, clientState: string, startY: number): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const isSameState = supplierState && clientState && supplierState.toLowerCase() === clientState.toLowerCase();

  const margin = 12; // Standard margin
  const tableWidth = 186; // Sum of column widths
  const tableRight = margin + tableWidth; // 12 + 186 = 198mm

  const summaryWidth = 80;
  const boxX = tableRight - summaryWidth; // Align with table right edge
  const contentPadding = 6;
  const labelX = boxX + contentPadding;
  const valueX = tableRight - contentPadding;

  let y = startY;

  // Draw Summary Box
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.setLineWidth(0.2);
  doc.roundedRect(boxX, y - 5, summaryWidth, isSameState ? 38 : 32, 1.5, 1.5, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);

  doc.text('Sub Total:', labelX, y + 3);
  doc.text(`Rs.${baseAmount.toFixed(2)}`, valueX, y + 3, { align: 'right' });
  y += 7;

  if (isSameState) {
    const halfGst = gstAmount / 2;
    const gstPctHalf = baseAmount > 0 ? (gstAmount / baseAmount * 50).toFixed(1) : '0.0';
    doc.text(`CGST (${gstPctHalf}%):`, labelX, y + 3);
    doc.text(`Rs.${halfGst.toFixed(2)}`, valueX, y + 3, { align: 'right' });
    y += 7;
    doc.text(`SGST (${gstPctHalf}%):`, labelX, y + 3);
    doc.text(`Rs.${halfGst.toFixed(2)}`, valueX, y + 3, { align: 'right' });
    y += 7;
  } else {
    const gstPct = baseAmount > 0 ? (gstAmount / baseAmount * 100).toFixed(1) : '0.0';
    doc.text(`IGST (${gstPct}%):`, labelX, y + 3);
    doc.text(`Rs.${gstAmount.toFixed(2)}`, valueX, y + 3, { align: 'right' });
    y += 7;
  }

  // Divider inside box
  setColor(doc, 'draw', BRAND_R, BRAND_G, BRAND_B);
  doc.setLineWidth(0.4);
  doc.line(labelX, y + 2, valueX, y + 2);
  y += 7;

  // Grand Total
  doc.setFont('helvetica', 'bold');
  setColor(doc, 'text', BRAND_R, BRAND_G, BRAND_B);
  doc.setFontSize(10.5);
  doc.text('GRAND TOTAL:', labelX, y + 2);
  doc.text(`Rs.${totalAmount.toFixed(2)}`, valueX, y + 2, { align: 'right' });
  y += 12;

  // Amount in words (Outside box, aligned to margin)
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  const words = numberToWords(totalAmount);
  const wordsLines = doc.splitTextToSize(`Amount in words: ${words}`, pageWidth - (margin * 2));
  doc.text(wordsLines, margin, y);

  return y + (wordsLines.length * 4);
}

function addFooter(doc: jsPDF, notes?: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;

  if (notes) {
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.text('Terms & Conditions:', margin, pageHeight - 22);
    doc.text(notes.substring(0, 120), margin, pageHeight - 18);
  }

  doc.setFillColor(248, 250, 252);
  doc.rect(0, pageHeight - 12, pageWidth, 12, 'F');
  setColor(doc, 'draw', BRAND_R, BRAND_G, BRAND_B);
  doc.setLineWidth(0.4);
  doc.line(0, pageHeight - 12, pageWidth, pageHeight - 12);

  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'italic');
  doc.text(FOOTER_TEXT, pageWidth / 2, pageHeight - 5, { align: 'center' });
}

// ─── QUOTATION PDF ───────────────────────────────────────────────────────────
export function generateQuotationPDF(quotation: Quotation, settings: PDFSettings) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  addHeader(doc, settings, settings.heading || 'QUOTATION', quotation.quoteNumber, quotation.date);

  const y1 = addBillToFrom(doc, settings, {
    companyName: quotation.companyName,
    contactName: quotation.contactName,
    address: quotation.companyAddress,
    email: quotation.email,
    mobile: quotation.mobileNumber,
    gstNumber: quotation.gstNumber,
    state: quotation.state,
    country: quotation.country,
  }, 50);

  const supplierState = settings.state || settings.companyState || '';
  const y2 = addItemsTable(doc, quotation.items, quotation.gstSlab, quotation.taxType,
    supplierState, quotation.state, y1 + 4);

  addSummary(doc, quotation.baseAmount, quotation.gstAmount, quotation.totalAmount,
    supplierState, quotation.state, y2);

  addFooter(doc);
  doc.save(`Quotation_${quotation.quoteNumber}.pdf`);
}

// ─── PO / PROFORMA INVOICE PDF ───────────────────────────────────────────────
export function generatePOPDF(order: Order, settings: PDFSettings) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  addHeader(doc, settings, settings.heading || 'PURCHASE ORDER', order.orderNumber, order.date);

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
  }, 50);

  const y2 = addItemsTable(doc, order.services, order.gstSlab, order.taxType,
    supplierState, order.state, y1 + 4);

  const y3 = addSummary(doc, order.baseAmount, order.gstAmount, order.totalAmount,
    supplierState, order.state, y2);

  // Payment status
  doc.setFillColor(236, 253, 245);
  doc.roundedRect(10, y3 + 2, 80, 16, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(5, 150, 105);
  doc.text(`Paid: Rs.${order.paidAmount.toFixed(2)}`, 14, y3 + 8);
  doc.text(`Pending: Rs.${order.pendingAmount.toFixed(2)}`, 14, y3 + 14);

  addFooter(doc);
  doc.save(`PO_${order.orderNumber}.pdf`);
}

// ─── PROFORMA INVOICE PDF ─────────────────────────────────────────────────────
export function generatePIPDF(order: Order, settings: PDFSettings) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  addHeader(doc, settings, settings.heading || 'PROFORMA INVOICE', order.orderNumber, order.date);

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
  }, 50);

  const y2 = addItemsTable(doc, order.services, order.gstSlab, order.taxType,
    supplierState, order.state, y1 + 4);

  const y3 = addSummary(doc, order.baseAmount, order.gstAmount, order.totalAmount,
    supplierState, order.state, y2);

  // Bank Details
  let bankFields = [];
  if ((settings as any).bankName) bankFields.push(`Bank: ${(settings as any).bankName}`);
  if ((settings as any).accountNo) bankFields.push(`A/C No: ${(settings as any).accountNo}`);
  if ((settings as any).ifsc) bankFields.push(`IFSC: ${(settings as any).ifsc}`);
  if ((settings as any).branch) bankFields.push(`Branch: ${(settings as any).branch}`);
  if ((settings as any).upiId) bankFields.push(`UPI: ${(settings as any).upiId}`);

  if (bankFields.length > 0) {
    let by = y3 + 6;
    const boxHeight = 10 + (bankFields.length * 5);

    doc.setDrawColor(BRAND_R, BRAND_G, BRAND_B);
    doc.setFillColor(239, 246, 255);
    doc.roundedRect(10, by, 95, boxHeight, 2, 2, 'FD');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    setColor(doc, 'text', BRAND_R, BRAND_G, BRAND_B);
    doc.text('BANK DETAILS', 14, by + 6);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(8);
    let ty = by + 11;
    bankFields.forEach(field => {
      doc.text(field, 14, ty);
      ty += 5;
    });
  }

  addFooter(doc);
  doc.save(`PI_${order.orderNumber}.pdf`);
}

// ─── TAX INVOICE PDF ─────────────────────────────────────────────────────────
export function generateTaxInvoicePDF(order: Order, settings: PDFSettings) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  addHeader(doc, settings, settings.heading || 'TAX INVOICE', order.orderNumber, order.date);

  // GSTIN prominent display
  if (settings.gstNumber) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(`GSTIN: ${settings.gstNumber}`, pageWidth - 10, 42, { align: 'right' });
  }

  // Place of supply
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Place of Supply: ${order.state || 'N/A'}`, 10, 42);

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
  }, 50);

  const y2 = addItemsTable(doc, order.services, order.gstSlab, order.taxType,
    supplierState, order.state, y1 + 4);

  const y3 = addSummary(doc, order.baseAmount, order.gstAmount, order.totalAmount,
    supplierState, order.state, y2);

  // Declaration
  let dy = y3 + 6;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 116, 139);
  doc.text('Declaration: We declare that this invoice shows the actual price of the goods/services described above', 10, dy);
  doc.text('and that all particulars are true and correct as per the books of accounts.', 10, dy + 4);

  // Authorized Signatory Box
  doc.setDrawColor(200, 200, 200);
  doc.rect(pageWidth - 60, dy, 50, 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('For ' + (settings.companyName || ''), pageWidth - 35, dy + 6, { align: 'center' });
  doc.text('Authorized Signatory', pageWidth - 35, dy + 17, { align: 'center' });

  addFooter(doc);
  doc.save(`TaxInvoice_${order.orderNumber}.pdf`);
}
