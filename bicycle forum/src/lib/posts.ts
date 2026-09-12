import { supabase } from './supabaseClient'

export interface PostSummary {
  id: string
  title: string
  author: string
  commentCount: number
  createdAt: string
}

export interface PlatformStats {
  userCount: number
  postCount: number
}

interface PostRow {
  id: string
  title: string
  created_at: string
  comment_count: number
  author_id: string
}

export async function getPlatformStats(): Promise<PlatformStats> {
  const { data, error } = await supabase.from('platform_stats').select('user_count, post_count').single()
  if (error || !data) return { userCount: 0, postCount: 0 }
  return { userCount: data.user_count ?? 0, postCount: data.post_count ?? 0 }
}

async function getPosts(orderBy: 'comment_count' | 'created_at', limit: number): Promise<PostSummary[]> {
  const { data: posts, error } = await supabase
    .from('posts')
    .select('id, title, created_at, comment_count, author_id')
    .order(orderBy, { ascending: false })
    .limit(limit)

  if (error || !posts || posts.length === 0) return []

  // profiles.username/email aren't publicly readable (see migration 08), so
  // author display names come from the public_profiles() function, which
  // only exposes the safe, non-sensitive columns.
  const authorIds = [...new Set(posts.map((post) => post.author_id))]
  const { data: authors } = await supabase.rpc('public_profiles').in('id', authorIds)

  const authorNameById = new Map((authors ?? []).map((author) => [author.id, author.username]))

  return (posts as PostRow[]).map((post) => ({
    id: post.id,
    title: post.title,
    author: authorNameById.get(post.author_id) ?? 'Unknown',
    commentCount: post.comment_count,
    createdAt: post.created_at,
  }))
}

export function getMostCommentedPosts(limit = 10): Promise<PostSummary[]> {
  return getPosts('comment_count', limit)
}

export function getMostRecentPosts(limit = 10): Promise<PostSummary[]> {
  return getPosts('created_at', limit)
}

// The caller already knows their own username, so this skips the
// public_profiles() round trip that getPosts() needs for other people's posts.
export async function getPostsByAuthor(authorId: string, authorUsername: string): Promise<PostSummary[]> {
  const { data: posts, error } = await supabase
    .from('posts')
    .select('id, title, created_at, comment_count, author_id')
    .eq('author_id', authorId)
    .order('created_at', { ascending: false })

  if (error || !posts) return []

  return (posts as PostRow[]).map((post) => ({
    id: post.id,
    title: post.title,
    author: authorUsername,
    commentCount: post.comment_count,
    createdAt: post.created_at,
  }))
}

export async function createPost(authorId: string, title: string, content: string) {
  return supabase.from('posts').insert({ author_id: authorId, title, content }).select('id').single()
}
