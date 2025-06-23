// File: src/frontend/utils/pdfGenerator.js
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateInvoicePdf = (invoice, frontendOrigin, paymentUrl) => {
  const doc = new jsPDF();
  const link = paymentUrl || `${frontendOrigin}/invoice/${invoice.invoice_id}`;

  // Professional fintech color palette
  const brandPrimary   = [74, 85, 104];   // #4A5568
  const lightGray      = [248, 250, 252]; // #F8FAFC
  const mediumGray     = [226, 232, 240]; // #E2E8F0
  const darkGray       = [45, 55, 72];    // #2D3748
  const textSecondary  = [113, 128, 150]; // #718096

  // === HEADER ===
  doc.setFillColor(...lightGray);
  doc.rect(0, 0, 210, 40, 'F');
  doc.setFont('helvetica', 'bold').setFontSize(24).setTextColor(...brandPrimary);
  doc.text('INVOICE', 14, 25);

  doc.setFillColor(255,255,255);
  doc.rect(130,12,65,25,'F');
  doc.setDrawColor(...mediumGray).setLineWidth(0.5);
  doc.rect(130,12,65,25,'S');
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...darkGray);
  doc.text(`Invoice #: ${invoice.invoice_number}`, 135,19);
  doc.text(`Issue Date: ${new Date(invoice.issue_date).toLocaleDateString()}`, 135,25);
  doc.text(`Due Date:   ${new Date(invoice.due_date).toLocaleDateString()}`, 135,31);

  // === PARTIES ===
  doc.setFont('helvetica','bold').setFontSize(11).setTextColor(...darkGray);
  doc.text('FROM', 14,55);
  doc.setFont('helvetica','normal').setFontSize(10).setTextColor(...darkGray);
  doc.text(`${invoice.user_first_name} ${invoice.user_last_name}`, 14,62);
  if (invoice.user_email) {
    doc.setTextColor(...textSecondary);
    doc.text(invoice.user_email, 14,68);
  }

  doc.setTextColor(...darkGray).setFont('helvetica','bold').setFontSize(11);
  doc.text('BILL TO', 14,85);
  doc.setFont('helvetica','normal').setFontSize(10).setTextColor(...darkGray);
  doc.text(invoice.client_name, 14,92);
  if (invoice.client_email) {
    doc.setTextColor(...textSecondary);
    doc.text(invoice.client_email, 14,98);
  }
  if (invoice.client_address) {
    const lines = doc.splitTextToSize(invoice.client_address, 80);
    doc.text(lines, 14,104);
  }

  // === LINE ITEMS TABLE ===
  const columns = ['Description','Qty','Rate','Amount'];
  const rows = invoice.items.map(item => [
    item.description,
    parseFloat(item.quantity).toFixed(0),
    `$${parseFloat(item.unit_price).toFixed(2)}`,
    `$${(parseFloat(item.quantity) * parseFloat(item.unit_price)).toFixed(2)}`
  ]);
  autoTable(doc, {
    head: [columns],
    body: rows,
    startY: 125,
    theme: 'plain',
    headStyles: {
      fillColor: brandPrimary,
      textColor: [255,255,255],
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'left'
    },
    bodyStyles: {
      fontSize: 9,
      textColor: darkGray,
      lineColor: mediumGray,
      lineWidth: 0.25
    },
    columnStyles: {
      0:{ cellWidth:90 },
      1:{ cellWidth:20, halign:'center' },
      2:{ cellWidth:30, halign:'right' },
      3:{ cellWidth:30, halign:'right' }
    },
    margin:{ left:14, right:14 }
  });

  // === TOTALS ===
  const finalY = doc.lastAutoTable.finalY + 20;
  const totalsX = 125, valueX = 195;
  doc.setFillColor(255,255,255).setDrawColor(...mediumGray).setLineWidth(0.25);
  doc.rect(totalsX-10, finalY-10, 85, 20, 'FD');
  const subtotal = invoice.items.reduce((sum,i) =>
    sum + parseFloat(i.quantity)*parseFloat(i.unit_price), 0);
  doc.setFont('helvetica','normal').setFontSize(10).setTextColor(...darkGray);
  doc.text('Subtotal', totalsX, finalY+5);
  doc.text(subtotal.toFixed(2), valueX, finalY+5, { align:'right' });
  const totalY = finalY + 30;  // extra padding
  doc.setDrawColor(...brandPrimary).setLineWidth(0.5);
  doc.line(totalsX, totalY-3, valueX, totalY-3);
  doc.setFont('helvetica','bold').setFontSize(12).setTextColor(...brandPrimary);
  doc.text('TOTAL DUE', totalsX, totalY);
  doc.text(parseFloat(invoice.total_amount).toFixed(2), valueX, totalY, { align:'right' });

  // === NOTES SECTION (full width, above payment) ===
  if (invoice.notes) {
    const notesY = totalY + 20;
    doc.setFont('helvetica','bold').setFontSize(9).setTextColor(...brandPrimary);
    doc.text('NOTES', 14, notesY);
    doc.setFont('helvetica','normal').setFontSize(8).setTextColor(...darkGray);
    const split = doc.splitTextToSize(invoice.notes, 182);
    doc.text(split, 14, notesY + 7);
  }

  // === PAYMENT INSTRUCTIONS ===
  const payY = (invoice.notes
    ? totalY + 20 + doc.splitTextToSize(invoice.notes, 182).length * 7 + 15
    : totalY + 25);

  doc.setFillColor(...lightGray);
  doc.rect(14, payY-8, 182, 45, 'F'); // taller box
  doc.setDrawColor(...mediumGray).setLineWidth(0.5);
  doc.rect(14, payY-8, 182, 45, 'S');
  doc.setFont('helvetica','bold').setFontSize(11).setTextColor(...brandPrimary);
  doc.text('PAYMENT INSTRUCTIONS', 20, payY);
  doc.setFont('helvetica','bold').setFontSize(9).setTextColor(...brandPrimary);
  doc.text('• Pay Online:', 20, payY+8);
  doc.setFont('helvetica','normal').setTextColor(30,144,255);
  doc.textWithLink('Click here to pay securely online', 60, payY+8, { url: link });
  const fee = parseFloat(invoice.total_amount)*0.03;
  const totalWithFee = parseFloat(invoice.total_amount)+fee;
  doc.setFontSize(8).setTextColor(...textSecondary);
  doc.text(`(3% processing fee applies — Total: ${totalWithFee.toFixed(2)})`, 62, payY+15);
  doc.setFont('helvetica','normal').setFontSize(9).setTextColor(...darkGray);
  doc.text('• Send Via Check: Please contact us directly.', 20, payY+25);

  // === FOOTER ===
  const pages = doc.internal.getNumberOfPages();
  doc.setFontSize(7).setTextColor(...textSecondary);
  for (let i=1; i<=pages; i++) {
    doc.setPage(i);
    doc.text(`Page ${i} of ${pages}`, 200, 285, { align:'right' });
    doc.text('Invoice powered by ChaseLess', 105, 285, { align:'center' });
  }

  doc.save(`Invoice-${invoice.invoice_number}.pdf`);
};
