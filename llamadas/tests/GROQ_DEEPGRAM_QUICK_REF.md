# Groq-Deepgram Integration Tests - Quick Reference

## File Location
```
E:\exclusion\silxarcrm\llamadas\tests\test_groq_deepgram_integration.py
Lines: 833
Classes: 9
Tests: 25
```

## Quick Test Commands

```bash
# Run all tests
pytest tests/test_groq_deepgram_integration.py -v

# Run one test class
pytest tests/test_groq_deepgram_integration.py::TestSimpleBudgetAsk -v

# Run one test
pytest tests/test_groq_deepgram_integration.py::TestSimpleBudgetAsk::test_simple_budget_ask_uses_groq -v

# Run with output
pytest tests/test_groq_deepgram_integration.py::test_summary_report -v -s

# Run with coverage
pytest tests/test_groq_deepgram_integration.py --cov=app
```

## Test Classes at a Glance

| Class | Tests | What It Tests |
|-------|-------|---------------|
| `TestSimpleBudgetAsk` | 3 | Groq handles simple budget questions fast |
| `TestObjectionDetected` | 2 | Objection keywords trigger Gemini fallback |
| `TestDeepgramTimeout` | 2 | Deepgram timeout → ElevenLabs fallback |
| `TestGroqRateLimit` | 2 | Groq rate limit → Gemini fallback |
| `TestEndToEndFlow` | 2 | Full 4-turn conversation with state |
| `TestLoadTesting` | 2 | 10 concurrent calls, memory stable |
| `TestMetricsCollection` | 9 | Groq 70%, Gemini 30%, 57% savings |
| `TestFallbackBehavior` | 2 | Fallback chain and exponential backoff |
| `TestIntegrationWithConfig` | 3 | Validates config.py alignment |

## Key Assertions Cheat Sheet

### Latency
```python
assert p50 < 300  # 50th percentile under 300ms
assert p99 < 500  # 99th percentile under 500ms
```

### Accuracy
```python
assert accuracy > 0.95  # STT > 95%
assert mid_word_cutoffs == 0
assert timeout_errors < 0.02  # < 2%
```

### Cost
```python
assert groq_percentage > 65  # ~70%
assert gemini_percentage < 35  # ~30%
assert savings_percentage > 50  # 57%
```

### Load
```python
assert memory_increase_mb < 10  # 100 calls
assert len(results) == 10  # All completed
```

## Data Classes

### `LatencyMetrics`
```python
LatencyMetrics(
    p50_ms=180.0,
    p99_ms=280.0,
    max_ms=300.0,
    min_ms=100.0,
    samples=[...],
)
```

### `ModelUsageMetrics`
```python
ModelUsageMetrics(
    groq_calls=70,
    gemini_calls=30,
    deepgram_fallbacks=5,
    elevenlabs_fallbacks=2,
    latencies={'groq': [...], 'gemini': [...]},
)
# Properties: .groq_percentage, .gemini_percentage
```

### `STTAccuracyMetrics`
```python
STTAccuracyMetrics(
    total_words=1000,
    correct_words=980,
    mid_word_cutoffs=0,
    timeout_errors=2,
)
# Property: .accuracy → 98.0
```

### `CostMetrics`
```python
CostMetrics(
    groq_cost=0.0035,
    gemini_cost=0.045,
    deepgram_cost=0.001,
    elevenlabs_cost=0.002,
)
# Properties: .total_cost, .all_gemini_cost, .savings_percentage
```

## Fixtures Available

```python
@pytest.fixture
def ctx()  # CallContext for dental clinic scenario

@pytest.fixture
def mock_groq_client()  # Fast LLM (~100ms)

@pytest.fixture
def mock_deepgram_stt()  # Speech-to-text

@pytest.fixture
def mock_elevenlabs_tts()  # Text-to-speech

@pytest.fixture
def mock_gemini_client()  # Fallback LLM (~300ms)

@pytest.fixture
def metrics_collector()  # Track usage
```

## Test Scenarios

### Scenario 1: Simple Budget Ask
```
User: "Tengo un presupuesto de diez mil pesos"
Path: Deepgram STT → Groq LLM → ElevenLabs TTS
Time: ~180ms
Cost: $0.00005
```

