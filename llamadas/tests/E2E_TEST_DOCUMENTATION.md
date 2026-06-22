# E2E Scenario Tests: Deal Workflow Documentation

**Test File:** `test_e2e_deal_workflow.py`  
**Framework:** pytest + pytest-asyncio  
**Purpose:** End-to-end testing of deal management, activity tracking, probability updates, and revenue forecasting

---

## Overview

This test suite validates the complete deal workflow from creation through forecast generation, with comprehensive testing of:

1. **Deal Lifecycle** - Create → Activities → Probability Updates → Forecast
2. **API Workflows** - POST /deals, POST /deals/:id/activities, GET /forecast
3. **Observability** - Logging across all operations
4. **Error Handling** - Invalid inputs, missing fields, boundary values

**Total Scenarios:** 4  
**Total Test Cases:** 25  
**Total Flows Tested:** 25+

---

## Scenario 1: Complete Deal Lifecycle

### Test: `test_scenario_1_complete_deal_lifecycle`

**Purpose:** Validate the complete end-to-end flow of a deal from creation to forecast update

**Flow:**
```
1. Get best offer for prospect (DealEngine)
   ↓
2. Create deal (PROSPECT stage, 10% probability)
   ↓
3. Add 3 activities (CALL → EMAIL → DEMO)
   ↓
4. Observe probability increase (10% → 25% → 40% → 55%)
   ↓
5. Update deal to DEMO_COMPLETED (45% probability)
   ↓
6. Generate forecast with updated deal
   ↓
7. Verify pipeline health metrics
```

**Assertions:**
- Offer is created with valid plan, price, and confidence
- Deal is created in PROSPECT stage with 10% initial probability
- Each activity is logged with proper metadata
- Probability increases with each activity
- Deal stage and probability update correctly
- Forecast calculates expected revenue = deal_monto × probability
- Best case revenue = total deal amount
- Worst case revenue = 0
- Pipeline health reflects deal state

**Expected Results:**
- Expected revenue: ~$5,625 (assuming $12,500 deal at 45%)
- Best case: $12,500
- Deal velocity tracked
- Health score improves from 30 → 75

---

## Scenario 2: API Workflow Testing

### Test Group: `TestAPIWorkflow`

#### 2.1: POST /api/revenue/deals

**Test:** `test_scenario_2_post_deals_endpoint`

**Purpose:** Test deal creation via HTTP POST endpoint

**Request Body:**
```json
{
  "nombre": "Enterprise SaaS Ltd",
  "monto": 12500.00,
  "stage": "PROSPECT",
  "leadId": "lead_002",
  "softwareId": "test_software_e2e_001",
  "fechaCierreEstimada": "2024-07-22T00:00:00Z"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "deal": {
      "id": "deal_api_001",
      "nombre": "Enterprise SaaS Ltd",
      "monto": 12500.00,
      "stage": "PROSPECT",
      "probabilidad_cierre": 10,
      "healthScore": 30,
      "createdAt": "2024-06-22T...",
      "updatedAt": "2024-06-22T..."
    }
  }
}
```

**Assertions:**
- Status code 201 (Created)
- Response contains complete deal object
- Initial probability set to 10%
- Health score initialized to 30
- Timestamp fields present

---

#### 2.2: POST /api/revenue/deals/:id/activities

**Test:** `test_scenario_2_post_activities_endpoint`

**Purpose:** Test activity creation and probability update

**Request Body:**
```json
{
  "tipo": "CALL",
  "canal": "phone",
  "resultado": "CONNECTED",
  "resumen": "Prospect demo scheduled for next week",
  "transcript": "Client very interested in pricing model",
  "duracionSeg": 1500
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "activity": {
      "id": "activity_api_001",
      "dealId": "deal_api_001",
      "tipo": "CALL",
      "resultado": "CONNECTED",
      "resumen": "Prospect demo scheduled for next week",
      "fechaHora": "2024-06-22T...",
      "createdAt": "2024-06-22T..."
    },
    "updatedProbability": {
      "adjustedProbability": 0.25,
      "confidence": 0.85,
      "reasoning": "Call connected, demo scheduled"
    }
  }
}
```

**Assertions:**
- Status code 201
- Activity created with type CALL
- Probability updated from 10% → 25%
- Confidence score present
- Deal's lastActivityTimestamp updated

---

#### 2.3: GET /api/revenue/forecast

**Test:** `test_scenario_2_get_forecast_endpoint`

**Purpose:** Test forecast generation with multiple deals in different stages

