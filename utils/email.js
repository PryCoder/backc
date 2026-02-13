// utils/email.js
const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_PORT === '465',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Send application confirmation email
const sendApplicationConfirmation = async ({ email, name, jobTitle, type = 'job' }) => {
  try {
    const subject = type === 'job' 
      ? `Application Received: ${jobTitle}`
      : 'Application Received - Thank you for your interest';

    const html = type === 'job'
      ? `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Application Received</title>
          <style>
            body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; margin: 0; padding: 0; background-color: #f9f9f9; }
            .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); overflow: hidden; }
            .header { background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); color: white; padding: 32px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
            .content { padding: 32px; }
            .highlight { background: #f3f4f6; border-radius: 12px; padding: 20px; margin: 20px 0; }
            .footer { background: #f3f4f6; padding: 24px; text-align: center; color: #666; font-size: 14px; }
            .btn { display: inline-block; background: #1a1a1a; color: white; text-decoration: none; padding: 12px 32px; border-radius: 30px; font-weight: 500; margin-top: 20px; }
            @media (max-width: 600px) {
              .container { margin: 10px; width: auto; }
              .header { padding: 24px; }
              .header h1 { font-size: 24px; }
              .content { padding: 24px; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Application Received!</h1>
            </div>
            <div class="content">
              <p>Dear <strong>${name}</strong>,</p>
              <p>Thank you for applying for the position of <strong>${jobTitle}</strong> at anxvvion.</p>
              
              <div class="highlight">
                <p style="margin: 0;"><strong>What's next?</strong></p>
                <ul style="margin-top: 10px; padding-left: 20px;">
                  <li>Our team will review your application within 5-7 business days</li>
                  <li>If your profile matches our requirements, we'll schedule an introductory call</li>
                  <li>You can check your application status anytime by replying to this email</li>
                </ul>
              </div>
              
              <p>We appreciate your interest in joining our team. We review every application carefully and will get back to you as soon as possible.</p>
              
              <p>Best regards,<br>
              <strong>The anxvvion Recruitment Team</strong></p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} anxvvion. All rights reserved.</p>
              <p style="font-size: 12px; color: #999;">This email was sent regarding your job application.</p>
            </div>
          </div>
        </body>
        </html>
      `
      : `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Application Received</title>
          <style>
            body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; margin: 0; padding: 0; background-color: #f9f9f9; }
            .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); overflow: hidden; }
            .header { background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); color: white; padding: 32px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
            .content { padding: 32px; }
            .highlight { background: #f3f4f6; border-radius: 12px; padding: 20px; margin: 20px 0; }
            .footer { background: #f3f4f6; padding: 24px; text-align: center; color: #666; font-size: 14px; }
            @media (max-width: 600px) {
              .container { margin: 10px; width: auto; }
              .header { padding: 24px; }
              .header h1 { font-size: 24px; }
              .content { padding: 24px; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✨ Application Received!</h1>
            </div>
            <div class="content">
              <p>Dear <strong>${name}</strong>,</p>
              <p>Thank you for your interest in joining anxvvion!</p>
              
              <div class="highlight">
                <p style="margin: 0;">We've received your resume and will keep it in our talent pool. When a suitable position opens up that matches your profile, we'll reach out to you.</p>
              </div>
              
              <p>In the meantime, feel free to follow us on social media to stay updated about new opportunities and company news.</p>
              
              <p>Best regards,<br>
              <strong>The anxvvion Recruitment Team</strong></p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} anxvvion. All rights reserved.</p>
              <p style="font-size: 12px; color: #999;">This email was sent regarding your application.</p>
            </div>
          </div>
        </body>
        </html>
      `;

    const mailOptions = {
      from: `"anxvvion Careers" <${process.env.EMAIL_USER}>`,
      to: email,
      subject,
      html,
    };

    await transporter.sendMail(mailOptions);
    console.log('Confirmation email sent to:', email);
  } catch (error) {
    console.error('Error sending confirmation email:', error);
    throw error;
  }
};

