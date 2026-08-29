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
    scrapedAt: str(raw.timestamp) || undefined,
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
  // X returns no hashtags field — they only exist inline in the body.
  const hashtags = Array.from(text.matchAll(/#(\w+)/g)).map((m) => `#${m[1]}`);
  // `videos` is a list of objects ({ video_url, ... }), not plain strings.
  const videos = Array.isArray(raw.videos)
    ? (raw.videos as Record<string, unknown>[]).map((v) => str(v?.video_url)).filter(Boolean)
    : [];
  const media = [...arr(raw.photos), ...videos];

  const likes = num(raw.likes);
  const comments = num(raw.replies);
  const reposts = num(raw.reposts);
  const views = num(raw.views) || undefined;
  const bookmarks = num(raw.bookmarks) || undefined;
  const engagement = { likes, comments, reposts, views, bookmarks, total: likes + comments + reposts };
  const followers = num(raw.followers) || undefined;

  const post: Post = {
    id: str(raw.id),
    platform: 'x',
    url: str(raw.url),
    author: {
      name: str(raw.name) || str(raw.user_posted),
      handle: str(raw.user_posted),
      avatarUrl: str(raw.profile_image_link) || undefined,
      followers,
    },
    postedAt: str(raw.date_posted),
    scrapedAt: str(raw.timestamp) || undefined,
    text,
    hook: (text.split('\n')[0] ?? '').trim(),
    hashtags,
    media,
    engagement,
    metrics: metricsFor(text, hashtags, media, engagement, followers),
  };
  if (views && views > 0) post.metrics.viewRate = Number(((engagement.total / views) * 100).toFixed(2));
  return post;
}

/** How old a reading is, for the UI to display. Bright Data gives point-in-time data, not a feed. */
export function freshness(post: { scrapedAt?: string }, now = new Date()): string {
  if (!post.scrapedAt) return 'unknown';
  const mins = Math.floor((now.getTime() - new Date(post.scrapedAt).getTime()) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