**Request Query:**
```
GET /api/revenue/forecast?months=3
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "forecast": {
      "software_id": "test_software_e2e_001",
      "fecha_snapshot": "2024-06-22T...",
      "prospect_value": 5000.0,
      "demo_scheduled_value": 10000.0,
      "demo_completed_value": 0.0,
      "negotiation_value": 20000.0,
      "closing_value": 0.0,
      "expected_revenue": 16250.0,
      "best_case_revenue": 35000.0,
      "worst_case_revenue": 0.0
    },
    "accuracy": {
      "mae": 2500.0,
      "mape": 0.08,
      "rmse": 3200.0
    },
    "generatedAt": "2024-06-22T..."
  }
}
```

**Assertions:**
- Status code 200
- Forecast snapshot includes all stage buckets
- Expected revenue = Σ(monto × probability) for all deals
- Best case revenue = Σ(monto) for all deals
- Worst case revenue = 0
- Accuracy metrics present
- Forecast generation timestamp present

**Expected Calculation:**
```
Expected Revenue = 
  (5000 × 0.10) +      # PROSPECT
  (10000 × 0.25) +     # DEMO_SCHEDULED
  (20000 × 0.65)       # NEGOTIATION
= 500 + 2500 + 13000
= 16000
```

---

#### 2.4: Complete API Workflow

**Test:** `test_scenario_2_complete_api_workflow`

**Purpose:** Integration test validating all three API calls in sequence

**Flow:**
```
POST /deals (Create)
  ↓ Returns: deal_workflow_001
POST /deals/{id}/activities × 3 (CALL, EMAIL, DEMO)
  ↓ Each updates probability
GET /forecast (Retrieve forecast)
  ↓ Returns: updated forecast
```

**Validations:**
- Deal created successfully
- 3 activities added in sequence
- Each activity logs correctly
- Forecast reflects updated deal state
- Probability increases monotonically

---

## Scenario 3: Observability and Logging

### Test Group: `TestObservabilityLogs`

#### 3.1: Deal Creation Logs

**Test:** `test_scenario_3_deal_creation_logs`

**Log Entry:**
```json
{
  "timestamp": "2024-06-22T10:30:00Z",
  "severity": "INFO",
  "event_type": "deal_offer_recommendation",
  "deal_id": "deal_log_001",
  "plan": "Pro",
  "price": 4900,
  "confidence": 0.85,
  "reasoning": "Pro plan with 15% volume discount. Historical: 85%",
  "user_id": "user_001",
  "software_id": "software_log_001"
}
```

**Assertion:** Logger.info() called with "Deal recommendation" message

---

#### 3.2: Forecast Calculation Logs

**Test:** `test_scenario_3_forecast_calculation_logs`

**Log Entry:**
```json
{
  "timestamp": "2024-06-22T10:35:00Z",
  "severity": "INFO",
  "event_type": "forecast_generated",
  "software_id": "software_log_001",
  "expected_revenue": 5000,
  "best_case_revenue": 5000,
  "deals_count": 1,
  "stages": {
    "prospect": 5000,
    "demo_scheduled": 0,
    "demo_completed": 0,
    "negotiation": 0,
    "closing": 0
  }
}
```

**Assertion:** Forecast generation creates observability logs with metrics

---

#### 3.3: Activity Logs with Metadata

**Test:** `test_scenario_3_activity_logs_contain_metadata`

**Log Entry:**
```json
{
  "timestamp": "2024-06-22T10:40:00Z",
  "event_type": "deal_activity_created",
  "deal_id": "deal_log_001",
  "activity_type": "CALL",
  "activity_id": "activity_log_001",
  "duration_sec": 1200,
  "result": "CONNECTED",
  "probability_before": 10,
  "probability_after": 25,
  "change_reason": "Connected call scheduled demo",
  "metadata": {
    "user_id": "user_001",
    "software_id": "software_001",
    "client_ip": "192.168.1.1",
    "user_agent": "Mozilla/5.0...",
    "channel": "phone"
  }
}
```

**Assertions:**
- Timestamp in ISO format
- Event type clearly identified
- Before/after probability captured
- Metadata includes context (user, software, IP)
- All required fields present

---

#### 3.4: Error Logs

**Test:** `test_scenario_3_error_logs`

**Log Entry:**
```json
{
  "timestamp": "2024-06-22T10:45:00Z",
  "severity": "ERROR",
  "event_type": "deal_creation_failed",
  "error_code": "INVALID_PROBABILITY",
  "error_message": "Probability must be between 0 and 100",
  "deal_data": {
    "nombre": "Invalid Deal",
    "monto": 5000,
    "probabilidad_cierre": 150
  },
  "stack_trace": "...",
  "request_id": "req_12345",
  "user_id": "user_001"
}
```

