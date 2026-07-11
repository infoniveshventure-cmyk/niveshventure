import nodemailer from "nodemailer";

function getTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("SMTP env vars missing. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendMail(to: string, subject: string, html: string) {
  const transport = getTransport();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  await transport.sendMail({ from, to, subject, html });
}

export function otpEmailTemplate(code: string) {
  return `
  <div style="font-family:Arial,sans-serif;background:#0A0E1A;padding:32px;color:#E8E8F0">
    <h2 style="color:#7B5CFF">Your verification code</h2>
    <p>Use the code below to verify your email. It expires in 10 minutes.</p>
    <div style="margin:24px 0">
      <span style="font-family:monospace;font-size:32px;font-weight:bold;letter-spacing:4px;color:#00E5FF;background:#1E293B;padding:8px 16px;border-radius:6px;user-select:all;-webkit-user-select:all;display:inline-block;">${code}</span>
      <div style="font-size:11px;color:#8A8AA0;margin-top:6px;">(Double-click or long-press to select & copy)</div>
    </div>
    <p style="color:#8A8AA0">Never share this code with anyone.</p>
  </div>`;
}

export function welcomeEmailTemplate(params: {
  fullName: string;
  memberId: string;
  loginKey: string;
  accessKey: string;
}) {
  const { fullName, memberId, loginKey, accessKey } = params;
  return `
  <div style="font-family:Arial,sans-serif;background:#0A0E1A;padding:32px;color:#E8E8F0">
    <h2 style="color:#7B5CFF">Welcome, ${fullName}!</h2>
    <p>Your account credentials have been successfully updated/created.</p>
    <table style="margin-top:16px;border-spacing: 0 10px;">
      <tr>
        <td style="padding:6px 12px;color:#8A8AA0;vertical-align:middle;">Member ID</td>
        <td style="padding:6px 12px;vertical-align:middle;">
          <span style="font-family:monospace;color:#00E5FF;background:#1E293B;padding:4px 10px;border-radius:4px;user-select:all;-webkit-user-select:all;">${memberId}</span>
        </td>
      </tr>
      <tr>
        <td style="padding:6px 12px;color:#8A8AA0;vertical-align:middle;">Login Key</td>
        <td style="padding:6px 12px;vertical-align:middle;">
          <span style="font-family:monospace;color:#00E5FF;background:#1E293B;padding:4px 10px;border-radius:4px;user-select:all;-webkit-user-select:all;">${loginKey}</span>
        </td>
      </tr>
      <tr>
        <td style="padding:6px 12px;color:#8A8AA0;vertical-align:middle;">Access Key</td>
        <td style="padding:6px 12px;vertical-align:middle;">
          <span style="font-family:monospace;color:#00E5FF;background:#1E293B;padding:4px 10px;border-radius:4px;user-select:all;-webkit-user-select:all;">${accessKey}</span>
        </td>
      </tr>
    </table>
    <p style="font-size:11px;color:#8A8AA0;margin-top:10px;">(Tip: Double-click or long-press on any key above to select it instantly for copy-paste)</p>
    <p style="margin-top:20px;color:#FF3CAC">Keep your Member ID, Login Key and Access Key safe and confidential.</p>
  </div>`;
}
