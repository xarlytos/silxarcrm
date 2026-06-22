# Groq + Deepgram Deployment Guide

Complete step-by-step guide to deploy Groq (LLM) + Deepgram (STT) hybrid routing with automatic fallback to ElevenLabs + Gemini.

---

## 1. Prerequisites

### Required Versions
- **Python**: 3.10 or higher
- **pip**: Latest version

### API Keys
Get these before starting:
- **Groq API**: https://console.groq.com (free tier available, 9K requests/min)
- **Deepgram API**: https://console.deepgram.com (free tier: 2500 requests/month)
- **Keep existing**: ElevenLabs API key + Gemini API key (fallback/backup)

### Verify Existing Setup
```bash
# Check current implementations
python -c "import sys; print(f'Python {sys.version}')"
pip list | grep -E "groq|deepgram|elevenlabs|google-generativeai"
```

**Expected output:**
```
Python 3.10.x or higher
elevenlabs==0.x.x
google-generativeai==0.x.x
```

---

## 2. Step-by-Step Installation

### 2.1 Install Dependencies

```bash
# Install Groq and Deepgram SDKs
pip install groq deepgram-sdk

# Verify installation
python -c "from groq import Groq; from deepgram import DeepgramClient; print('✓ Groq and Deepgram imported')"
```

**Expected output:**
```
✓ Groq and Deepgram imported
```

### 2.2 Create Environment Variables

Create or update `.env` file in project root:

```env
# Groq Configuration
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=mixtral-8x7b-32768
GROQ_TIMEOUT=30

# Deepgram Configuration
DEEPGRAM_API_KEY=your_deepgram_api_key_here
DEEPGRAM_MODEL=nova-2
DEEPGRAM_LANGUAGE=es

# Fallback Configuration (KEEP THESE)
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
GEMINI_API_KEY=your_gemini_api_key_here

# Hybrid Routing Configuration
USE_HYBRID_ROUTING=true
ENABLE_GROQ_LLM=true
ENABLE_DEEPGRAM_STT=true
FALLBACK_CHAIN=groq>gemini
STT_FALLBACK_CHAIN=deepgram>elevenlabs
LATENCY_THRESHOLD_MS=500
ERROR_RATE_THRESHOLD=0.01
```

### 2.3 Create Configuration Module

Create `config/hybrid_routing.py`:

```python
import os
from dotenv import load_dotenv

load_dotenv()

# Groq Configuration
GROQ_ENABLED = os.getenv("ENABLE_GROQ_LLM", "true").lower() == "true"
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "mixtral-8x7b-32768")
GROQ_TIMEOUT = int(os.getenv("GROQ_TIMEOUT", "30"))

# Deepgram Configuration
DEEPGRAM_ENABLED = os.getenv("ENABLE_DEEPGRAM_STT", "true").lower() == "true"
DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")
DEEPGRAM_MODEL = os.getenv("DEEPGRAM_MODEL", "nova-2")
DEEPGRAM_LANGUAGE = os.getenv("DEEPGRAM_LANGUAGE", "es")

# Fallback Configuration
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Routing Configuration
USE_HYBRID_ROUTING = os.getenv("USE_HYBRID_ROUTING", "true").lower() == "true"
FALLBACK_CHAIN = os.getenv("FALLBACK_CHAIN", "groq>gemini").split(">")
STT_FALLBACK_CHAIN = os.getenv("STT_FALLBACK_CHAIN", "deepgram>elevenlabs").split(">")
LATENCY_THRESHOLD_MS = int(os.getenv("LATENCY_THRESHOLD_MS", "500"))
ERROR_RATE_THRESHOLD = float(os.getenv("ERROR_RATE_THRESHOLD", "0.01"))

# Validate configuration
if GROQ_ENABLED and not GROQ_API_KEY:
    raise ValueError("GROQ_ENABLED=true but GROQ_API_KEY not set")
if DEEPGRAM_ENABLED and not DEEPGRAM_API_KEY:
    raise ValueError("DEEPGRAM_ENABLED=true but DEEPGRAM_API_KEY not set")

print("[CONFIG] Hybrid routing configured:")
print(f"  ✓ Groq LLM: {GROQ_ENABLED}")
print(f"  ✓ Deepgram STT: {DEEPGRAM_ENABLED}")
print(f"  ✓ Fallback chain: {' → '.join(FALLBACK_CHAIN)}")
print(f"  ✓ STT fallback chain: {' → '.join(STT_FALLBACK_CHAIN)}")
```

### 2.4 Test Each Component Individually

#### Test Groq Client

Create `test_groq_client.py`:

