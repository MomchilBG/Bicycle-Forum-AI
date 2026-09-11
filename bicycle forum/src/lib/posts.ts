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

// The generated Database types don't model PostgREST's embedded-resource
// shorthand (`author:profiles(...)`), so the raw row is typed by hand to
// match the select string below.
interface PostRow {
  id: string
  title: string
  created_at: string
  comment_count: number
  author: { username: string | null; first_name: string; last_name: string } | null
}

function displayName(author: PostRow['author']): string {
  if (!author) return 'Unknown'
  return author.username ?? `${author.first_name} ${author.last_name}`
}

function toPostSummary(post: PostRow): PostSummary {
  return {
    id: post.id,
    title: post.title,
    author: displayName(post.author),
    commentCount: post.comment_count,
    createdAt: post.created_at,
  }
}

export async function getPlatformStats(): Promise<PlatformStats> {
  const { data, error } = await supabase.from('platform_stats').select('user_count, post_count').single()
  if (error || !data) return { userCount: 0, postCount: 0 }
  return { userCount: data.user_count ?? 0, postCount: data.post_count ?? 0 }
}

async function getPosts(orderBy: 'comment_count' | 'created_at', limit: number): Promise<PostSummary[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('id, title, created_at, comment_count, author:profiles(username, first_name, last_name)')
    .order(orderBy, { ascending: false })
    .limit(limit)

  if (error || !data) return []
  return (data as unknown as PostRow[]).map(toPostSummary)
}

export function getMostCommentedPosts(limit = 10): Promise<PostSummary[]> {
  return getPosts('comment_count', limit)
}

export function getMostRecentPosts(limit = 10): Promise<PostSummary[]> {
  return getPosts('created_at', limit)
}
