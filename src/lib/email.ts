import nodemailer, { type Transporter } from "nodemailer";

interface SendOtpEmailParams {
  to: string;
  otp: string;
  purpose: "SIGNUP" | "FORGOT_PASSWORD";
}

let cachedTransporter: Transporter | null = null;

export function isEmailConfigured(): boolean {
  const user = process.env.GMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS;
  return Boolean(user && pass);
}

// Backward compatibility alias
export const isSmtpConfigured = isEmailConfigured;

async function getTransporter(): Promise<{ transporter: Transporter; isConfigured: boolean }> {
  if (cachedTransporter) {
    return { transporter: cachedTransporter, isConfigured: isEmailConfigured() };
  }

  const user = (process.env.GMAIL_USER || process.env.SMTP_USER || "").trim();
  // Strip whitespace from App Passwords (Google App Passwords often come as 4 groups of 4 chars: "abcd efgh ijkl mnop")
  const pass = (process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS || "").replace(/\s+/g, "");
  const service = process.env.SMTP_SERVICE;
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 465;

  // 1. Gmail configuration (either GMAIL_USER/GMAIL_APP_PASSWORD, or SMTP_SERVICE="gmail", or @gmail.com)
  if (user && pass && (process.env.GMAIL_USER || service === "gmail" || user.endsWith("@gmail.com"))) {
    cachedTransporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user,
        pass,
      },
    });
    return { transporter: cachedTransporter, isConfigured: true };
  }

  // 2. Custom SMTP host configuration
  if (host && user && pass) {
    cachedTransporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false,
      },
    });
    return { transporter: cachedTransporter, isConfigured: true };
  }

  // 3. Automated Test environment fallback ONLY if explicitly allowed
  if (process.env.ALLOW_DEV_EMAIL_FALLBACK === "true" || process.env.NODE_ENV === "test") {
    try {
      const testAccount = await nodemailer.createTestAccount();
      cachedTransporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      return { transporter: cachedTransporter, isConfigured: false };
    } catch {
      cachedTransporter = nodemailer.createTransport({
        jsonTransport: true,
      });
      return { transporter: cachedTransporter, isConfigured: false };
    }
  }

  throw new Error(
    "Gmail/SMTP email delivery is not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD in your .env file."
  );
}

export async function sendOtpEmail({
  to,
  otp,
  purpose,
}: SendOtpEmailParams): Promise<{ success: boolean; previewUrl?: string | false; error?: string }> {
  const isSignup = purpose === "SIGNUP";
  const subject = isSignup
    ? `[KhataBook] ${otp} is your account verification code`
    : `[KhataBook] ${otp} is your password reset code`;

  const title = isSignup ? "Verify Your KhataBook Account" : "Reset Your KhataBook Password";
  const message = isSignup
    ? "Welcome to KhataBook! Use the 6-digit verification code below to complete your registration:"
    : "We received a request to reset your KhataBook account password. Use the 6-digit verification code below to set a new password:";

  // Clean, modern, responsive HTML email layout with inline CSS for 100% compatibility with Gmail mobile & desktop
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f6f8; padding: 36px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 500px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #0f172a; padding: 26px 32px; text-align: left;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color: #ffffff; width: 36px; height: 36px; border-radius: 10px; text-align: center; vertical-align: middle;">
                    <span style="font-size: 20px; line-height: 36px;">📖</span>
                  </td>
                  <td style="padding-left: 14px; color: #ffffff; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">
                    KhataBook
                    <span style="display: block; font-size: 11px; font-weight: 500; color: #94a3b8; letter-spacing: 0.5px; text-transform: uppercase; margin-top: 2px;">Digital Ledger</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <h1 style="margin: 0 0 14px 0; font-size: 21px; font-weight: 700; color: #0f172a; line-height: 1.3;">
                ${title}
              </h1>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 22px; color: #475569;">
                ${message}
              </p>

              <!-- 6-Digit OTP Box -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td align="center" style="padding: 22px 16px;">
                    <span style="display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 10px;">Your One-Time Code</span>
                    <span style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #0f172a; display: block; padding-left: 8px;">${otp}</span>
                    <span style="display: block; font-size: 12px; color: #dc2626; font-weight: 600; margin-top: 10px;">⏱ Valid for 10 minutes</span>
                  </td>
                </tr>
              </table>

              <!-- Security Notice -->
              <div style="background-color: #fff1f2; border-left: 4px solid #f43f5e; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 12px; line-height: 18px; color: #9f1239;">
                  <strong>Security Warning:</strong> Never share this code with anyone. KhataBook employees will never ask for your verification code.
                </p>
              </div>

              <p style="margin: 0; font-size: 12px; line-height: 18px; color: #64748b;">
                If you did not request this email, please disregard it. Your account remains safe and no changes have been made.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center;">
              <p style="margin: 0; font-size: 11px; line-height: 16px; color: #94a3b8;">
                © ${new Date().getFullYear()} KhataBook Digital Ledger System.<br>
                Automated security notification • Do not reply directly to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  console.log(`\n============================================================`);
  console.log(`📬 [EMAIL DISPATCH] Destination: ${to}`);
  console.log(`📋 Purpose: ${purpose}`);
  console.log(`============================================================\n`);

  const user = process.env.GMAIL_USER || process.env.SMTP_USER;
  const fromAddress =
    process.env.SMTP_FROM ||
    (user ? `"KhataBook" <${user}>` : '"KhataBook Security" <security@khatabook.local>');

  try {
    const { transporter, isConfigured } = await getTransporter();
    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      text: `${title}\n\n${message}\n\nYour 6-digit OTP: ${otp}\n\nThis code expires in 10 minutes.\n\nNever share this code with anyone.`,
      html,
    });

    if (isConfigured) {
      console.log(`✅ [GMAIL/SMTP DELIVERED] Email successfully sent to ${to} (Message ID: ${info.messageId})`);
    } else {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log(`🔗 Test Account URL (Fallback): ${previewUrl}`);
      }
    }

    return { success: true };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`❌ [EMAIL DISPATCH ERROR] Failed to send email to ${to}:`, errorMessage);
    return {
      success: false,
      error: `Failed to deliver verification code to your email: ${errorMessage}`,
    };
  }
}
