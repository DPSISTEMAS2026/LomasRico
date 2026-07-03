const path = require('path');
require('dotenv').config();
require('dotenv').config({ path: path.join(__dirname, '..', 'apps', 'api', '.env') });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Iniciando limpieza de historial de chat de WhatsApp...');

  // 1. Eliminar mensajes (Message)
  // Tienen FK hacia Conversation y User
  const deletedMessages = await prisma.message.deleteMany();
  console.log(`  ✅ Eliminados: ${deletedMessages.count} mensajes.`);

  // 2. Eliminar notas de conversación (ConversationNote)
  const deletedNotes = await prisma.conversationNote.deleteMany();
  console.log(`  ✅ Eliminadas: ${deletedNotes.count} notas de conversación.`);

  // 3. Eliminar eventos de conversación (ConversationEvent)
  const deletedEvents = await prisma.conversationEvent.deleteMany();
  console.log(`  ✅ Eliminados: ${deletedEvents.count} eventos de conversación.`);

  // 4. Eliminar conversaciones (Conversation)
  const deletedConversations = await prisma.conversation.deleteMany();
  console.log(`  ✅ Eliminadas: ${deletedConversations.count} conversaciones.`);

  console.log('🎉 Limpieza de historial de WhatsApp completada con éxito.');
}

main()
  .catch((error) => {
    console.error('❌ Error durante la limpieza:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
