import { supabase } from './supabaseClient'

async function getOrCreateTagId(name: string): Promise<{ id: string | null; error: string | null }> {
  const { data: existing } = await supabase.from('tags').select('id').eq('name', name).maybeSingle()
  if (existing) return { id: existing.id, error: null }

  const { data: created, error } = await supabase.from('tags').insert({ name }).select('id').single()
  if (!error) return { id: created.id, error: null }

  // Race: someone else created the same tag between our lookup and insert -
  // look it up again instead of treating the unique-constraint hit as a failure.
  const { data: retry } = await supabase.from('tags').select('id').eq('name', name).maybeSingle()
  if (retry) return { id: retry.id, error: null }

  return { id: null, error: error.message }
}

export async function attachTagsToPost(postId: string, tagNames: string[]): Promise<{ error: string | null }> {
  // Dedupe defensively (the caller already does this too) and resolve them
  // concurrently - each lookup/insert is independent of the others.
  const uniqueNames = [...new Set(tagNames)]
  const results = await Promise.all(
    uniqueNames.map(async (name) => ({ name, ...(await getOrCreateTagId(name)) })),
  )

  const tagIds: string[] = []
  for (const result of results) {
    if (!result.id) return { error: `Couldn't save tag "${result.name}": ${result.error}` }
    tagIds.push(result.id)
  }

  if (tagIds.length === 0) return { error: null }

  const { error } = await supabase.from('post_tags').insert(tagIds.map((tagId) => ({ post_id: postId, tag_id: tagId })))
  return { error: error?.message ?? null }
}

export async function getTagsForPost(postId: string): Promise<string[]> {
  const { data: postTagRows } = await supabase.from('post_tags').select('tag_id').eq('post_id', postId)

  const tagIds = (postTagRows ?? []).map((row) => row.tag_id)
  if (tagIds.length === 0) return []

  const { data: tagRows } = await supabase.from('tags').select('name').in('id', tagIds)
  return (tagRows ?? []).map((row) => row.name).sort()
}
