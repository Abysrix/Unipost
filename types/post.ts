import type { PlatformId } from "@/config/platforms";

export type PostStatus = "draft" | "scheduled" | "published" | "archived";
export type PostVisibility = "public" | "private" | "unlisted";
export type MediaType = "image" | "video";

export interface PostMedia {
  path: string; // storage path: {user_id}/{post_id}/{file}
  url: string;
  type: MediaType;
  name: string;
  size: number;
}

/** A row of `public.posts`. */
export interface Post {
  id: string;
  user_id: string;
  title: string;
  content: string;
  status: PostStatus;
  platforms: PlatformId[];
  media: PostMedia[];
  visibility: PostVisibility;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

/** The editable slice of a post (what the studio saves). */
export interface PostInput {
  title: string;
  content: string;
  platforms: PlatformId[];
  media: PostMedia[];
  visibility: PostVisibility;
}
