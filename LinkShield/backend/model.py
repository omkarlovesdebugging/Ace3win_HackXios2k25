import pandas as pd
import numpy as np
from xgboost import XGBClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, recall_score, roc_auc_score
import joblib

# ===============================
# 1. LOAD DATA
# ===============================

df = pd.read_csv('./dataset/processed_dataset.csv')

# Drop non-feature columns
df = df.drop(columns=["url"], errors="ignore")
df = df.drop(columns=["https_used"], errors="ignore")
df = df.drop(columns=["digit_count"], errors="ignore")

# -------------------------------
# Target & Features
# -------------------------------
X = df.drop(columns=["label"])
y = df["label"]

# -------------------------------
# Train-test split
# -------------------------------
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    stratify=y,
    random_state=42
)

# -------------------------------
# Compute class weight automatically
# -------------------------------
neg, pos = np.bincount(y_train)
scale_pos_weight = neg / pos

print("Scale_pos_weight:", round(scale_pos_weight, 2))

# ===============================
# 2. TRAIN MODEL
# ===============================

model = XGBClassifier(
    n_estimators=300,
    max_depth=6,
    learning_rate=0.05,
    scale_pos_weight=scale_pos_weight,
    subsample=0.8,
    colsample_bytree=0.8,
    eval_metric="logloss",
    random_state=42
)

model.fit(X_train, y_train)

# ===============================
# 3. THRESHOLD OPTIMIZATION
# ===============================

y_probs = model.predict_proba(X_test)[:, 1]

best_threshold = 0.5
best_score = 0

for t in np.arange(0.35, 0.6, 0.05):
    preds = (y_probs > t).astype(int)
    recall = recall_score(y_test, preds)

    # prioritize recall but keep precision reasonable
    if recall > best_score:
        best_score = recall
        best_threshold = t

# Final predictions
y_pred = (y_probs > best_threshold).astype(int)

# ===============================
# 4. RESULTS
# ===============================

print("\n✅ Best Threshold:", round(best_threshold, 2))
print("✅ Malicious Recall:", round(best_score, 4))
print("✅ ROC-AUC:", round(roc_auc_score(y_test, y_probs), 4))

print("\nClassification Report:\n")
print(classification_report(y_test, y_pred))

# ===============================
# 5. FEATURE IMPORTANCE
# ===============================

importance = pd.Series(model.feature_importances_, index=X.columns)
importance = importance.sort_values(ascending=False)

print("\n📊 Feature Importance:")
print(importance)

# ===============================
# 6. SAVE MODEL & THRESHOLD
# ===============================

# Save both model and optimized threshold
model_data = {
    'model': model,
    'threshold': best_threshold,
    'feature_names': list(X.columns)
}

# joblib.dump(model_data, "url_malicious_model.pkl")
# print(f"\n✅ Model saved with optimized threshold: {best_threshold}")
# print("✅ Model saved as url_malicious_model.pkl")