**Assertions:**
- Error severity set appropriately
- Error code for programmatic handling
- Relevant context included
- Stack trace for debugging
- Request traceability

---

#### 3.5: Comprehensive Logging

**Test:** `test_scenario_3_comprehensive_logging`

**Purpose:** Verify logging across complete workflow

**Logged Events:**
1. Deal recommendation created (offer optimization)
2. Deal created in PROSPECT stage
3. Activity created (CALL)
4. Activity created (EMAIL)
5. Activity created (DEMO)
6. Deal probability updated × 3
7. Deal stage updated (PROSPECT → DEMO_COMPLETED)
8. Forecast generated
9. Pipeline health calculated

**Assertions:**
- All events logged with proper severity
- Timestamps consistent and sequential
- Context preserved across related events
- No sensitive data exposed in logs
- Log volume reasonable (not excessive)

---

## Scenario 4: Error Cases and Boundary Values

### Test Group: `TestErrorCasesAndBoundaryValues`

#### 4.1: Invalid Probability Values

**Test:** `test_scenario_4_invalid_probability_values`

**Invalid Values:** -1, 101, 150, -50, "invalid"

**Expected Response:** 400 Bad Request
```json
{
  "success": false,
  "error": "Probability must be between 0 and 100"
}
```

**Assertions:**
- Rejects negative percentages
- Rejects values > 100
- Rejects string inputs
- Clear error message provided

---

#### 4.2: Invalid Deal Stages

**Test:** `test_scenario_4_invalid_deal_stages`

**Valid Stages:** PROSPECT, DEMO_SCHEDULED, DEMO_COMPLETED, NEGOTIATION, CLOSING, WON, LOST

**Invalid Stages:** INVALID, COMPLETED, PENDING, IN_PROGRESS

**Expected Response:** 400 Bad Request
```json
{
  "success": false,
  "error": "Invalid stage. Must be one of: PROSPECT, DEMO_SCHEDULED, ..."
}
```

---

#### 4.3: Invalid Activity Types

**Test:** `test_scenario_4_invalid_activity_types`

**Valid Types:** CALL, EMAIL, WHATSAPP, DEMO, MEETING, PROPOSAL

**Invalid Types:** CALL2, chat, sms, telegram, INVALID

**Expected Response:** 400 Bad Request
```json
{
  "success": false,
  "error": "Invalid activity type. Must be one of: CALL, EMAIL, ..."
}
```

---

#### 4.4: Missing Required Fields

**Test:** `test_scenario_4_missing_required_fields`

**Required Fields:** nombre, monto, stage, leadId, softwareId

**Test Cases:**
```python
{"monto": 5000}                          # Missing: nombre
{"nombre": "Deal"}                       # Missing: monto
{"nombre": "Deal", "monto": 5000}        # Missing: stage
{"nombre": "Deal", "monto": 5000, "stage": "PROSPECT"}  # Missing: leadId
```

**Expected Response:** 400 Bad Request
```json
{
  "success": false,
  "error": "Missing required field(s): [nombre, monto, ...]"
}
```

---

#### 4.5: Amount Boundary Values

**Test:** `test_scenario_4_zero_and_negative_amounts`

| Value | Valid | Reason |
|-------|-------|--------|
| 0 | ❌ | Zero revenue invalid |
| -100 | ❌ | Negative amount invalid |
| 0.01 | ✅ | Smallest valid amount |
| 1,000,000 | ✅ | Large amount valid |

**Expected Response for Invalid:**
```json
{
  "success": false,
  "error": "Monto must be greater than 0"
}
```

---

#### 4.6: Date Boundary Values

**Test:** `test_scenario_4_date_boundary_values`

| Date | In Forecast | Reason |
|------|-------------|--------|
| Yesterday | ❌ | Past date invalid |
| Today | ✅ | Within window |
| Tomorrow | ✅ | Within window |
| 90 days out | ✅ | Maximum window |
| 91+ days out | ❌ | Beyond 90-day forecast |

**Logic:**
```python
close_date = deal['fecha_cierre_estimada']
days_diff = (close_date - datetime.now()).days

if days_diff < 0:  # Past
    return 400, "Close date must be in future"
elif days_diff > 90:  # Beyond forecast window
    excluded_from_forecast = True
else:
    included_in_forecast = True
```

---

#### 4.7: Nonexistent Deal (404)

**Test:** `test_scenario_4_nonexistent_deal_not_found`

**Request:**
```
GET /api/revenue/deals/nonexistent_deal_id
```