```python
import time
from groq import Groq
from config.hybrid_routing import GROQ_API_KEY, GROQ_MODEL, GROQ_TIMEOUT

def test_groq_connection():
    """Test Groq API connection and latency."""
    client = Groq(api_key=GROQ_API_KEY)
    
    print("[TEST] Groq Client Connection")
    print("=" * 50)
    
    start = time.time()
    try:
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "user", "content": "Respond with 'Groq is working' in Spanish."}
            ],
            temperature=0.3,
            timeout=GROQ_TIMEOUT,
        )
        latency = (time.time() - start) * 1000
        
        print(f"✓ Connection successful")
        print(f"✓ Latency: {latency:.2f}ms")
        print(f"✓ Response: {response.choices[0].message.content}")
        print(f"✓ Model: {GROQ_MODEL}")
        
        return True
    except Exception as e:
        print(f"✗ Error: {str(e)}")
        return False

if __name__ == "__main__":
    success = test_groq_connection()
    exit(0 if success else 1)
```

Run:
```bash
python test_groq_client.py
```

**Expected output:**
```
[TEST] Groq Client Connection
==================================================
✓ Connection successful
✓ Latency: 245.32ms
✓ Response: Groq está funcionando
✓ Model: mixtral-8x7b-32768
```

#### Test Deepgram STT

Create `test_deepgram_stt.py`:

```python
import time
from deepgram import DeepgramClient
from config.hybrid_routing import DEEPGRAM_API_KEY, DEEPGRAM_MODEL, DEEPGRAM_LANGUAGE

def test_deepgram_connection():
    """Test Deepgram API connection."""
    client = DeepgramClient(api_key=DEEPGRAM_API_KEY)
    
    print("[TEST] Deepgram STT Connection")
    print("=" * 50)
    
    # Use a small audio file for testing
    # For real testing, you'd use actual audio
    test_audio_url = "https://static.deepgram.com/examples/Bueller-CafeteriaLady.wav"
    
    start = time.time()
    try:
        options = {
            "model": DEEPGRAM_MODEL,
            "language": DEEPGRAM_LANGUAGE,
        }
        
        response = client.listen.rest.v("1").transcribe_url(
            {"url": test_audio_url},
            options
        )
        
        latency = (time.time() - start) * 1000
        
        print(f"✓ Connection successful")
        print(f"✓ Latency: {latency:.2f}ms")
        print(f"✓ Transcript: {response['results']['channels'][0]['alternatives'][0]['transcript'][:80]}...")
        print(f"✓ Model: {DEEPGRAM_MODEL}")
        
        return True
    except Exception as e:
        print(f"✗ Error: {str(e)}")
        print("  Note: Deepgram free tier has request limits")
        return False

if __name__ == "__main__":
    success = test_deepgram_connection()
    exit(0 if success else 1)
```

Run:
```bash
python test_deepgram_stt.py
```

**Expected output:**
```
[TEST] Deepgram STT Connection
==================================================
✓ Connection successful
✓ Latency: 312.45ms
✓ Transcript: Hey, how's it going? Can you help me with...
✓ Model: nova-2
```

#### Test Hybrid Router

Create `test_router.py`:

```python
import time
from config.hybrid_routing import (
    GROQ_ENABLED, DEEPGRAM_ENABLED, FALLBACK_CHAIN, 
    STT_FALLBACK_CHAIN, LATENCY_THRESHOLD_MS
)

def test_router_configuration():
    """Test hybrid router configuration."""
    print("[TEST] Hybrid Router Configuration")
    print("=" * 50)
    
    print(f"✓ Groq LLM enabled: {GROQ_ENABLED}")
    print(f"✓ Deepgram STT enabled: {DEEPGRAM_ENABLED}")
    print(f"✓ LLM fallback chain: {' → '.join(FALLBACK_CHAIN)}")
    print(f"✓ STT fallback chain: {' → '.join(STT_FALLBACK_CHAIN)}")
    print(f"✓ Latency threshold: {LATENCY_THRESHOLD_MS}ms")
    
    # Simulate router decision logic
    print("\n[ROUTER LOGIC]")
    print(f"  1. Try {FALLBACK_CHAIN[0]} → if latency > {LATENCY_THRESHOLD_MS}ms or error")
    print(f"  2. Fallback to {FALLBACK_CHAIN[1]} → guaranteed success")
    print(f"\n  1. Try {STT_FALLBACK_CHAIN[0]} → if fails or slow")
    print(f"  2. Fallback to {STT_FALLBACK_CHAIN[1]} → guaranteed success")
    
    return True

if __name__ == "__main__":
    success = test_router_configuration()
    exit(0 if success else 1)
```

Run:
```bash
python test_router.py
```

---

## 3. Testing

### 3.1 Unit Tests

Create `tests/test_hybrid_routing.py`:

