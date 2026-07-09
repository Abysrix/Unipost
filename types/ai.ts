export type MessageRole = "user" | "assistant" | "system";

export interface AIConversation {
  id: string;
  user_id: string;
  title: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
  last_message_at: string;
}

export interface AIMessage {
  id: string;
  conversation_id: string;
  user_id: string;
  role: MessageRole;
  content: string;
  created_at: string;
}

export interface SavedPrompt {
  id: string;
  user_id: string;
  title: string;
  body: string;
  category: string;
  favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface AIGeneration {
  id: string;
  user_id: string;
  action: string;
  input: Record<string, unknown>;
  output: string;
  favorite: boolean;
  duration_ms: number | null;
  created_at: string;
}

/** Lightweight message shape passed to the AI service. */
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
