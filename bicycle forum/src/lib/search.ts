import { supabase } from './supabaseClient'
import { getPublicProfiles } from './publicProfiles'
import type { PostSummary } from './posts'

export type SortOption = 'recent' | 'score'

export interface ParsedQuery {
  words: string[]
  tags: string[]
}

// "#gravel #mountain_biking maintenance" -> { words: ['maintenance'], tags: ['gravel', 'mountain biking'] }.
// Underscores stand in for the spaces a multi-word tag can't otherwise
// express in a space-delimited search box; lowercasing mirrors the username
// field at registration.
export function parseSearchQuery(raw: string): ParsedQuery {
  const words: string[] = []
  const tags: string[] = []

  for (const token of raw.trim().split(/\s+/).filter(Boolean)) {
    if (token.startsWith('#')) {
      const tag = token.slice(1).toLowerCase().replace(/_/g, ' ').trim()
      if (tag) tags.push(tag)
    } else {
      words.push(token)
    }
  }

  return { words, tags }
}

export const SEARCH_PAGE_SIZE = 20

export interface SearchPostsResult {
  posts: PostSummary[]
  totalCount: number
}

export async function searchPosts(query: ParsedQuery, sort: SortOption, page: number): Promise<SearchPostsResult> {
  const { data, error } = await supabase.rpc('search_posts', {
    search_words: query.words,
    tag_names: query.tags,
    sort_by: sort,
    page_limit: SEARCH_PAGE_SIZE,
    page_offset: page * SEARCH_PAGE_SIZE,
  })

  if (error || !data || data.length === 0) return { posts: [], totalCount: 0 }

  const authorIds = [...new Set(data.map((row) => row.author_id))]
  const profiles = await getPublicProfiles(authorIds)

  const posts: PostSummary[] = data.map((row) => ({
    id: row.id,
    title: row.title,
    author: profiles.get(row.author_id)?.username ?? 'Unknown',
    commentCount: row.comment_count,
    createdAt: row.created_at,
    score: row.like_count - row.dislike_count,
  }))

  return { posts, totalCount: data[0].total_count }
}
