import nodemailer from "nodemailer";

interface TransporterConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

function createTransporter(): nodemailer.Transporter {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    // Return a mock transporter for development when SMTP is not configured
    return nodemailer.createTransport({
      jsonTransport: true,
    });
  }

  const config: TransporterConfig = {
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  };

  return nodemailer.createTransport(config);
}

export interface SendInvitationEmailParams {
  to: string;
  tenantName: string;
  role: string;
  signupUrl: string;
}

export async function sendInvitationEmail({
  to,
  tenantName,
  role,
  signupUrl,
}: SendInvitationEmailParams): Promise<void> {
  const transporter = createTransporter();
  const from = process.env.SMTP_FROM || "Perseus <noreply@example.com>";

  const subject = `You're invited to join ${tenantName} on Perseus`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #1a1a1a;">You're invited!</h2>
  <p>Hi,</p>
  <p>You've been invited to join <strong>${tenantName}</strong> on Perseus as a <strong>${role}</strong>.</p>
  <p style="margin: 24px 0;">
    <a href="${signupUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Join Now</a>
  </p>
  <p style="color: #666; font-size: 14px;">
    This invitation expires in 7 days.<br>
    If you didn't expect this invitation, you can safely ignore this email.
  </p>
  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;">
  <p style="color: #999; font-size: 12px;">
    Powered by <a href="https://perseus.ai" style="color: #2563eb;">Perseus</a>
  </p>
</body>
</html>
`;

  const text = `
You're invited!

Hi,

You've been invited to join ${tenantName} on Perseus as a ${role}.

Click the link below to create your account:
${signupUrl}

This invitation expires in 7 days.

If you didn't expect this invitation, you can safely ignore this email.
`;

  const result = await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });

  // Log message ID for development (mock transporter)
  console.log(`[Email] Invitation sent to ${to}: ${result.messageId}`);
}
