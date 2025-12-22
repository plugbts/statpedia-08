/**
 * Calibration layer for Icura predictions.
 * Uses Platt Scaling (logistic calibration) to fix probability shift.
 */

import type { EarlyGoalMlArtifact } from "./ml-artifact";

/**
 * Apply Isotonic Regression calibration (piecewise linear interpolation).
 * Uses stored thresholds to map raw probabilities to calibrated probabilities.
 */
function applyIsotonic(
  rawProb: number,
  params: {
    X_min: number;
    X_max: number;
    f_min: number;
    f_max: number;
    X_thresholds?: number[];
    y_thresholds?: number[];
  },
): number {
  const p = Math.max(0, Math.min(1, rawProb));

  // Clamp to range
  if (p <= params.X_min) return params.f_min;
  if (p >= params.X_max) return params.f_max;

  // If we have thresholds, use piecewise linear interpolation
  if (params.X_thresholds && params.y_thresholds && params.X_thresholds.length > 0) {
    // Find the segment containing p
    for (let i = 0; i < params.X_thresholds.length - 1; i++) {
      if (p >= params.X_thresholds[i] && p <= params.X_thresholds[i + 1]) {
        // Linear interpolation
        const x0 = params.X_thresholds[i];
        const x1 = params.X_thresholds[i + 1];
        const y0 = params.y_thresholds[i];
        const y1 = params.y_thresholds[i + 1];
        const t = (p - x0) / (x1 - x0);
        return y0 + t * (y1 - y0);
      }
    }
  }

  // Fallback: linear interpolation between min and max
  const t = (p - params.X_min) / (params.X_max - params.X_min);
  return params.f_min + t * (params.f_max - params.f_min);
}

/**
 * Apply Beta Calibration to a probability.
 * Formula: P_calibrated = sigmoid(a * log(p_raw) + b * log(1 - p_raw) + c)
 * More flexible than Platt Scaling, handles rare events and compressed probabilities better.
 */
function applyBeta(rawProb: number, params: { a: number; b: number; c: number }): number {
  const p = Math.max(1e-7, Math.min(1 - 1e-7, rawProb));
  const logP = Math.log(p);
  const logOneMinusP = Math.log(1 - p);
  const logitCal = params.a * logP + params.b * logOneMinusP + params.c;
  const calibrated = 1 / (1 + Math.exp(-logitCal));
  return Math.max(1e-7, Math.min(1 - 1e-7, calibrated));
}

/**
 * Apply Platt Scaling calibration to a probability.
 * Formula: P_calibrated = 1 / (1 + exp(A * logit(P_raw) + B))
 */
function applyPlatt(rawProb: number, params: { A: number; B: number }): number {
  const p = Math.max(1e-7, Math.min(1 - 1e-7, rawProb));
  const logitRaw = Math.log(p / (1 - p));
  const logitCal = params.A * logitRaw + params.B;
  const calibrated = 1 / (1 + Math.exp(-logitCal));
  return Math.max(1e-7, Math.min(1 - 1e-7, calibrated));
}

/**
 * Apply calibration to a probability.
 * Uses Beta Calibration for G1F5, Platt Scaling for G1F10.
 *
 * @param rawProb - Raw probability from model (0-1)
 * @param modelType - "g1f5" or "g1f10"
 * @param artifact - ML artifact containing calibration parameters
 */
export function calibrateProbability(
  rawProb: number,
  modelType: "g1f5" | "g1f10",
  artifact?: EarlyGoalMlArtifact | null,
): number {
  const p = Math.max(1e-7, Math.min(1 - 1e-7, rawProb));

  if (!artifact?.calibration) {
    return p;
  }

  const calib = modelType === "g1f5" ? artifact.calibration.g1f5 : artifact.calibration.g1f10;

  if (!calib?.params) {
    return p;
  }

  // Apply appropriate calibration method
  if (
    calib.method === "beta" &&
    calib.params.a !== undefined &&
    calib.params.b !== undefined &&
    calib.params.c !== undefined
  ) {
    return applyBeta(p, { a: calib.params.a, b: calib.params.b, c: calib.params.c });
  } else if (calib.method === "isotonic" && calib.params.X_min !== undefined) {
    return applyIsotonic(p, calib.params as any);
  } else if (
    calib.method === "platt" &&
    calib.params.A !== undefined &&
    calib.params.B !== undefined
  ) {
    return applyPlatt(p, { A: calib.params.A, B: calib.params.B });
  }

  // Fallback: return raw probability
  return p;
}

/**
 * Apply temperature scaling for calibration.
 * Lower temperature = more conservative (less confident).
 */
export function temperatureScale(prob: number, temperature: number = 1.0): number {
  if (temperature <= 0) return prob;
  const logit = Math.log(prob / (1 - prob));
  const scaledLogit = logit / temperature;
  return 1 / (1 + Math.exp(-scaledLogit));
}
