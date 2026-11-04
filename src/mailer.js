import nodemailer from 'nodemailer';

/**
 * Creates the Titan SMTP transporter
 */
export function createTitanTransporter(user, pass) {
  return nodemailer.createTransport({
    host: 'smtp.titan.email',
    port: 465,
    secure: true, // SSL
    auth: {
      user: user.trim(),
      pass: pass.trim()
    },
    tls: {
      rejectUnauthorized: true
    }
  });
}

/**
 * Verifies Titan SMTP credentials
 */
export async function verifySmtpConnection(user, pass) {
  if (!user || !pass) {
    return { success: false, error: 'Email and password are required.' };
  }
  try {
    const transporter = createTitanTransporter(user, pass);
    await transporter.verify();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Renders template strings by replacing variable placeholders
 */
export function renderTemplate(templateStr, lead) {
  if (!templateStr) return '';
  return templateStr
    .replace(/{business_name}/gi, lead.name || 'your company')
    .replace(/{city}/gi, lead.city || 'your area')
    .replace(/{phone}/gi, lead.phone || '')
    .replace(/{email}/gi, lead.email || '');
}

/**
 * Sends outreach email using custom template
 */
export async function sendOutreachEmail({
  transporter,
  fromEmail,
  senderName = "Team Hutchforge",
  lead,
  templateSubject,
  templateBody,
  dryRun = false
}) {
  const subject = renderTemplate(templateSubject, lead);
  const textBody = renderTemplate(templateBody, lead);

  // Convert plaintext newlines to HTML paragraphs for rich email clients
  const htmlBody = `
<div style="font-family: Arial, sans-serif; font-size: 14px; color: #222; line-height: 1.6;">
  ${textBody.split('\n\n').map(p => `<p style="margin: 0 0 14px 0;">${p.replace(/\n/g, '<br>')}</p>`).join('')}
</div>
`;

  if (dryRun) {
    return { success: true, dryRun: true, subject, body: textBody };
  }

  try {
    const info = await transporter.sendMail({
      from: `"${senderName}" <${fromEmail}>`,
      to: lead.email,
      replyTo: fromEmail,
      subject: subject,
      text: textBody,
      html: htmlBody
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
