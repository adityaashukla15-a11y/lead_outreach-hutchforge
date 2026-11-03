import nodemailer from 'nodemailer';

/**
 * Creates the Titan SMTP transporter
 */
export function createTitanTransporter(user, pass) {
  return nodemailer.createTransporter({
    host: 'smtp.titan.email',
    port: 465,
    secure: true, // Use SSL for port 465
    auth: {
      user: user,
      pass: pass
    },
    tls: {
      rejectUnauthorized: true
    }
  });
}

/**
 * Builds the personalized subject and body for a specific lead
 */
export function generateEmailContent(lead) {
  const businessName = lead.name || 'your business';
  const city = lead.city || 'your area';

  const subject = `Web presence & project inquiries for ${businessName}`;

  const textBody = `Hello,

We are Hutchforge, a digital creative agency (https://hutchforge.in/).

We noticed ${businessName} is doing great work in ${city}, but couldn't find an official website listed for your business. Most homeowners and commercial clients search online first before choosing a contractor or builder.

We specialize in helping construction companies and builders establish a modern, high-converting web presence to showcase past projects and attract more direct inquiries.

You can learn more about our agency and explore our work here:
Website: https://hutchforge.in/

We would love to share a quick mock-up or idea of how a modern site for ${businessName} could look. Would you be open to a brief chat this week?

Looking forward to hearing from you.

Best regards,
Team Hutchforge
Digital Creative Agency
Website: https://hutchforge.in/

---
If you'd prefer not to hear from us, just reply with "unsubscribe" and we won't reach out again.`;

  const htmlBody = `
<div style="font-family: Arial, sans-serif; font-size: 14px; color: #333; line-height: 1.6;">
  <p>Hello,</p>
  <p>We are <strong>Hutchforge</strong>, a digital creative agency (<a href="https://hutchforge.in/" style="color: #0066cc;">https://hutchforge.in/</a>).</p>
  <p>We noticed <strong>${businessName}</strong> is doing great work in ${city}, but couldn't find an official website listed for your business. Most homeowners and commercial clients search online first before choosing a contractor or builder.</p>
  <p>We specialize in helping construction companies and builders establish a modern, high-converting web presence to showcase past projects and attract more direct inquiries.</p>
  <p>You can learn more about our agency and explore our work here:<br>
  <strong>Website:</strong> <a href="https://hutchforge.in/" style="color: #0066cc;">https://hutchforge.in/</a></p>
  <p>We would love to share a quick mock-up or idea of how a modern site for <strong>${businessName}</strong> could look. Would you be open to a brief chat this week?</p>
  <p>Looking forward to hearing from you.</p>
  <br>
  <p>Best regards,<br>
  <strong>Team Hutchforge</strong><br>
  Digital Creative Agency<br>
  <a href="https://hutchforge.in/" style="color: #0066cc;">https://hutchforge.in/</a></p>
  <hr style="border: none; border-top: 1px solid #eee; margin-top: 24px;">
  <p style="font-size: 11px; color: #888;">If you'd prefer not to receive emails from us, simply reply with "unsubscribe" and we will remove your address.</p>
</div>
`;

  return { subject, textBody, htmlBody };
}

/**
 * Sends a single cold email with error handling
 */
export async function sendOutreachEmail(transporter, fromEmail, lead, dryRun = false) {
  const { subject, textBody, htmlBody } = generateEmailContent(lead);

  if (dryRun) {
    console.log(`\n================= [DRY RUN - PREVIEW] =================`);
    console.log(`From: Team Hutchforge <${fromEmail}>`);
    console.log(`To: ${lead.email} (${lead.name})`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:\n${textBody}`);
    console.log(`=======================================================\n`);
    return { success: true, dryRun: true };
  }

  try {
    const info = await transporter.sendMail({
      from: `"Team Hutchforge" <${fromEmail}>`,
      to: lead.email,
      replyTo: fromEmail,
      subject: subject,
      text: textBody,
      html: htmlBody
    });

    console.log(`[Mailer] Successfully sent to ${lead.email} (MessageID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[Mailer] Failed sending to ${lead.email}: ${error.message}`);
    return { success: false, error: error.message };
  }
}
