import { supabase } from './supabaseClient'
import { getPublicProfiles } from './publicProfiles'
import type { PublicProfile } from './publicProfiles'
import { getTagsForPost } from './tags'

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
  updatedAt: string
  upvoteCount: number
  downvoteCount: number
  author: PublicProfile
  authorBadges: Badge[]
  tags: string[]
  myVote: 1 | -1 | null
}

export interface CommentItem {
  id: string
  content: string
  createdAt: string
  updatedAt: string
  author: PublicProfile
  badges: Badge[]
  parentCommentId: string | null
}

const UNKNOWN_AUTHOR: PublicProfile = {
  id: '',
  username: 'unknown',
  firstName: '',
  lastName: '',
  avatarUrl: null,
  reputation: 0,
}

async function getBadgesForUsers(userIds: string[]): Promise<Map<string, Badge[]>> {
  const map = new Map<string, Badge[]>()
  if (userIds.length === 0) return map

  const { data: userBadgeRows } = await supabase.from('user_badges').select('user_id, badge_id').in('user_id', userIds)

  const badgeIds = [...new Set((userBadgeRows ?? []).map((row) => row.badge_id))]
  if (badgeIds.length === 0) return map

  const { data: badgeRows } = await supabase.from('badges').select('id, code, name, description').in('id', badgeIds)
  const badgeById = new Map((badgeRows ?? []).map((badge) => [badge.id, badge]))

  for (const row of userBadgeRows ?? []) {
    const badge = badgeById.get(row.badge_id)
    if (!badge) continue
    const list = map.get(row.user_id) ?? []
    list.push(badge)
    map.set(row.user_id, list)
  }

  return map
}

export async function getPostDetail(postId: string, viewerId: string | null): Promise<PostDetail | null> {
  const { data: post, error } = await supabase
    .from('posts')
    .select('id, title, content, created_at, updated_at, like_count, dislike_count, author_id')
    .eq('id', postId)
    .single()

  if (error || !post) return null

  // Independent of each other - fetch them concurrently rather than in
  // series, since each one is its own network round trip.
  const [profiles, badgesByUser, tags, voteRow] = await Promise.all([
    getPublicProfiles([post.author_id]),
    getBadgesForUsers([post.author_id]),
    getTagsForPost(postId),
    viewerId
      ? supabase.from('votes').select('value').eq('post_id', postId).eq('voter_id', viewerId).maybeSingle()
      : Promise.resolve(null),
  ])

  // A missing profile here means the author lookup failed transiently (or
  // the profile is otherwise gone) - not that the post itself is missing, so
  // fall back to a placeholder instead of reporting the whole post as 404,
  // same as getComments() below does for comment authors.
  const author = profiles.get(post.author_id) ?? { ...UNKNOWN_AUTHOR, id: post.author_id }

  const myVote = (voteRow?.data?.value as 1 | -1 | undefined) ?? null

  return {
    id: post.id,
    title: post.title,
    content: post.content,
    createdAt: post.created_at,
    updatedAt: post.updated_at,
    upvoteCount: post.like_count,
    downvoteCount: post.dislike_count,
    author,
    authorBadges: badgesByUser.get(post.author_id) ?? [],
    tags,
    myVote,
  }
}

export async function getComments(postId: string): Promise<CommentItem[]> {
  const { data: comments, error } = await supabase
    .from('comments')
    .select('id, content, created_at, updated_at, author_id, parent_comment_id')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })

  if (error || !comments) return []

  const authorIds = [...new Set(comments.map((comment) => comment.author_id))]
  const [profiles, badgesByUser] = await Promise.all([getPublicProfiles(authorIds), getBadgesForUsers(authorIds)])

  return comments.map((comment) => ({
    id: comment.id,
    content: comment.content,
    createdAt: comment.created_at,
    updatedAt: comment.updated_at,
    author: profiles.get(comment.author_id) ?? { ...UNKNOWN_AUTHOR, id: comment.author_id },
    badges: badgesByUser.get(comment.author_id) ?? [],
    parentCommentId: comment.parent_comment_id,
  }))
}

export function createComment(postId: string, authorId: string, content: string, parentCommentId: string | null = null) {
  return supabase.from('comments').insert({ post_id: postId, author_id: authorId, content, parent_comment_id: parentCommentId })
}

export function updateComment(commentId: string, content: string) {
  return supabase.from('comments').update({ content }).eq('id', commentId)
}

export function deleteComment(commentId: string) {
  return supabase.from('comments').delete().eq('id', commentId)
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
