# LinkShield Backend Server

This is the local backend server for the LinkShield browser extension. It provides ML-based phishing detection using XGBoost.

## Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Start the Server

**Windows:**
```bash
start_server.bat
```

**Linux/Mac:**
```bash
chmod +x start_server.sh
./start_server.sh
```

**Manual:**
```bash
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### 3. Verify Server is Running

Open your browser and go to: http://127.0.0.1:8000

You should see: `{"message": "URL Security Analysis API - Service Active", "version": "1.0.0"}`

## API Endpoints

- `GET /` - Health check
- `POST /predict_url` - Analyze a URL for phishing (used by extension)
- `POST /predict` - Analyze pre-extracted features

## Troubleshooting

### Server won't start:
1. Make sure Python is installed
2. Install dependencies: `pip install -r requirements.txt`
3. Check if port 8000 is available: `netstat -an | findstr :8000`

### Extension can't connect:
1. Make sure server is running on http://127.0.0.1:8000
2. Check browser console for error messages
3. Verify CORS is enabled (already configured)

### Model files missing:
Make sure these files exist in the backend directory:
- `scaler.pkl`
- `xgb_model.json`
- `url_feature_extractor.py`

## Server Logs

The server will show logs in the terminal including:
- Incoming requests
- Analysis results
- Any errors

Keep the terminal open to monitor the server activity.