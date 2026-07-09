export type ModelId = "gemini-1.5-flash" | "gemini-1.5-pro";

export interface AIModel {
  id: ModelId;
  name: string;
  description: string;
}

/** Selectable models (ModelSelector is future-ready; both map to Gemini). */
export const AI_MODELS: AIModel[] = [
  { id: "gemini-1.5-flash", name: "Gemini Flash", description: "Fast — great for most content" },
  { id: "gemini-1.5-pro", name: "Gemini Pro", description: "Deeper reasoning — long-form" },
];

export const DEFAULT_MODEL: ModelId = "gemini-1.5-flash";

export function isModelId(v: string): v is ModelId {
  return AI_MODELS.some((m) => m.id === v);
}
