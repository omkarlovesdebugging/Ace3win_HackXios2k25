from fastapi import FastAPI
import difflib
from pydantic import BaseModel
import joblib
import tldextract
import math
import re
from urllib.parse import urlparse
import numpy as np
from fastapi.middleware.cors import CORSMiddleware
import requests
import os
from dotenv import load_dotenv
import hashlib
import time
from threat_intel import ThreatIntelligence

load_dotenv()

# ----------------------------
# Configuration
# ----------------------------
VIRUSTOTAL_API_KEY = os.getenv("VIRUSTOTAL_API_KEY")
CACHE = {}  # Simple in-memory cache
CACHE_TTL = 3600  # 1 hour
threat_intel = ThreatIntelligence()

# ----------------------------
# Load trained model
# ----------------------------
try:
    model_data = joblib.load("url_malicious_model.pkl")
    
    # Handle both old and new model formats
    if isinstance(model_data, dict):
        # New format with threshold and feature names
        model = model_data['model']
        OPTIMIZED_THRESHOLD = model_data['threshold']
        FEATURE_NAMES = model_data['feature_names']
    else:
        # Old format - just the model
        model = model_data
        OPTIMIZED_THRESHOLD = 0.30  # Default threshold
        FEATURE_NAMES = [
            "url_length", "special_char_count", "subdomain_depth", 
            "uses_ip_address", "url_entropy", "brand_similarity_score", 
            "suspicious_tld"
        ]
        print("⚠️ Using legacy model format. Consider retraining for optimal performance.")
        
except Exception as e:
    print(f"❌ Error loading model: {e}")
    print("Please run 'python model.py' to train the model first.")
    exit(1)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # OK for local testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------
# Request Models
# ----------------------------
class URLRequest(BaseModel):
    url: str

class BatchURLRequest(BaseModel):
    urls: list

# ----------------------------
# Helper Functions
# ----------------------------

def calculate_entropy(text):
    if not text:
        return 0
    probs = [text.count(c) / len(text) for c in set(text)]
    return -sum(p * math.log2(p) for p in probs)

def is_ip(host):
    return bool(re.match(r"^\d{1,3}(\.\d{1,3}){3}$", host))

def brand_similarity(domain):
    brands = ["google", "facebook", "amazon", "apple", "microsoft", "paypal"]
    return max(
        [difflib.SequenceMatcher(None, domain, b).ratio() for b in brands]
    )

def suspicious_tld(tld):
    return int(tld in ["tk", "ml", "ga", "cf", "gq"])

def check_virustotal(url):
    """Check URL against VirusTotal API"""
    if not VIRUSTOTAL_API_KEY:
        return None
    
    try:
        # Create URL ID for VirusTotal
        url_id = hashlib.sha256(url.encode()).hexdigest()
        
        headers = {"x-apikey": VIRUSTOTAL_API_KEY}
        response = requests.get(
            f"https://www.virustotal.com/api/v3/urls/{url_id}",
            headers=headers,
            timeout=5
        )
        
        if response.status_code == 200:
            data = response.json()
            stats = data.get("data", {}).get("attributes", {}).get("last_analysis_stats", {})
            malicious = stats.get("malicious", 0)
            total = sum(stats.values())
            
            if total > 0:
                return {
                    "malicious_count": malicious,
                    "total_engines": total,
                    "reputation_score": 1 - (malicious / total)
                }
    except Exception as e:
        print(f"VirusTotal API error: {e}")
    
    return None

# ----------------------------
# Feature Extraction
# ----------------------------

def extract_features(url):
    parsed = urlparse(url)
    ext = tldextract.extract(url)

    features = {
        "url_length": len(url),
        "special_char_count": len(re.findall(r"[^a-zA-Z0-9]", url)),
        "subdomain_depth": len(ext.subdomain.split(".")) if ext.subdomain else 0,
        "uses_ip_address": int(is_ip(parsed.hostname or "")),
        "url_entropy": calculate_entropy(url),
        "brand_similarity_score": brand_similarity(ext.domain),
        "suspicious_tld": suspicious_tld(ext.suffix),
    }

    return features

