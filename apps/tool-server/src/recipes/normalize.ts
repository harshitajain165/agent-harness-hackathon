import type { Post, PostMetrics } from './contract.ts';

/**
 * Bright Data's raw post payloads -> the `Post` the UI renders.
 *
 * Worth doing aggressively: a raw LinkedIn post is ~50KB, and roughly 90% of it
 * is other people's comments, "more relevant posts", and the body repeated in
 * three formats. Passing that around would bloat the agent's context and give the
 * UI thirty fields it doesn't want.
 */

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const arr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);

function metricsFor(text: string, hashtags: string[], media: string[], e: { total: number }, followers?: number): PostMetrics {
  return {
    words: text.trim() ? text.trim().split(/\s+/).length : 0,
    hookLength: (text.split('\n')[0] ?? '').length,
    hasMedia: media.length > 0,
    hashtagCount: hashtags.length,
    engagementRate: followers && followers > 0 ? Number(((e.total / followers) * 1000).toFixed(2)) : undefined,
  };
}

export function normalizeLinkedInPost(raw: Record<string, unknown>): Post {
  const text = str(raw.post_text) || str(raw.original_post_text);
  const hashtags = arr(raw.hashtags);
  const media = arr(raw.images);
  const likes = num(raw.num_likes);
  const comments = num(raw.num_comments);
  const engagement = { likes, comments, total: likes + comments };
  const followers = num(raw.user_followers) || undefined;

  return {
    id: str(raw.id),
    platform: 'linkedin',
    url: str(raw.url),
    author: {
      name: str(raw.user_name),
      handle: str(raw.user_id),
      avatarUrl: str(raw.author_profile_pic) || undefined,
      followers,
    },
    postedAt: str(raw.date_posted),
    text,
    hook: (text.split('\n')[0] ?? '').trim(),
    hashtags,
    media,
    engagement,
    metrics: metricsFor(text, hashtags, media, engagement, followers),
  };
}

export function normalizeXPost(raw: Record<string, unknown>): Post {
  const text = str(raw.description) || str(raw.text);
  const hashtags = arr(raw.hashtags);
  const media = [...arr(raw.photos), ...arr(raw.videos)];
  const likes = num(raw.likes);
  const comments = num(raw.replies);
  const reposts = num(raw.reposts);
  const engagement = { likes, comments, reposts, total: likes + comments + reposts };
  const followers = num(raw.followers) || undefined;

  return {
    id: str(raw.id),
    platform: 'x',
    url: str(raw.url),
    author: {
      name: str(raw.user_posted) || str(raw.name),
      handle: str(raw.user_posted),
      avatarUrl: str(raw.profile_image_link) || undefined,
      followers,
    },
    postedAt: str(raw.date_posted),
    text,
    hook: (text.split('\n')[0] ?? '').trim(),
    hashtags,
    media,
    engagement,
    metrics: metricsFor(text, hashtags, media, engagement, followers),
  };
}
