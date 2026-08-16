import PDFDocument from 'pdfkit';

class InvoiceService {
  static HSN_CODES = {
    'tshirt': '6109', 't-shirt': '6109', 'tshirts': '6109',
    'polo': '6105', 'polo tshirt': '6105', 'polo t-shirt': '6105',
    'hoodie': '6110', 'hoodies': '6110', 'sweatshirt': '6110',
    'short': '6103', 'shorts': '6103', 'jogger': '6103', 'joggers': '6103',
    'sweatpants': '6103', 'pant': '6103', 'pants': '6103', 'trouser': '6103', 'trousers': '6103',
  };

  static getGSTRate(itemValue) {
    return itemValue <= 1000 ? 5 : 12;
  }

  static getHSNCode(productName, category) {
    const searchText = `${productName} ${category || ''}`.toLowerCase();
    for (const [key, code] of Object.entries(this.HSN_CODES)) {
      if (searchText.includes(key)) return code;
    }
    return '6109';
  }

  // GST-inclusive reverse calculation on the given amount.
  static calculateGST(amountIncludingGST, isSameState) {
    const gstRate = this.getGSTRate(amountIncludingGST);
    const gstAmount = (amountIncludingGST * gstRate) / (100 + gstRate);
    const taxableValue = amountIncludingGST - gstAmount;

    if (isSameState) {
      return {
        taxableValue: parseFloat(taxableValue.toFixed(2)),
        cgst: parseFloat((gstAmount / 2).toFixed(2)),
        sgst: parseFloat((gstAmount / 2).toFixed(2)),
        igst: 0,
        gstRate,
      };
    }
    return {
      taxableValue: parseFloat(taxableValue.toFixed(2)),
      cgst: 0,
      sgst: 0,
      igst: parseFloat(gstAmount.toFixed(2)),
      gstRate,
    };
  }

  static generateInvoiceNumber(orderId, deliveredDate) {
    const date = new Date(deliveredDate);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const orderIdString = typeof orderId === 'object' && orderId !== null ? orderId.toString() : String(orderId);
    const orderShort = orderIdString.slice(-8).toUpperCase();
    return `BYND/INV/${year}${month}/${orderShort}`;
  }

  static numberToWords(num) {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

    if (num === 0) return 'Zero';

    const convert = (n) => {
      if (n < 10) return ones[n];
      if (n < 20) return teens[n - 10];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
      if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '');
      if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
      if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
      return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
    };