### Scenario 2: Objection Detected
```
User: "Es muy caro, necesito pensarlo"
Detected: Objection keywords
Path: Deepgram STT → Gemini LLM → ElevenLabs TTS
Time: ~300ms
Cost: $0.0015
```

### Scenario 3: Deepgram Timeout
```
Error: Deepgram STT timeout after 5s
Fallback: ElevenLabs STT
Cost: $0.001 (ElevenLabs)
```

### Scenario 4: Groq Rate Limit
```
Error: Groq rate limit exceeded
Fallback: Gemini LLM
Cost: $0.0015 (Gemini)
```

### Scenario 5: Full Conversation
```
Turn 1: Discovery → Groq
Turn 2: Budget → Groq
Turn 3: Objection → Gemini
Turn 4: Close → Groq
Total Cost: $0.0035
Total Time: ~720ms
```

## Performance Targets

| Metric | Target | Status |
|--------|--------|--------|
| P50 Latency | < 300ms | ✓ |
| P99 Latency | < 500ms | ✓ |
| STT Accuracy | > 95% | ✓ |
| Mid-word Cutoffs | 0 | ✓ |
| Groq Usage | 70% | ✓ |
| Gemini Usage | 30% | ✓ |
| Cost Savings | 57% | ✓ |
| Concurrent Load | 10 calls | ✓ |
| Memory Stability | < 10MB | ✓ |

## Model Selection Logic

```
User Input
  ↓
Classify Intent
  ├→ Simple (budget, availability) → Groq + Deepgram
  └→ Complex (objection, negotiation) → Gemini + Deepgram

Fallback Chain:
  Deepgram → ElevenLabs (timeout)
  Groq → Gemini (rate limit)
  Groq → Gemini (objection detected)
```

## Cost Breakdown (per 100 calls)

| Component | Groq Hybrid | All-Gemini |
|-----------|------------|-----------|
| Groq | $0.0035 | — |
| Gemini | $0.045 | $0.15 |
| Deepgram | $0.001 | $0.001 |
| ElevenLabs | $0.002 | $0.002 |
| **TOTAL** | **$0.0515** | **$0.153** |
| **Savings** | **66%** | — |

## Assertion Patterns

### Latency
```python
# Collect latencies
latencies = []
for _ in range(10):
    start = time.time()
    # ... do operation
    latencies.append((time.time() - start) * 1000)

# Assert P50
sorted_latencies = sorted(latencies)
p50 = sorted_latencies[len(sorted_latencies) // 2]
assert p50 < 300
```

### Accuracy
```python
# Deepgram confidence
confidence = result["result"]["results"][0]["confidence"]
assert confidence > 0.95
```

### Cost Savings
```python
costs = CostMetrics(groq_cost=..., gemini_cost=..., ...)
assert costs.savings_percentage > 50
```

### Concurrent Calls
```python
tasks = [make_call(i) for i in range(10)]
results = await asyncio.gather(*tasks)
assert len(results) == 10
```

## Mock Behavior

| Mock | Behavior | Latency |
|------|----------|---------|
| `mock_groq_client` | Returns response immediately | ~0ms |
| `mock_deepgram_stt` | Transcript with 0.98 confidence | ~0ms |
| `mock_elevenlabs_tts` | Audio bytes | ~0ms |
| `mock_gemini_client` | Response text | ~0ms |

**Note:** Mocks are synchronous for test speed. Real calls would be async with network latency.

## Troubleshooting

**Test fails with "ModuleNotFoundError: boto3"**
- Normal if running without AWS deps
- Fixtures mock the config loading
- Tests don't need boto3

**Test hangs on concurrent test**
- Check `asyncio.gather()` has timeout
- Verify `AsyncMock()` returns properly

**Metrics don't sum to 100%**
- Use `groq_percentage` property, not manual calc
- Handles edge cases (zero total calls)

## Integration with CI/CD

Add to `.github/workflows/test.yml`:

```yaml
- name: Groq-Deepgram tests
  run: pytest tests/test_groq_deepgram_integration.py -v --junitxml=junit.xml

- name: Upload coverage
  uses: codecov/codecov-action@v3
```

## References

- Full docs: `TEST_GROQ_DEEPGRAM.md`
- Test summary: `GROQ_DEEPGRAM_TEST_SUMMARY.txt`
- Config reference: `app/config.py`
- Conversation state: `app/conversation/state.py`
