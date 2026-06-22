import { logger } from '../utils/logger';
import {
  cacheConversationTurn,
  detectRepetition,
  getProspectMemory,
  ConversationTurn,
} from './memoryGuardianService';
import { AIWebhookPayload } from './llamadaAiService';

/**
 * Integration layer for Memory Guardian with AI calling system
 * Automatically caches transcripts and detects repetitions in real-time
 */

/**
 * Process transcript from AI call and cache conversation turns
 * Called after AI call webhook with transcript
 */
export async function processAICallTranscript(
  leadId: string,
  softwareId: string,
  transcript: Array<{ role: string; text: string }> | string,
  callId: string,
  durationSec?: number
): Promise<{
  success: boolean;
  cacheCount: number;
  repetitionsDetected: number;
  alerts: any[];
  error?: string;
}> {
  try {
    // Parse transcript if it's a string
    let turns: Array<{ role: string; text: string }> = [];
    if (typeof transcript === 'string') {
      // If it's a stringified JSON, parse it
      try {
        turns = JSON.parse(transcript);
      } catch {
        // If it's plain text, treat as single agent message
        turns = [
          {
            role: 'agent',
            text: transcript,
          },
        ];
      }
    } else {
      turns = transcript;
    }

    if (!Array.isArray(turns) || turns.length === 0) {
      logger.warn('[MemoryGuardian] Empty or invalid transcript', { leadId, callId });
      return {
        success: true,
        cacheCount: 0,
        repetitionsDetected: 0,
        alerts: [],
      };
    }

    let cacheCount = 0;
    let repetitionsDetected = 0;
    const detectedRepetitions: any[] = [];

    // Get current memory to check for repetitions
    const prospectMemory = await getProspectMemory(leadId);

    // Process each turn
    for (const turn of turns) {
      try {
        // Normalize role
        const role =
          turn.role === 'prospect' || turn.role === 'customer' ? 'prospect' : 'agent';

        const conversationTurn: ConversationTurn = {
          role: role as any,
          timestamp: new Date(),
          message: turn.text,
          callId,
          duration: durationSec,
        };

        // Cache the turn
        const updated = await cacheConversationTurn(leadId, softwareId, conversationTurn);
        cacheCount++;

        // Detect repetition only for prospect messages
        if (role === 'prospect' && prospectMemory) {
          const repetition = detectRepetition(turn.text, prospectMemory);
          if (repetition && repetition.detected) {
            repetitionsDetected++;
            detectedRepetitions.push({
              field: repetition.field,
              confidence: repetition.confidence,
              empathyResponse: repetition.empathyResponse,
              message: turn.text,
            });

            logger.info(
              `[MemoryGuardian] Repetition detected - ${repetition.field} (${repetition.confidence}% confidence)`,
              {
                leadId,
                callId,
              }
            );
          }
        }
      } catch (turnError) {
        logger.error('[MemoryGuardian] Error processing transcript turn:', turnError);
        // Continue with next turn
      }
    }

    return {
      success: true,
      cacheCount,
      repetitionsDetected,
      alerts: detectedRepetitions,
    };
  } catch (error: any) {
    logger.error('[MemoryGuardian] Error processing AI call transcript:', error);
    return {
      success: false,
      cacheCount: 0,
      repetitionsDetected: 0,
      alerts: [],
      error: error.message,
    };
  }
}

/**
 * Hook into AI webhook to auto-cache transcripts
 * Call this after processing standard AI webhook
 */
export async function hookAIWebhookForMemory(payload: AIWebhookPayload): Promise<void> {
  try {
    if (
      !payload.leadId ||
      !payload.softwareId ||
      !payload.transcript ||
      payload.transcript.length === 0
    ) {
      return;
    }

    // Fire and forget - don't block the webhook response
    processAICallTranscript(
      payload.leadId,
      payload.softwareId,
      payload.transcript,
      payload.llamadaId || payload.callSid || 'unknown',
      payload.durationS
    ).catch((err) => {
      logger.error('[MemoryGuardian] Error in webhook hook:', err);
    });
  } catch (error) {
    logger.error('[MemoryGuardian] Error hooking AI webhook:', error);
  }
}

