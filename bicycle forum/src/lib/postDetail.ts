import { supabase } from './supabaseClient'

export interface PublicProfile {
  id: string
  username: string
  firstName: string
  lastName: string
  avatarUrl: string | null
  reputation: number
}

export interface Badge {
  id: string
  code: string
  name: string
  description: string
}

export interface PostDetail {
  id: string
  title: string
  content: string
  createdAt: string
  upvoteCount: number
  downvoteCount: number
  author: PublicProfile
  authorBadges: Badge[]
  myVote: 1 | -1 | null
}

export interface CommentItem {
  id: string
  content: string
  createdAt: string
  author: PublicProfile
}

async function getPublicProfiles(ids: string[]): Promise<Map<string, PublicProfile>> {
  const map = new Map<string, PublicProfile>()
  if (ids.length === 0) return map

  const { data } = await supabase.rpc('public_profiles').in('id', ids)
  for (const row of data ?? []) {
    map.set(row.id, {
      id: row.id,
      username: row.username,
      firstName: row.first_name,
      lastName: row.last_name,
      avatarUrl: row.avatar_url,
      reputation: row.reputation,
    })
  }
  return map
}

async function getBadgesForUser(userId: string): Promise<Badge[]> {
  const { data: userBadgeRows } = await supabase.from('user_badges').select('badge_id').eq('user_id', userId)

  const badgeIds = (userBadgeRows ?? []).map((row) => row.badge_id)
  if (badgeIds.length === 0) return []

  const { data: badgeRows } = await supabase.from('badges').select('id, code, name, description').in('id', badgeIds)

  return badgeRows ?? []
}

export async function getPostDetail(postId: string, viewerId: string | null): Promise<PostDetail | null> {
  const { data: post, error } = await supabase
    .from('posts')
    .select('id, title, content, created_at, like_count, dislike_count, author_id')
    .eq('id', postId)
    .single()

  if (error || !post) return null

  // Independent of each other - fetch them concurrently rather than in
  // series, since each one is its own network round trip.
  const [profiles, authorBadges, voteRow] = await Promise.all([
    getPublicProfiles([post.author_id]),
    getBadgesForUser(post.author_id),
    viewerId
      ? supabase.from('votes').select('value').eq('post_id', postId).eq('voter_id', viewerId).maybeSingle()
      : Promise.resolve(null),
  ])

  const author = profiles.get(post.author_id)
  if (!author) return null

  const myVote = (voteRow?.data?.value as 1 | -1 | undefined) ?? null

  return {
    id: post.id,
    title: post.title,
    content: post.content,
    createdAt: post.created_at,
    upvoteCount: post.like_count,
    downvoteCount: post.dislike_count,
    author,
    authorBadges,
    myVote,
  }
}

export async function getComments(postId: string): Promise<CommentItem[]> {
  const { data: comments, error } = await supabase
    .from('comments')
    .select('id, content, created_at, author_id')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })

  if (error || !comments) return []

  const authorIds = [...new Set(comments.map((comment) => comment.author_id))]
  const profiles = await getPublicProfiles(authorIds)

  return comments.map((comment) => ({
    id: comment.id,
    content: comment.content,
    createdAt: comment.created_at,
    author: profiles.get(comment.author_id) ?? {
      id: comment.author_id,
      username: 'unknown',
      firstName: '',
      lastName: '',
      avatarUrl: null,
      reputation: 0,
    },
  }))
}

export function createComment(postId: string, authorId: string, content: string) {
  return supabase.from('comments').insert({ post_id: postId, author_id: authorId, content })
}

// One vote per (voter, post): insert if none yet, delete to toggle the same
// value off, or update when switching from up- to downvote (or vice versa).
export async function castVote(postId: string, voterId: string, value: 1 | -1) {
  const { data: existing } = await supabase
    .from('votes')
    .select('id, value')
    .eq('post_id', postId)
    .eq('voter_id', voterId)
    .maybeSingle()

  if (!existing) {
    return supabase.from('votes').insert({ post_id: postId, voter_id: voterId, value })
  }
  if (existing.value === value) {
    return supabase.from('votes').delete().eq('id', existing.id)
  }
  return supabase.from('votes').update({ value }).eq('id', existing.id)
}
