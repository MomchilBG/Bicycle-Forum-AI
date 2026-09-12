import { supabase } from './supabaseClient'

export interface PublicProfile {
  id: string
  username: string
  firstName: string
  lastName: string
  avatarUrl: string | null
  reputation: number
}

export async function getPublicProfiles(ids: string[]): Promise<Map<string, PublicProfile>> {
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
