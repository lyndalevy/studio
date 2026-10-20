import manifest from "@/content/social-media.json";
import type { FeedKey, TierKey } from "@/content/social";

/** One post, as written to content/social-media.json by the export script. */
export type Post = {
  id: string;
  kind: "image" | "video" | "carousel";
  /** The image or video file. Carousels use slides instead. */
  src?: string;
  /** Still shown in the grid (a video's first frame, a carousel's first slide). */
  poster: string;
  w: number;
  h: number;
  slides?: { src: string; w: number; h: number }[];
  /** The video has sound worth hearing (the reels). */
  sound?: boolean;
  caption?: string;
};

export const feedPosts = manifest.feeds as Record<FeedKey, Post[]>;
export const tierPosts = manifest.tiers as Record<TierKey, Post[]>;
