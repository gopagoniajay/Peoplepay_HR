const nodemailer = require('nodemailer');
const { generatePayslipPdf } = require('./pdf.service');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initTransporter();
  }

  async initTransporter() {
    try {
      const user = process.env.SMTP_USER;
      const pass = (process.env.SMTP_PASS || '').replace(/\s+/g, '');
      const host = process.env.SMTP_HOST || 'smtp.gmail.com';
      const port = parseInt(process.env.SMTP_PORT || '465', 10);

      if (user && pass) {
        if (host.includes('gmail') || user.endsWith('@gmail.com')) {
          this.transporter = nodemailer.createTransport({
            service: 'gmail',
            pool: true,
            maxConnections: 3,
            maxMessages: 100,
            rateDelta: 1000,
            rateLimit: 3,
            auth: { user, pass },
          });
          console.log(`✉️ EmailService: Configured pooled Gmail SMTP service for [${user}]`);
        } else {
          this.transporter = nodemailer.createTransport({
            host,
            port,
            secure: port === 465,
            auth: { user, pass },
          });
          console.log(`✉️ EmailService: Configured SMTP [${host}:${port}] for [${user}]`);
        }
      } else {
        // Create an Ethereal development test account or fallback transporter
        try {
          const testAccount = await nodemailer.createTestAccount();
          this.transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
              user: testAccount.user,
              pass: testAccount.pass,
            },
          });
          console.log(`✉️ EmailService: Initialized Ethereal test account [${testAccount.user}]`);
        } catch (e) {
          // In case network is offline, create a JSON stream transporter for logging
          this.transporter = nodemailer.createTransport({
            jsonTransport: true,
          });
          console.log('✉️ EmailService: Network offline / SMTP fallback initialized in mock logging mode');
        }
      }
    } catch (err) {
      console.warn('⚠️ EmailService init warning:', err.message);
    }
  }

  /**
   * Send an official payslip / salary statement PDF via email to an employee
   */
  async sendPayslipEmail(payslip, existingPdfBuffer = null) {
    if (!this.transporter) {
      await this.initTransporter();
    }

    const employee = payslip.employee || {};
    const recipientEmail = employee.email;
    const recipientName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Employee';
    const periodLabel = payslip.payPeriod || payslip.payrun?.name || 'Current Payroll Cycle';
    const netSalaryFormatted = parseFloat(payslip.netSalary || payslip.netPay || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const grossSalaryFormatted = parseFloat(payslip.grossSalary || payslip.grossPay || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const deductionsFormatted = parseFloat(payslip.totalDeductions || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

    const periodYearMonth = payslip.payrun?.periodStart 
      ? new Date(payslip.payrun.periodStart).toISOString().slice(0, 7) 
      : new Date().toISOString().slice(0, 7);
    const empCode = employee.employeeCode || employee.code || 'EMP';
    const pdfFilename = `Payslip_${empCode}_${periodYearMonth}.pdf`;

    // Generate PDF buffer if not provided
    const pdfBuffer = existingPdfBuffer || await generatePayslipPdf(payslip);

    const fromAddress = process.env.SMTP_USER 
      ? `"PeoplePay360 Payroll" <${process.env.SMTP_USER}>`
      : `"PeoplePay360 Payroll Disbursements" <payroll@peoplepay360.com>`;

    const mailOptions = {
      from: fromAddress,
      to: recipientEmail,
      subject: `Official Payslip Statement - ${periodLabel} | PeoplePay360`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
            .header { background: linear-gradient(135deg, #1e3a8a 0%, #4338ca 100%); color: #ffffff; padding: 30px 24px; text-align: center; }
            .header h1 { margin: 0 0 8px 0; font-size: 22px; font-weight: 700; letter-spacing: -0.02em; }
            .header p { margin: 0; opacity: 0.88; font-size: 14px; }
            .content { padding: 28px 24px; }
            .greeting { font-size: 16px; font-weight: 600; color: #0f172a; margin-bottom: 12px; }
            .summary-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 0; }
            .summary-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
            .summary-row:last-child { border-bottom: none; }
            .net-row { font-size: 17px; font-weight: 700; color: #059669; border-top: 2px solid #e2e8f0; padding-top: 12px; margin-top: 6px; }
            .badge { display: inline-block; background: #ecfdf5; color: #059669; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; }
            .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>PeoplePay360 Payroll</h1>
              <p>Salary Disbursement & Payslip Notification</p>
            </div>
            <div class="content">
              <div class="greeting">Dear ${recipientName},</div>
              <p style="line-height: 1.6; color: #475569; font-size: 14px;">
                Your payroll compensation for <strong>${periodLabel}</strong> has been officially approved and disbursed. Your detailed salary statement invoice has been generated and is attached to this email.
              </p>

              <div class="summary-card">
                <div class="summary-row">
                  <span style="color: #64748b;">Employee Code:</span>
                  <strong>${empCode}</strong>
                </div>
                <div class="summary-row">
                  <span style="color: #64748b;">Pay Period:</span>
                  <span>${periodLabel}</span>
                </div>
                <div class="summary-row">
                  <span style="color: #64748b;">Gross Earnings:</span>
                  <span>₹${grossSalaryFormatted}</span>
                </div>
                <div class="summary-row">
                  <span style="color: #64748b;">Total Deductions:</span>
                  <span style="color: #e11d48;">-₹${deductionsFormatted}</span>
                </div>
                <div class="summary-row net-row">
                  <span>Net Disbursed:</span>
                  <span>₹${netSalaryFormatted}</span>
                </div>
              </div>

              <p style="line-height: 1.5; color: #64748b; font-size: 13px;">
                📎 <strong>Attached Document:</strong> <code>${pdfFilename}</code><br>
                You can also view, review, or print this statement anytime directly from your <strong>Employee Self-Service Portal</strong>.
              </p>
            </div>
            <div class="footer">
              This is an automated notification from PeoplePay360 Inc. Payroll Department.<br>
              Please contact your HR administrator if you have questions regarding this disbursement.
            </div>
          </div>
        </body>
        </html>
      `,
      attachments: [
        {
          filename: pdfFilename,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log(`✉️ Payslip email sent to ${recipientEmail} [MsgId: ${info.messageId || 'mock'}]`);
      if (previewUrl) {
        console.log(`🔗 Ethereal Email Preview URL: ${previewUrl}`);
      }
      return {
        success: true,
        email: recipientEmail,
        messageId: info.messageId,
        previewUrl: previewUrl || null,
      };
    } catch (err) {
      console.error(`❌ Failed to send email to ${recipientEmail}:`, err.message);
      return {
        success: false,
        email: recipientEmail,
        error: err.message,
      };
    }
  }
}

module.exports = new EmailService();
