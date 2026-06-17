import nodemailer from 'nodemailer'

const SMTP_HOST = process.env.SMTP_HOST || 'buzzword-com-mx.mail.protection.outlook.com'
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '25')
const SMTP_USER = process.env.SMTP_USER || ''
const SMTP_PASS = process.env.SMTP_PASS || ''
const FROM_EMAIL = process.env.SMTP_FROM || 'ERP CSI <noreply@buzzword.com.mx>'

function createTransport() {
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    ...(SMTP_USER && SMTP_PASS
      ? { auth: { user: SMTP_USER, pass: SMTP_PASS } }
      : {}),
    tls: {
      rejectUnauthorized: false,
    },
  })
}

export async function sendEmail(to: string, subject: string, html: string) {
  if (!SMTP_HOST) {
    console.log(`[EMAIL SKIP] No SMTP_HOST configured. To: ${to}, Subject: ${subject}`)
    return { success: true, skipped: true }
  }

  try {
    const transporter = createTransport()

    await transporter.sendMail({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    })

    return { success: true }
  } catch (err) {
    console.error('[EMAIL ERROR]', err)
    return { success: false, error: 'Error al enviar email' }
  }
}

export async function sendEmailToUsers(
  supabase: { from: (table: string) => { select: (cols: string) => { in: (col: string, vals: string[]) => { eq: (col: string, val: boolean) => Promise<{ data: Array<{ email: string }> | null }> } } } },
  roles: string[],
  subject: string,
  html: string
) {
  const { data: usuarios } = await supabase
    .from('perfiles')
    .select('email')
    .in('rol', roles)
    .eq('activo', true)

  if (!usuarios) return

  for (const u of usuarios) {
    await sendEmail(u.email, subject, html)
  }
}