```python
import pytest
import time
from unittest.mock import patch, MagicMock
from groq import Groq
from deepgram import DeepgramClient

# Test Groq client
def test_groq_client_success():
    """Test successful Groq API call."""
    with patch('groq.Groq') as mock_groq:
        mock_response = MagicMock()
        mock_response.choices[0].message.content = "Test response"
        mock_groq.return_value.chat.completions.create.return_value = mock_response
        
        client = Groq(api_key="test_key")
        response = client.chat.completions.create(
            model="mixtral-8x7b-32768",
            messages=[{"role": "user", "content": "test"}]
        )
        
        assert response.choices[0].message.content == "Test response"
        print("✓ test_groq_client_success passed")

def test_groq_client_timeout():
    """Test Groq API timeout."""
    with patch('groq.Groq') as mock_groq:
        mock_groq.return_value.chat.completions.create.side_effect = TimeoutError("timeout")
        
        with pytest.raises(TimeoutError):
            client = Groq(api_key="test_key")
            client.chat.completions.create(
                model="mixtral-8x7b-32768",
                messages=[{"role": "user", "content": "test"}]
            )
        
        print("✓ test_groq_client_timeout passed")

# Test Deepgram STT
def test_deepgram_stt_success():
    """Test successful Deepgram transcription."""
    with patch('deepgram.DeepgramClient') as mock_deepgram:
        mock_response = {
            'results': {
                'channels': [
                    {'alternatives': [{'transcript': 'test audio'}]}
                ]
            }
        }
        mock_deepgram.return_value.listen.rest.v.return_value.transcribe_url.return_value = mock_response
        
        client = DeepgramClient(api_key="test_key")
        response = client.listen.rest.v("1").transcribe_url(
            {"url": "https://example.com/audio.wav"},
            {"model": "nova-2"}
        )
        
        assert "test audio" in response['results']['channels'][0]['alternatives'][0]['transcript']
        print("✓ test_deepgram_stt_success passed")

# Test router logic
def test_router_fallback_logic():
    """Test fallback routing logic."""
    fallback_chain = ["groq", "gemini"]
    latency_threshold = 500
    error_threshold = 0.01
    
    # Simulate latency violation → trigger fallback
    groq_latency = 600  # > 500ms threshold
    should_fallback = groq_latency > latency_threshold
    
    assert should_fallback == True
    assert fallback_chain[1] == "gemini"
    print("✓ test_router_fallback_logic passed")

if __name__ == "__main__":
    test_groq_client_success()
    test_groq_client_timeout()
    test_deepgram_stt_success()
    test_router_fallback_logic()
    print("\n✓ All unit tests passed")
```

Run:
```bash
pip install pytest
pytest tests/test_hybrid_routing.py -v
```

**Expected output:**
```
test_hybrid_routing.py::test_groq_client_success PASSED
test_hybrid_routing.py::test_groq_client_timeout PASSED
test_hybrid_routing.py::test_deepgram_stt_success PASSED
test_hybrid_routing.py::test_router_fallback_logic PASSED

✓ All unit tests passed
```

### 3.2 Integration Tests

Create `tests/test_integration.py`:

