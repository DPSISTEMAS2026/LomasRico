'use client';
import { useState, useEffect, useRef } from 'react';
import { MessageSquare, User, Bot, Send, Search, Loader2, MapPin, UserPlus, ArrowLeft, CheckCircle, StickyNote, ShoppingBag, Info, MessageCircle, AlertCircle, Store } from 'lucide-react';
import { API_URL } from '../../../../../services/api';
import { authFetch } from '../../../../../services/authFetch';
import { useAuth } from '../../../../../context/AuthContext';

export default function WhatsAppInboxPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [conv, setConv] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [noteText, setNoteText] = useState('');
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showInfo, setShowInfo] = useState(true);

  const { user } = useAuth();
  const me = { id: user?.id || 'staff-1', name: user?.name || 'Soporte' };
  const chatEnd = useRef<HTMLDivElement>(null);
  const idRef = useRef<string | null>(null);

  useEffect(() => { idRef.current = selectedId; if (selectedId) loadConv(selectedId); }, [selectedId]);
  useEffect(() => {
    loadList();
    const iv = setInterval(() => { loadList(); if (idRef.current) loadConv(idRef.current); }, 3000);
    return () => clearInterval(iv);
  }, []);
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [conv?.messages]);

  const loadList = async () => {
    try { const r = await authFetch(`${API_URL}/api/whatsapp/conversations`); if (r.ok) { const d = await r.json(); setConversations(d.sort((a: any, b: any) => +new Date(b.lastMessageAt) - +new Date(a.lastMessageAt))); } } catch (e) { console.error(e); } finally { setLoading(false); }
  };
  const loadConv = async (id: string) => {
    try { const r = await authFetch(`${API_URL}/api/whatsapp/conversations/${id}`); if (r.ok) setConv(await r.json()); } catch (e) { console.error(e); }
  };
  const doAction = async (action: string, body?: any) => {
    if (!selectedId) return;
    await authFetch(`${API_URL}/api/whatsapp/conversations/${selectedId}/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    loadConv(selectedId); loadList();
  };
  const doSend = async () => {
    if (!selectedId || !replyText.trim()) return;
    const t = replyText; setReplyText('');
    await doAction('reply', { userId: me.id, text: t });
  };
  const doNote = async () => {
    if (!selectedId || !noteText.trim()) return;
    await doAction('note', { userId: me.id, text: noteText });
    setNoteText('');
  };

  const fmt = (id: string) => '+' + id.replace(/\D/g, '');
  const fmtTime = (d: string) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });

  const filtered = conversations.filter(c => {
    const q = searchTerm.toLowerCase();
    const match = String(c.contactId).includes(q) || (c.customerName && c.customerName.toLowerCase().includes(q));
    if (filter === 'human') return match && c.mode === 'HUMAN';
    if (filter === 'bot') return match && c.mode === 'BOT';
    if (filter === 'resolved') return match && c.status === 'RESOLVED';
    return match;
  });

  if (loading && !conversations.length) return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
      <Loader2 className="animate-spin text-orange-500 mb-6" size={48} />
      <p className="font-black text-slate-400 text-xs uppercase italic tracking-widest">Cargando chats...</p>
    </div>
  );

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col lg:flex-row bg-white rounded-2xl md:rounded-3xl overflow-hidden shadow-lg border border-slate-200">

      {/* === SIDEBAR === */}
      <aside className={`w-full lg:w-[360px] flex flex-col border-r border-slate-200 bg-slate-50 ${selectedId ? 'hidden lg:flex' : 'flex'}`}>
        {/* Header */}
        <div className="p-4 md:p-5 border-b border-slate-200 bg-white">
          <h2 className="text-xl md:text-2xl font-black italic tracking-tighter uppercase flex items-center gap-2 text-slate-800">
            <MessageCircle className="text-orange-500" size={24} />
            WHATS<span className="text-orange-500">APP</span>
          </h2>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input placeholder="Buscar chats..." className="w-full pl-9 pr-4 py-2.5 bg-slate-100 border-none rounded-xl text-xs outline-none focus:ring-2 focus:ring-orange-500 transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
            {([['all', 'Todos'], ['bot', '🤖 Bot'], ['human', '👤 Humano'], ['resolved', '✓ Resueltos']] as const).map(([k, l]) => (
              <button key={k} onClick={() => setFilter(k)} className={`px-3 py-1.5 rounded-xl text-[10px] md:text-xs font-black uppercase italic tracking-tighter transition-all whitespace-nowrap ${filter === k ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}>{l}</button>
            ))}
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && <div className="text-center p-8 text-xs font-black uppercase text-slate-400 italic">No hay conversaciones</div>}
          {filtered.map(c => (
            <div key={c.id} onClick={() => { setSelectedId(c.id); setShowInfo(true); }}
              className={`p-4 border-b border-slate-100 cursor-pointer transition-colors relative flex items-center gap-3 ${selectedId === c.id ? 'bg-orange-50 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-orange-500' : 'bg-white hover:bg-slate-50'}`}>
              <div className="w-11 h-11 bg-slate-200 rounded-full flex items-center justify-center shrink-0"><User size={20} className="text-slate-400" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                  <span className="font-black text-slate-800 text-sm truncate">{c.customerName || fmt(c.contactId)}</span>
                  <span className="text-[10px] font-bold text-slate-400 shrink-0 ml-2">{fmtTime(c.lastMessageAt)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-[11px] text-slate-500 truncate flex-1 flex items-center gap-1">
                    {c.mode === 'BOT' && <Bot size={12} className="text-orange-400 shrink-0" />}
                    {c.messages?.[0]?.body?.substring(0, 45) || 'Sin mensajes'}
                  </p>
                  <div className="flex items-center gap-2 ml-2 shrink-0">
                    {c.unreadCount > 0 && <div className="w-5 h-5 bg-orange-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">{c.unreadCount}</div>}
                    <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase ${c.mode === 'BOT' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-700'}`}>{c.mode === 'BOT' ? 'Bot' : 'Manual'}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* === CHAT AREA === */}
      {selectedId && conv ? (
        <main className={`flex-1 flex flex-col bg-[#f0f2f5] relative ${selectedId ? 'flex' : 'hidden lg:flex'}`}>
          {/* Chat Header */}
          <header className="px-4 md:px-6 py-3 bg-white border-b border-slate-200 flex justify-between items-center shadow-sm z-10">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => setSelectedId(null)} className="lg:hidden p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"><ArrowLeft size={20} /></button>
              <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center shrink-0"><User size={18} className="text-slate-400" /></div>
              <div className="min-w-0">
                <h3 className="font-black text-slate-800 text-sm uppercase italic tracking-tighter truncate">{conv.customerName || fmt(conv.contactId)}</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className={`w-2 h-2 rounded-full ${conv.mode === 'HUMAN' ? 'bg-green-500' : 'bg-orange-500'}`} />
                  <span className="text-[10px] font-bold text-slate-500">{conv.mode === 'HUMAN' ? `Atendido por ${conv.assignedTo?.name || me.name}` : 'Maxi (Bot IA)'}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {conv.mode === 'BOT' ? (
                <button onClick={() => doAction('take', { userId: me.id })} className="bg-green-600 text-white px-3 py-2 rounded-xl font-black text-[10px] shadow-sm hover:bg-green-700 transition flex items-center gap-1.5 uppercase italic tracking-tighter"><UserPlus size={14} /><span className="hidden sm:inline">Tomar Chat</span></button>
              ) : (
                <button onClick={() => doAction('release')} className="bg-slate-800 text-white px-3 py-2 rounded-xl font-black text-[10px] shadow-sm hover:bg-slate-700 transition flex items-center gap-1.5 uppercase italic tracking-tighter"><Bot size={14} /><span className="hidden sm:inline">Devolver al Bot</span></button>
              )}
              <button onClick={() => doAction('resolve')} className="bg-slate-100 text-slate-600 px-3 py-2 rounded-xl font-black text-[10px] hover:bg-slate-200 transition flex items-center gap-1.5 uppercase italic tracking-tighter"><CheckCircle size={14} /><span className="hidden sm:inline">Resolver</span></button>
              <button onClick={() => setShowInfo(!showInfo)} className={`p-2 rounded-xl transition ${showInfo ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}><Info size={16} /></button>
            </div>
          </header>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-12 py-6 space-y-2" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cpath d=\"M30 0v60M0 30h60\" stroke=\"%23e2e8f0\" stroke-width=\"0.5\" opacity=\"0.3\"/%3E%3C/svg%3E')" }}>
            {conv.messages?.length === 0 && (
              <div className="text-center p-8"><span className="bg-orange-100 text-orange-700 font-black text-[10px] px-4 py-2 rounded-lg uppercase italic">Aún no hay mensajes</span></div>
            )}
            {conv.messages?.map((m: any, i: number) => {
              const isIn = m.direction === 'IN';
              const prev = conv.messages[i - 1];
              const showDateSep = !prev || fmtDate(m.createdAt) !== fmtDate(prev.createdAt);
              return (
                <div key={m.id}>
                  {showDateSep && <div className="text-center my-4"><span className="bg-white text-slate-400 font-bold text-[10px] px-4 py-1.5 rounded-lg shadow-sm uppercase italic">{fmtDate(m.createdAt)}</span></div>}
                  <div className={`flex w-full ${isIn ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[80%] md:max-w-[65%] rounded-2xl p-3 shadow-sm ${isIn ? 'bg-white text-slate-800 rounded-tl-sm' : 'bg-orange-50 border border-orange-100 text-slate-800 rounded-tr-sm'}`}>
                      <p className="text-[13px] md:text-sm leading-relaxed whitespace-pre-wrap">{m.body}</p>
                      <div className="flex justify-end items-center gap-2 mt-1.5">
                        {!isIn && <span className="text-[9px] font-black uppercase italic text-slate-400">{m.authorType === 'BOT' ? '🤖 Bot' : '👤 Tú'}</span>}
                        <span className="text-[9px] font-bold text-slate-400">{fmtTime(m.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={chatEnd} className="h-2" />
          </div>

          {/* Bot Banner */}
          {conv.mode === 'BOT' && (
            <div className="bg-orange-50 border-t border-orange-100 px-4 py-2.5 flex items-center gap-2 text-orange-700 text-xs font-bold">
              <AlertCircle size={14} /> Maxi (IA) controla este chat. Toma el control para responder.
            </div>
          )}

          {/* Input */}
          <footer className="bg-white px-3 md:px-4 py-2.5 flex items-center gap-3 border-t border-slate-200">
            <input disabled={conv.mode === 'BOT'} placeholder={conv.mode === 'BOT' ? 'Toma el chat para responder...' : 'Escribe un mensaje...'} className="flex-1 bg-slate-100 rounded-full px-5 py-3 border-none shadow-sm focus:ring-2 focus:ring-orange-500 outline-none text-sm disabled:opacity-50 disabled:bg-slate-200 transition-all" value={replyText} onChange={e => setReplyText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); } }} />
            <button disabled={conv.mode === 'BOT' || !replyText.trim()} onClick={doSend} className="w-11 h-11 bg-orange-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-orange-600 disabled:opacity-40 disabled:bg-slate-300 transition-all shrink-0"><Send size={18} className="translate-x-0.5" /></button>
          </footer>
        </main>
      ) : (
        <main className="hidden lg:flex flex-1 items-center justify-center bg-slate-50">
          <div className="text-center p-10">
            <div className="w-28 h-28 bg-white rounded-[3rem] shadow-xl flex items-center justify-center mx-auto mb-8 border border-slate-100"><Store size={48} className="text-slate-200" /></div>
            <h3 className="text-3xl font-black italic tracking-tighter uppercase text-slate-800">LO MÁS RICO <span className="text-orange-500">WEB</span></h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4 italic">Selecciona un chat para comenzar</p>
          </div>
        </main>
      )}

      {/* === INFO PANEL === */}
      {showInfo && selectedId && conv && (
        <aside className="hidden 2xl:flex w-[320px] border-l border-slate-200 bg-white flex-col overflow-y-auto">
          {/* Profile */}
          <div className="p-6 border-b border-slate-100 text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-slate-200"><User size={32} className="text-slate-300" /></div>
            <h4 className="font-black text-slate-800 text-lg uppercase italic tracking-tighter">{conv.customerName || 'Cliente Nuevo'}</h4>
            <p className="text-[10px] font-bold text-slate-400 mt-1 tracking-widest uppercase">{fmt(conv.contactId)}</p>
            <div className="mt-3 flex justify-center">
              <span className={`text-[9px] px-3 py-1 rounded-full font-black uppercase ${conv.mode === 'BOT' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-700'}`}>{conv.mode === 'BOT' ? '🤖 Bot Activo' : '👤 Modo Manual'}</span>
            </div>
          </div>

          {/* Orders */}
          <div className="p-5 border-b border-slate-100">
            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 italic flex items-center gap-1.5"><ShoppingBag size={12} />Últimos Pedidos</h5>
            {conv.customer?.sales?.length > 0 ? conv.customer.sales.map((s: any) => (
              <div key={s.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100 mb-2 hover:border-orange-200 transition">
                <div className="flex justify-between items-baseline">
                  <span className="font-black text-[11px] text-orange-600 uppercase italic">#{s.code}</span>
                  <span className="font-black text-[11px] text-slate-800">${Number(s.total).toLocaleString('es-CL')}</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1 leading-tight">{s.items?.join(', ')}</p>
                <p className="text-[9px] text-slate-400 mt-1 font-bold">{fmtDate(s.createdAt)} · {s.status}</p>
              </div>
            )) : <p className="text-[10px] text-slate-400 italic font-bold">Sin pedidos registrados</p>}
          </div>

          {/* Addresses */}
          <div className="p-5 border-b border-slate-100">
            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 italic flex items-center gap-1.5"><MapPin size={12} />Direcciones</h5>
            {conv.customer?.addresses?.length > 0 ? conv.customer.addresses.map((a: any) => (
              <div key={a.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100 mb-2 flex items-start gap-2 hover:border-orange-200 transition">
                <MapPin size={14} className="text-orange-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold text-[11px] text-slate-800">{a.alias}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{a.address}, {a.city}</p>
                </div>
              </div>
            )) : <p className="text-[10px] text-slate-400 italic font-bold">Sin direcciones registradas</p>}
          </div>

          {/* Notes */}
          <div className="p-5">
            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 italic flex items-center gap-1.5"><StickyNote size={12} />Notas del Equipo</h5>
            <div className="bg-orange-50/50 p-3 rounded-xl border border-orange-100 mb-3">
              <textarea className="w-full bg-transparent text-xs text-slate-700 placeholder-slate-400 outline-none resize-none" placeholder="Agregar nota..." rows={3} value={noteText} onChange={e => setNoteText(e.target.value)} />
              <button onClick={doNote} disabled={!noteText.trim()} className="mt-2 w-full bg-slate-900 hover:bg-orange-500 text-white font-black py-2 rounded-xl text-[10px] disabled:opacity-30 transition-all uppercase italic tracking-widest">Guardar Nota</button>
            </div>
            {conv.notes?.map((n: any) => (
              <div key={n.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100 mb-2">
                <p className="text-[11px] text-slate-700 leading-relaxed">{n.text}</p>
                <div className="flex justify-between text-[9px] text-slate-400 font-bold mt-2">
                  <span className="flex items-center gap-1"><User size={9} />{n.user?.name}</span>
                  <span>{fmtDate(n.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </aside>
      )}
    </div>
  );
}
