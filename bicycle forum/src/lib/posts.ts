import { supabase } from './supabaseClient'
import { getPublicProfiles } from './publicProfiles'
import { getTagsForPost } from './tags'

export interface PostSummary {
  id: string
  title: string
  author: string
  commentCount: number
  createdAt: string
  // Only populated by callers that already have upvote/downvote counts
  // (currently the search/browse results) - undefined elsewhere.
  score?: number
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

export const getPlatformStats = async (): Promise<PlatformStats> => {
  // A SECURITY DEFINER function, not a plain `.from()` select - platform_stats
  // used to be a `security_invoker` view, which meant its profiles count ran
  // under the viewer's own RLS (only their own row is visible to a non-admin),
  // so most users always saw a user count of 0 or 1. See migration 20.
  const { data, error } = await supabase.rpc('platform_stats').single()
  if (error || !data) return { userCount: 0, postCount: 0 }
  return { userCount: data.user_count ?? 0, postCount: data.post_count ?? 0 }
}

const getPosts = async (orderBy: 'comment_count' | 'created_at', limit: number): Promise<PostSummary[]> => {
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
  const profiles = await getPublicProfiles(authorIds)

  return (posts as PostRow[]).map((post) => ({
    id: post.id,
    title: post.title,
    author: profiles.get(post.author_id)?.username ?? 'Unknown',
    commentCount: post.comment_count,
    createdAt: post.created_at,
  }))
}

export const getMostCommentedPosts = (limit = 10): Promise<PostSummary[]> => getPosts('comment_count', limit)

export const getMostRecentPosts = (limit = 10): Promise<PostSummary[]> => getPosts('created_at', limit)

// The caller already knows their own username, so this skips the
// public_profiles() round trip that getPosts() needs for other people's posts.
export const getPostsByAuthor = async (authorId: string, authorUsername: string): Promise<PostSummary[]> => {
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

export const createPost = async (authorId: string, title: string, content: string, imageUrl: string | null = null) => supabase.from('posts').insert({ author_id: authorId, title, content, image_url: imageUrl }).select('id').single()

export interface EditablePost {
  title: string
  content: string
  authorId: string
  tags: string[]
  imageUrl: string | null
}

// Deliberately leaner than getPostDetail() (no author profile, badges, or
// vote lookup) since an edit form only needs the post's own fields plus its
// tags.
export const getPostForEdit = async (postId: string): Promise<EditablePost | null> => {
  const [{ data: post, error }, tags] = await Promise.all([
    supabase.from('posts').select('title, content, author_id, image_url').eq('id', postId).single(),
    getTagsForPost(postId),
  ])

  if (error || !post) return null

  return { title: post.title, content: post.content, authorId: post.author_id, tags, imageUrl: post.image_url }
}

// imageUrl left undefined means "don't touch the post's image"; passing
// null explicitly clears it, and a string replaces it - both go through the
// same UPDATE as title/content so this is one edit, not two.
export const updatePost = (postId: string, title: string, content: string, imageUrl?: string | null) => {
  const patch: { title: string; content: string; image_url?: string | null } = { title, content }
  if (imageUrl !== undefined) patch.image_url = imageUrl
  return supabase.from('posts').update(patch).eq('id', postId)
}

export const deletePost = (postId: string) => supabase.from('posts').delete().eq('id', postId)