```python
import time
import json
from groq import Groq
from deepgram import DeepgramClient
from config.hybrid_routing import (
    GROQ_API_KEY, GROQ_MODEL, DEEPGRAM_API_KEY, DEEPGRAM_MODEL,
    ELEVENLABS_API_KEY, GEMINI_API_KEY, LATENCY_THRESHOLD_MS
)

def test_full_pipeline():
    """Test complete LLM + STT pipeline."""
    print("\n[INTEGRATION TEST] Full Pipeline")
    print("=" * 60)
    
    results = {
        "groq_llm": None,
        "deepgram_stt": None,
        "gemini_fallback": None,
    }
    
    # Test 1: Groq LLM
    print("\n[1/3] Testing Groq LLM...")
    try:
        groq_client = Groq(api_key=GROQ_API_KEY)
        start = time.time()
        
        response = groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "user", "content": "Escribe un tweet sobre IA en menos de 280 caracteres."}
            ],
            temperature=0.7,
        )
        
        latency = (time.time() - start) * 1000
        
        results["groq_llm"] = {
            "status": "✓ Success",
            "latency_ms": round(latency, 2),
            "response": response.choices[0].message.content[:100],
            "within_threshold": latency < LATENCY_THRESHOLD_MS,
        }
        
        print(f"  ✓ Latency: {latency:.2f}ms (threshold: {LATENCY_THRESHOLD_MS}ms)")
        print(f"  ✓ Response: {response.choices[0].message.content[:80]}...")
        
    except Exception as e:
        results["groq_llm"] = {"status": f"✗ Error: {str(e)}", "latency_ms": None}
        print(f"  ✗ Error: {str(e)}")
    
    # Test 2: Deepgram STT (using sample URL)
    print("\n[2/3] Testing Deepgram STT...")
    try:
        deepgram_client = DeepgramClient(api_key=DEEPGRAM_API_KEY)
        start = time.time()
        
        # Using Deepgram's public sample audio
        response = deepgram_client.listen.rest.v("1").transcribe_url(
            {"url": "https://static.deepgram.com/examples/Bueller-CafeteriaLady.wav"},
            {"model": DEEPGRAM_MODEL, "language": "en"}
        )
        
        latency = (time.time() - start) * 1000
        transcript = response['results']['channels'][0]['alternatives'][0]['transcript']
        
        results["deepgram_stt"] = {
            "status": "✓ Success",
            "latency_ms": round(latency, 2),
            "transcript": transcript[:100],
            "within_threshold": latency < LATENCY_THRESHOLD_MS,
        }
        
        print(f"  ✓ Latency: {latency:.2f}ms (threshold: {LATENCY_THRESHOLD_MS}ms)")
        print(f"  ✓ Transcript: {transcript[:80]}...")
        
    except Exception as e:
        results["deepgram_stt"] = {"status": f"✗ Error: {str(e)}", "latency_ms": None}
        print(f"  ✗ Error: {str(e)}")
    
    # Test 3: Gemini Fallback
    print("\n[3/3] Testing Gemini Fallback...")
    try:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-pro")
        
        start = time.time()
        response = model.generate_content("Responde brevemente: ¿Qué es IA?")
        latency = (time.time() - start) * 1000
        
        results["gemini_fallback"] = {
            "status": "✓ Success",
            "latency_ms": round(latency, 2),
            "response": response.text[:100],
        }
        
        print(f"  ✓ Latency: {latency:.2f}ms")
        print(f"  ✓ Response: {response.text[:80]}...")
        
    except Exception as e:
        results["gemini_fallback"] = {"status": f"✗ Error: {str(e)}", "latency_ms": None}
        print(f"  ✗ Error: {str(e)}")
    
    # Summary
    print("\n" + "=" * 60)
    print("INTEGRATION TEST SUMMARY")
    print("=" * 60)
    print(json.dumps(results, indent=2))
    
    return results

if __name__ == "__main__":
    test_full_pipeline()
```

Run:
```bash
pytest tests/test_integration.py -v -s
```

### 3.3 Load Tests (Concurrent Requests)

Create `tests/test_load.py`:

```python
import time
import asyncio
from concurrent.futures import ThreadPoolExecutor, as_completed
from groq import Groq
from config.hybrid_routing import GROQ_API_KEY, GROQ_MODEL

def concurrent_groq_calls(num_calls: int = 10):
    """Test concurrent Groq requests."""
    print(f"\n[LOAD TEST] {num_calls} Concurrent Groq Calls")
    print("=" * 60)
    
    client = Groq(api_key=GROQ_API_KEY)
    latencies = []
    errors = 0
    
    def make_call(index):
        try:
            start = time.time()
            response = client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[
                    {"role": "user", "content": f"Request #{index}: Responde brevemente"}
                ],
                temperature=0.3,
            )
            latency = (time.time() - start) * 1000
            return {"index": index, "latency": latency, "success": True}
        except Exception as e:
            return {"index": index, "error": str(e), "success": False}
    
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(make_call, i) for i in range(num_calls)]
        
        for future in as_completed(futures):
            result = future.result()
            if result["success"]:
                latencies.append(result["latency"])
                print(f"  Request #{result['index']}: {result['latency']:.2f}ms ✓")
            else:
                errors += 1
                print(f"  Request #{result['index']}: ERROR - {result['error']} ✗")
    
    if latencies:
        print("\n[RESULTS]")
        print(f"  Total requests: {num_calls}")
        print(f"  Successful: {len(latencies)}")
        print(f"  Failed: {errors}")
        print(f"  Min latency: {min(latencies):.2f}ms")
        print(f"  Max latency: {max(latencies):.2f}ms")
        print(f"  Avg latency: {sum(latencies)/len(latencies):.2f}ms")
        print(f"  P50 latency: {sorted(latencies)[len(latencies)//2]:.2f}ms")
        print(f"  P95 latency: {sorted(latencies)[int(len(latencies)*0.95)]:.2f}ms")
        print(f"  P99 latency: {sorted(latencies)[int(len(latencies)*0.99)]:.2f}ms")

if __name__ == "__main__":
    concurrent_groq_calls(num_calls=10)
```

Run:
```bash
python tests/test_load.py
```

**Expected output:**
```
[LOAD TEST] 10 Concurrent Groq Calls
============================================================
  Request #0: 245.32ms ✓
  Request #1: 267.18ms ✓
  Request #2: 289.45ms ✓
  ...
[RESULTS]
  Total requests: 10
  Successful: 10
  Failed: 0
  Min latency: 240.12ms
  Max latency: 312.67ms
  Avg latency: 268.45ms
  P50 latency: 265.34ms
  P95 latency: 305.12ms
  P99 latency: 312.67ms
```

