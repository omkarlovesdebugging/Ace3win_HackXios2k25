"""
Advanced Threat Intelligence Module
Provides additional security checks and threat detection
"""

import re
import requests
from urllib.parse import urlparse
import tldextract

class ThreatIntelligence:
    def __init__(self):
        # Known malicious patterns
        self.suspicious_patterns = [
            r'[0-9]{1,3}-[0-9]{1,3}-[0-9]{1,3}-[0-9]{1,3}',  # IP-like patterns in domain
            r'[a-z]{20,}',  # Very long random strings
            r'(secure|bank|paypal|amazon|apple)-[a-z0-9]+\.',  # Brand impersonation
            r'[0-9]{8,}',  # Long number sequences
            r'(login|signin|verify|update|confirm)-[a-z0-9]+',  # Phishing keywords
        ]
        
        # Suspicious keywords
        self.phishing_keywords = [
            'verify', 'suspend', 'limited', 'security', 'update', 'confirm',
            'click', 'urgent', 'immediate', 'expire', 'account', 'billing'
        ]
        
        # Known malicious TLDs (beyond the basic ones)
        self.high_risk_tlds = [
            'tk', 'ml', 'ga', 'cf', 'gq', 'pw', 'top', 'click', 'download',
            'stream', 'science', 'work', 'party', 'review', 'country'
        ]
    
    def analyze_url_structure(self, url):
        """Analyze URL structure for suspicious patterns"""
        parsed = urlparse(url)
        ext = tldextract.extract(url)
        
        risk_score = 0
        flags = []
        
        # Check for suspicious patterns
        for pattern in self.suspicious_patterns:
            if re.search(pattern, url.lower()):
                risk_score += 0.3
                flags.append(f"Suspicious pattern detected: {pattern}")
        
        # Check domain length
        if len(ext.domain) > 20:
            risk_score += 0.2
            flags.append("Unusually long domain name")
        
        # Check for excessive subdomains
        if ext.subdomain and len(ext.subdomain.split('.')) > 2:
            risk_score += 0.25
            flags.append("Multiple subdomains detected")
        
        # Check for high-risk TLD
        if ext.suffix in self.high_risk_tlds:
            risk_score += 0.4
            flags.append(f"High-risk TLD: .{ext.suffix}")
        
        # Check for phishing keywords in domain
        domain_lower = ext.domain.lower()
        for keyword in self.phishing_keywords:
            if keyword in domain_lower:
                risk_score += 0.15
                flags.append(f"Phishing keyword in domain: {keyword}")
        
        # Check for URL shorteners (potential redirect chains)
        shorteners = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'short.link']
        if ext.domain in shorteners:
            risk_score += 0.3
            flags.append("URL shortener detected")
        
        return min(risk_score, 1.0), flags
    
    def check_homograph_attack(self, domain):
        """Check for homograph/IDN attacks"""
        # Common homograph substitutions
        homographs = {
            'a': ['а', 'ɑ', 'α'],  # Cyrillic/Greek a
            'e': ['е', 'ε'],       # Cyrillic/Greek e
            'o': ['о', 'ο', '0'],  # Cyrillic/Greek o, zero
            'p': ['р', 'ρ'],       # Cyrillic/Greek p
            'c': ['с', 'ϲ'],       # Cyrillic/Greek c
            'x': ['х', 'χ'],       # Cyrillic/Greek x
        }
        
        risk_score = 0
        flags = []
        
        for char in domain.lower():
            for latin, variants in homographs.items():
                if char in variants:
                    risk_score += 0.2
                    flags.append(f"Potential homograph attack: '{char}' resembles '{latin}'")
        
        return min(risk_score, 1.0), flags
    
    def analyze_certificate_info(self, url):
        """Analyze SSL certificate information (basic check)"""
        parsed = urlparse(url)
        
        if parsed.scheme != 'https':
            return 0.3, ["No HTTPS encryption"]
        
        # In a real implementation, you'd check certificate details
        # For now, just basic HTTPS presence check
        return 0.0, []
    
    def get_threat_score(self, url):
        """Get comprehensive threat intelligence score"""
        parsed = urlparse(url)
        ext = tldextract.extract(url)
        
        total_score = 0
        all_flags = []
        
        # URL structure analysis
        struct_score, struct_flags = self.analyze_url_structure(url)
        total_score += struct_score * 0.4
        all_flags.extend(struct_flags)
        
        # Homograph attack check
        homo_score, homo_flags = self.check_homograph_attack(ext.domain)
        total_score += homo_score * 0.3
        all_flags.extend(homo_flags)
        
        # Certificate check
        cert_score, cert_flags = self.analyze_certificate_info(url)
        total_score += cert_score * 0.3
        all_flags.extend(cert_flags)
        
        return min(total_score, 1.0), all_flags