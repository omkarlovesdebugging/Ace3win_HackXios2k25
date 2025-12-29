# 🚀 LinkShield Quick Start Guide

## Step 1: Install Dependencies

```bash
cd LinkShield/backend
pip install -r requirements.txt
```

## Step 2: Start the Backend Server

```bash
# Option 1: Use the startup script
python start.py

# Option 2: Start manually
uvicorn main:app --host 127.0.0.1 --port 8000
```

You should see:
```
✅ All dependencies installed
✅ Trained model found
🚀 Starting LinkShield backend server...
📡 Server will be available at: http://127.0.0.1:8000
```

## Step 3: Test the API

Open a new terminal and run:
```bash
cd LinkShield/backend
python test_api.py
```

You should see successful API tests.

## Step 4: Install Browser Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `LinkShield/extension` folder
5. The LinkShield 🛡️ icon should appear in your toolbar

## Step 5: Test the Extension

1. Click the LinkShield icon in your toolbar
2. It should automatically scan the current page
3. Try visiting different websites to see the protection in action

## 🔧 Troubleshooting

### Backend Issues:
- **"Module not found"**: Run `pip install -r requirements.txt`
- **"Model not found"**: Run `python model.py` to train the model
- **Port already in use**: Change port in the uvicorn command

### Extension Issues:
- **"Unable to scan website"**: Make sure backend is running on port 8000
- **Extension not loading**: Check that all files are in the extension folder

## 🧪 Testing URLs

### Safe URLs (should show LOW risk):
- https://google.com
- https://github.com
- https://stackoverflow.com

### Test suspicious patterns:
- URLs with suspicious TLDs (.tk, .ml, .ga)
- URLs with IP addresses instead of domains
- URLs with excessive subdomains

## 📊 API Endpoints

- **Health Check**: http://127.0.0.1:8000/health
- **Statistics**: http://127.0.0.1:8000/stats
- **API Docs**: http://127.0.0.1:8000/docs

## 🎯 Demo Ready!

Your LinkShield is now ready for demonstration. The system provides:
- Real-time malicious URL detection
- Beautiful browser extension UI
- Comprehensive threat analysis
- Production-ready API endpoints

Good luck with your hackathon! 🏆