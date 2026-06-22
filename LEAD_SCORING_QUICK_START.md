# Lead Scoring - Quick Start Guide

## What You Got

A complete lead scoring system that:
- Scores leads 0-100 based on engagement, fit, and behavior
- Automatically routes them to: NURTURE (<30), SALES (30-70), or VIP (>70)
- Uses real data from your database (emails, calls, WhatsApp, website events)
- Provides 5 REST API endpoints ready to integrate

---

## Quick Examples

### Example 1: Get scores for all leads (with routing)
```bash
curl -X GET http://localhost:5000/api/lead-scoring/software/groomly
```

Response shows VIP leads, Sales-qualified leads, and Nurture leads grouped and sorted.

### Example 2: Score a single lead
```bash
curl -X POST http://localhost:5000/api/lead-scoring/score-and-save \
  -H "Content-Type: application/json" \
  -d '{
    "leadId": "clj1abc123...",
    "softwareId": "groomly"
  }'
```

Returns: `{ totalScore: 67, nextAction: "sales", engagementScore: 85, fitScore: 100, behaviorScore: 45 }`

### Example 3: Batch score 100+ leads
```bash
curl -X POST http://localhost:5000/api/lead-scoring/batch \
  -H "Content-Type: application/json" \
  -d '{
    "softwareId": "groomly",
    "leadIds": ["lead1", "lead2", "lead3", ...]
  }'
```

---

## How the Scoring Works

### Score Breakdown

```
Total = (Engagement × 40%) + (Fit × 35%) + (Behavior × 25%)
```

**Engagement (40%)**
- Email opens: 0-20 points
- Email clicks: 0-15 points
- Call duration: 0-25 points (10 min = max)
- WhatsApp interactions: 0-25 points (5+ = max)
- Reply rate: 0-15 points

**Fit (35%)**
- Company size: micro(0) < small(25) < medium(50) < large(75)
- Industry match: 0-40 points (% match to your ICP)
- Location match: 0-35 points (% match to your ICP)

**Behavior (25%)**
- Website revisits: 0-20 points (5+ = max)
- Feature clicks: 0-25 points (10+ = max)
- Time on site: 0-25 points (30+ min = max)
- Days active: 0-15 points (14+ = max)
- Funnel stage: 0-15 points (NUEVO=10, CONTACTADO=30, INTERESADO=50, CALIFICADO=85, CONVERTIDO=100)

### Example Scores

| Profile | Engagement | Fit | Behavior | **Total** | Action |
|---------|-----------|-----|----------|---------|--------|
| Hot VIP | 90 | 95 | 85 | **90** | 🔥 VIP |
| Sales Ready | 70 | 80 | 60 | **73** | 📞 Sales |
| Mid Funnel | 55 | 70 | 50 | **60** | 📧 Sales |
| Cold Lead | 20 | 40 | 25 | **28** | 🌱 Nurture |
| Dead Lead | 0 | 25 | 5 | **8** | ❌ Nurture |

---

## Routing Actions

### 🌱 NURTURE (<30)
**What to do**: Send email sequences, educational content, light outreach
- **Frequency**: 1-2x per week
- **Channels**: Email + WhatsApp automated
- **Goal**: Build awareness and interest
- **Template**: Drip campaign, webinar invites, case studies

### 📞 SALES (30-70)
**What to do**: Direct sales outreach, discovery calls, custom offers
- **Frequency**: 2-3x per week
- **Channels**: Phone + Email + WhatsApp
- **Goal**: Qualification and closing
- **Template**: Cold call → discovery → demo → proposal

### 🔥 VIP (>70)
**What to do**: Priority handling, dedicated account management
- **Frequency**: Daily touchpoints
- **Channels**: All channels + personal attention
- **Goal**: Fast-track to deal closure
- **Template**: Direct sales rep, custom solution, VIP support

---

## Integration Points

### 1. Dashboard Widget
```typescript
// Show pie chart of lead distribution
GET /api/lead-scoring/software/:softwareId

→ Shows: nurtureLead (45), salesQualified (78), vipPriority (27)
```

### 2. Lead Detail Page
```typescript
// Show score breakdown when viewing a lead
GET /api/lead-scoring/score-and-save
```

### 3. Automated Routing
```typescript
// Schedule daily: score all leads, update their metadata
POST /api/lead-scoring/batch (daily at 2 AM)

// Trigger automation based on routing:
if (score.nextAction === 'vip') {
  assignToTopSalesRep()
  triggerVipOnboarding()
}
```

### 4. Lead List Filtering
```typescript
// Add filter to leads list
GET /api/leads?routingAction=sales
GET /api/leads?scoredMin=70  // Only VIP
GET /api/leads?scoredMax=30  // Only nurture
```

---

## Testing

### Verify it's working
```bash
# Test a simple score calculation
curl -X POST http://localhost:5000/api/lead-scoring/score \
  -H "Content-Type: application/json" \
  -d '{
    "leadId": "test",
    "softwareId": "groomly",
    "fetchFromDb": false,
    "engagement": {
      "emailOpens": 5,
      "emailClicks": 2,
      "callDuration": 1200,
      "callCount": 1,
      "replyRate": 60,
      "whatsappInteractions": 3,
      "lastEngagementDaysAgo": 2
    },
    "fit": {
      "companySize": "small",
      "industryMatch": 100,
      "locationMatch": 100
    },
    "behavior": {
      "websiteRevisits": 3,
      "featureClickCount": 8,
      "timeOnSiteMinutes": 25,
      "daysActive": 10,
      "conversionFunnelStage": 50
    }
  }'

# Expected response:
{
  "success": true,
  "data": {
    "totalScore": 67,
    "engagementScore": 85,
    "fitScore": 100,
    "behaviorScore": 45,
    "nextAction": "sales",
    "signals": 13,
    "confidence": 100
  }
}
```

---

## API Reference

### POST /api/lead-scoring/score
Score with custom signals (don't fetch from DB)

### POST /api/lead-scoring/score-and-save
Score and save to lead.metadata.leadScore

### GET /api/lead-scoring/software/:softwareId
Get all scores + routing recommendations

### GET /api/lead-scoring/software/:softwareId/routing
Just the routing recommendations

### POST /api/lead-scoring/batch
Score 100+ leads efficiently

---

## Advanced: Custom Weights (Future)

To change scoring weights per company:
```typescript
const score = await scoreLeadWithSignals({
  leadId: "...",
  softwareId: "groomly",
  weights: {
    engagement: 0.5,    // 50% (from 40%)
    fit: 0.3,           // 30% (from 35%)
    behavior: 0.2       // 20% (from 25%)
  },
  engagement: {...},
  fit: {...},
  behavior: {...}
});
```

---

## Next Steps

1. **Try it**: Run batch scoring on your leads
2. **Monitor**: Watch the score distribution
3. **Automate**: Set up daily scoring + routing
4. **Integrate**: Add routing actions to your workflows
5. **Optimize**: Adjust weights based on your conversion data

---

## Files

- `/backend/src/services/leadScoringService.ts` - Core logic
- `/backend/src/routes/leadScoring.ts` - API endpoints
- `/backend/LEAD_SCORING_IMPLEMENTATION.md` - Full technical docs
- `/backend/tests/leadScoring.test.ts` - Test suite

---

## Support

For more details, see: `/backend/LEAD_SCORING_IMPLEMENTATION.md`

For implementation questions, check the test file for usage examples.
