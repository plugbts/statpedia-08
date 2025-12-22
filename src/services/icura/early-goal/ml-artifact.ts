import fs from "node:fs/promises";

export type EarlyGoalMlModel = {
  weights: number[];
  bias: number;
  metrics?: Record<string, unknown>;
};

export type EarlyGoalMlArtifact = {
  type: "logreg" | "logreg_dual";
  version: string;
  trained_at_iso: string;
  feature_order: string[];
  // Feature scaling (StandardScaler)
  scaler?: {
    mean: number[];
    scale: number[];
  };
  // Legacy single model format
  weights?: number[];
  bias?: number;
  // Dual model format (G1F5 + G1F10)
  g1f5?: EarlyGoalMlModel | null;
  g1f10?: EarlyGoalMlModel | null;
  calibration?: {
    method: "platt" | "isotonic" | "hybrid" | "none";
    g1f5?: {
      method: "isotonic" | "platt" | "beta";
      params?: {
        // Isotonic parameters
        X_min?: number;
        X_max?: number;
        f_min?: number;
        f_max?: number;
        X_thresholds?: number[];
        y_thresholds?: number[];
        // Platt parameters
        A?: number;
        B?: number;
        // Beta calibration parameters
        a?: number;
        b?: number;
        c?: number;
      } | null;
    } | null;
    g1f10?: {
      method: "isotonic" | "platt" | "beta";
      params?: {
        // Isotonic parameters
        X_min?: number;
        X_max?: number;
        f_min?: number;
        f_max?: number;
        X_thresholds?: number[];
        y_thresholds?: number[];
        // Platt parameters
        A?: number;
        B?: number;
        // Beta calibration parameters
        a?: number;
        b?: number;
        c?: number;
      } | null;
    } | null;
    params?: Record<string, unknown>;
  };
};

let cached: EarlyGoalMlArtifact | null = null;

export async function loadEarlyGoalMlArtifact(path: string): Promise<EarlyGoalMlArtifact> {
  const raw = await fs.readFile(path, "utf8");
  const json = JSON.parse(raw) as EarlyGoalMlArtifact;
  if (json.type !== "logreg" && json.type !== "logreg_dual") {
    throw new Error("Unsupported ML artifact type");
  }

  // Validate dual model format
  if (json.type === "logreg_dual") {
    if (!json.g1f5 && !json.g1f10) {
      throw new Error("Dual model artifact must have at least one model (g1f5 or g1f10)");
    }
    if (
      json.g1f5 &&
      (!Array.isArray(json.g1f5.weights) || json.g1f5.weights.length !== json.feature_order.length)
    ) {
      throw new Error("G1F5 model: weights length mismatch");
    }
    if (
      json.g1f10 &&
      (!Array.isArray(json.g1f10.weights) ||
        json.g1f10.weights.length !== json.feature_order.length)
    ) {
      throw new Error("G1F10 model: weights length mismatch");
    }
  } else {
    // Legacy single model format
    if (!Array.isArray(json.feature_order) || !Array.isArray(json.weights)) {
      throw new Error("Invalid ML artifact format");
    }
    if (json.feature_order.length !== json.weights.length) {
      throw new Error("ML artifact: feature_order and weights length mismatch");
    }
  }

  cached = json;
  return json;
}

export async function getEarlyGoalMlArtifact(): Promise<EarlyGoalMlArtifact | null> {
  if (cached) return cached;
  const path = process.env.ICURA_EARLY_GOAL_ML_ARTIFACT;
  if (!path) return null;
  try {
    return await loadEarlyGoalMlArtifact(path);
  } catch (e) {
    // Soft-fail: engine can fallback to Poisson-only
    console.warn("[IcuraML] Failed to load artifact:", e);
    return null;
  }
}

export function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

export function scaleFeatures(
  features: number[],
  scaler?: { mean: number[]; scale: number[] },
): number[] {
  if (!scaler || features.length !== scaler.mean.length) {
    return features; // No scaling if scaler not available or mismatch
  }
  return features.map((val, i) => (val - scaler.mean[i]) / scaler.scale[i]);
}

export async function predictMlP10FromRow(row: Record<string, unknown>): Promise<number | null> {
  const art = await getEarlyGoalMlArtifact();
  if (!art) return null;

  // Use G1F10 model if available (dual format), otherwise fallback to legacy single model
  const model =
    art.type === "logreg_dual"
      ? art.g1f10
      : art.weights && art.bias !== undefined
        ? { weights: art.weights, bias: art.bias }
        : null;

  if (!model) return null;

  // Extract features in order
  const features: number[] = [];
  for (let i = 0; i < art.feature_order.length; i++) {
    const k = art.feature_order[i];
    const v = Number((row as any)[k]);
    features.push(Number.isFinite(v) ? v : 0.0);
  }

  // Scale features if scaler is available
  const scaledFeatures = scaleFeatures(features, art.scaler);

  // Compute prediction
  let z = model.bias;
  for (let i = 0; i < scaledFeatures.length; i++) {
    z += scaledFeatures[i] * model.weights[i];
  }

  return sigmoid(z);
}

export async function predictMlP5FromRow(row: Record<string, unknown>): Promise<number | null> {
  const art = await getEarlyGoalMlArtifact();
  if (!art || art.type !== "logreg_dual" || !art.g1f5) return null;

  const model = art.g1f5;

  // Extract features in order
  const features: number[] = [];
  for (let i = 0; i < art.feature_order.length; i++) {
    const k = art.feature_order[i];
    const v = Number((row as any)[k]);
    features.push(Number.isFinite(v) ? v : 0.0);
  }

  // Scale features if scaler is available
  const scaledFeatures = scaleFeatures(features, art.scaler);

  // Compute prediction
  let z = model.bias;
  for (let i = 0; i < scaledFeatures.length; i++) {
    z += scaledFeatures[i] * model.weights[i];
  }

  return sigmoid(z);
}
