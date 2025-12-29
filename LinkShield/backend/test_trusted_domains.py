#!/usr/bin/env python3
"""
Test script specifically for trusted domains issue
"""

import requests
import json

def test_trusted_domains():
    base_url = "http://127.0.0.1:8000"
    
    trusted_urls = [
        "https://google.com",
        "https://github.com",
        "https://stackoverflow.com",
        "https://www.google.com/search?q=test"
    ]
    
    print("🧪 Testing Trusted Domains")
    print("=" * 40)
    
    for url in trusted_urls:
        print(f"\n🔍 Testing: {url}")
        
        try:
            response = requests.post(
                f"{base_url}/analyze",
                json={"url": url},
                timeout=10
            )
            
            print(f"   Status Code: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print(f"   Risk: {result.get('risk', 'UNKNOWN')}")
                print(f"   Confidence: {result.get('confidence', 0):.2f}")
                print(f"   Source: {result.get('source', 'unknown')}")
                
                if 'details' in result:
                    print(f"   Details: {result['details']}")
                
                if 'error' in result:
                    print(f"   ❌ Error: {result['error']}")
                else:
                    print("   ✅ SUCCESS")
            else:
                print(f"   ❌ HTTP Error: {response.status_code}")
                print(f"   Response: {response.text}")
                
        except Exception as e:
            print(f"   ❌ Exception: {e}")

if __name__ == "__main__":
    test_trusted_domains()