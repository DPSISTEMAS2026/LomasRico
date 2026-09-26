import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    const body = await req.json().catch(() => ({}));
    const host = req.headers.get('host');
    const origin = req.headers.get('origin');
    const fwd = req.headers.get('x-forwarded-for');
    // #region agent log
        fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'phone-access',hypothesisId:'H-LOCALHOST',location:'api/debug-access/route.ts',message:'client reached server',data:{host,origin,fwd,href:body?.href||null,apiUrl:body?.apiUrl||null,ua:String(body?.ua||'').slice(0,80)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return NextResponse.json({ ok: true });
}
