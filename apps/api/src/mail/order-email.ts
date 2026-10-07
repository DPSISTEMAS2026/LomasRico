import { logoSrc } from './brevo.service';

const esc = (value: unknown) => String(value ?? '').replace(/[<>&"]/g, '');
const money = (n: unknown) => `$${Math.round(Number(n) || 0).toLocaleString('es-CL')}`;

export function orderConfirmationHtml(sale: any, name?: string) {
    const shipping = sale.shippingData || {};
    const rows = (sale.items || []).map((item: any) => `
<tr>
  <td style="padding:6px 0;font-size:14px;color:#0f172a;">${item.quantity}x ${esc(item.sellingProduct?.name || 'Producto')}</td>
  <td style="padding:6px 0;font-size:14px;color:#0f172a;text-align:right;">${money(Number(item.priceUnit) * item.quantity)}</td>
</tr>`).join('');
    const delivery = sale.fulfillmentType === 'DELIVERY'
        ? `Despacho a ${esc(shipping.address)}${Number(shipping.cost) > 0 ? ` (${money(shipping.cost)})` : ''}`
        : 'Retiro en el local';
    return `<!DOCTYPE html><html lang="es"><body style="margin:0;padding:32px 12px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;border:1px solid #e5e7eb;">
<tr><td style="padding:32px;color:#0f172a;">
<img src="${logoSrc()}" width="72" alt="Lo Más Rico" style="display:block;margin:0 auto 16px auto;" />
<p style="margin:0 0 8px 0;font-size:15px;">Hola${name ? `, ${esc(name)}` : ''}:</p>
<p style="margin:0 0 20px 0;font-size:15px;">Recibimos tu pago. Tu pedido <strong>${esc(sale.code)}</strong> ya está en cocina.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;margin-bottom:16px;">${rows}</table>
<p style="margin:0 0 8px 0;font-size:14px;">${delivery}</p>
<p style="margin:0 0 20px 0;font-size:18px;font-weight:900;">Total pagado: ${money(sale.total)}</p>
<p style="margin:0;font-size:13px;color:#334155;">Cevichería Lo Más Rico · Concepción</p>
</td></tr></table></td></tr></table></body></html>`;
}
