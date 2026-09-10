const PDFDocument = require('pdfkit');

/**
 * Generate a PDF buffer for a payslip record
 * @param {Object} payslip - The populated payslip database record
 * @returns {Promise<Buffer>}
 */
function generatePayslipPdf(payslip) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const buffers = [];
      doc.on('data', (data) => buffers.push(data));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', (err) => reject(err));

      const periodYearMonth = payslip.payrun?.periodStart 
        ? new Date(payslip.payrun.periodStart).toISOString().slice(0, 7) 
        : new Date(payslip.createdAt || Date.now()).toISOString().slice(0, 7);
      const empNum = payslip.employee?.employeeCode 
        ? payslip.employee.employeeCode.replace(/[^0-9]/g, '').padStart(4, '0') 
        : (payslip.id || '').slice(0, 4).toUpperCase();
      const payslipNumber = payslip.payslipNumber || `PS-${periodYearMonth}-${empNum || '0001'}`;

      // Brand Header
      doc.fontSize(20).font('Helvetica-Bold').fillColor('#1e3a8a').text('PeoplePay360 Inc.', { align: 'center' });
      doc.fontSize(11).font('Helvetica').fillColor('#475569').text(`Official Salary Statement & Payslip — ${payslipNumber}`, { align: 'center' });
      doc.moveDown(0.8);

      // Header Divider
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cbd5e1').lineWidth(1).stroke();
      doc.moveDown(0.8);

      // Employee & Payroll Metadata Table
      doc.fontSize(10).fillColor('#0f172a');
      const leftCol = 50;
      const rightCol = 310;
      let y = doc.y;

      doc.font('Helvetica-Bold').text('Employee Name:', leftCol, y);
      doc.font('Helvetica').text(`${payslip.employee?.firstName || ''} ${payslip.employee?.lastName || ''}`, leftCol + 105, y);

      doc.font('Helvetica-Bold').text('Employee Code:', rightCol, y);
      doc.font('Helvetica').text(payslip.employee?.employeeCode || payslip.employee?.code || 'EMP-XXXX', rightCol + 95, y);

      y += 18;
      doc.font('Helvetica-Bold').text('Department:', leftCol, y);
      doc.font('Helvetica').text(payslip.employee?.department?.name || 'General Operations', leftCol + 105, y);

      doc.font('Helvetica-Bold').text('Designation:', rightCol, y);
      doc.font('Helvetica').text(payslip.employee?.jobPosition?.title || 'Team Member', rightCol + 95, y);

      y += 18;
      doc.font('Helvetica-Bold').text('Pay Period:', leftCol, y);
      const periodLabel = payslip.payrun?.name || (payslip.payrun?.periodStart ? `${new Date(payslip.payrun.periodStart).toISOString().slice(0, 10)} to ${new Date(payslip.payrun.periodEnd).toISOString().slice(0, 10)}` : 'Monthly Payroll');
      doc.font('Helvetica').text(periodLabel, leftCol + 105, y);

      doc.font('Helvetica-Bold').text('Days Worked:', rightCol, y);
      doc.font('Helvetica').text(String(payslip.workedDays || '22'), rightCol + 95, y);

      doc.moveDown(2);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cbd5e1').lineWidth(0.8).stroke();
      doc.moveDown(0.8);

      // Lines Breakdown
      const earnings = (payslip.lines || []).filter(l => ['BASIC', 'ALLOWANCE', 'GROSS'].includes(l.category));
      const deductions = (payslip.lines || []).filter(l => l.category === 'DEDUCTION');

      // Earnings Table
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#065f46').text('ITEMIZED EARNINGS');
      doc.moveDown(0.4);

      if (earnings.length > 0) {
        for (const line of earnings) {
          doc.fontSize(9.5).font('Helvetica').fillColor('#1e293b');
          doc.text(line.label, leftCol, doc.y, { continued: true, width: 330 });
          doc.text(`Rs. ${parseFloat(line.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, { align: 'right' });
        }
      } else {
        doc.fontSize(9.5).font('Helvetica').fillColor('#1e293b');
        doc.text('Basic Salary', leftCol, doc.y, { continued: true, width: 330 });
        doc.text(`Rs. ${parseFloat(payslip.grossSalary || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, { align: 'right' });
      }

      doc.moveDown(1);
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#9f1239').text('STATUTORY & OTHER DEDUCTIONS');
      doc.moveDown(0.4);

      if (deductions.length > 0) {
        for (const line of deductions) {
          doc.fontSize(9.5).font('Helvetica').fillColor('#1e293b');
          doc.text(line.label, leftCol, doc.y, { continued: true, width: 330 });
          doc.text(`-Rs. ${parseFloat(Math.abs(line.amount)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, { align: 'right' });
        }
      } else {
        doc.fontSize(9.5).font('Helvetica').fillColor('#1e293b');
        doc.text('Total Deductions', leftCol, doc.y, { continued: true, width: 330 });
        doc.text(`-Rs. ${parseFloat(payslip.totalDeductions || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, { align: 'right' });
      }

      doc.moveDown(1.5);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cbd5e1').lineWidth(0.8).stroke();
      doc.moveDown(0.8);

      // Totals Box
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#0f172a');
      doc.text('Total Gross Earnings:', leftCol, doc.y, { continued: true, width: 330 });
      doc.text(`Rs. ${parseFloat(payslip.grossSalary || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, { align: 'right' });

      doc.text('Total Deductions:', leftCol, doc.y, { continued: true, width: 330 });
      doc.text(`-Rs. ${parseFloat(payslip.totalDeductions || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, { align: 'right' });

      doc.moveDown(0.5);
      doc.fontSize(13).font('Helvetica-Bold').fillColor('#059669');
      doc.text('Net Disbursed Amount:', leftCol, doc.y, { continued: true, width: 330 });
      doc.text(`Rs. ${parseFloat(payslip.netSalary || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, { align: 'right' });

      doc.moveDown(3);
      doc.fontSize(8).font('Helvetica').fillColor('#64748b');
      doc.text('Confidential Document — Generated electronically by PeoplePay360 Inc. Payroll Processing System.', { align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generatePayslipPdf };
