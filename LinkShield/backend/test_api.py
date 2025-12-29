#!/usr/bin/env python3
"""
Quick API test script to verify LinkShield backend functionality
"""

import requests
import json
import time

def test_api():
    base_url = "http://127.0.0.1:8000"
    
    print("🧪 Testing LinkShield API...")
    print("=" * 40)
    
    # Test health endpoint
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        if response.status_code == 200:
            print("✅ Health check: PASSED")
            print(f"   Response: {response.json()}")
        else:
            print(f"❌ Health check failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Health check error: {e}")
        print("   Make sure the server is running: uvicorn main:app --host 127.0.0.1 --port 8000")
        return
    
    print()
    
    # Test analyze endpoint with safe URL
    test_urls = [
        ("https://google.com", "Should be SAFE"),
        ("https://github.com", "Should be SAFE"),
        ("http://suspicious-phishing-site.tk/verify", "Should be DANGEROUS")
    ]
    
    for url, expected in test_urls:
        try:
            print(f"🔍 Testing: {url}")
            print(f"   Expected: {expected}")
            
            response = requests.post(
                f"{base_url}/analyze",
                json={"url": url},
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                risk = result.get("risk", "UNKNOWN")
                confidence = result.get("confidence", 0)
                
                print(f"   Result: {risk} (confidence: {confidence:.2f})")
                
                if "details" in result:
                    print("   Details:")
                    for detail in result["details"][:3]:  # Show first 3 details
                        print(f"     • {detail}")
                
                print("   ✅ PASSED")
            else:
                print(f"   ❌ FAILED: {response.status_code}")
                print(f"   Response: {response.text}")
                
        except Exception as e:
            print(f"   ❌ ERROR: {e}")
        
        print()
    
    # Test stats endpoint
    try:
        response = requests.get(f"{base_url}/stats", timeout=5)
        if response.status_code == 200:
            print("📊 Stats endpoint: PASSED")
            stats = response.json()
            print(f"   Model threshold: {stats.get('model', {}).get('threshold', 'N/A')}")
            print(f"   Cache size: {stats.get('system', {}).get('cache_size', 'N/A')}")
        else:
            print(f"❌ Stats endpoint failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Stats endpoint error: {e}")
    
    print("\n🎉 API testing completed!")

if __name__ == "__main__":
    test_api()