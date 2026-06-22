import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  scoreLeadWithSignals,
  LeadScoringInput,
  LeadScoreBreakdown,
} from '../src/services/leadScoringService';

describe('Lead Scoring System', () => {
  describe('Engagement Score Calculation', () => {
    it('should calculate high engagement score for active lead', async () => {
      const input: LeadScoringInput = {
        leadId: 'test-1',
        softwareId: 'groomly',
        engagement: {
          emailOpens: 10,
          emailClicks: 5,
          callDuration: 1200, // 20 minutes
          callCount: 2,
          replyRate: 100,
          whatsappInteractions: 8,
          lastEngagementDaysAgo: 1,
        },
      };

      const result = await scoreLeadWithSignals(input);

      expect(result.engagementScore).toBeGreaterThan(80);
      console.log('✓ High engagement score:', result.engagementScore);
    });

    it('should penalize disengaged leads', async () => {
      const input: LeadScoringInput = {
        leadId: 'test-2',
        softwareId: 'groomly',
        engagement: {
          emailOpens: 5,
          emailClicks: 2,
          callDuration: 600,
          callCount: 1,
          replyRate: 50,
          whatsappInteractions: 2,
          lastEngagementDaysAgo: 45, // 45 days ago - apply penalty
        },
      };

      const result = await scoreLeadWithSignals(input);

      expect(result.engagementScore).toBeLessThan(50);
      console.log('✓ Disengaged lead penalty applied:', result.engagementScore);
    });

    it('should handle zero engagement', async () => {
      const input: LeadScoringInput = {
        leadId: 'test-3',
        softwareId: 'groomly',
        engagement: {
          emailOpens: 0,
          emailClicks: 0,
          callDuration: 0,
          callCount: 0,
          replyRate: 0,
          whatsappInteractions: 0,
          lastEngagementDaysAgo: 999,
        },
      };

      const result = await scoreLeadWithSignals(input);

      expect(result.engagementScore).toBe(0);
      console.log('✓ Zero engagement score:', result.engagementScore);
    });
  });

  describe('Fit Score Calculation', () => {
    it('should score perfect fit highly', async () => {
      const input: LeadScoringInput = {
        leadId: 'test-4',
        softwareId: 'groomly',
        fit: {
          companySize: 'large',
          industryMatch: 100,
          locationMatch: 100,
        },
      };

      const result = await scoreLeadWithSignals(input);

      expect(result.fitScore).toBeGreaterThanOrEqual(95);
      console.log('✓ Perfect fit score:', result.fitScore);
    });

    it('should score partial fit moderately', async () => {
      const input: LeadScoringInput = {
        leadId: 'test-5',
        softwareId: 'groomly',
        fit: {
          companySize: 'medium',
          industryMatch: 75,
          locationMatch: 50,
        },
      };

      const result = await scoreLeadWithSignals(input);

      expect(result.fitScore).toBeGreaterThan(40);
      expect(result.fitScore).toBeLessThan(70);
      console.log('✓ Partial fit score:', result.fitScore);
    });

    it('should score poor fit lowly', async () => {
      const input: LeadScoringInput = {
        leadId: 'test-6',
        softwareId: 'groomly',
        fit: {
          companySize: 'micro',
          industryMatch: 25,
          locationMatch: 25,
        },
      };

      const result = await scoreLeadWithSignals(input);

      expect(result.fitScore).toBeLessThan(35);
      console.log('✓ Poor fit score:', result.fitScore);
    });

    it('should handle unknown company size', async () => {
      const input: LeadScoringInput = {
        leadId: 'test-7',
        softwareId: 'groomly',
        fit: {
          companySize: 'unknown',
          industryMatch: 50,
          locationMatch: 50,
        },
      };

      const result = await scoreLeadWithSignals(input);

      expect(result.fitScore).toBeGreaterThan(0);
      console.log('✓ Unknown company size handled:', result.fitScore);
    });
  });

  describe('Behavior Score Calculation', () => {
    it('should score engaged behavior highly', async () => {
      const input: LeadScoringInput = {
        leadId: 'test-8',
        softwareId: 'groomly',
        behavior: {
          websiteRevisits: 8,
          featureClickCount: 20,
          timeOnSiteMinutes: 45,
          daysActive: 30,
          conversionFunnelStage: 100,
        },
      };

      const result = await scoreLeadWithSignals(input);

      expect(result.behaviorScore).toBeGreaterThan(80);
      console.log('✓ Engaged behavior score:', result.behaviorScore);
    });

    it('should score passive behavior lowly', async () => {
      const input: LeadScoringInput = {
        leadId: 'test-9',
        softwareId: 'groomly',
        behavior: {
          websiteRevisits: 1,
          featureClickCount: 2,
          timeOnSiteMinutes: 5,
          daysActive: 1,
          conversionFunnelStage: 10,
        },
      };

      const result = await scoreLeadWithSignals(input);

      expect(result.behaviorScore).toBeLessThan(30);
      console.log('✓ Passive behavior score:', result.behaviorScore);
    });
  });

  describe('Total Score & Routing', () => {
    it('VIP score should route to VIP (>70)', async () => {
      const input: LeadScoringInput = {
        leadId: 'test-10',
        softwareId: 'groomly',
        engagement: { emailOpens: 10, emailClicks: 5, callDuration: 1800, whatsappInteractions: 10, replyRate: 90, callCount: 2, lastEngagementDaysAgo: 1 },
        fit: { companySize: 'large', industryMatch: 100, locationMatch: 100 },
        behavior: { websiteRevisits: 10, featureClickCount: 25, timeOnSiteMinutes: 60, daysActive: 45, conversionFunnelStage: 85 },
      };

      const result = await scoreLeadWithSignals(input);

      expect(result.totalScore).toBeGreaterThan(70);
      expect(result.nextAction).toBe('vip');
      console.log(`✓ VIP routing: Score=${result.totalScore}, Action=${result.nextAction}`);
    });

    it('Sales score should route to Sales (30-70)', async () => {
      const input: LeadScoringInput = {
        leadId: 'test-11',
        softwareId: 'groomly',
        engagement: { emailOpens: 3, emailClicks: 1, callDuration: 900, whatsappInteractions: 3, replyRate: 60, callCount: 1, lastEngagementDaysAgo: 2 },
        fit: { companySize: 'small', industryMatch: 100, locationMatch: 100 },
        behavior: { websiteRevisits: 3, featureClickCount: 8, timeOnSiteMinutes: 20, daysActive: 10, conversionFunnelStage: 50 },
      };

      const result = await scoreLeadWithSignals(input);

      expect(result.totalScore).toBeGreaterThanOrEqual(30);
      expect(result.totalScore).toBeLessThanOrEqual(70);
      expect(result.nextAction).toBe('sales');
      console.log(`✓ Sales routing: Score=${result.totalScore}, Action=${result.nextAction}`);
    });

    it('Nurture score should route to Nurture (<30)', async () => {
      const input: LeadScoringInput = {
        leadId: 'test-12',
        softwareId: 'groomly',
        engagement: { emailOpens: 1, emailClicks: 0, callDuration: 0, whatsappInteractions: 0, replyRate: 0, callCount: 0, lastEngagementDaysAgo: 999 },
        fit: { companySize: 'micro', industryMatch: 25, locationMatch: 50 },
        behavior: { websiteRevisits: 1, featureClickCount: 1, timeOnSiteMinutes: 2, daysActive: 1, conversionFunnelStage: 10 },
      };

      const result = await scoreLeadWithSignals(input);

      expect(result.totalScore).toBeLessThan(30);
      expect(result.nextAction).toBe('nurture');
      console.log(`✓ Nurture routing: Score=${result.totalScore}, Action=${result.nextAction}`);
    });
  });

  describe('Signal Counting & Confidence', () => {
    it('should count available signals correctly', async () => {
      const input: LeadScoringInput = {
        leadId: 'test-13',
        softwareId: 'groomly',
        engagement: {
          emailOpens: 5,
          emailClicks: 2,
          callDuration: 600,
          callCount: 1,
          replyRate: 50,
          whatsappInteractions: 3,
          lastEngagementDaysAgo: 7,
        },
        fit: {
          companySize: 'small',
          industryMatch: 100,
          locationMatch: 100,
        },
        behavior: {
          websiteRevisits: 2,
          featureClickCount: 5,
          timeOnSiteMinutes: 15,
          daysActive: 5,
          conversionFunnelStage: 50,
        },
      };

      const result = await scoreLeadWithSignals(input);

      expect(result.signals).toBeGreaterThan(10);
      expect(result.confidence).toBeGreaterThan(75);
      console.log(`✓ Signals: ${result.signals}/13, Confidence: ${result.confidence}%`);
    });

    it('should have low confidence with few signals', async () => {
      const input: LeadScoringInput = {
        leadId: 'test-14',
        softwareId: 'groomly',
        engagement: { emailOpens: 1, emailClicks: 0, callDuration: 0, whatsappInteractions: 0, replyRate: 0, callCount: 0, lastEngagementDaysAgo: 999 },
        fit: { companySize: 'unknown', industryMatch: 0, locationMatch: 0 },
        behavior: { websiteRevisits: 0, featureClickCount: 0, timeOnSiteMinutes: 0, daysActive: 1, conversionFunnelStage: 10 },
      };

      const result = await scoreLeadWithSignals(input);

      expect(result.signals).toBeLessThan(5);
      expect(result.confidence).toBeLessThan(50);
      console.log(`✓ Low confidence with few signals: ${result.signals}/13, Confidence: ${result.confidence}%`);
    });
  });

  describe('Weight Distribution', () => {
    it('should apply correct weights (40% engagement, 35% fit, 25% behavior)', async () => {
      // Equal 100 on each component
      const input: LeadScoringInput = {
        leadId: 'test-15',
        softwareId: 'groomly',
        engagement: { emailOpens: 100, emailClicks: 100, callDuration: 100000, whatsappInteractions: 100, replyRate: 100, callCount: 100, lastEngagementDaysAgo: 0 },
        fit: { companySize: 'large', industryMatch: 100, locationMatch: 100 },
        behavior: { websiteRevisits: 100, featureClickCount: 100, timeOnSiteMinutes: 100, daysActive: 100, conversionFunnelStage: 100 },
      };

      const result = await scoreLeadWithSignals(input);

      // Expected: 100 * 0.40 + 100 * 0.35 + 100 * 0.25 = 100
      expect(result.totalScore).toBe(100);
      expect(result.engagementScore).toBe(100);
      expect(result.fitScore).toBe(100);
      expect(result.behaviorScore).toBe(100);
      console.log(`✓ Perfect weights: Total=${result.totalScore} (100*0.40 + 100*0.35 + 100*0.25)`);
    });

    it('should correctly weight a realistic mixed scenario', async () => {
      const input: LeadScoringInput = {
        leadId: 'test-16',
        softwareId: 'groomly',
        engagement: { emailOpens: 5, emailClicks: 2, callDuration: 600, whatsappInteractions: 3, replyRate: 50, callCount: 1, lastEngagementDaysAgo: 3 },
        fit: { companySize: 'small', industryMatch: 80, locationMatch: 100 },
        behavior: { websiteRevisits: 2, featureClickCount: 6, timeOnSiteMinutes: 18, daysActive: 8, conversionFunnelStage: 50 },
      };

      const result = await scoreLeadWithSignals(input);

      const expectedTotal = Math.round(
        result.engagementScore * 0.4 +
        result.fitScore * 0.35 +
        result.behaviorScore * 0.25
      );

      expect(result.totalScore).toBe(expectedTotal);
      console.log(
        `✓ Weighted calculation: ${result.engagementScore}*0.4 + ${result.fitScore}*0.35 + ${result.behaviorScore}*0.25 = ${result.totalScore}`
      );
    });
  });
});

/**
 * Test Summary Output
 * Run with: npm test -- leadScoring.test.ts
 *
 * Expected Results:
 * ✓ High engagement score: 90+
 * ✓ Disengaged lead penalty: 30-40
 * ✓ Zero engagement: 0
 * ✓ Perfect fit score: 95+
 * ✓ Partial fit score: 40-70
 * ✓ Poor fit score: <35
 * ✓ Unknown company size handled: 40-60
 * ✓ Engaged behavior score: 80+
 * ✓ Passive behavior score: <30
 * ✓ VIP routing: Score>70, Action=vip
 * ✓ Sales routing: 30<=Score<=70, Action=sales
 * ✓ Nurture routing: Score<30, Action=nurture
 * ✓ Signal counting: signals>10, confidence>75
 * ✓ Low confidence: signals<5, confidence<50
 * ✓ Perfect weights: Total=100
 * ✓ Weighted calculation: Correct formula applied
 */
