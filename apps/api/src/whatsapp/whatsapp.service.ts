import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class WhatsAppService {
    constructor(private prisma: PrismaService) { }

    async findAllConversations() {
        const conversations = await (this.prisma as any).conversation.findMany({
            include: {
                assignedTo: { select: { id: true, name: true, email: true } },
                messages: {
                    take: 1,
                    orderBy: { createdAt: 'desc' },
                }
            },
            orderBy: { lastMessageAt: 'desc' }
        });

        // Enriquecer con datos del cliente si existen
        return Promise.all(conversations.map(async (conv: any) => {
            const customer = await (this.prisma as any).user.findFirst({
                where: { phone: { contains: conv.contactId } },
                select: { name: true }
            });
            return { ...conv, customerName: customer?.name || null };
        }));
    }

    async findOneConversation(id: string) {
        // Reset unread count when viewing
        await (this.prisma as any).conversation.update({
            where: { id },
            data: { unreadCount: 0 }
        });

        const conversation = await (this.prisma as any).conversation.findUnique({
            where: { id },
            include: {
                messages: { orderBy: { createdAt: 'asc' } },
                notes: { include: { user: { select: { name: true } } }, orderBy: { createdAt: 'desc' } },
                events: { include: { user: { select: { name: true } } }, orderBy: { createdAt: 'desc' } },
                assignedTo: { select: { id: true, name: true } }
            }
        });

        if (!conversation) throw new NotFoundException('Conversación no encontrada');

        // Buscar datos del usuario vinculado
        const user = await (this.prisma as any).user.findFirst({
            where: { phone: { contains: conversation.contactId } },
            include: {
                addresses: true,
                sales: {
                    take: 5,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        items: {
                            include: { sellingProduct: true }
                        }
                    }
                }
            }
        });

        return {
            ...conversation,
            customer: user ? {
                id: user.id,
                name: user.name,
                addresses: user.addresses,
                sales: user.sales.map((s: any) => ({
                    id: s.id,
                    code: s.code,
                    total: s.total,
                    createdAt: s.createdAt,
                    status: s.status,
                    items: s.items.map((i: any) => `${i.quantity}x ${i.sellingProduct?.name || 'Producto'}`)
                }))
            } : null
        };
    }

    async take(id: string, userId: string = 'staff-1') {
        const staffId = userId || 'staff-1';

        // Asegurar que el usuario staff existe para evitar error de FK
        const userExists = await (this.prisma as any).user.findUnique({ where: { id: staffId } });
        if (!userExists) {
            await (this.prisma as any).user.create({
                data: {
                    id: staffId,
                    name: 'Soporte LoMásRico',
                    email: staffId === 'staff-1' ? 'soporte@lomasrico.cl' : `${staffId}@lomasrico.cl`,
                    role: 'OWNER'
                }
            });
        }

        return (this.prisma as any).conversation.update({
            where: { id },
            data: {
                mode: 'HUMAN',
                status: 'OPEN',
                assignedToUserId: staffId,
                events: {
                    create: {
                        type: 'TAKE',
                        userId: staffId,
                    }
                }
            }
        });
    }

    async release(id: string) {
        return (this.prisma as any).conversation.update({
            where: { id },
            data: {
                mode: 'BOT',
                assignedToUserId: null,
                events: {
                    create: {
                        type: 'RELEASE',
                    }
                }
            }
        });
    }

    async resolve(id: string) {
        return (this.prisma as any).conversation.update({
            where: { id },
            data: {
                status: 'RESOLVED',
                mode: 'BOT',
                assignedToUserId: null,
                events: {
                    create: {
                        type: 'RESOLVE',
                    }
                }
            }
        });
    }

    async addNote(id: string, userId: string, text: string) {
        return (this.prisma as any).conversationNote.create({
            data: {
                conversationId: id,
                userId,
                text
            }
        });
    }

    async reply(id: string, userId: string, text: string) {
        const conversation = await (this.prisma as any).conversation.findUnique({ where: { id } });
        if (!conversation) throw new NotFoundException('Conversación no encontrada');

        // Llamada a N8N para enviar el mensaje real a través de Twilio
        try {
            await fetch('https://diegoproyects8.app.n8n.cloud/webhook/twilio-outbound', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: conversation.contactId,
                    message: text
                })
            });
            console.log(`[WHATSAPP REPLY] Enviado a N8N -> To: ${conversation.contactId}`);
        } catch (e) {
            console.error('[WHATSAPP REPLY ERROR] Falló al enviar a N8N:', e);
        }

        const message = await (this.prisma as any).message.create({
            data: {
                conversationId: id,
                direction: 'OUT',
                body: text,
                authorType: 'HUMAN',
                authorUserId: userId,
            }
        });

        await (this.prisma as any).conversation.update({
            where: { id },
            data: { lastMessageAt: new Date() }
        });

        return message;
    }

    async handleInboundMessage(payload: { contactId: string, body: string, providerMessageId?: string, rawJson?: any }) {
        let { contactId, body, providerMessageId, rawJson } = payload;

        // NORMALIZACIÓN AGRESIVA
        if (!contactId) return { error: 'contactId is required' };
        const cleanContactId = contactId.replace(/\D/g, '').slice(-9); // Toma los últimos 9 dígitos (Chile)

        if (!body) return { error: 'body is required' };

        let conversation = await (this.prisma as any).conversation.findFirst({
            where: { contactId: { contains: cleanContactId } }
        });

        if (!conversation) {
            conversation = await (this.prisma as any).conversation.create({
                data: { contactId: cleanContactId, status: 'OPEN', mode: 'BOT' }
            });
        }

        const message = await (this.prisma as any).message.create({
            data: {
                conversationId: conversation.id,
                direction: 'IN',
                body,
                providerMessageId,
                authorType: 'HUMAN',
                rawJson
            }
        });

        await (this.prisma as any).conversation.update({
            where: { id: conversation.id },
            data: {
                lastMessageAt: new Date(),
                status: 'OPEN',
                unreadCount: { increment: 1 }
            }
        });

        return { conversation, message };
    }

    async getConversationMode(contactId: string) {
        const conversation = await (this.prisma as any).conversation.findFirst({
            where: { contactId }
        });
        return { mode: conversation?.mode || 'BOT', status: conversation?.status || 'OPEN' };
    }
}