/**
 * Generate agent briefing card from memory
 * Call this before initiating a call to prep agent
 */
export async function generateAgentBriefing(
  leadId: string
): Promise<{
  hasPriorCalls: boolean;
  briefing: string;
  keyPoints: string[];
  reparedResponses: string[];
  estimatedBudget?: string;
  riskFactors: string[];
}> {
  try {
    const prospectMemory = await getProspectMemory(leadId);

    const briefing = {
      hasPriorCalls: !!prospectMemory,
      briefing: '',
      keyPoints: [] as string[],
      reparedResponses: [] as string[],
      estimatedBudget: prospectMemory?.extractedInfo.budget
        ? `${prospectMemory.extractedInfo.budget.currency} ${prospectMemory.extractedInfo.budget.amount}`
        : undefined,
      riskFactors: [] as string[],
    };

    if (!prospectMemory) {
      briefing.briefing = 'No prior calls - first contact. Lead is unqualified.';
      briefing.keyPoints.push('Perform initial discovery');
      briefing.keyPoints.push('Identify pain points');
      briefing.keyPoints.push('Assess budget');
      return briefing;
    }

    // Build briefing text
    const lines = [
      `Prospect: ${prospectMemory.extractedInfo.name || 'Unknown'} at ${
        prospectMemory.extractedInfo.company || 'Unknown Company'
      }`,
      `Prior calls: ${prospectMemory.callCount || 0}`,
      `Total engagement: ${prospectMemory.totalEngagementMinutes.toFixed(1)} minutes`,
    ];

    if (prospectMemory.extractedInfo.budget) {
      lines.push(
        `Budget: ${prospectMemory.extractedInfo.budget.currency} ${prospectMemory.extractedInfo.budget.amount}`
      );
    }

    briefing.briefing = lines.join('\n');

    // Key points
    if (prospectMemory.extractedInfo.painPoints && prospectMemory.extractedInfo.painPoints.length > 0) {
      briefing.keyPoints.push(
        `Pain points: ${prospectMemory.extractedInfo.painPoints.join(', ')}`
      );
    }

    if (prospectMemory.extractedInfo.objections && prospectMemory.extractedInfo.objections.length > 0) {
      briefing.keyPoints.push(
        `Objections to address: ${prospectMemory.extractedInfo.objections.join(', ')}`
      );
    }

    if (prospectMemory.extractedInfo.timeline) {
      briefing.keyPoints.push(`Timeline: ${prospectMemory.extractedInfo.timeline}`);
    }

    // Prepared responses for likely repetitions
    if (prospectMemory.extractedInfo.name) {
      briefing.reparedResponses.push(
        `"Thanks ${prospectMemory.extractedInfo.name}, let me recap..."`
      );
    }

    if (prospectMemory.extractedInfo.budget) {
      briefing.reparedResponses.push(
        `"As we discussed, your ${prospectMemory.extractedInfo.budget.currency} ${prospectMemory.extractedInfo.budget.amount} budget..."`
      );
    }

    if (prospectMemory.extractedInfo.company) {
      briefing.reparedResponses.push(
        `"At ${prospectMemory.extractedInfo.company}, I understand..."`
      );
    }

    // Risk factors
    if (prospectMemory.extractedInfo.objections && prospectMemory.extractedInfo.objections.length > 0) {
      briefing.riskFactors.push('Unresolved objections present');
    }

    if (prospectMemory.callCount && prospectMemory.callCount > 3) {
      briefing.riskFactors.push('Multiple calls - risk of fatigue or disqualification');
    }

    if (!prospectMemory.extractedInfo.budget) {
      briefing.riskFactors.push('No budget identified yet - critical for qualification');
    }

    return briefing;
  } catch (error: any) {
    logger.error('[MemoryGuardian] Error generating agent briefing:', error);
    return {
      hasPriorCalls: false,
      briefing: 'Error generating briefing',
      keyPoints: [],
      reparedResponses: [],
      riskFactors: ['Unable to access prior memory'],
    };
  }
}
