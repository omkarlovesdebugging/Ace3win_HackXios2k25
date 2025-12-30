"""
Phishing Detection API Server
FastAPI backend for real-time URL security analysis using XGBoost ML model
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import numpy as np
import pandas as pd
import xgboost as xgb
from url_feature_extractor import WebSecurityAnalyzer

# Initialize web application
app = FastAPI(title="URL Security Analysis API", version="1.0.0")

# Configure CORS for browser extension access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load pre-trained ML components
import os
model_path = os.path.dirname(__file__)
feature_scaler = joblib.load(os.path.join(model_path, "scaler.pkl"))
ml_classifier = xgb.Booster()
ml_classifier.load_model(os.path.join(model_path, "xgb_model.json"))

# Define expected feature order for model input
REQUIRED_FEATURES = [
    "URLLength", "DomainLength", "TLDLength", "NoOfImage", "NoOfJS", "NoOfCSS", 
    "NoOfSelfRef", "NoOfExternalRef", "IsHTTPS", "HasObfuscation", "HasTitle", 
    "HasDescription", "HasSubmitButton", "HasSocialNet", "HasFavicon", 
    "HasCopyrightInfo", "popUpWindow", "Iframe", "Abnormal_URL", 
    "LetterToDigitRatio", "Redirect_0", "Redirect_1"
]

# Request model for direct feature input
class SecurityFeatures(BaseModel):
    URLLength: int
    DomainLength: int
    TLDLength: int
    NoOfImage: int
    NoOfJS: int
    NoOfCSS: int
    NoOfSelfRef: int
    NoOfExternalRef: int
    IsHTTPS: int
    HasObfuscation: int
    HasTitle: int
    HasDescription: int
    HasSubmitButton: int
    HasSocialNet: int
    HasFavicon: int
    HasCopyrightInfo: int
    popUpWindow: int
    Iframe: int
    Abnormal_URL: int
    LetterToDigitRatio: float
    Redirect_0: int
    Redirect_1: int

# Request model for URL analysis
class URLAnalysisRequest(BaseModel):
    url: str

@app.post("/predict")
def analyze_features(features: SecurityFeatures):
    """Analyze URL security based on pre-extracted features"""
    try:
        feature_dataframe = pd.DataFrame([features.dict()], columns=REQUIRED_FEATURES)
        normalized_features = feature_scaler.transform(feature_dataframe)
        
        prediction_matrix = xgb.DMatrix(normalized_features, feature_names=REQUIRED_FEATURES)
        security_score = ml_classifier.predict(prediction_matrix)
        classification_result = int(round(security_score[0]))

        return {
            "prediction": classification_result,
            "result": "Legitimate" if classification_result == 1 else "Phishing"
        }
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))

@app.post("/predict_url")
def analyze_url(request: URLAnalysisRequest):
    """Analyze URL security by extracting features automatically"""
    try:
        security_analyzer = WebSecurityAnalyzer(request.url)
        extracted_features = security_analyzer.generate_feature_vector()

        if "error" in extracted_features:
            raise HTTPException(status_code=400, detail=extracted_features["error"])

        feature_dataframe = pd.DataFrame([extracted_features], columns=REQUIRED_FEATURES)
        normalized_features = feature_scaler.transform(feature_dataframe)
        
        prediction_matrix = xgb.DMatrix(normalized_features, feature_names=REQUIRED_FEATURES)
        security_score = ml_classifier.predict(prediction_matrix)
        classification_result = int(round(security_score[0]))

        return {
            "features": extracted_features,
            "prediction": classification_result,
            "result": "Legitimate" if classification_result == 1 else "Phishing"
        }
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))

@app.get("/")
def service_status():
    return {"message": "URL Security Analysis API - Service Active", "version": "1.0.0", "status": "deployed"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "linkshield-backend"}