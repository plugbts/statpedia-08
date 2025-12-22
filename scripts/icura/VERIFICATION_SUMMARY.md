# Icura Model Verification Summary

## Data Source Verification

### MoneyPuck Data
- **Season**: 2023-2024
- **Games**: 1,406 games (IDs: 20001 to 30417)
- **Time Format**: 
  - `period` column: Period number (1, 2, 3, etc.)
  - `time` column: Time in seconds (e.g., 61 = 1:01)
  - `game_time_seconds` computed as: `(period - 1) * 20 * 60 + period_time_seconds`

### Label Computation
- **Method**: Using FIRST goal only (not ANY goal)
- **G1F5**: First goal occurs at `game_time_seconds <= 300` (5 minutes)
- **G1F10**: First goal occurs at `game_time_seconds <= 600` (10 minutes)

## Actual Distribution (MoneyPuck 2023-2024)

### Current Calculation (Period-based)
- **G1F5**: 776/1406 = **55.2%** (expected: 28-30%)
- **G1F10**: 1147/1406 = **81.6%** (expected: 58%)

### Issue Identified
The MoneyPuck data shows a much higher rate of early goals than expected. This could indicate:
1. **Time calculation is correct** but MoneyPuck data has different characteristics
2. **Time calculation might be wrong** - need to verify if `period_time_seconds` is already cumulative
3. **Expected rates are from a different source** or definition

## Model Performance (With Balanced Metrics)

### G1F5 (Goal in First 5 Minutes)
- **Brier Score**: 0.2467 (below random baseline of 0.25)
- **Accuracy**: 55.2%
- **Precision**: 55.2% (TP: 776, FP: 630)
- **Recall**: 100.0% (TP: 776, FN: 0)
- **F1 Score**: 71.1%
- **Issue**: Model predicts "yes" for 100% of games (always predicting majority class)

### G1F10 (Goal in First 10 Minutes)
- **Brier Score**: 0.1440 (below random baseline of 0.25)
- **Accuracy**: 81.8%
- **Precision**: 81.8% (TP: 1147, FP: 256)
- **Recall**: 100.0% (TP: 1147, FN: 0)
- **F1 Score**: 90.0%
- **Issue**: Model predicts "yes" for 99.8% of games (always predicting majority class)

## Root Cause Analysis

### The "Too Good to Be True" Performance
The high accuracy (81.8% for G1F10) is **NOT** a bug - it's the model correctly predicting the majority class:
- Actual G1F10 rate: 81.6%
- Model predicts "yes" for 99.8% of games
- Accuracy: 81.8% (mostly correct because actual rate is 81.6%)

### The Real Problem
1. **Class Imbalance**: The dataset has 81.6% positive class for G1F10
2. **Model Overfitting to Majority**: Model learned to always predict "yes"
3. **Evaluation Metric**: Accuracy is misleading with imbalanced classes

## Next Steps

1. **Verify Time Calculation**: Check if MoneyPuck's `period_time_seconds` is already cumulative game time
2. **Re-evaluate with Balanced Dataset**: Use stratified sampling or class weights
3. **Use Proper Metrics**: Focus on F1 score, precision, recall instead of accuracy
4. **Check Expected Rates Source**: Verify if expected rates (28-30%, 58%) are from a different definition or source

## Recommendations

1. **Fix Class Imbalance**: 
   - Use class weights in training
   - Use stratified train/test splits
   - Consider SMOTE or other balancing techniques

2. **Improve Model Calibration**:
   - The model is overconfident (predicts >0.5 for almost all games)
   - Need better calibration to distinguish between high/low probability games

3. **Verify Data Quality**:
   - Double-check time calculation
   - Verify MoneyPuck data source and format
   - Compare with NHL API data if available