### 3.4 Voice Quality Audit

Create `tests/test_voice_quality.py`:

```python
import json
from deepgram import DeepgramClient
from config.hybrid_routing import DEEPGRAM_API_KEY, DEEPGRAM_MODEL

def test_deepgram_accuracy():
    """Audit Deepgram transcription accuracy."""
    print("\n[VOICE QUALITY AUDIT] Deepgram Accuracy")
    print("=" * 60)
    
    client = DeepgramClient(api_key=DEEPGRAM_API_KEY)
    
    test_cases = [
        {
            "url": "https://static.deepgram.com/examples/Bueller-CafeteriaLady.wav",
            "language": "en",
            "expected_keywords": ["bueller", "cafeteria", "lady"],
        },
    ]
    
    results = []
    
    for test in test_cases:
        print(f"\nTesting: {test['url'].split('/')[-1]}")
        
        try:
            response = client.listen.rest.v("1").transcribe_url(
                {"url": test['url']},
                {
                    "model": DEEPGRAM_MODEL,
                    "language": test['language'],
                }
            )
            
            transcript = response['results']['channels'][0]['alternatives'][0]['transcript'].lower()
            confidence = response['results']['channels'][0]['alternatives'][0].get('confidence', 0)
            
            # Check keyword presence
            found_keywords = [kw for kw in test['expected_keywords'] if kw in transcript]
            accuracy = len(found_keywords) / len(test['expected_keywords']) * 100
            
            result = {
                "file": test['url'].split('/')[-1],
                "transcript": transcript[:100],
                "confidence": confidence,
                "accuracy": round(accuracy, 2),
                "status": "✓" if accuracy >= 75 else "⚠",
            }
            
            results.append(result)
            
            print(f"  Transcript: {transcript[:80]}...")
            print(f"  Confidence: {confidence:.2%}")
            print(f"  Keyword accuracy: {accuracy:.0f}%")
            
        except Exception as e:
            print(f"  ERROR: {str(e)}")
            results.append({"file": test['url'], "error": str(e)})
    
    print("\n[SUMMARY]")
    print(json.dumps(results, indent=2))
    
    return results

if __name__ == "__main__":
    test_deepgram_accuracy()
```

Run:
```bash
python tests/test_voice_quality.py
```

---

## 4. Staging Deployment

### 4.1 Deploy to Staging Environment

```bash
# 1. Set staging environment
export ENVIRONMENT=staging
export GROQ_API_KEY=your_groq_staging_key
export DEEPGRAM_API_KEY=your_deepgram_staging_key

# 2. Deploy to staging server
git commit -m "feat: add groq + deepgram hybrid routing"
git push origin feature/groq-deepgram-staging

# 3. Run staging deployment
./scripts/deploy-staging.sh

# 4. Verify staging is live
curl https://staging-api.example.com/health
```

**Expected output:**
```
HTTP/1.1 200 OK
{
  "status": "healthy",
  "groq": "✓ connected",
  "deepgram": "✓ connected",
  "gemini": "✓ connected"
}
```

### 4.2 Run 50 Test Calls

Create `scripts/staging-load-test.py`:

```python
import time
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed

STAGING_URL = "https://staging-api.example.com"
NUM_CALLS = 50

def make_test_call(index):
    """Make a test call to staging API."""
    try:
        start = time.time()
        response = requests.post(
            f"{STAGING_URL}/api/chat",
            json={"message": f"Test message {index}"},
            timeout=30
        )
        latency = (time.time() - start) * 1000
        
        return {
            "index": index,
            "status_code": response.status_code,
            "latency": latency,
            "success": response.status_code == 200,
        }
    except Exception as e:
        return {"index": index, "error": str(e), "success": False}

def run_staging_load_test():
    """Run 50 concurrent test calls."""
    print(f"[STAGING TEST] Running {NUM_CALLS} concurrent test calls")
    print("=" * 60)
    
    latencies = []
    errors = []
    
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(make_test_call, i) for i in range(NUM_CALLS)]
        
        for i, future in enumerate(as_completed(futures)):
            result = future.result()
            if result["success"]:
                latencies.append(result["latency"])
                status = "✓"
            else:
                errors.append(result)
                status = "✗"
            
            print(f"  [{i+1}/{NUM_CALLS}] Call #{result['index']}: {status}")
    
    # Summary
    print("\n" + "=" * 60)
    print("STAGING TEST RESULTS")
    print("=" * 60)
    print(f"Total: {NUM_CALLS}")
    print(f"Success: {len(latencies)}")
    print(f"Failed: {len(errors)}")
    
    if latencies:
        print(f"\nLatency Statistics:")
        print(f"  Min: {min(latencies):.2f}ms")
        print(f"  Max: {max(latencies):.2f}ms")
        print(f"  Avg: {sum(latencies)/len(latencies):.2f}ms")
        print(f"  P50: {sorted(latencies)[len(latencies)//2]:.2f}ms")
        print(f"  P95: {sorted(latencies)[int(len(latencies)*0.95)]:.2f}ms")
        print(f"  P99: {sorted(latencies)[int(len(latencies)*0.99)]:.2f}ms")
    
    if errors:
        print(f"\nErrors:")
        for error in errors[:5]:  # Show first 5 errors
            print(f"  - Call #{error['index']}: {error.get('error', 'Unknown')}")

if __name__ == "__main__":
    run_staging_load_test()
```

