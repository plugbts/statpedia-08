"""
Train Icura Early-Goal ML correction layer (logistic regression) offline.

This script expects your DB to have `icura_nhl_early_game_dataset` populated with:
- targets: goal_in_first_5, goal_in_first_10
- feature columns (home/away)

It outputs a lightweight JSON artifact that Node can load for inference:
ICURA_EARLY_GOAL_ML_ARTIFACT=path/to/artifact.json

Trains TWO separate models:
- Model for goal_in_first_5 (G1F5)
- Model for goal_in_first_10 (G1F10)

Usage:
  # Default: Train on 2023-2024, validate on early 2025, test on late 2025
  python3 scripts/icura/train-early-goal-logreg.py \
    --db "$DATABASE_URL" \
    --out icura_early_goal_logreg.json

  # Custom splits by date
  python3 scripts/icura/train-early-goal-logreg.py \
    --db "$DATABASE_URL" \
    --out icura_early_goal_logreg.json \
    --train-start "2023-10-01" --train-end "2024-07-01" \
    --val-start "2025-10-01" --val-end "2026-01-15" \
    --test-start "2026-01-15" --test-end "2026-07-01"
"""

import argparse
import json
import os
from datetime import datetime

import numpy as np

try:
  import psycopg2
except ImportError as e:
  raise SystemExit("Missing dependency psycopg2. Install: pip install psycopg2-binary scikit-learn numpy") from e

try:
  from sklearn.linear_model import LogisticRegression
  from sklearn.metrics import log_loss, brier_score_loss, roc_auc_score
  from sklearn.preprocessing import StandardScaler
  from sklearn.isotonic import IsotonicRegression
except ImportError as e:
  raise SystemExit("Missing scikit-learn. Install: pip install scikit-learn") from e


FEATURES = [
  # First 10 features
  "home_team_xgf_first10_last20",
  "home_team_xga_first10_last20",
  "home_team_rush_chances_first10_last20",
  "home_team_high_danger_first10_last20",
  "home_team_shot_attempts_first10",
  "away_team_xgf_first10_last20",
  "away_team_xga_first10_last20",
  "away_team_rush_chances_first10_last20",
  "away_team_high_danger_first10_last20",
  "away_team_shot_attempts_first10",
  # First 5 features (critical for G1F5)
  "home_team_xgf_first5_last20",
  "home_team_rush_chances_first5_last20",
  "home_team_high_danger_first5_last20",
  "home_team_time_to_first_shot",
  "home_team_time_to_first_hd",
  "away_team_xgf_first5_last20",
  "away_team_rush_chances_first5_last20",
  "away_team_high_danger_first5_last20",
  "away_team_time_to_first_shot",
  "away_team_time_to_first_hd",
  # Goalie first 5 features
  "home_goalie_save_pct_first5",
  "home_goalie_gsax_first5",
  "away_goalie_save_pct_first5",
  "away_goalie_gsax_first5",
  # Context
  "home_rest_days",
  "away_rest_days",
  "travel_distance",
  "ref_penalty_rate",
  "closing_total",
  "closing_first_period_total",
  # Penalty features (from extras JSONB)
  "(extras->>'home_penalties_first5')::numeric",
  "(extras->>'away_penalties_first5')::numeric",
  "(extras->>'home_penalty_time_first5')::numeric",
  "(extras->>'away_penalty_time_first5')::numeric",
  # Faceoff tempo features
  "(extras->>'min_time_since_faceoff_first5')::numeric",
  "(extras->>'avg_time_since_faceoff_first5')::numeric",
  # Shift-level features
  "(extras->>'home_avg_toi_first5')::numeric",
  "(extras->>'home_max_toi_first5')::numeric",
  "(extras->>'home_min_time_since_faceoff_first5')::numeric",
  "(extras->>'away_avg_toi_first5')::numeric",
  "(extras->>'away_max_toi_first5')::numeric",
  "(extras->>'away_min_time_since_faceoff_first5')::numeric",
  # Interaction features (critical for G1F5)
  # Fast start interactions
  "home_team_time_to_first_shot * away_team_time_to_first_shot",  # Both teams fast = high tempo
  "home_team_xgf_first5_last20 * away_team_xgf_first10_last20",  # Home offense vs away overall
  "home_goalie_save_pct_first5 * away_goalie_save_pct_first5",  # Both goalies weak = high scoring
  # Goalie weakness interactions
  "home_goalie_gsax_first5 * away_team_xgf_first5_last20",  # Weak goalie + strong offense
  "away_goalie_gsax_first5 * home_team_xgf_first5_last20",
  # Penalty interactions
  "(extras->>'home_penalties_first5')::numeric * away_team_xgf_first5_last20",  # Home penalty + away offense
  "(extras->>'away_penalties_first5')::numeric * home_team_xgf_first5_last20",  # Away penalty + home offense
]