    const rupees = Math.floor(num);
    const paise = Math.round((num - rupees) * 100);
    let words = 'Rupees ' + convert(rupees);
    if (paise > 0) words += ' and ' + convert(paise) + ' Paise';
    return words + ' Only';
  }

  static formatCurrency(amount) {
    return `Rs.${Number(amount).toFixed(2)}`;
  }

  static async generateInvoicePDF(order, user) {
    return new Promise((resolve, reject) => {
      try {
        const orderIdString = typeof order._id === 'object' && order._id !== null ? order._id.toString() : String(order._id);
        const invoiceNumber = order.invoiceNumber || this.generateInvoiceNumber(order._id, order.deliveredAt);
        const fileName = `Invoice_${invoiceNumber.replace(/\//g, '_')}.pdf`;

        const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => {
          try {
            resolve({ success: true, invoiceNumber, pdfBuffer: Buffer.concat(chunks), fileName });
          } catch (error) {
            reject(error);
          }
        });
        doc.on('error', reject);

        const isSameState = order.address?.state?.toLowerCase().includes('gujarat');

        // order.total is the actual amount paid (subtotal - discount + deliveryFee).
        const productSubtotal = order.subtotal;
        const discount = order.discountAmount || 0;
        const deliveryFee = order.deliveryFee || 0;
        const grandTotal = order.total;
        const gstDetails = this.calculateGST(grandTotal, isSameState);

        // HEADER
        doc.fontSize(22).font('Helvetica-Bold');
        doc.text('TAX INVOICE', 0, 50, { align: 'center', width: doc.page.width });
        doc.fontSize(10).font('Helvetica');
        doc.text('GST TAX INVOICE', 0, 78, { align: 'center', width: doc.page.width });
        doc.moveTo(50, 95).lineTo(545, 95).stroke();

        // Sold By
        let yPos = 110;
        doc.fontSize(11).font('Helvetica-Bold').text('Sold By: BYND OFFICIAL', 50, yPos);
        yPos += 20;
        doc.fontSize(9).font('Helvetica')
          .text('Address: 150, Mandir Faliya,', 50, yPos)
          .text('Gadaria, Valsad, 396055', 50, yPos + 12)
          .text('GSTIN: 24GFSPP3645P1ZG', 50, yPos + 24)
          .text('Email: support@byndofficial.in', 50, yPos + 36)
          .text('Contact: +91 9510136959', 50, yPos + 48);

        // Invoice details
        yPos = 110;
        const labelX = 330;
        const valueX = 430;
        const formatDate = (date) => {
          const d = new Date(date);
          return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        };

        doc.fontSize(9).font('Helvetica-Bold').text('Invoice No:', labelX, yPos, { width: 95 });
        doc.font('Helvetica').text(invoiceNumber, valueX, yPos, { width: 115 });
        yPos += 25;
        doc.font('Helvetica-Bold').text('Invoice Date:', labelX, yPos, { width: 95 });
        doc.font('Helvetica').text(formatDate(order.deliveredAt), valueX, yPos, { width: 115 });
        yPos += 18;
        doc.font('Helvetica-Bold').text('Order ID:', labelX, yPos, { width: 95 });
        doc.font('Helvetica').text(orderIdString.slice(-8).toUpperCase(), valueX, yPos, { width: 115 });
        yPos += 18;
        doc.font('Helvetica-Bold').text('Place of Supply:', labelX, yPos, { width: 95 });
        doc.font('Helvetica').text('Gujarat (24)', valueX, yPos, { width: 115 });

        doc.moveTo(50, 205).lineTo(545, 205).stroke();

        // Bill To
        yPos = 220;
        doc.fontSize(11).font('Helvetica-Bold').text('Bill To:', 50, yPos);
        yPos += 18;
        const addressLine = order.address.line1 + (order.address.line2 ? `, ${order.address.line2}` : '');
        doc.fontSize(9).font('Helvetica')
          .text(order.address.name || 'N/A', 50, yPos)
          .text(addressLine || 'N/A', 50, yPos + 12)
          .text(`${order.address.city}, ${order.address.state} - ${order.address.pincode}`, 50, yPos + 24)
          .text(`Contact: ${order.address.phone || 'N/A'}`, 50, yPos + 36);

        // Products table
        const tableTop = 300;
        doc.rect(50, tableTop, 495, 20).stroke();
        doc.fontSize(9).font('Helvetica-Bold');
        doc.text('S.No', 55, tableTop + 6);
        doc.text('Product Description', 90, tableTop + 6);
        doc.text('HSN', 280, tableTop + 6);
        doc.text('Qty', 325, tableTop + 6);
        doc.text('Rate (Rs.)', 360, tableTop + 6);
        doc.text('Amount (Rs.)', 445, tableTop + 6);

        let yPosition = tableTop + 20;
        doc.font('Helvetica');
        order.items.forEach((item, index) => {
          const hsnCode = this.getHSNCode(item.name, item.category);
          const rowHeight = 25;
          doc.rect(50, yPosition, 495, rowHeight).stroke();
          doc.text(index + 1, 55, yPosition + 8);
          const productDesc = item.size ? `${item.name} (${item.size})` : item.name;
          doc.text(productDesc, 90, yPosition + 8, { width: 180 });
          doc.text(hsnCode, 280, yPosition + 8);
          doc.text(item.quantity.toString(), 325, yPosition + 8);
          doc.text(item.price.toFixed(2), 360, yPosition + 8);
          doc.text((item.price * item.quantity).toFixed(2), 445, yPosition + 8);
          yPosition += rowHeight;
        });

        // Totals
        yPosition += 20;
        const totalsLabelX = 370;
        const totalsValueX = 485;

        doc.font('Helvetica-Bold').text('Subtotal:', totalsLabelX, yPosition);
        doc.font('Helvetica').text(this.formatCurrency(productSubtotal), totalsValueX, yPosition);
        yPosition += 18;

        doc.font('Helvetica-Bold').text('Discount:', totalsLabelX, yPosition);
        if (order.couponCode) {
          doc.fontSize(8).text(`(${order.couponCode})`, totalsLabelX, yPosition + 10);
          doc.fontSize(9);
        }
        doc.font('Helvetica').text(discount > 0 ? `-${this.formatCurrency(discount)}` : 'Rs.0.00', totalsValueX, yPosition);
        yPosition += order.couponCode ? 28 : 18;

        doc.font('Helvetica-Bold').text('Delivery Fee:', totalsLabelX, yPosition);
        doc.font('Helvetica').text(deliveryFee === 0 ? 'FREE' : this.formatCurrency(deliveryFee), totalsValueX, yPosition);
        yPosition += 18;

        doc.font('Helvetica-Bold').text('Taxable Value:', totalsLabelX, yPosition);
        doc.font('Helvetica').text(this.formatCurrency(gstDetails.taxableValue), totalsValueX, yPosition);
        yPosition += 18;

        if (isSameState) {
          doc.font('Helvetica-Bold').text(`CGST @ ${gstDetails.gstRate / 2}%:`, totalsLabelX, yPosition);
          doc.font('Helvetica').text(this.formatCurrency(gstDetails.cgst), totalsValueX, yPosition);
          yPosition += 18;
          doc.font('Helvetica-Bold').text(`SGST @ ${gstDetails.gstRate / 2}%:`, totalsLabelX, yPosition);
          doc.font('Helvetica').text(this.formatCurrency(gstDetails.sgst), totalsValueX, yPosition);
          yPosition += 18;
        } else {
          doc.font('Helvetica-Bold').text(`IGST @ ${gstDetails.gstRate}%:`, totalsLabelX, yPosition);
          doc.font('Helvetica').text(this.formatCurrency(gstDetails.igst), totalsValueX, yPosition);
          yPosition += 18;
        }

        doc.moveTo(370, yPosition).lineTo(545, yPosition).stroke();
        yPosition += 8;
        doc.fontSize(11).font('Helvetica-Bold');
        doc.text('Grand Total:', totalsLabelX, yPosition);
        doc.text(this.formatCurrency(grandTotal), totalsValueX, yPosition);
        yPosition += 30;

        doc.fontSize(10).font('Helvetica-Bold').text('Amount in Words:', 50, yPosition);
        yPosition += 15;
        doc.fontSize(9).font('Helvetica').text(this.numberToWords(grandTotal), 50, yPosition, { width: 495 });
        yPosition += 35;

        doc.fontSize(10).font('Helvetica-Bold').text('Declaration:', 50, yPosition);
        yPosition += 15;
        doc.fontSize(9).font('Helvetica')
          .text('We declare that this invoice shows the actual price of the goods described', 50, yPosition, { width: 495 })
          .text('and all particulars are true and correct.', 50, yPosition + 12, { width: 495 });
        yPosition += 50;

        doc.fontSize(10).font('Helvetica-Bold').text('For BYND OFFICIAL', 50, yPosition);
        yPosition += 50;
        doc.fontSize(9).font('Helvetica-Oblique').text('Authorized Signatory', 50, yPosition);

        yPosition += 40;
        doc.fontSize(8).font('Helvetica-Oblique');
        doc.text('*This is a computer generated bill', 0, yPosition, { align: 'center', width: doc.page.width });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}

export default InvoiceService;