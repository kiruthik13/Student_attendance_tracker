const nodemailer = require('nodemailer');

// Create transporter for Gmail
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'kiruthikbairavan13@gmail.com',
      pass: 'edxykxakcnqznmyb' // NO spaces
    }
  });
};

// Email templates
const emailTemplates = {
  welcomeEmail: (adminName, email) => ({
    subject: 'Welcome to Kongu Engineering College - Attendance Management System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
        <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 25%, #6366f1 50%, #8b5cf6 75%, #a855f7 100%); padding: 30px; border-radius: 15px; text-align: center; margin-bottom: 20px;">
          <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold;">KONGU ENGINEERING COLLEGE</h1>
          <p style="color: #fbbf24; margin: 5px 0; font-weight: bold;">(Autonomous)</p>
          <p style="color: #e2e8f0; margin: 5px 0; font-size: 14px;">Affiliated to Anna University | Accredited by NAAC with A++ Grade</p>
          <p style="color: #cbd5e1; margin: 5px 0; font-size: 12px;">Perundurai Erode - 638060 Tamilnadu India</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 15px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <h2 style="color: #1e40af; margin-bottom: 20px;">Welcome to Our Attendance Management System!</h2>
          
          <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
            Dear <strong>${adminName}</strong>,
          </p>
          
          <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
            Thank you for registering with our Student Attendance Management System. Your account has been successfully created and you can now access the system to manage student attendance efficiently.
          </p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h3 style="color: #1e40af; margin-top: 0;">Account Details:</h3>
            <p style="margin: 5px 0;"><strong>Name:</strong> ${adminName}</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: #059669; font-weight: bold;">Active</span></p>
          </div>
          
          <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
            You can now log in to the system using your email address and password to:
          </p>
          
          <ul style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
            <li>Add and manage students</li>
            <li>Mark daily attendance</li>
            <li>Generate attendance reports</li>
            <li>View detailed statistics</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" 
               style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Access Dashboard
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
            If you have any questions or need assistance, please contact the system administrator.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
          <p>© 2024 Kongu Engineering College. All rights reserved.</p>
        </div>
      </div>
    `
  }),
  
  passwordResetEmail: (adminName, resetToken) => ({
    subject: 'Password Reset Request - Kongu Engineering College',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
        <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 25%, #6366f1 50%, #8b5cf6 75%, #a855f7 100%); padding: 30px; border-radius: 15px; text-align: center; margin-bottom: 20px;">
          <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold;">KONGU ENGINEERING COLLEGE</h1>
          <p style="color: #fbbf24; margin: 5px 0; font-weight: bold;">(Autonomous)</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 15px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <h2 style="color: #1e40af; margin-bottom: 20px;">Password Reset Request</h2>
          
          <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
            Dear <strong>${adminName}</strong>,
          </p>
          
          <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
            We received a request to reset your password for the Attendance Management System. If you didn't make this request, you can safely ignore this email.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}" 
               style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Reset Password
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
            This link will expire in 1 hour for security reasons.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
          <p>© 2024 Kongu Engineering College. All rights reserved.</p>
        </div>
      </div>
    `
  }),
  
  csvReportEmail: (subject, csvContent, fileName, reportType, reportData) => {
    const currentDate = new Date().toLocaleString('en-IN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
    
    const totalRecords = reportData.rows ? reportData.rows.length : 'N/A';
    const className = reportData.className || '';
    const section = reportData.section || '';
    const date = reportData.date || '';
    const startDate = reportData.startDate || '';
    const endDate = reportData.endDate || '';
    const studentName = reportData.studentName || '';
    
    // Build dynamic content based on report type
    let reportDetails = '';
    if (className) reportDetails += `<p style="margin: 8px 0;"><strong>🏫 Class:</strong> ${className}</p>`;
    if (section) reportDetails += `<p style="margin: 8px 0;"><strong>📚 Section:</strong> ${section}</p>`;
    if (date) reportDetails += `<p style="margin: 8px 0;"><strong>📅 Date:</strong> ${date}</p>`;
    if (startDate && endDate) reportDetails += `<p style="margin: 8px 0;"><strong>📅 Period:</strong> ${startDate} to ${endDate}</p>`;
    if (studentName) reportDetails += `<p style="margin: 8px 0;"><strong>👤 Student:</strong> ${studentName}</p>`;
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
        <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 25%, #6366f1 50%, #8b5cf6 75%, #a855f7 100%); padding: 30px; border-radius: 15px; text-align: center; margin-bottom: 20px;">
          <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold;">KONGU ENGINEERING COLLEGE</h1>
          <p style="color: #fbbf24; margin: 5px 0; font-weight: bold;">(Autonomous)</p>
          <p style="color: #e2e8f0; margin: 5px 0; font-size: 14px;">Student Attendance Management System</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 15px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <h2 style="color: #1e40af; margin-bottom: 20px;">📊 Attendance Report Generated Successfully</h2>
          
          <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
            Your attendance report has been generated successfully and is attached to this email. The report contains detailed attendance information for your selected criteria.
          </p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h3 style="color: #1e40af; margin-top: 0;">📋 Report Details:</h3>
            <p style="margin: 8px 0;"><strong>📄 Report Type:</strong> ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Attendance Report</p>
            <p style="margin: 8px 0;"><strong>📁 File Name:</strong> ${fileName}</p>
            <p style="margin: 8px 0;"><strong>📅 Generated On:</strong> ${currentDate}</p>
            <p style="margin: 8px 0;"><strong>📊 Total Records:</strong> ${totalRecords} students</p>
            ${reportDetails}
          </div>
          
          <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
            <h4 style="color: #1e40af; margin: 0 0 10px 0;">📈 Report Features:</h4>
            <ul style="color: #374151; margin: 0; padding-left: 20px;">
              <li>Detailed period-wise attendance status</li>
              <li>Student-wise attendance statistics</li>
              <li>Attendance percentage calculations</li>
              <li>Exportable CSV format for analysis</li>
            </ul>
          </div>
          
          <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
            <strong>📎 Attachment:</strong> The CSV file contains detailed attendance information that you can open in Excel, Google Sheets, or any spreadsheet application for further analysis.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" 
               style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              🏠 Access Dashboard
            </a>
          </div>
          
          <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <p style="color: #856404; margin: 0; font-size: 14px;">
              <strong>💡 Tip:</strong> You can use this report for attendance analysis, parent communication, and academic planning.
            </p>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
            If you have any questions about this report or need assistance, please contact the system administrator.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
          <p>© 2024 Kongu Engineering College. All rights reserved.</p>
          <p style="margin-top: 5px;">Perundurai Erode - 638060 Tamilnadu India</p>
        </div>
      </div>
    `;
    
    return {
      subject: subject,
      html: htmlContent,
      attachments: [
        {
          filename: fileName,
          content: csvContent,
          contentType: 'text/csv'
        }
      ]
    };
  }
};

// Send email function
const sendEmail = async (to, template, data = {}) => {
  try {
    const transporter = createTransporter();
    console.log('Email template data:', { to, template, data });
    const emailContent = emailTemplates[template](...data);
    console.log('Generated email content:', {
      subject: emailContent.subject,
      hasHtml: !!emailContent.html,
      htmlLength: emailContent.html ? emailContent.html.length : 0,
      hasAttachments: !!emailContent.attachments
    });
    
    const mailOptions = {
      from: `"Kongu Engineering College" <kiruthikbairavan13@gmail.com>`,
      to: to,
      subject: emailContent.subject,
      html: emailContent.html
    };
    
    // Add attachments if present
    if (emailContent.attachments) {
      mailOptions.attachments = emailContent.attachments;
    }
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email sending failed:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendEmail,
  emailTemplates
}; 