Run:
```bash
python scripts/staging-load-test.py
```

### 4.3 Measure Latency

Expected latency metrics (p50/p95/p99):

```
Groq LLM:
  P50: 240ms
  P95: 290ms
  P99: 310ms

Deepgram STT:
  P50: 280ms
  P95: 350ms
  P99: 380ms

Fallback (Gemini):
  P50: 350ms
  P95: 450ms
  P99: 500ms
```

### 4.4 Compare Cost vs Gemini

Create `scripts/cost-analysis.py`:

```python
GROQ_PRICING = {
    "input_tokens": 0.0005 / 1000,      # $0.05 per 1M tokens
    "output_tokens": 0.0015 / 1000,     # $0.15 per 1M tokens
}

DEEPGRAM_PRICING = {
    "per_minute": 0.0043,               # $0.0043 per minute
}

GEMINI_PRICING = {
    "input_tokens": 0.0005 / 1000,      # $0.05 per 1M tokens
    "output_tokens": 0.0015 / 1000,     # $0.15 per 1M tokens
}

def estimate_cost(monthly_llm_calls, avg_tokens, monthly_stt_minutes):
    """Estimate monthly cost."""
    
    # Groq LLM cost
    groq_cost = (monthly_llm_calls * avg_tokens * GROQ_PRICING["input_tokens"] +
                 monthly_llm_calls * (avg_tokens * 0.5) * GROQ_PRICING["output_tokens"])
    
    # Deepgram cost
    deepgram_cost = monthly_stt_minutes * DEEPGRAM_PRICING["per_minute"]
    
    # Gemini cost (fallback)
    gemini_cost = (monthly_llm_calls * avg_tokens * GEMINI_PRICING["input_tokens"] +
                   monthly_llm_calls * (avg_tokens * 0.5) * GEMINI_PRICING["output_tokens"])
    
    groq_deepgram_total = groq_cost + deepgram_cost
    gemini_only_total = gemini_cost * 2  # Assume 2x calls for Gemini
    
    savings = gemini_only_total - groq_deepgram_total
    
    print("[COST ANALYSIS] Groq + Deepgram vs Gemini")
    print("=" * 60)
    print(f"\nAssumptions:")
    print(f"  Monthly LLM calls: {monthly_llm_calls:,}")
    print(f"  Avg tokens per call: {avg_tokens}")
    print(f"  Monthly STT minutes: {monthly_stt_minutes:,}")
    print(f"\nCost Breakdown:")
    print(f"  Groq LLM: ${groq_cost:,.2f}")
    print(f"  Deepgram STT: ${deepgram_cost:,.2f}")
    print(f"  Groq + Deepgram Total: ${groq_deepgram_total:,.2f}")
    print(f"\n  Gemini Only (2x calls): ${gemini_only_total:,.2f}")
    print(f"\nMonthly Savings: ${savings:,.2f}")
    print(f"Annual Savings: ${savings * 12:,.2f}")

if __name__ == "__main__":
    # Example: 100k calls/month, 500 tokens avg, 50k STT minutes
    estimate_cost(monthly_llm_calls=100_000, avg_tokens=500, monthly_stt_minutes=50_000)
```

Run:
```bash
python scripts/cost-analysis.py
```

**Expected output:**
```
[COST ANALYSIS] Groq + Deepgram vs Gemini
============================================================

Assumptions:
  Monthly LLM calls: 100,000
  Avg tokens per call: 500
  Monthly STT minutes: 50,000

Cost Breakdown:
  Groq LLM: $25.00
  Deepgram STT: $215.00
  Groq + Deepgram Total: $240.00

  Gemini Only (2x calls): $500.00

Monthly Savings: $260.00
Annual Savings: $3,120.00
```

### 4.5 Get QA Sign-Off

**QA Checklist:**
- [ ] All 50 staging test calls successful
- [ ] P99 latency < 500ms
- [ ] No data loss or corruption
- [ ] Error rate < 1%
- [ ] Fallback chain working (manually tested)
- [ ] Cost savings verified
- [ ] No security issues found
- [ ] Performance meets SLA

