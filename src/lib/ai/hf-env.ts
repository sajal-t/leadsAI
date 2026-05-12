import type { InferenceProviderOrPolicy } from "@huggingface/inference";

export function getHfModelInitial(): string {
  return (process.env.HF_MODEL_INITIAL || process.env.HF_MODEL || "").trim();
}

export function getHfModelEdit(): string {
  return (process.env.HF_MODEL_EDIT || process.env.HF_MODEL || "").trim();
}

export function getHfProviderInitial(): InferenceProviderOrPolicy {
  const v = (process.env.HF_PROVIDER_INITIAL || process.env.HF_PROVIDER || "auto").trim();
  return (v || "auto") as InferenceProviderOrPolicy;
}

export function getHfProviderEdit(): InferenceProviderOrPolicy {
  const v = (process.env.HF_PROVIDER_EDIT || process.env.HF_PROVIDER || "auto").trim();
  return (v || "auto") as InferenceProviderOrPolicy;
}