def main():
  ap = argparse.ArgumentParser()
  ap.add_argument("--db", required=False, default=os.getenv("NEON_DATABASE_URL") or os.getenv("DATABASE_URL"))
  ap.add_argument("--out", required=True)
  # Default splits: Train on 2023-2024, validate on early 2025, test on late 2025
  ap.add_argument("--train-start", default="2023-10-01", help="Train set start date (YYYY-MM-DD)")
  ap.add_argument("--train-end", default="2024-07-01", help="Train set end date (YYYY-MM-DD)")
  ap.add_argument("--val-start", default="2025-10-01", help="Validation set start date (YYYY-MM-DD)")
  ap.add_argument("--val-end", default="2026-01-15", help="Validation set end date (YYYY-MM-DD)")
  ap.add_argument("--test-start", default="2026-01-15", help="Test set start date (YYYY-MM-DD)")
  ap.add_argument("--test-end", default="2026-07-01", help="Test set end date (YYYY-MM-DD)")
  args = ap.parse_args()

  if not args.db:
    raise SystemExit("No DB connection string provided (--db or DATABASE_URL).")

  conn = psycopg2.connect(args.db)
  cur = conn.cursor()

  # Fetch train/val/test splits by date (for both targets)
  def fetch_split(start_date, end_date, split_name):
    sql = f"""
      SELECT
        goal_in_first_5::int as y5,
        goal_in_first_10::int as y10,
        {", ".join(FEATURES)}
      FROM public.icura_nhl_early_game_dataset
      WHERE goal_in_first_5 IS NOT NULL
        AND goal_in_first_10 IS NOT NULL
        AND date_iso >= %s
        AND date_iso < %s
    """
    cur.execute(sql, [start_date, end_date])
    rows = cur.fetchall()
    print(f"  {split_name}: {len(rows)} rows ({start_date} to {end_date})")
    return rows

  print("📊 Loading dataset splits...")
  train_rows = fetch_split(args.train_start, args.train_end, "Train")
  val_rows = fetch_split(args.val_start, args.val_end, "Validate")
  test_rows = fetch_split(args.test_start, args.test_end, "Test")

  # Fallback: if train set is empty, combine all available data and split it
  if not train_rows:
    all_available = []
    if val_rows:
      all_available.extend(val_rows)
    if test_rows:
      all_available.extend(test_rows)
    
    if not all_available:
      # Last resort: get any available data
      cur.execute(f"""
        SELECT
          goal_in_first_5::int as y5,
          goal_in_first_10::int as y10,
          {", ".join(FEATURES)}
        FROM public.icura_nhl_early_game_dataset
        WHERE goal_in_first_5 IS NOT NULL
          AND goal_in_first_10 IS NOT NULL
        ORDER BY date_iso
        LIMIT 1000
      """)
      all_available = cur.fetchall()
    
    if not all_available:
      raise SystemExit("No training rows found in dataset.")
    
    # Split available data: 70% train, 15% val, 15% test
    import random
    random.seed(42)
    random.shuffle(all_available)
    n = len(all_available)
    train_end = int(n * 0.7)
    val_end = train_end + int(n * 0.15)
    
    train_rows = all_available[:train_end]
    val_rows = all_available[train_end:val_end] if val_end > train_end else []
    test_rows = all_available[val_end:] if val_end < n else []
    
    print(f"⚠️  No date-based training data. Split {n} available rows: {len(train_rows)} train, {len(val_rows)} val, {len(test_rows)} test")
  
  if not val_rows:
    print(f"⚠️  Warning: No validation rows found for date range {args.val_start} to {args.val_end}.")
  if not test_rows:
    print(f"⚠️  Warning: No test rows found for date range {args.test_start} to {args.test_end}.")

  # Convert to numpy arrays (separate targets for G1F5 and G1F10)
  y5_train = np.array([r[0] for r in train_rows], dtype=np.int32)
  y10_train = np.array([r[1] for r in train_rows], dtype=np.int32)
  X_train_raw = np.array([[float(v) if v is not None else 0.0 for v in r[2:]] for r in train_rows], dtype=np.float64)

  y5_val = np.array([r[0] for r in val_rows], dtype=np.int32) if val_rows else np.array([], dtype=np.int32)
  y10_val = np.array([r[1] for r in val_rows], dtype=np.int32) if val_rows else np.array([], dtype=np.int32)
  X_val_raw = np.array([[float(v) if v is not None else 0.0 for v in r[2:]] for r in val_rows], dtype=np.float64) if val_rows else np.array([[]], dtype=np.float64)

  y5_test = np.array([r[0] for r in test_rows], dtype=np.int32) if test_rows else np.array([], dtype=np.int32)
  y10_test = np.array([r[1] for r in test_rows], dtype=np.int32) if test_rows else np.array([], dtype=np.int32)
  X_test_raw = np.array([[float(v) if v is not None else 0.0 for v in r[2:]] for r in test_rows], dtype=np.float64) if test_rows else np.array([[]], dtype=np.float64)

  # Scale features for better convergence
  scaler = StandardScaler()
  X_train = scaler.fit_transform(X_train_raw)
  X_val = scaler.transform(X_val_raw) if len(X_val_raw) > 0 and X_val_raw.shape[1] > 0 else X_val_raw
  X_test = scaler.transform(X_test_raw) if len(X_test_raw) > 0 and X_test_raw.shape[1] > 0 else X_test_raw

  cur.close()
  conn.close()

  # Train model for G1F5
  print(f"\n🔧 Training G1F5 model on {len(y5_train)} samples...")
  print(f"   Class distribution: {np.bincount(y5_train) if len(y5_train) > 0 and len(np.unique(y5_train)) > 1 else 'Single class - need more data'}")
  
  if len(np.unique(y5_train)) < 2:
    print("⚠️  G1F5: Not enough class diversity. Skipping G1F5 model.")
    model5 = None
    metrics5 = {}
  else:
    # Calculate class weights to handle imbalanced data (34.6% positive)
    class_counts = np.bincount(y5_train)
    total = class_counts.sum()
    n_classes = len(class_counts)
    class_weight = {i: total / (n_classes * count) for i, count in enumerate(class_counts) if count > 0}
    
    # Use more iterations and better regularization
    model5 = LogisticRegression(
      max_iter=5000,  # Increased further for convergence
      solver="lbfgs",
      C=0.5,  # Slightly more regularization to prevent overfitting
      class_weight=class_weight,  # Balance classes
      penalty="l2",
      tol=1e-5  # Slightly relaxed tolerance for convergence
    )
    model5.fit(X_train, y5_train)
    metrics5 = {"n_train": int(len(y5_train)), "n_val": int(len(y5_val)), "n_test": int(len(y5_test))}
    
  if len(y5_val) > 0 and len(np.unique(y5_val)) > 1:
    p5_val = model5.predict_proba(X_val)[:, 1]
    metrics5["val_log_loss"] = float(log_loss(y5_val, p5_val))
    metrics5["val_brier"] = float(brier_score_loss(y5_val, p5_val))
    metrics5["val_roc_auc"] = float(roc_auc_score(y5_val, p5_val))
    print(f"✅ G1F5 Validation: Log Loss={metrics5['val_log_loss']:.4f}, Brier={metrics5['val_brier']:.4f}, ROC-AUC={metrics5['val_roc_auc']:.4f}")
  elif len(y5_val) > 0:
    print(f"⚠️  G1F5 Validation: Only one class in validation set, skipping metrics")
    
    if len(y5_test) > 0:
      p5_test = model5.predict_proba(X_test)[:, 1]
      metrics5["test_log_loss"] = float(log_loss(y5_test, p5_test))
      metrics5["test_brier"] = float(brier_score_loss(y5_test, p5_test))
      metrics5["test_roc_auc"] = float(roc_auc_score(y5_test, p5_test))
      print(f"✅ G1F5 Test: Log Loss={metrics5['test_log_loss']:.4f}, Brier={metrics5['test_brier']:.4f}, ROC-AUC={metrics5['test_roc_auc']:.4f}")

  # Train model for G1F10
  print(f"\n🔧 Training G1F10 model on {len(y10_train)} samples...")
  print(f"   Class distribution: {np.bincount(y10_train) if len(y10_train) > 0 and len(np.unique(y10_train)) > 1 else 'Single class - need more data'}")
  
  if len(np.unique(y10_train)) < 2:
    print("⚠️  G1F10: Not enough class diversity. Skipping G1F10 model.")
    model10 = None
    metrics10 = {}
  else:
    # Calculate class weights to handle imbalanced data (62.5% positive)
    class_counts = np.bincount(y10_train)
    total = class_counts.sum()
    n_classes = len(class_counts)
    class_weight = {i: total / (n_classes * count) for i, count in enumerate(class_counts) if count > 0}
    
    # Use more iterations and better regularization
    model10 = LogisticRegression(
      max_iter=5000,  # Increased further for convergence
      solver="lbfgs",
      C=0.5,  # Slightly more regularization to prevent overfitting
      class_weight=class_weight,  # Balance classes
      penalty="l2",
      tol=1e-5  # Slightly relaxed tolerance for convergence
    )
    model10.fit(X_train, y10_train)
    metrics10 = {"n_train": int(len(y10_train)), "n_val": int(len(y10_val)), "n_test": int(len(y10_test))}
    
  if len(y10_val) > 0 and len(np.unique(y10_val)) > 1:
    p10_val = model10.predict_proba(X_val)[:, 1]
    metrics10["val_log_loss"] = float(log_loss(y10_val, p10_val))
    metrics10["val_brier"] = float(brier_score_loss(y10_val, p10_val))
    metrics10["val_roc_auc"] = float(roc_auc_score(y10_val, p10_val))
    print(f"✅ G1F10 Validation: Log Loss={metrics10['val_log_loss']:.4f}, Brier={metrics10['val_brier']:.4f}, ROC-AUC={metrics10['val_roc_auc']:.4f}")
  elif len(y10_val) > 0:
    print(f"⚠️  G1F10 Validation: Only one class in validation set, skipping metrics")
    
    if len(y10_test) > 0:
      p10_test = model10.predict_proba(X_test)[:, 1]
      metrics10["test_log_loss"] = float(log_loss(y10_test, p10_test))
      metrics10["test_brier"] = float(brier_score_loss(y10_test, p10_test))
      metrics10["test_roc_auc"] = float(roc_auc_score(y10_test, p10_test))
      print(f"✅ G1F10 Test: Log Loss={metrics10['test_log_loss']:.4f}, Brier={metrics10['test_brier']:.4f}, ROC-AUC={metrics10['test_roc_auc']:.4f}")

  # Fit calibration: Beta Calibration for G1F5, Platt Scaling for G1F10
  # Use validation set if available and has both classes, otherwise use holdout from training set
  beta_g1f5 = None
  platt_g1f10 = None
  
  # For G1F5: Use Beta Calibration (flexible, smooth, handles rare events and compressed probabilities)
  # Formula: p_cal = sigmoid(a * log(p_raw) + b * log(1 - p_raw) + c)
  if model5:
    if len(y5_val) > 0 and len(np.unique(y5_val)) > 1:
      # Use validation set
      p5_cal_raw = model5.predict_proba(X_val)[:, 1]
      y5_cal = y5_val
    else:
      # Use last 20% of training set as holdout for calibration
      holdout_size = max(50, int(len(y5_train) * 0.2))
      p5_cal_raw = model5.predict_proba(X_train[-holdout_size:])[:, 1]
      y5_cal = y5_train[-holdout_size:]
    
    if len(y5_cal) > 0 and len(np.unique(y5_cal)) > 1:
      # Clip probabilities to avoid log(0)
      p5_clipped = np.clip(p5_cal_raw, 1e-7, 1 - 1e-7)
      # Create features: [log(p), log(1-p)]
      X_beta = np.column_stack([
        np.log(p5_clipped),
        np.log(1 - p5_clipped)
      ])
      # Fit logistic regression: logit(P_cal) = a * log(p) + b * log(1-p) + c
      # Use class weights to handle imbalance and encourage upward shift
      class_counts = np.bincount(y5_cal)
      total = class_counts.sum()
      n_classes = len(class_counts)
      class_weight = {i: total / (n_classes * count) for i, count in enumerate(class_counts) if count > 0}
      
      beta_model5 = LogisticRegression(
        max_iter=1000, 
        solver="lbfgs", 
        fit_intercept=True,
        class_weight=class_weight,  # Balance classes to encourage proper calibration
        C=0.5  # Less regularization to allow more aggressive shifting
      )
      beta_model5.fit(X_beta, y5_cal)
      
      # Post-process: Add fixed upward shift to ensure probabilities are high enough
      # Target: shift probabilities so that raw 0.25 maps to ~0.35 (base rate)
      # This ensures we have enough predictions above the 0.346 threshold
      test_raw = 0.25  # Typical raw prediction
      test_clipped = np.clip([test_raw], 1e-7, 1 - 1e-7)
      test_X = np.column_stack([np.log(test_clipped), np.log(1 - test_clipped)])
      test_cal_before = beta_model5.predict_proba(test_X)[:, 1][0]
      
      target_cal = 0.35  # Want 0.25 raw -> 0.35 calibrated
      if test_cal_before < target_cal:
        # Compute adjustment needed
        target_logit = np.log(target_cal / (1 - target_cal))
        current_logit = np.log(test_cal_before / (1 - test_cal_before))
        adjustment = target_logit - current_logit
        beta_model5.intercept_[0] += adjustment
        print(f"   ⚡ Adjusted intercept by {adjustment:.4f} to shift probabilities upward")
        print(f"      Test: 0.25 raw -> {test_cal_before:.4f} -> {beta_model5.predict_proba(test_X)[:, 1][0]:.4f} calibrated")
      
      # Extract parameters: a, b, c
      beta_g1f5 = {
        "a": float(beta_model5.coef_[0][0]),  # coefficient for log(p)
        "b": float(beta_model5.coef_[0][1]),  # coefficient for log(1-p)
        "c": float(beta_model5.intercept_[0])  # intercept
      }
      
      # Test calibration on sample values to verify it's shifting appropriately
      test_probs = np.array([0.2, 0.3, 0.4, 0.35])
      test_clipped = np.clip(test_probs, 1e-7, 1 - 1e-7)
      test_X = np.column_stack([np.log(test_clipped), np.log(1 - test_clipped)])
      test_cal = beta_model5.predict_proba(test_X)[:, 1]
      
      print(f"✅ G1F5 Beta Calibration: a={beta_g1f5['a']:.4f}, b={beta_g1f5['b']:.4f}, c={beta_g1f5['c']:.4f} (fitted on {len(y5_cal)} samples)")
      print(f"   Test mapping: 0.2->{test_cal[0]:.4f}, 0.3->{test_cal[1]:.4f}, 0.35->{test_cal[3]:.4f}, 0.4->{test_cal[2]:.4f}")
  
  # For G1F10: Use Platt Scaling (works well for smooth distributions)
  if model10:
    if len(y10_val) > 0 and len(np.unique(y10_val)) > 1:
      # Use validation set
      p10_cal_raw = model10.predict_proba(X_val)[:, 1]
      y10_cal = y10_val
    else:
      # Use last 20% of training set as holdout for calibration
      holdout_size = max(50, int(len(y10_train) * 0.2))
      p10_cal_raw = model10.predict_proba(X_train[-holdout_size:])[:, 1]
      y10_cal = y10_train[-holdout_size:]
    
    if len(y10_cal) > 0 and len(np.unique(y10_cal)) > 1:
      # Convert to logits
      logits10 = np.log(np.clip(p10_cal_raw, 1e-7, 1 - 1e-7) / np.clip(1 - p10_cal_raw, 1e-7, 1 - 1e-7))
      # Fit logistic regression (Platt Scaling)
      platt_model10 = LogisticRegression(max_iter=1000, solver="lbfgs")
      platt_model10.fit(logits10.reshape(-1, 1), y10_cal)
      platt_g1f10 = {
        "A": float(platt_model10.coef_[0][0]),
        "B": float(platt_model10.intercept_[0])
      }
      print(f"✅ G1F10 Platt Scaling: A={platt_g1f10['A']:.4f}, B={platt_g1f10['B']:.4f} (fitted on {len(y10_cal)} samples)")

  # Build artifact with both models, scaler, and Platt calibration
  artifact = {
    "type": "logreg_dual",
    "version": "icura-early-goal-ml-0.6.0",  # Updated for hybrid calibration (Beta G1F5, Platt G1F10)
    "trained_at_iso": datetime.utcnow().isoformat() + "Z",
    "scaler": {
      "mean": scaler.mean_.tolist(),
      "scale": scaler.scale_.tolist()
    },
    "train_date_range": {"start": args.train_start, "end": args.train_end},
    "val_date_range": {"start": args.val_start, "end": args.val_end},
    "test_date_range": {"start": args.test_start, "end": args.test_end},
        "feature_order": [f if " * " not in f else f.replace(" ", "_").replace("*", "x") for f in FEATURES],
    "g1f5": {
      "weights": model5.coef_[0].tolist() if model5 else None,
      "bias": float(model5.intercept_[0]) if model5 else None,
      "metrics": metrics5,
    } if model5 else None,
    "g1f10": {
      "weights": model10.coef_[0].tolist() if model10 else None,
      "bias": float(model10.intercept_[0]) if model10 else None,
      "metrics": metrics10,
    } if model10 else None,
    "calibration": {
      "method": "hybrid",  # Beta for G1F5, Platt for G1F10
      "g1f5": {
        "method": "beta",
        "params": beta_g1f5,
      } if beta_g1f5 else None,
      "g1f10": {
        "method": "platt",
        "params": platt_g1f10,
      } if platt_g1f10 else None,
    },
  }

  with open(args.out, "w", encoding="utf-8") as f:
    json.dump(artifact, f, indent=2)

  print(f"\n✅ Wrote artifact: {args.out}")
  if model5:
    print(f"📊 G1F5 metrics: {json.dumps(metrics5, indent=2)}")
  if model10:
    print(f"📊 G1F10 metrics: {json.dumps(metrics10, indent=2)}")


if __name__ == "__main__":
  main()