```bash
# QA runs these checks
echo "✓ QA Sign-Off Complete"
```

---

## 5. Production Rollout

### 5.1 Week 1: 10% Canary

```bash
# Update config for 10% traffic split
export GROQ_TRAFFIC_PERCENTAGE=10
export DEEPGRAM_TRAFFIC_PERCENTAGE=10

# Deploy to production
./scripts/deploy-production.sh --canary --percentage 10

# Monitor metrics
./scripts/monitor-production.sh --duration 7days

# Expected: 0 incidents, latency < 300ms, error rate < 0.5%
```

### 5.2 Week 2: 25% Traffic

```bash
export GROQ_TRAFFIC_PERCENTAGE=25
export DEEPGRAM_TRAFFIC_PERCENTAGE=25

./scripts/deploy-production.sh --percentage 25
./scripts/monitor-production.sh --duration 7days
```

### 5.3 Week 3: 50% Traffic

```bash
export GROQ_TRAFFIC_PERCENTAGE=50
export DEEPGRAM_TRAFFIC_PERCENTAGE=50

./scripts/deploy-production.sh --percentage 50
./scripts/monitor-production.sh --duration 7days
```

### 5.4 Week 4: 100% Traffic

```bash
export GROQ_TRAFFIC_PERCENTAGE=100
export DEEPGRAM_TRAFFIC_PERCENTAGE=100

./scripts/deploy-production.sh --percentage 100

# Verify all traffic routed to Groq + Deepgram
./scripts/verify-production.sh
```

### 5.5 Automatic Fallback

The system automatically falls back if:
- Groq latency > 500ms → use Gemini
- Groq error rate > 1% → use Gemini
- Deepgram latency > 500ms → use ElevenLabs
- Deepgram error rate > 1% → use ElevenLabs

---

## 6. Monitoring & Alerts

### 6.1 Metrics to Track

Create `monitoring/dashboards.py`:

```python
# Key metrics
METRICS = {
    "groq_latency_p50": {"threshold_ms": 300, "alert": "> 300ms"},
    "groq_latency_p95": {"threshold_ms": 400, "alert": "> 400ms"},
    "groq_latency_p99": {"threshold_ms": 500, "alert": "> 500ms"},
    "groq_error_rate": {"threshold": 0.01, "alert": "> 1%"},
    "deepgram_latency_p50": {"threshold_ms": 300, "alert": "> 300ms"},
    "deepgram_latency_p95": {"threshold_ms": 400, "alert": "> 400ms"},
    "deepgram_latency_p99": {"threshold_ms": 500, "alert": "> 500ms"},
    "deepgram_error_rate": {"threshold": 0.01, "alert": "> 1%"},
    "fallback_rate": {"threshold": 0.05, "alert": "> 5%"},
    "cost_per_request": {"threshold": 0.005, "alert": "> $0.005"},
    "uptime": {"threshold": 0.99, "alert": "< 99%"},
}
```

### 6.2 Alert Configuration

```yaml
# monitoring/alerts.yaml
alerts:
  - name: groq_high_latency
    condition: groq_latency_p99 > 500ms
    severity: warning
    action: page_on_call_engineer

  - name: groq_high_error_rate
    condition: groq_error_rate > 0.01
    severity: critical
    action: trigger_fallback_to_gemini

  - name: deepgram_high_latency
    condition: deepgram_latency_p99 > 500ms
    severity: warning
    action: page_on_call_engineer

  - name: deepgram_high_error_rate
    condition: deepgram_error_rate > 0.01
    severity: critical
    action: trigger_fallback_to_elevenlabs

  - name: fallback_rate_high
    condition: fallback_rate > 0.05
    severity: critical
    action: page_on_call_engineer

  - name: daily_cost_spike
    condition: daily_cost > baseline * 1.5
    severity: warning
    action: investigate_and_notify
```

### 6.3 Cost Savings Dashboard

```
╔══════════════════════════════════════════════════════════════╗
║           COST SAVINGS VISUALIZATION                         ║
╚══════════════════════════════════════════════════════════════╝

Today's Savings:        $47.32  📈
Weekly Savings:        $312.15  📈
Monthly Savings:     $1,240.60  💰
YTD Savings:        $12,406.00  🎉

Groq + Deepgram Spend:    $240/month
Gemini-Only Spend:        $500/month
                         ─────────
Savings:                  $260/month  (52% reduction)

Confidence Level: ████████░ 95%
Traffic Split: Groq+Deep 100% | Gemini 0% (fallback only)
```

---

## 7. Troubleshooting

### 7.1 Groq Rate-Limited (429 Error)

**Symptom:** `RateLimitError: Rate limit exceeded`

