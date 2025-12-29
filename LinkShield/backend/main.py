from fastapi import FastAPI
from pydantic import BaseModel
import tldextract
import difflib
import math
import whois
import datetime

app = FastAPI()

# ----------------------------
# Trusted domains (expandable)
# ----------------------------
TRUSTED_DOMAINS = [
    "google.com",
    "facebook.com",
    "amazon.com",
    "instagram.com",
    "microsoft.com",
    "paypal.com"
]

# ----------------------------
# Request Model
# ----------------------------
class URLRequest(BaseModel):
    url: str


# ----------------------------
# Entropy Calculator
# ----------------------------
def calculate_entropy(text):
    probabilities = [text.count(c) / len(text) for c in set(text)]
    return -sum(p * math.log2(p) for p in probabilities)


# ----------------------------
# Domain Age Check
# ----------------------------
def is_new_domain(domain):
    try:
        info = whois.whois(domain)
        created = info.creation_date

        if isinstance(created, list):
            created = created[0]

        age_days = (datetime.datetime.now() - created).days
        return age_days < 7  # less than 7 days old
    except:
        return True


# ----------------------------
# Look-alike Detection
# ----------------------------
def looks_like_legit(domain):
    for legit in TRUSTED_DOMAINS:
        similarity = difflib.SequenceMatcher(None, domain, legit).ratio()
        if similarity > 0.75 and domain != legit:
            return True
    return False


# ----------------------------
# Keyword Detection
# ----------------------------
def has_suspicious_words(domain):
    keywords = ["login", "verify", "secure", "update", "account"]
    return any(word in domain for word in keywords)


# ----------------------------
# MAIN API
# ----------------------------
@app.post("/analyze")
def analyze_url(data: URLRequest):
    url = data.url
    ext = tldextract.extract(url)
    domain = f"{ext.domain}.{ext.suffix}"

    risk_score = 0
    reasons = []

    if calculate_entropy(domain) > 3.5:
        risk_score += 1
        reasons.append("Random-looking domain")

    if is_new_domain(domain):
        risk_score += 1
        reasons.append("Recently registered domain")

    if looks_like_legit(domain):
        risk_score += 2
        reasons.append("Looks similar to a trusted website")

    if has_suspicious_words(domain):
        risk_score += 1
        reasons.append("Contains phishing keywords")

    risk_level = "low"
    if risk_score >= 3:
        risk_level = "high"

    return {
        "risk": risk_level,
        "score": risk_score,
        "domain": domain,
        "reasons": reasons
    }