**Response (404 Not Found):**
```json
{
  "success": false,
  "error": "Deal not found"
}
```

**Assertion:** Database query returns None

---

#### 4.8: Activity Without Deal (Validation)

**Test:** `test_scenario_4_activity_without_deal_fails`

**Request:**
```
POST /api/revenue/deals/nonexistent_deal_id/activities
{
  "tipo": "CALL",
  "resumen": "..."
}
```

**Response (404 Not Found):**
```json
{
  "success": false,
  "error": "Deal not found"
}
```

**Assertion:** Activity creation rejected before database operation

---

#### 4.9: Empty Deals List

**Test:** `test_scenario_4_forecast_with_empty_deals_list`

**Input:** `deals = []`

**Output:**
```python
snapshot.expected_revenue == 0.0
snapshot.best_case_revenue == 0.0
snapshot.worst_case_revenue == 0.0
```

**Assertion:** Handles gracefully without error

---

#### 4.10: Malformed Deal Data

**Test:** `test_scenario_4_forecast_with_malformed_deal_data`

**Test Cases:**
```python
{"id": "deal_1"}                              # Missing: stage, monto, prob
{"id": "deal_2", "stage": "INVALID"}         # Invalid stage
{"id": "deal_3", "monto": "not_a_number"}    # Invalid type
```

**Expected:** Either use defaults or raise validation error
```python
# Option 1: Graceful defaults
snapshot = forecast_engine.forecast(software_id, malformed_deals)
# Uses default stage PROSPECT, default prob 10%, etc.

# Option 2: Validation error
ValidationError: "monto must be numeric"
```

---

#### 4.11: Probability Boundary Values

**Test:** `test_scenario_4_probability_boundary_values`

| Prob | Deal Stage | Included | Expected Contribution |
|------|-----------|----------|----------------------|
| 0% | PROSPECT | ✅ | 0 × monto = 0 |
| 100% | WON | ❌ | Excluded from forecast |
| 50% | NEGOTIATION | ✅ | 0.50 × monto |

**Code Logic:**
```python
if stage in ['WON', 'LOST']:
    continue  # Skip from forecast

prob = deal.get('probabilidad_cierre', 0) / 100.0
expected += monto * prob  # Even if prob=0
```

---

#### 4.12: Concurrent Activity Creation

**Test:** `test_scenario_4_concurrent_activity_creation`

**Purpose:** Test thread-safety of concurrent activity creation

**Scenario:**
```python
async def create_activities():
    tasks = [
        create_activity(activity_1),
        create_activity(activity_2),
        create_activity(activity_3),
        create_activity(activity_4),
        create_activity(activity_5),
    ]
    return await asyncio.gather(*tasks)
```

**Expected Results:**
- All 5 activities created successfully
- Deal probability updated correctly
- No data corruption
- Proper serialization

**Assertions:**
- Result count = 5
- All activity IDs unique
- Deal's lastActivityTimestamp = max of all timestamps
- Probability calculated from all activities

---

#### 4.13: Health Score Boundary Values

**Test:** `test_scenario_4_health_score_boundary_values`

| Score | Valid | Interpretation |
|-------|-------|-----------------|
| -10 | ❌ | Invalid (below min) |
| 0 | ✅ | Critical |
| 25 | ✅ | Low |
| 50 | ✅ | Medium (neutral) |
| 75 | ✅ | High |
| 100 | ✅ | Excellent |
| 110 | ❌ | Invalid (above max) |

**Calculation Example:**
```python
# Based on: activity_count, last_activity_age, probability
health_score = (
    (activity_count / max_expected) * 40 +
    (recent_activity_days / max_days) * 30 +
    (probability * 100) * 0.30
)
# Result: 0-100
```

---

#### 4.14: Comprehensive Error Handling

**Test:** `test_scenario_4_comprehensive_error_handling`

**Error Scenarios:**
1. Invalid probability (>100)
2. Invalid stage
3. Null/missing amount
4. Negative amount
5. Empty deal ID
6. Malformed date

**Expected:** All errors caught and reported with clear messages

---

## Test Execution Guide

### Running All Tests

```bash
cd /e/exclusion/silxarcrm/llamadas

# Run all E2E tests with verbose output
pytest tests/test_e2e_deal_workflow.py -v

# Run with coverage report
pytest tests/test_e2e_deal_workflow.py --cov=app --cov-report=html

# Run with detailed output and capture=no (to see print statements)
pytest tests/test_e2e_deal_workflow.py -v -s
```

### Running Specific Scenarios

