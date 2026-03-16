import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';

dotenv.config();

// ──────────────────────────────────────────────
//  Configuración lazy de SendGrid
//  No lanza en top-level; valida al primer uso
// ──────────────────────────────────────────────
let initialized = false;

function initSendGrid(): void {
  if (initialized) return;

  const apiKey = process.env['SENDGRID_API_KEY'];
  const fromEmail = process.env['SENDGRID_FROM_EMAIL'];

  if (!apiKey) throw new Error('SENDGRID_API_KEY no está definido en el archivo .env');
  if (!fromEmail) throw new Error('SENDGRID_FROM_EMAIL no está definido en el archivo .env');

  sgMail.setApiKey(apiKey);
  initialized = true;
}

const getFrom = (): string => process.env['SENDGRID_FROM_EMAIL']!;

// ──────────────────────────────────────────────
//  Template HTML base
// ──────────────────────────────────────────────
const baseTemplate = (content: string): string => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    body { margin: 0; padding: 0; background-color: #f4f4f7; font-family: Arial, sans-serif; }
    .wrapper { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background-color: #4f46e5; padding: 32px 40px; text-align: center; }
    .header h1 { margin: 0; color: #ffffff; font-size: 22px; letter-spacing: 0.5px; }
    .body { padding: 36px 40px; color: #374151; line-height: 1.6; font-size: 15px; }
    .body p { margin: 0 0 16px; }
    .btn { display: inline-block; margin: 8px 0 24px; padding: 13px 28px; background-color: #4f46e5; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-size: 15px; font-weight: bold; }
    .token-box { background: #f3f4f6; border: 1px dashed #d1d5db; border-radius: 6px; padding: 14px 20px; font-family: monospace; font-size: 14px; color: #1f2937; word-break: break-all; margin: 16px 0 24px; }
    .footer { padding: 20px 40px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header"><h1>Mi App</h1></div>
    <div class="body">${content}</div>
    <div class="footer">© ${new Date().getFullYear()} Mi App · Este correo fue enviado automáticamente, por favor no respondas.</div>
  </div>
</body>
</html>
`;

// ──────────────────────────────────────────────
//  EmailService
// ──────────────────────────────────────────────
class EmailService {

  async sendWelcome(to: string, name: string): Promise<void> {
    initSendGrid();
    const html = baseTemplate(`
      <p>Hola <strong>${name}</strong>,</p>
      <p>¡Bienvenido a <strong>Mi App</strong>! Tu cuenta ha sido creada exitosamente.</p>
      <p>Ya puedes iniciar sesión y empezar a usar la plataforma.</p>
      <p>Si no creaste esta cuenta, ignora este mensaje.</p>
    `);
    await sgMail.send({ to, from: getFrom(), subject: '¡Bienvenido a Mi App! 🎉', html });
  }

  async sendPasswordReset(to: string, name: string, resetToken: string): Promise<void> {
    initSendGrid();
    const resetUrl = process.env['FRONTEND_URL']
      ? `${process.env['FRONTEND_URL']}/reset-password?token=${resetToken}`
      : null;

    const tokenSection = resetUrl
      ? `<a href="${resetUrl}" class="btn">Restablecer contraseña</a>
         <p style="font-size:13px;color:#6b7280;">O copia este enlace:<br/><span style="word-break:break-all;">${resetUrl}</span></p>`
      : `<p>Usa este token en <code>POST /api/auth/reset-password</code>:</p>
         <div class="token-box">${resetToken}</div>`;

    const html = baseTemplate(`
      <p>Hola <strong>${name}</strong>,</p>
      <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
      ${tokenSection}
      <p>Este enlace/token expirará en <strong>1 hora</strong>.</p>
      <p>Si no solicitaste este cambio, ignora este correo.</p>
    `);
    await sgMail.send({ to, from: getFrom(), subject: 'Recuperación de contraseña — Mi App', html });
  }

  async sendPasswordChanged(to: string, name: string): Promise<void> {
    initSendGrid();
    const html = baseTemplate(`
      <p>Hola <strong>${name}</strong>,</p>
      <p>La contraseña de tu cuenta fue modificada exitosamente.</p>
      <p>Si realizaste este cambio, no necesitas hacer nada más.</p>
      <p>Si <strong>no</strong> fuiste tú, contacta a soporte de inmediato.</p>
    `);
    await sgMail.send({ to, from: getFrom(), subject: 'Tu contraseña fue cambiada — Mi App', html });
  }
}

export default new EmailService();
