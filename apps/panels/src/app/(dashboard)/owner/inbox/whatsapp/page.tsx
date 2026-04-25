'use client';

import { useState, useEffect, useRef } from 'react';
import {
    MessageSquare,
    User,
    Bot,
    Send,
    CheckCircle,
    UserPlus,
    Search,
    MessageCircle,
    Loader2,
    Store,
    MapPin,
    AlertCircle
} from 'lucide-react';
import { API_URL } from '../../../../../services/api';
import { authFetch } from '../../../../../services/authFetch';
import { useAuth } from '../../../../../context/AuthContext';

export default function WhatsAppInboxClean() {
    const [conversations, setConversations] = useState<any[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [conversation, setConversation] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [replyText, setReplyText] = useState('');
    const [noteText, setNoteText] = useState('');
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    const { user } = useAuth();
    const currentUser = { id: user?.id || 'staff-1', name: user?.name || 'Soporte' };

    const chatEndRef = useRef<HTMLDivElement>(null);
    const activeIdRef = useRef<string | null>(null);

    // Sincronizar el ref cada vez que cambia el seleccionado
    useEffect(() => {
        activeIdRef.current = selectedId;
        if (selectedId) loadConversation(selectedId);
    }, [selectedId]);

    useEffect(() => {
        loadConversations();
        const interval = setInterval(() => {
            loadConversations();
            if (activeIdRef.current) loadConversation(activeIdRef.current);
        }, 3000); // Polling rápido para mejorUX
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [conversation?.messages]);

    const loadConversations = async () => {
        try {
            const res = await authFetch(`${API_URL}/api/whatsapp/conversations`);
            if (res.ok) {
                // Ordenar para que las más recientes salgan arriba
                const data = await res.json();
                setConversations(data.sort((a: any, b: any) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()));
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const loadConversation = async (id: string) => {
        try {
            const res = await authFetch(`${API_URL}/api/whatsapp/conversations/${id}`);
            if (res.ok) setConversation(await res.json());
        } catch (e) { console.error(e); }
    };

    const handleTake = async () => {
        if (!selectedId) return;
        const res = await authFetch(`${API_URL}/api/whatsapp/conversations/${selectedId}/take`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.id })
        });
        if (res.ok) {
            alert('✓ Ahora estás a cargo de este chat.');
            loadConversation(selectedId);
            loadConversations();
        } else {
            alert('Error al tomar el chat.');
        }
    };

    const handleRelease = async () => {
        if (!selectedId) return;
        const res = await authFetch(`${API_URL}/api/whatsapp/conversations/${selectedId}/release`, { method: 'POST' });
        if (res.ok) {
            alert('✓ Chat devuelto al asistente virtual.');
            loadConversation(selectedId);
            loadConversations();
        } else {
            alert('Error al liberar el chat.');
        }
    };

    const handleSendReply = async () => {
        if (!selectedId || !replyText.trim()) return;
        const textBuf = replyText;
        setReplyText(''); // Limpiar input rápido
        const res = await authFetch(`${API_URL}/api/whatsapp/conversations/${selectedId}/reply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.id, text: textBuf })
        });
        if (res.ok) {
            loadConversation(selectedId);
            loadConversations();
        }
    };

    const handleAddNote = async () => {
        if (!selectedId || !noteText.trim()) return;
        await authFetch(`${API_URL}/api/whatsapp/conversations/${selectedId}/note`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.id, text: noteText })
        });
        setNoteText('');
        loadConversation(selectedId);
    };

    const formatId = (id: string) => `+${id.replace('whatsapp:', '').replace('+', '')}`;

    const filteredConversations = conversations.filter(c => {
        const strId = String(c.contactId);
        const matchesSearch = strId.includes(searchTerm) || (c.customerName && c.customerName.toLowerCase().includes(searchTerm.toLowerCase()));
        if (filter === 'all') return matchesSearch;
        if (filter === 'human') return matchesSearch && c.mode === 'HUMAN';
        if (filter === 'bot') return matchesSearch && c.mode === 'BOT';
        if (filter === 'resolved') return matchesSearch && c.status === 'RESOLVED';
        return matchesSearch;
    });

    if (loading && conversations.length === 0) return (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
            <Loader2 className="animate-spin text-orange-500 mb-6" size={48} />
            <p className="font-semibold text-slate-500">Cargando chats...</p>
        </div>
    );

    return (
        <div className="h-[calc(100vh-100px)] md:h-[calc(100vh-140px)] flex flex-col lg:flex-row bg-white rounded-2xl md:rounded-3xl overflow-hidden shadow-lg border border-slate-200">

            {/* BARRA LATERAL (LISTA DE CHATS) */}
            <aside className={`w-full lg:w-[350px] flex flex-col border-r border-slate-200 bg-slate-50 transition-all ${selectedId ? 'hidden lg:flex' : 'flex'}`}>
                {/* Cabecera Sidebar */}
                <div className="p-4 md:p-5 border-b border-slate-200 bg-white">
                    <h2 className="text-xl md:text-2xl font-black italic tracking-tighter uppercase flex items-center gap-2 text-slate-800">
                        <MessageCircle className="text-orange-500" size={24} />
                        CHAT<span className="text-orange-500">CENTER</span>
                    </h2>

                    <div className="relative mt-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            placeholder="Buscar chats..."
                            className="w-full pl-9 pr-4 py-2 bg-slate-100 border-none rounded-xl text-xs md:text-sm outline-none focus:ring-2 focus:ring-orange-500 transition-all font-bold uppercase italic"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar pb-1">
                        {['all', 'human', 'bot'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-black uppercase italic tracking-tighter transition-all whitespace-nowrap ${filter === f ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                    }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Lista de Coversaciones */}
                <div className="flex-1 overflow-y-auto w-full no-scrollbar pb-10">
                    {filteredConversations.length === 0 ? (
                        <div className="text-center p-8 text-[10px] font-black uppercase text-slate-400 italic">
                            No hay conversaciones
                        </div>
                    ) : (
                        filteredConversations.map(conv => (
                            <div
                                key={conv.id}
                                onClick={() => setSelectedId(conv.id)}
                                className={`p-4 border-b border-slate-100 cursor-pointer transition-colors relative flex items-center gap-3
                                ${selectedId === conv.id ? 'bg-orange-50 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 md:before:w-1.5 before:bg-orange-500' : 'bg-white hover:bg-slate-50'}
                                `}
                            >
                                {/* Avatar Genérico */}
                                <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-200 rounded-full flex items-center justify-center shrink-0 border border-white shadow-sm overflow-hidden">
                                    <User size={20} className="text-slate-400 md:w-6 md:h-6" />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline mb-0.5">
                                        <span className="font-black text-slate-800 text-xs md:text-sm truncate uppercase italic tracking-tighter">
                                            {conv.customerName || formatId(conv.contactId)}
                                        </span>
                                        <span className="text-[9px] md:text-[10px] font-black text-slate-400 shrink-0 ml-2 italic">
                                            {new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <p className="text-[11px] md:text-xs text-slate-500 truncate flex-1 leading-tight">
                                            {conv.mode === 'BOT' ? <Bot size={12} className="inline mr-1 text-slate-400" /> : ''}
                                            {conv.messages?.[0]?.body || 'Sin mensajes'}
                                        </p>
                                        {conv.unreadCount > 0 && (
                                            <div className="w-4 h-4 md:w-5 md:h-5 bg-green-500 text-white text-[8px] md:text-[10px] font-black rounded-full flex items-center justify-center ml-2 shrink-0">
                                                {conv.unreadCount}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </aside>

            {/* ÁREA PRINCIPAL DE CHAT */}
            {selectedId && conversation ? (
                <main className={`flex-1 flex flex-col bg-[#efeae2] relative z-0 transition-all ${selectedId ? 'flex' : 'hidden lg:flex'}`}>
                    {/* Header del Chat */}
                    <header className="px-4 md:px-6 py-3 md:py-4 bg-white border-b border-slate-200 flex justify-between items-center z-10 shadow-sm">
                        <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                            <button
                                onClick={() => setSelectedId(null)}
                                className="lg:hidden p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"
                            >
                                <MessageSquare size={20} />
                            </button>
                            <div className="w-9 h-9 md:w-12 md:h-12 bg-slate-200 rounded-full flex items-center justify-center shrink-0">
                                <User size={20} className="text-slate-500 md:w-6 md:h-6" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="font-black text-slate-800 text-sm md:text-base uppercase italic tracking-tighter truncate leading-tight">
                                    {conversation.customerName || formatId(conversation.contactId)}
                                </h3>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <div className={`w-1.5 h-1.5 rounded-full ${conversation.mode === 'HUMAN' ? 'bg-green-500' : 'bg-orange-500'}`} />
                                    <span className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase italic whitespace-nowrap">
                                        {conversation.mode === 'HUMAN' ? 'Personal' : 'Bot AI'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            {conversation.mode === 'BOT' ? (
                                <button
                                    onClick={handleTake}
                                    className="bg-green-600 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-xl font-black text-[9px] md:text-xs shadow-sm hover:bg-green-700 transition flex items-center gap-1.5 md:gap-2 uppercase italic tracking-tighter"
                                >
                                    <UserPlus size={14} className="md:w-4 md:h-4" /> <span className="hidden sm:inline">TOMAR CHAT</span><span className="sm:hidden">TOMAR</span>
                                </button>
                            ) : (
                                <button
                                    onClick={handleRelease}
                                    className="bg-slate-900 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-xl font-black text-[9px] md:text-xs shadow-sm hover:bg-slate-800 transition flex items-center gap-1.5 md:gap-2 uppercase italic tracking-tighter"
                                >
                                    <Bot size={14} className="md:w-4 md:h-4" /> <span className="hidden sm:inline">DEVOLVER AL BOT</span><span className="sm:hidden">LIBERAR</span>
                                </button>
                            )}
                        </div>
                    </header>

                    {/* Mensajes - Estilo WhatsApp */}
                    <div className="flex-1 overflow-y-auto px-3 sm:px-10 py-6 space-y-4 shadow-inner" style={{ backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')", backgroundRepeat: 'repeat', backgroundSize: '400px', opacity: 1 }}>
                        {conversation.messages.length === 0 && (
                            <div className="text-center p-8">
                                <div className="bg-orange-100 text-orange-800 font-black text-[10px] md:text-xs px-4 py-2 rounded-lg inline-block uppercase italic">
                                    Aún no hay mensajes en este chat.
                                </div>
                            </div>
                        )}

                        {conversation.messages.map((msg: any) => {
                            const isCustomer = msg.direction === 'IN';

                            return (
                                <div key={msg.id} className={`flex w-full ${isCustomer ? 'justify-start' : 'justify-end'}`}>
                                    <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-2.5 md:p-3 shadow-sm relative group
                                        ${isCustomer
                                            ? 'bg-white text-slate-800 rounded-tl-sm'
                                            : 'bg-[#daf8cb] text-slate-800 rounded-tr-sm' /* WhatsApp light green */}
                                    `}>
                                        <p className="text-xs md:text-[14px] font-medium leading-snug whitespace-pre-wrap">{msg.body}</p>

                                        <div className={`flex justify-end items-center gap-1.5 mt-1.5 -mb-1
                                            ${isCustomer ? 'text-slate-400' : 'text-slate-500'}`}>

                                            {!isCustomer && (
                                                <span className="text-[8px] md:text-[10px] font-black uppercase italic opacity-70">
                                                    {msg.authorType === 'BOT' ? '🤖 Bot' : '👤 Tú'}
                                                </span>
                                            )}

                                            <span className="text-[8px] md:text-[9px] font-black">
                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={chatEndRef} className="h-2" />
                    </div>

                    {/* Input de Envío */}
                    <footer className="bg-slate-100 px-3 md:px-4 py-2 md:py-3 flex items-center gap-2 md:gap-3 z-10 border-t border-slate-300">
                        {conversation.mode === 'BOT' && (
                            <div className="absolute inset-x-0 bottom-full bg-slate-900 text-white text-[8px] md:text-xs py-2 px-4 shadow-lg flex justify-between items-center">
                                <span className="flex items-center gap-2 font-black uppercase italic tracking-tighter leading-tight"><AlertCircle size={14} className="shrink-0" /> Chat controlado por IA. Toma el control para responder.</span>
                            </div>
                        )}
                        <input
                            disabled={conversation.mode === 'BOT'}
                            placeholder={conversation.mode === 'BOT' ? "Auditoría en curso..." : "Escribe un mensaje..."}
                            className="flex-1 bg-white rounded-full px-4 md:px-5 py-2.5 md:py-3 border-none shadow-sm focus:ring-2 focus:ring-green-500 outline-none text-xs md:text-sm disabled:opacity-60 disabled:bg-slate-200 transition-all font-bold italic"
                            value={replyText}
                            onChange={e => setReplyText(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendReply();
                                }
                            }}
                        />
                        <button
                            disabled={conversation.mode === 'BOT' || !replyText.trim()}
                            onClick={handleSendReply}
                            className="w-10 h-10 md:w-12 md:h-12 bg-green-600 text-white rounded-full flex items-center justify-center shadow-md hover:bg-green-700 disabled:opacity-50 disabled:bg-slate-400 transition-all shrink-0"
                        >
                            <Send size={16} className="md:w-[18px] md:h-[18px] translate-x-0.5" />
                        </button>
                    </footer>
                </main>
            ) : (
                <main className="hidden md:flex flex-1 items-center justify-center bg-slate-50 relative z-0">
                    <div className="text-center p-10">
                        <div className="w-24 h-24 md:w-32 md:h-32 bg-white rounded-[2.5rem] md:rounded-[3rem] shadow-xl flex items-center justify-center mx-auto mb-8 border border-slate-100">
                            <Store size={48} className="text-slate-200 md:w-16 md:h-16" />
                        </div>
                        <h3 className="text-3xl md:text-4xl font-black italic tracking-tighter uppercase text-slate-800 leading-none">
                            LO MÁS RICO <span className="text-orange-500">WEB</span>
                        </h3>
                        <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest mt-4 italic">Selecciona un chat para comenzar a auditar o responder.</p>
                    </div>
                </main>
            )}

            {/* RIGHT PANEL - INFO */}
            {selectedId && conversation && (
                <aside className="hidden 2xl:flex w-[300px] border-l border-slate-200 bg-white flex-col z-10 transition-all">
                    <div className="p-8 border-b border-slate-100 text-center">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-slate-100 shadow-inner">
                            <User size={36} className="text-slate-300" />
                        </div>
                        <h4 className="font-black text-slate-800 text-lg uppercase italic tracking-tighter leading-tight">{conversation.customerName || 'Cliente Nuevo'}</h4>
                        <p className="text-[10px] font-black text-slate-400 mt-2 tracking-widest uppercase italic">{formatId(conversation.contactId)}</p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
                        {/* Ubicaciones */}
                        <div>
                            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 italic">Direcciones ({conversation.customer?.addresses?.length || 0})</h5>
                            {conversation.customer?.addresses?.length > 0 ? (
                                <div className="space-y-3">
                                    {conversation.customer.addresses.map((a: any) => (
                                        <div key={a.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 hover:border-orange-200 transition-all">
                                            <p className="font-black text-[11px] text-slate-800 uppercase italic tracking-tight">{a.alias}</p>
                                            <p className="text-[11px] text-slate-500 leading-tight mt-1 font-medium">{a.address}, {a.city}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-[10px] text-slate-400 italic font-black uppercase">No tiene direcciones registradas.</p>
                            )}
                        </div>

                        {/* Notas */}
                        <div>
                            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 italic">Notas del Equipo</h5>
                            <div className="bg-orange-50/30 p-4 rounded-2xl border border-orange-100 mb-4 transition-all focus-within:ring-2 focus-within:ring-orange-500/20">
                                <textarea
                                    className="w-full bg-transparent text-xs text-slate-700 placeholder-slate-400 outline-none resize-none font-medium"
                                    placeholder="Añadir nota importante..."
                                    rows={3}
                                    value={noteText}
                                    onChange={e => setNoteText(e.target.value)}
                                />
                                <button
                                    onClick={handleAddNote}
                                    disabled={!noteText.trim()}
                                    className="mt-3 w-full bg-slate-900 hover:bg-orange-500 text-white font-black py-2 rounded-xl text-[10px] disabled:opacity-30 transition-all uppercase italic tracking-widest"
                                >
                                    Guardar Nota
                                </button>
                            </div>

                            <div className="space-y-3">
                                {conversation.notes?.map((n: any) => (
                                    <div key={n.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                        <p className="text-[11px] text-slate-700 leading-relaxed font-medium mb-3">{n.text}</p>
                                        <div className="flex justify-between items-center text-[8px] text-slate-400 font-black uppercase italic tracking-tighter">
                                            <span className="flex items-center gap-1"><User size={8} /> {n.user?.name}</span>
                                            <span>{new Date(n.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </aside>
            )}

        </div>
    );
}
