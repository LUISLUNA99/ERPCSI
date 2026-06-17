const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

function baseTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:Inter,system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;">
    <tr>
      <td style="background-color:#1B3A6B;padding:24px 32px;">
        <h1 style="color:#ffffff;margin:0;font-size:20px;">ERP CSI</h1>
        <p style="color:#93C5FD;margin:4px 0 0;font-size:12px;">Grupo CSI - Cuentas por Pagar</p>
      </td>
    </tr>
    <tr>
      <td style="padding:32px;">
        ${content}
      </td>
    </tr>
    <tr>
      <td style="padding:16px 32px;background-color:#F1F5F9;border-top:1px solid #E2E8F0;">
        <p style="color:#94A3B8;font-size:12px;margin:0;text-align:center;">
          Este es un correo automatico del sistema ERP CSI. No responder a este mensaje.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function linkButton(url: string, text: string): string {
  return `<a href="${url}" style="display:inline-block;background-color:#2563EB;color:#ffffff;padding:10px 24px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:500;margin-top:16px;">${text}</a>`
}

export function emailRequisicionEnviada(folio: string, requisicionId: string, solicitante: string) {
  return {
    subject: `Nueva solicitud de compra pendiente: ${folio}`,
    html: baseTemplate(`
      <h2 style="color:#1B3A6B;margin:0 0 16px;">Nueva solicitud de compra pendiente</h2>
      <p style="color:#334155;font-size:14px;line-height:1.6;">
        <strong>${solicitante}</strong> ha enviado la solicitud de compra <strong>${folio}</strong> para tu aprobacion.
      </p>
      <p style="color:#334155;font-size:14px;">Revisa los detalles y toma una decision.</p>
      ${linkButton(`${APP_URL}/requisiciones/${requisicionId}`, 'Ver solicitud de compra')}
    `),
  }
}

export function emailRequisicionAprobada(folio: string, requisicionId: string) {
  return {
    subject: `Solicitud de compra aprobada: ${folio}`,
    html: baseTemplate(`
      <h2 style="color:#16A34A;margin:0 0 16px;">Solicitud de compra aprobada</h2>
      <p style="color:#334155;font-size:14px;line-height:1.6;">
        Tu solicitud de compra <strong>${folio}</strong> ha sido aprobada y pasara al area de Tesoreria para programar el pago.
      </p>
      ${linkButton(`${APP_URL}/requisiciones/${requisicionId}`, 'Ver detalle')}
    `),
  }
}

export function emailRequisicionRechazada(folio: string, requisicionId: string, motivo: string) {
  return {
    subject: `Solicitud de compra rechazada: ${folio}`,
    html: baseTemplate(`
      <h2 style="color:#DC2626;margin:0 0 16px;">Solicitud de compra rechazada</h2>
      <p style="color:#334155;font-size:14px;line-height:1.6;">
        Tu solicitud de compra <strong>${folio}</strong> ha sido rechazada.
      </p>
      <div style="background-color:#FEF2F2;border-left:4px solid #DC2626;padding:12px 16px;margin:16px 0;border-radius:4px;">
        <p style="color:#991B1B;font-size:14px;margin:0;"><strong>Motivo:</strong> ${motivo}</p>
      </div>
      <p style="color:#334155;font-size:14px;">Puedes corregir y reenviar la solicitud de compra.</p>
      ${linkButton(`${APP_URL}/requisiciones/${requisicionId}`, 'Corregir solicitud de compra')}
    `),
  }
}

export function emailPagoEjecutado(folio: string, requisicionId: string, folioBancario: string) {
  return {
    subject: `Pago realizado: ${folio}`,
    html: baseTemplate(`
      <h2 style="color:#16A34A;margin:0 0 16px;">Pago realizado</h2>
      <p style="color:#334155;font-size:14px;line-height:1.6;">
        El pago de tu solicitud de compra <strong>${folio}</strong> ha sido ejecutado.
      </p>
      <p style="color:#334155;font-size:14px;">Folio bancario: <strong>${folioBancario}</strong></p>
      <p style="color:#334155;font-size:14px;">Si aun no has subido la factura del proveedor, por favor hazlo lo antes posible.</p>
      ${linkButton(`${APP_URL}/requisiciones/${requisicionId}`, 'Ver detalle')}
    `),
  }
}

export function emailAlertaFactura(folio: string, requisicionId: string, nivel: string) {
  const esVencida = nivel === 'VENCIDA'
  return {
    subject: esVencida ? `URGENTE: Factura vencida - ${folio}` : `Alerta: Factura por vencer - ${folio}`,
    html: baseTemplate(`
      <h2 style="color:${esVencida ? '#DC2626' : '#D97706'};margin:0 0 16px;">
        ${esVencida ? 'Factura VENCIDA' : 'Factura por vencer'}
      </h2>
      <p style="color:#334155;font-size:14px;line-height:1.6;">
        La solicitud de compra <strong>${folio}</strong> ${esVencida ? 'ha superado el plazo para entregar la factura.' : 'esta proxima a vencer el plazo de entrega de factura.'}
      </p>
      <p style="color:#334155;font-size:14px;">Se requiere accion inmediata.</p>
      ${linkButton(`${APP_URL}/requisiciones/${requisicionId}`, 'Ver solicitud de compra')}
    `),
  }
}
