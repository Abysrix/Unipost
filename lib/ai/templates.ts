import type { PlatformId } from "@/config/platforms";

/** A starter template — clicking one pre-fills the chat prompt (Phase 4). */
export interface AITemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  platform?: PlatformId;
  /** Prompt text with a `[topic]` placeholder the user fills in. */
  prompt: string;
}

export const AI_TEMPLATES: AITemplate[] = [
  { id: "ig-reel", name: "Instagram Reel", description: "30-second reel script + hook", category: "Instagram", platform: "instagram",
    prompt: "Write a 30-second Instagram Reel script about [topic]. Start with a strong 3-second hook, then 3 quick value points, and end with a CTA. Add on-screen text suggestions." },
  { id: "carousel", name: "Carousel", description: "Slide-by-slide carousel", category: "Instagram", platform: "instagram",
    prompt: "Create a 6-slide Instagram carousel about [topic]. Give each slide a punchy headline and one line of body text. Slide 1 is the hook, slide 6 is the CTA." },
  { id: "li-post", name: "LinkedIn Post", description: "Story-driven professional post", category: "LinkedIn", platform: "linkedin",
    prompt: "Write a LinkedIn post about [topic]. Open with a scroll-stopping first line, tell a short story or insight, use short line breaks, and end with a question to drive comments." },
  { id: "x-thread", name: "Twitter/X Thread", description: "5–7 tweet thread", category: "X", platform: "x",
    prompt: "Write a 6-tweet X thread about [topic]. Tweet 1 is a bold hook. Each following tweet is one crisp idea. End with a takeaway + soft CTA. Number each tweet." },
  { id: "launch", name: "Product Launch", description: "Announcement + hype", category: "Marketing",
    prompt: "Write a launch announcement for [product]. Convey excitement, the core benefit, who it's for, and a clear CTA. Give me one version for Instagram and one for LinkedIn." },
  { id: "announcement", name: "Announcement", description: "Clear, exciting update", category: "Marketing",
    prompt: "Write a short, exciting announcement post about [news]. Keep it clear, human, and celebratory. Include one line of context and a CTA." },
  { id: "educational", name: "Educational Post", description: "Teach one idea well", category: "Growth",
    prompt: "Write an educational post that teaches [topic] in a simple, memorable way. Use a hook, 3 clear takeaways, and a one-line summary." },
  { id: "story-script", name: "Story Script", description: "Story sequence outline", category: "Instagram",
    prompt: "Outline a 5-frame Instagram Story sequence about [topic]. For each frame give the visual idea, on-screen text, and any sticker/poll suggestion." },
  { id: "brand-collab", name: "Brand Collaboration", description: "Sponsored post that feels real", category: "Monetize",
    prompt: "Write a sponsored post for [brand] about [product] that feels authentic and on-brand for my audience. Disclose the partnership naturally and include the brand's key message." },
  { id: "personal-brand", name: "Personal Branding", description: "Build authority + trust", category: "Growth",
    prompt: "Write a personal-branding post about [lesson or experience] that builds authority and trust. Be vulnerable and specific, and end with an insight my audience can use." },
];

export const TEMPLATE_CATEGORIES = Array.from(new Set(AI_TEMPLATES.map((t) => t.category)));