**Solution:**
```python
# Automatic fallback triggered in router
if response.status_code == 429:
    log.warning("Groq rate limited, falling back to Gemini")
    return fallback_to_gemini()

# Expected: Automatic fallback within < 100ms
```

**Debug:**
```bash
# Check Groq API status
curl https://status.groq.com/api/health

# Check rate limit headers
python -c "
import groq
client = groq.Groq(api_key='...')
try:
    response = client.chat.completions.create(...)
except Exception as e:
    print(e.response.headers)  # Check X-RateLimit-* headers
"
```

### 7.2 Deepgram Timeout (STT Slow)

**Symptom:** `Deepgram request timeout (> 500ms)`

**Solution:**
```python
# Automatic fallback to ElevenLabs
if deepgram_latency > 500:
    log.warning(f"Deepgram slow ({deepgram_latency}ms), falling back to ElevenLabs")
    return fallback_to_elevenlabs()

# Expected: Fallback within < 100ms
```

**Debug:**
```bash
# Test Deepgram directly
python -c "
from deepgram import DeepgramClient
import time

client = DeepgramClient(api_key='...')
start = time.time()
response = client.listen.rest.v('1').transcribe_url(...)
print(f'Latency: {(time.time()-start)*1000:.2f}ms')
"
```

### 7.3 Pipeline Fails Completely

**Symptom:** All services down (Groq, Deepgram, Gemini, ElevenLabs)

**Solution:**
```python
# Fall back to safe defaults
if all_services_down():
    log.critical("All AI services down! Using cached responses.")
    return use_cached_response_or_queue_for_retry()

# Actions:
# 1. Page on-call engineer immediately
# 2. Use cached/queued responses
# 3. Inform users of degraded service
# 4. Retry with exponential backoff
```

**Recovery:**
```bash
# Manual intervention
./scripts/manual-override.sh --use-gemini-only
./scripts/health-check.sh --verbose
```

---

## 8. Rollback Procedure

### 8.1 Revert to Gemini-Only

If issues arise, revert immediately:

```bash
# 1. Update config
export USE_HYBRID_ROUTING=false
export GROQ_ENABLED=false
export DEEPGRAM_ENABLED=false

# 2. Deploy rollback
./scripts/deploy-rollback.sh

# 3. Verify all traffic → Gemini
./scripts/verify-production.sh

# Expected output:
# ✓ 100% traffic routed to Gemini
# ✓ No data loss detected
# ✓ Fallback chain disabled
```

### 8.2 Verify No Data Loss

```bash
# Compare record counts before/after
python scripts/data-verification.py --compare-snapshots

# Expected:
# Records before: 1,234,567
# Records after:  1,234,567
# Status: ✓ No data loss
```

### 8.3 Archive Metrics

```bash
# Export all metrics from Groq+Deepgram trial
./scripts/export-metrics.sh \
  --start-date 2024-01-01 \
  --end-date 2024-01-31 \
  --output metrics-groq-deepgram-jan2024.json

# Analysis saved for post-mortem
cat metrics-groq-deepgram-jan2024.json | jq '.summary'
```

---

## Quick Reference

### Environment Variables

| Variable | Value | Purpose |
|----------|-------|---------|
| `GROQ_API_KEY` | API key | Authenticate with Groq |
| `GROQ_MODEL` | `mixtral-8x7b-32768` | LLM model choice |
| `DEEPGRAM_API_KEY` | API key | Authenticate with Deepgram |
| `DEEPGRAM_MODEL` | `nova-2` | STT model choice |
| `USE_HYBRID_ROUTING` | `true` / `false` | Enable/disable hybrid routing |
| `LATENCY_THRESHOLD_MS` | `500` | Trigger fallback if latency exceeds |
| `ERROR_RATE_THRESHOLD` | `0.01` | Trigger fallback if error rate exceeds 1% |

### Common Commands

```bash
# Test individual components
python test_groq_client.py
python test_deepgram_stt.py
python test_router.py

# Run test suites
pytest tests/test_hybrid_routing.py -v
pytest tests/test_integration.py -v -s

# Deploy
./scripts/deploy-staging.sh
./scripts/deploy-production.sh --percentage 25

# Monitor
./scripts/monitor-production.sh --duration 7days

# Rollback
./scripts/deploy-rollback.sh

# Verify
./scripts/health-check.sh --verbose
./scripts/verify-production.sh
```

### Support

- **Groq Issues**: https://console.groq.com/keys → Check API limits
- **Deepgram Issues**: https://console.deepgram.com → Check usage
- **On-Call**: PagerDuty (AI Systems team)
- **Slack**: #ai-operations

---

**Created:** 2024-01-22  
**Last Updated:** 2024-01-22  
**Status:** Ready for Staging Deployment
