const esc = (value: unknown) => String(value ?? '').replace(/[<>&"]/g, '');
const money = (n: unknown) => `$${Math.round(Number(n) || 0).toLocaleString('es-CL')}`;

function logo() {
    return process.env.BREVO_LOGO_URL
        || 'https://xnwbrdnorjafwwyfhysx.supabase.co/storage/v1/object/public/assets/logo-email.png';
}

function detail(item: any) {
    const names: string[] = [];
    const groups = item?.modifiers?.dynamicSelections;
    if (Array.isArray(groups)) {
        for (const group of groups) {
            for (const option of group?.selectedOptions || []) {
                const name = String(option?.name || '').trim();
                if (name && !/^unidad$/i.test(name)) names.push(name);
            }
        }
    }
    const product = item?.sellingProduct?.name || 'Producto';
    return names.length ? `${product} · ${names.join(', ')}` : product;
}

function rows(sale: any) {
    return (sale.items || []).map((item: any) => `
<tr>
  <td style="padding:8px 0;font-size:14px;color:#0f172a;">${item.quantity}× ${esc(detail(item))}</td>
  <td style="padding:8px 0;font-size:14px;color:#0f172a;text-align:right;white-space:nowrap;">${money(Number(item.priceUnit) * item.quantity)}</td>
</tr>`).join('');
}

function shell(body: string) {
    return `<!DOCTYPE html><html lang="es"><body style="margin:0;padding:32px 12px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;border:1px solid #e5e7eb;">
<tr><td style="padding:32px;color:#0f172a;">
<img src="${logo()}" width="72" alt="Lo Más Rico" style="display:block;margin:0 auto 16px auto;" />
${body}
<p style="margin:20px 0 0 0;font-size:13px;color:#334155;">Cevichería Lo Más Rico · Concepción</p>
</td></tr></table></td></tr></table></body></html>`;
}

export function orderConfirmationHtml(sale: any, name?: string) {
    const shipping = sale.shippingData || {};
    const delivery = sale.fulfillmentType === 'DELIVERY'
        ? `Despacho a ${esc(shipping.address)}${Number(shipping.cost) > 0 ? ` (${money(shipping.cost)})` : ''}`
        : 'Retiro en el local';
    return shell(`
<p style="margin:0 0 8px 0;font-size:15px;">Hola${name ? `, ${esc(name)}` : ''}:</p>
<p style="margin:0 0 8px 0;font-size:15px;">Tu pedido <strong>${esc(sale.code)}</strong> está confirmado.</p>
<p style="margin:0 0 20px 0;font-size:15px;">Recibimos el pago y ya está en cocina.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;margin-bottom:16px;">${rows(sale)}</table>
<p style="margin:0 0 8px 0;font-size:14px;">${delivery}</p>
<p style="margin:0;font-size:18px;font-weight:900;">Total pagado: ${money(sale.total)}</p>`);
}

export function orderOnTheWayHtml(sale: any, name?: string) {
    const shipping = sale.shippingData || {};
    return shell(`
<p style="margin:0 0 8px 0;font-size:15px;">Hola${name ? `, ${esc(name)}` : ''}:</p>
<p style="margin:0 0 20px 0;font-size:15px;">Vamos en camino con tu pedido <strong>${esc(sale.code)}</strong>.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;margin-bottom:16px;">${rows(sale)}</table>
<p style="margin:0 0 8px 0;font-size:14px;">Despacho a ${esc(shipping.address || 'tu dirección')}</p>
<p style="margin:0;font-size:15px;">Atento a tu celular: el repartidor se estará comunicando.</p>`);
}
