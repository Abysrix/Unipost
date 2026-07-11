export type ModelId = "tencent/hy3:free";

export interface AIModel {
  id: ModelId;
  name: string;
  description: string;
}

/** Selectable models (ModelSelector maps to OpenRouter). */
export const AI_MODELS: AIModel[] = [
  { id: "tencent/hy3:free", name: "Hunyuan 3 (Free)", description: "OpenRouter - Tencent Hunyuan 3" },
  { id: "nvidia/nemotron-3-super-120b-a12b:free", name: "Nemotron 3 Super 120B (Free)", description: "OpenRouter - NVIDIA Nemotron 3 Super 120B" },
];

export const DEFAULT_MODEL: ModelId = "tencent/hy3:free";

export function isModelId(v: string): v is ModelId {
  return AI_MODELS.some((m) => m.id === v);
}
