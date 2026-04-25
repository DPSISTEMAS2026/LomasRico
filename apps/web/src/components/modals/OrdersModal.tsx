'use client';

import { useState, useEffect } from 'react';
import { getUserOrders } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Clock, Package, ChevronRight, CheckCircle, AlertCircle } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export default function OrdersModal({ isOpen, onClose }: Props) {
    const { user, isLoggedIn } = useAuth();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && isLoggedIn && user) {
            loadOrders();
        }
    }, [isOpen, isLoggedIn, user]);

    const loadOrders = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const data = await getUserOrders(user.id);
            setOrders(data);
        } catch (e) {
            console.error('Failed to load orders');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden flex flex-col shadow-2xl max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b flex justify-between items-center bg-gray-50 shrink-0">
                    <div>
                        <h2 className="text-2xl font-black italic tracking-tighter">MIS PEDIDOS</h2>
                        <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest">Historial de compras</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-black text-2xl p-2">&times;</button>
                </div>

                <div className="p-6 overflow-y-auto space-y-4">
                    {loading ? (
                        <div className="py-20 text-center">
                            <div className="animate-spin inline-block w-8 h-8 border-4 border-black border-t-transparent rounded-full mb-4"></div>
                            <p className="text-xs font-black uppercase text-gray-400 tracking-widest animate-pulse">Cargando historial...</p>
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="py-20 text-center space-y-4">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-300">
                                <Package size={32} />
                            </div>
                            <div className="space-y-1">
                                <p className="font-black italic text-lg tracking-tight">AUN NO TIENES PEDIDOS</p>
                                <p className="text-gray-400 text-xs">¡Tus ceviches aparecerán aquí cuando realices tu primera compra!</p>
                            </div>
                        </div>
                    ) : (
                        orders.map((order) => (
                            <div key={order.id} className="group bg-white border border-gray-100 rounded-2xl p-5 hover:border-black transition-all shadow-sm">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex gap-4">
                                        <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-black group-hover:text-white transition-colors">
                                            <Package size={20} />
                                        </div>
                                        <div>
                                            <div className="font-black text-sm tracking-tight text-gray-900 uppercase">PEDIDO {order.code}</div>
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase">
                                                <Clock size={10} /> {new Date(order.createdAt).toLocaleDateString()} • {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-black text-lg text-gray-900">${Number(order.total).toLocaleString()}</div>
                                        <div className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full inline-block ${order.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                                order.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                                                    'bg-orange-100 text-orange-700'
                                            }`}>
                                            {order.status}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2 border-t border-gray-50 pt-4">
                                    {order.items.map((item: any, idx: number) => (
                                        <div key={idx} className="flex justify-between text-xs">
                                            <span className="text-gray-500"><b className="text-gray-900">{item.quantity}x</b> {item.productVariant.sellingProduct.name} ({item.productVariant.name})</span>
                                            <span className="font-bold text-gray-400">${Number(item.priceUnit).toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>

                                {order.shippingData && (
                                    <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-blue-500 bg-blue-50 p-2 rounded-lg uppercase">
                                        <ChevronRight size={12} /> Despacho a: {order.shippingData.address}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                <div className="p-6 bg-gray-50 border-t shrink-0">
                    <button
                        onClick={onClose}
                        className="w-full py-4 rounded-2xl bg-black text-white font-black text-sm uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                    >
                        Cerrar Historial
                    </button>
                </div>
            </div>
        </div>
    );
}