// Send contact form confirmation email
const sendContactConfirmation = async ({ email, name, subject, message }) => {
  try {
    const mailOptions = {
      from: `"anxvvion Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `We received your message: "${subject}"`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Message Received</title>
          <style>
            body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; margin: 0; padding: 0; background-color: #f9f9f9; }
            .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); overflow: hidden; }
            .header { background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); color: white; padding: 32px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
            .content { padding: 32px; }
            .message-box { background: #f8f9fa; border-left: 4px solid #1a1a1a; padding: 20px; margin: 20px 0; border-radius: 8px; }
            .footer { background: #f3f4f6; padding: 24px; text-align: center; color: #666; font-size: 14px; }
            .signature { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eaeaea; }
            @media (max-width: 600px) {
              .container { margin: 10px; width: auto; }
              .header { padding: 24px; }
              .header h1 { font-size: 24px; }
              .content { padding: 24px; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📬 Message Received</h1>
            </div>
            <div class="content">
              <p>Dear <strong>${name}</strong>,</p>
              <p>Thank you for reaching out to us. We've received your message and will get back to you within 24-48 hours.</p>
              
              <div class="message-box">
                <p style="margin: 0 0 10px 0;"><strong>Your message:</strong></p>
                <p style="margin: 0; color: #444; font-style: italic;">"${message.substring(0, 200)}${message.length > 200 ? '...' : ''}"</p>
              </div>
              
              <p>Our team is reviewing your inquiry and will respond as soon as possible. For urgent matters, you can also reach us at:</p>
              
              <ul style="margin: 20px 0; padding-left: 20px;">
                <li>📞 Phone: +1 (555) 123-4567</li>
                <li>💬 Live chat: Visit our website</li>
              </ul>
              
              <div class="signature">
                <p>Best regards,<br>
                <strong>The anxvvion Support Team</strong></p>
              </div>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} anxvvion. All rights reserved.</p>
              <p style="font-size: 12px; color: #999;">This is an automated confirmation of your contact request.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log('Contact confirmation email sent to:', email);
  } catch (error) {
    console.error('Error sending contact confirmation email:', error);
    throw error;
  }
};

// Send admin notification
const sendAdminNotification = async ({ type, application }) => {
  try {
    let subject, html;
    
    if (type === 'contact') {
      subject = `📬 New Contact Form: ${application.subject}`;
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Contact Form Submission</title>
          <style>
            body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; }
            .header { background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); color: white; padding: 24px; }
            .content { padding: 24px; }
            .info-grid { display: grid; grid-template-columns: 120px 1fr; gap: 12px; background: #f8f9fa; padding: 20px; border-radius: 12px; margin: 20px 0; }
            .label { font-weight: 600; color: #666; }
            .value { color: #1a1a1a; }
            .message-box { background: white; border: 1px solid #eaeaea; padding: 20px; border-radius: 12px; margin: 20px 0; }
            .footer { background: #f3f4f6; padding: 20px; text-align: center; color: #666; font-size: 14px; }
            .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; background: #eaeaea; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin: 0;">📬 New Contact Form Submission</h2>
            </div>
            <div class="content">
              <div class="info-grid">
                <span class="label">From:</span>
                <span class="value">${application.applicantName}</span>
                
                <span class="label">Email:</span>
                <span class="value"><a href="mailto:${application.applicantEmail}">${application.applicantEmail}</a></span>
                
                <span class="label">Subject:</span>
                <span class="value">${application.subject}</span>
                
                <span class="label">Received:</span>
                <span class="value">${new Date(application.appliedAt).toLocaleString()}</span>
                
                <span class="label">Language:</span>
                <span class="value"><span class="badge">${application.language || 'Unknown'}</span></span>
                
                <span class="label">Threat Level:</span>
                <span class="value"><span class="badge" style="background: ${application.threatLevel === 'high' ? '#fee2e2' : application.threatLevel === 'medium' ? '#fef3c7' : '#e0f2fe'}">${application.threatLevel || 'Unknown'}</span></span>
              </div>
              
              <div class="message-box">
                <p style="margin: 0 0 10px 0; font-weight: 600;">Message:</p>
                <p style="margin: 0; white-space: pre-wrap;">${application.message}</p>
              </div>
              
              <p style="text-align: center; margin-top: 20px;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/contacts/${application.id}" style="display: inline-block; background: #1a1a1a; color: white; text-decoration: none; padding: 12px 24px; border-radius: 30px; font-weight: 500;">View in Dashboard</a>
              </p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} anxvvion. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (type === 'job') {
      subject = `🎯 New Job Application: ${application.jobTitle}`;
      html = `
        <h2>New Job Application Received</h2>
        <p><strong>Position:</strong> ${application.jobTitle}</p>
        <p><strong>Department:</strong> ${application.department}</p>
        <p><strong>Applicant:</strong> ${application.applicantName}</p>
        <p><strong>Email:</strong> ${application.applicantEmail}</p>
        <p><strong>Applied:</strong> ${new Date(application.appliedAt).toLocaleString()}</p>
        <p><strong>Resume:</strong> <a href="${application.resumeUrl}">Download Resume</a></p>
        ${application.coverLetter ? `<p><strong>Cover Letter:</strong> ${application.coverLetter}</p>` : ''}
      `;
    } else {
      subject = `📝 New Spontaneous Application`;
      html = `
        <h2>New Spontaneous Application Received</h2>
        <p><strong>Applicant:</strong> ${application.applicantName}</p>
        <p><strong>Email:</strong> ${application.applicantEmail}</p>
        <p><strong>Applied:</strong> ${new Date(application.appliedAt).toLocaleString()}</p>
        <p><strong>Resume:</strong> <a href="${application.resumeUrl}">Download Resume</a></p>
      `;
    }

    const mailOptions = {
      from: `"anxvvion System" <${process.env.EMAIL_USER}>`,
      to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
      subject,
      html,
    };

    await transporter.sendMail(mailOptions);
    console.log('Admin notification sent for:', type);
  } catch (error) {
    console.error('Error sending admin notification:', error);
    throw error;
  }
};

module.exports = {
  sendApplicationConfirmation,
  sendContactConfirmation,
  sendAdminNotification,
};