"""
AeroTwin — Ensemble Predictor
Combines: LeakSenseNet + LeakLocalizationNet + XGBoost
Weighted vote: NN:0.40, XGBoost:0.60
"""

import numpy as np
import torch
import joblib
from xgboost import XGBClassifier
from sklearn.preprocessing import StandardScaler


class LeakSenseEnsemble:
    """
    Production ensemble combining neural nets with traditional ML models.
    Uses weighted voting for final leak detection and localization.
    """

    def __init__(self):
        self.leak_net = None        # LeakSenseNet (binary)
        self.loc_net = None         # LeakLocalizationNet (multi-class)
        self.xgb_detector = None    # XGBoost binary detector
        self.xgb_localizer = None   # XGBoost zone localizer
        self.scaler = None          # StandardScaler for features
        self.is_fitted = False

        # Ensemble weights (40% Neural Nets, 60% XGBoost)
        self.weights = {
            'leak_net': 0.40,
            'loc_net': 0.40,
            'xgb': 0.60,
        }

    def fit_sklearn_models(self, X_train: np.ndarray, y_binary: np.ndarray,
                           y_zone: np.ndarray):
        """
        Fit the XGBoost models.
        Neural nets are trained separately via PyTorch.
        """
        # Fit scaler
        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X_train)

        # Binary detection model (XGBoost)
        # Optimized for low computation (n_estimators=80, max_depth=5) and low latency
        self.xgb_detector = XGBClassifier(
            n_estimators=80,
            max_depth=5,
            learning_rate=0.1,
            random_state=42,
            tree_method='hist',
            eval_metric='logloss',
            n_jobs=-1
        )
        self.xgb_detector.fit(X_scaled, y_binary)

        # Zone localization model (XGBoost)
        # Optimized for low computation and multiclass classification
        self.xgb_localizer = XGBClassifier(
            n_estimators=80,
            max_depth=5,
            learning_rate=0.1,
            random_state=42,
            tree_method='hist',
            eval_metric='mlogloss',
            n_jobs=-1
        )
        self.xgb_localizer.fit(X_scaled, y_zone)

        self.is_fitted = True

    def predict(self, features_tensor: torch.Tensor = None,
                features_numpy: np.ndarray = None) -> dict:
        """
        Ensemble prediction combining all models.

        Args:
            features_tensor: PyTorch tensor for neural nets
            features_numpy: NumPy array for sklearn models (pre-scaled)

        Returns:
            dict with confidence, zone prediction, and component scores
        """
        scores = {}

        # Neural net predictions
        if self.leak_net is not None and features_tensor is not None:
            with torch.inference_mode():
                nn_conf = float(self.leak_net(features_tensor).item())
                scores['leak_net'] = nn_conf

        if self.loc_net is not None and features_tensor is not None:
            with torch.inference_mode():
                loc_probs = self.loc_net(features_tensor).numpy()[0]
                scores['loc_probs'] = loc_probs

        # XGBoost predictions
        if features_numpy is not None and self.is_fitted:
            # XGB detection
            xgb_proba = self.xgb_detector.predict_proba(features_numpy)
            scores['xgb_conf'] = float(xgb_proba[0][1]) if xgb_proba.shape[1] > 1 else 0.5

            # XGB zone localization
            xgb_zone = self.xgb_localizer.predict_proba(features_numpy)[0]
            scores['xgb_zone_probs'] = xgb_zone

        # Weighted ensemble for binary detection
        w = self.weights
        conf_components = []
        weight_sum = 0.0

        if 'leak_net' in scores:
            conf_components.append(w['leak_net'] * scores['leak_net'])
            weight_sum += w['leak_net']
        if 'xgb_conf' in scores:
            conf_components.append(w['xgb'] * scores['xgb_conf'])
            weight_sum += w['xgb']

        if weight_sum > 0:
            final_confidence = sum(conf_components) / weight_sum
        else:
            final_confidence = 0.5

        # Weighted ensemble for zone localization
        if 'loc_probs' in scores:
            n_classes = len(scores['loc_probs'])
        elif 'xgb_zone_probs' in scores:
            n_classes = len(scores['xgb_zone_probs'])
        else:
            n_classes = 7
        zone_votes = np.zeros(n_classes)

        if 'loc_probs' in scores:
            zone_votes += w['loc_net'] * scores['loc_probs']
        if 'xgb_zone_probs' in scores:
            zone_votes += w['xgb'] * scores['xgb_zone_probs']

        zone_votes_sum = zone_votes.sum()
        if zone_votes_sum > 0:
            zone_votes /= zone_votes_sum

        suspected_zone_idx = int(np.argmax(zone_votes))

        return {
            'confidence': float(final_confidence),
            'suspected_zone_idx': suspected_zone_idx,
            'zone_probabilities': zone_votes.tolist(),
            'component_scores': {
                k: float(v) if isinstance(v, (int, float, np.floating)) else v
                for k, v in scores.items()
                if not isinstance(v, np.ndarray)
            },
        }

    def save(self, path: str):
        joblib.dump(self, path)

    @staticmethod
    def load(path: str) -> 'LeakSenseEnsemble':
        return joblib.load(path)
