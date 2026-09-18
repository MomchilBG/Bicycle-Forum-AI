import { supabase } from './supabaseClient'

// Removes every object directly under `${prefix}/` in the given bucket -
// used to blank out a user's whole folder (their avatar, or every image
// across all of their posts) rather than track individual paths. Storage
// objects must be removed through this API, not by deleting rows from
// storage.objects directly via SQL - that only deletes the metadata row
// and leaves the underlying file orphaned in the bucket.
export const clearStorageFolder = async (bucket: string, prefix: string): Promise<void> => {
  const { data } = await supabase.storage.from(bucket).list(prefix)
  if (!data || data.length === 0) return
  await supabase.storage.from(bucket).remove(data.map((file) => `${prefix}/${file.name}`))
}

// Public storage URLs look like
// https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
// - this pulls the bucket-relative path back out so it can be passed to
// remove().
export const extractStoragePath = (bucket: string, url: string): string | null => {
  const marker = `/object/public/${bucket}/`
  const index = url.indexOf(marker)
  if (index === -1) return null
  return decodeURIComponent(url.slice(index + marker.length))
}
