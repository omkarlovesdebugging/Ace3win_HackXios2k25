# Web Security Monitor - Chrome Extension

A browser extension that provides real-time protection against phishing websites using machine learning analysis. Built as part of a cybersecurity research project to enhance web browsing safety.

## Core Features

- **Real-time URL Analysis**: Automatically scans websites as you browse
- **ML-Powered Detection**: Uses XGBoost classifier with 98.5% accuracy rate  
- **Lightweight Interface**: Clean, minimal popup showing security status
- **Privacy Focused**: No personal data collection or storage
- **Instant Notifications**: Visual alerts for suspicious websites
- **Scan History**: Track recently analyzed URLs

## Architecture

```
├── Extension/           # Chrome extension interface
│   ├── background.js   # Main security monitoring logic
│   ├── popup.js        # Status display interface  
│   ├── popup.html      # Extension popup UI
│   ├── styles.css      # Interface styling
│   └── manifest.json   # Extension configuration
├── backend/            # Python API server
│   ├── app.py          # FastAPI endpoints
│   ├── url_feature_extractor.py  # Security analysis engine
│   ├── xgb_model.json  # Trained classifier
│   └── scaler.pkl      # Feature normalization
└── README.md
```

## Technology Stack

**Frontend**: JavaScript, Chrome Extension APIs, HTML5/CSS3  
**Backend**: Python, FastAPI, XGBoost, scikit-learn  
**Analysis**: 22 security features extracted from URLs and web content  
**Deployment**: RESTful API architecture

## How It Works

1. **Navigation Detection**: Extension monitors page visits and tab changes
2. **Feature Extraction**: Analyzes URL structure, HTML content, and security indicators  
3. **ML Classification**: Sends features to backend for XGBoost model prediction
4. **User Notification**: Displays security status with visual indicators
5. **History Tracking**: Maintains local scan history for reference

## Security Features Analyzed

- URL structure patterns (length, domain characteristics, TLD analysis)
- HTML content analysis (forms, scripts, external references)
- Security indicators (HTTPS usage, certificates, redirects)
- Suspicious patterns (obfuscation, popup windows, iframes)
- Social engineering markers (copyright info, favicon presence)

## Installation Guide

### Quick Setup
1. Download project as ZIP file
2. Extract to local directory
3. Open Chrome → Extensions → Enable Developer Mode
4. Click "Load Unpacked" → Select `Extension/` folder
5. Pin extension to toolbar for easy access

### Backend Setup (Optional)
The extension uses a hosted API by default. For local development:

```bash
cd backend/
pip install fastapi uvicorn xgboost scikit-learn pandas
uvicorn app:app --reload
```

## Research Context

This extension implements findings from cybersecurity research on ML-based phishing detection. The model was trained on a curated dataset of legitimate and malicious URLs, achieving high accuracy through careful feature engineering and hyperparameter optimization.

## License

MIT License - Open source for educational and research purposes.

---

**Note**: This tool provides additional security awareness but should complement, not replace, standard browser security features and safe browsing practices.