```bash
# Scenario 1: Deal Lifecycle
pytest tests/test_e2e_deal_workflow.py::TestDealWorkflowScenario -v

# Scenario 2: API Workflow
pytest tests/test_e2e_deal_workflow.py::TestAPIWorkflow -v

# Scenario 3: Observability
pytest tests/test_e2e_deal_workflow.py::TestObservabilityLogs -v

# Scenario 4: Error Handling
pytest tests/test_e2e_deal_workflow.py::TestErrorCasesAndBoundaryValues -v
```

### Running Async Tests Only

```bash
pytest tests/test_e2e_deal_workflow.py -v -m asyncio
```

### With Pytest Markers

```bash
# Create markers in conftest.py, then:
pytest tests/test_e2e_deal_workflow.py -v -m "not slow"
```

---

## Test Metrics

### Coverage Analysis

**Tested Components:**
- `app.deal_engine.DealEngine` - Deal offer recommendations
- `app.deal_engine.DealRecommendation` - Deal data model
- `app.revenue_intelligence.forecast_engine.ForecastEngine` - Forecast calculations
- `app.revenue_intelligence.forecast_engine.ForecastSnapshot` - Forecast data model
- API workflow (mocked): POST /deals, POST /activities, GET /forecast
- Observability logging across all operations
- Error handling and validation

**Scenarios Covered:**
- Deal creation workflows
- Activity tracking and logging
- Probability updates with activities
- Forecast generation with multiple deals
- Pipeline health metrics
- API endpoint workflows
- Error cases and boundary conditions
- Concurrent operations
- Data serialization

### Test Statistics

| Metric | Count |
|--------|-------|
| Total Scenarios | 4 |
| Total Test Cases | 25 |
| Async Tests | 7 |
| Sync Tests | 18 |
| Fixtures | 6 |
| Mock Objects | Multiple |
| Test Classes | 5 |

---

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-python@v2
        with:
          python-version: 3.9+
      
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-asyncio pytest-cov
      
      - name: Run E2E tests
        run: |
          pytest llamadas/tests/test_e2e_deal_workflow.py \
            --cov=app \
            --cov-report=xml \
            --junit-xml=test-results.xml
      
      - name: Upload coverage
        uses: codecov/codecov-action@v2
        with:
          files: ./coverage.xml
```

---

## Troubleshooting

### Common Issues

**Issue:** AsyncIO tests fail with "no running event loop"
```
Solution: Ensure pytest-asyncio is installed and @pytest.mark.asyncio decorator used
```

**Issue:** Database connection errors in tests
```
Solution: Tests use mocked AsyncMock clients, no real DB needed
```

**Issue:** Import errors for app modules
```
Solution: Ensure PYTHONPATH includes project root:
export PYTHONPATH=/e/exclusion/silxarcrm/llamadas:$PYTHONPATH
```

---

## Future Enhancements

- [ ] Add performance benchmarks
- [ ] Add load testing (concurrent deals)
- [ ] Add stress testing (large deal amounts, many activities)
- [ ] Parametrized tests for multiple data sets
- [ ] Integration tests with real database
- [ ] API integration tests (actual HTTP calls)
- [ ] Chaos engineering tests (simulate failures)
- [ ] Property-based testing (Hypothesis)

---

## Appendix: Test Data Reference

### Standard Test Deal

```python
{
    'id': 'deal_e2e_001',
    'nombre': 'Acme Corp',
    'monto': 12500.0,
    'stage': 'PROSPECT',
    'probabilidad_cierre': 10,
    'healthScore': 30,
    'softwareId': 'test_software_e2e_001',
    'leadId': 'lead_001',
    'fechaCierreEstimada': datetime.now() + timedelta(days=30),
}
```

### Standard Activities

```python
# CALL Activity
{
    'tipo': 'CALL',
    'resultado': 'CONNECTED',
    'duracionSeg': 1200,
    'resumen': 'Initial prospect call...',
}

# EMAIL Activity
{
    'tipo': 'EMAIL',
    'resultado': 'OPENED',
    'resumen': 'Sent proposal with pricing details',
}

# DEMO Activity
{
    'tipo': 'DEMO',
    'resultado': 'CONNECTED',
    'duracionSeg': 1800,
    'resumen': 'Product demo completed...',
}
```

### Prospect Profile

```python
{
    'nombre': 'Acme Corp',
    'email': 'sales@acme.com',
    'industry': 'SaaS',
    'company_size': 150,
    'presupuesto_max': 5000,
    'nivel_interes': 'warm',
}
```

---

**Document Version:** 1.0  
**Last Updated:** 2024-06-22  
**Maintainer:** Development Team