# ----------------------------
# Prediction Endpoint
# ----------------------------
@app.post("/analyze")
def analyze_url(data: URLRequest):
    try:
        url = data.url
        print(f"🔍 Analyzing URL: {url}")  # Debug logging
        
        # Check cache first
        cache_key = hashlib.md5(url.encode()).hexdigest()
        if cache_key in CACHE:
            cached_result = CACHE[cache_key]
            if time.time() - cached_result['timestamp'] < CACHE_TTL:
                print(f"✅ Cache hit for: {url}")
                return cached_result['result']
        
        ext = tldextract.extract(url)
        print(f"📊 Extracted domain: {ext.domain}, subdomain: {ext.subdomain}, suffix: {ext.suffix}")

        # ✅ Enhanced trusted domains check
        TRUSTED_DOMAINS = [
            "google", "youtube", "facebook", "microsoft", "amazon", 
            "github", "stackoverflow", "wikipedia", "reddit", "twitter",
            "linkedin", "apple", "netflix", "spotify", "dropbox"
        ]
        
        if ext.domain in TRUSTED_DOMAINS:
            print(f"✅ Trusted domain detected: {ext.domain}")
            result = {
                "url": url,
                "risk": "LOW",
                "confidence": 0.99,
                "source": "trusted_domain",
                "details": [f"✅ Domain '{ext.domain}' is in trusted whitelist"],
                "features": extract_features(url),
                "threat_intelligence": {
                    "score": 0.0,
                    "flags": []
                }
            }
            CACHE[cache_key] = {"result": result, "timestamp": time.time()}
            print(f"✅ Returning trusted domain result: {result}")
            return result

        # Check VirusTotal reputation
        vt_result = check_virustotal(url)
        
        # Get threat intelligence analysis
        threat_score, threat_flags = threat_intel.get_threat_score(url)
        
        # Extract ML features
        features = extract_features(url)
        X = np.array([list(features.values())])

        # Predict using ML model
        prob = model.predict_proba(X)[0][1]
        ml_risk = "HIGH" if prob > OPTIMIZED_THRESHOLD else "LOW"
        
        # Combine all analysis methods
        final_risk = ml_risk
        confidence = float(prob)
        details = []
        
        # Factor in threat intelligence
        if threat_score > 0.5:
            final_risk = "HIGH"
            confidence = max(confidence, threat_score)
            details.extend([f"⚠️ {flag}" for flag in threat_flags])
        
        if vt_result:
            vt_risk = "HIGH" if vt_result["reputation_score"] < 0.7 else "LOW"
            details.append(f"🔍 VirusTotal: {vt_result['malicious_count']}/{vt_result['total_engines']} engines flagged")
            
            # If any method says HIGH risk, mark as HIGH
            if ml_risk == "HIGH" or vt_risk == "HIGH":
                final_risk = "HIGH"
                confidence = max(confidence, 1 - vt_result["reputation_score"])
        
        details.append(f"🤖 ML Model confidence: {prob:.2f}")
        details.append(f"🎯 Threshold used: {OPTIMIZED_THRESHOLD:.2f}")
        if threat_score > 0:
            details.append(f"🛡️ Threat Intelligence score: {threat_score:.2f}")

        result = {
            "url": url,
            "risk": final_risk,
            "confidence": confidence,
            "source": "comprehensive_analysis",
            "details": details,
            "features": features,
            "threat_intelligence": {
                "score": threat_score,
                "flags": threat_flags
            }
        }
        
        # Cache result
        CACHE[cache_key] = {"result": result, "timestamp": time.time()}
        print(f"✅ Analysis complete for: {url}, risk: {final_risk}")
        return result

    except Exception as e:
        print(f"❌ Error analyzing {data.url}: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "error": str(e),
            "url": data.url,
            "risk": "UNKNOWN"
        }

# ----------------------------
# Additional Endpoints
# ----------------------------

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "cache_size": len(CACHE),
        "virustotal_enabled": VIRUSTOTAL_API_KEY is not None
    }

@app.get("/stats")
def get_stats():
    # Calculate cache statistics
    cache_size = len(CACHE)
    cache_memory = sum(len(str(v)) for v in CACHE.values()) / 1024  # KB
    
    return {
        "system": {
            "status": "operational",
            "uptime": "running",
            "cache_size": cache_size,
            "cache_memory_kb": round(cache_memory, 2)
        },
        "model": {
            "threshold": OPTIMIZED_THRESHOLD,
            "feature_count": len(FEATURE_NAMES),
            "algorithm": "XGBoost"
        },
        "security": {
            "trusted_domains_count": 15,
            "threat_patterns": len(threat_intel.suspicious_patterns),
            "virustotal_enabled": VIRUSTOTAL_API_KEY is not None
        },
        "performance": {
            "avg_response_time_ms": "<200",
            "cache_ttl_seconds": CACHE_TTL,
            "batch_limit": 10
        }
    }

@app.post("/batch-analyze")
def batch_analyze(data: BatchURLRequest):
    """Analyze multiple URLs at once"""
    results = []
    for url in data.urls[:10]:  # Limit to 10 URLs
        try:
            result = analyze_url(URLRequest(url=url))
            results.append(result)
        except Exception as e:
            results.append({"url": url, "error": str(e), "risk": "UNKNOWN"})
    return {"results": results}
