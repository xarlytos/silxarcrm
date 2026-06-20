/**
 * Script para generar VoiceAgentConfig para todos los softwares existentes
 * que aún no tengan configuración de agente de voz.
 *
 * Uso: npx ts-node scripts/seedVoiceAgentConfigs.ts
 */
import { seedVoiceAgentConfigs } from '../src/services/voiceAgentConfigService';
import { prisma } from '../src/config/database';
import { logger } from '../src/utils/logger';

async function main() {
  logger.info('🚀 Iniciando seed de VoiceAgentConfigs...');

  try {
    const result = await seedVoiceAgentConfigs();
    logger.info(`✅ Seed completado:`, result);
  } catch (error) {
    logger.error('❌ Error en seed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
