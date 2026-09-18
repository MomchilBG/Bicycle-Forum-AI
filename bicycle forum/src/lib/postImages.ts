import { supabase } from './supabaseClient'

export const ALLOWED_POST_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']

export const ALLOWED_POST_IMAGE_LABEL = 'PNG, JPG/JPEG, WEBP, GIF, or AVIF'

export const MAX_POST_IMAGE_BYTES = 5 * 1024 * 1024

const EXTENSION_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
}

export const validatePostImage = (file: File): string | null => {
  if (!ALLOWED_POST_IMAGE_TYPES.includes(file.type)) {
    return `Images must be one of: ${ALLOWED_POST_IMAGE_LABEL}.`
  }
  if (file.size > MAX_POST_IMAGE_BYTES) {
    return 'Image must be 5MB or smaller.'
  }
  return null
}

// Deliberately just a storage upload with no posts table write - the caller
// (create or edit) folds the resulting URL into its own insert/update, so a
// brand-new post's image is part of the same insert rather than a follow-up
// UPDATE (which would immediately - and wrongly - mark it as "(edited)", see
// migration 18's edited-marker gotcha). Each upload gets its own random path
// (author uid + a fresh id) rather than one derived from the post id, since
// on creation the post id doesn't exist yet.
export const uploadPostImage = async (authorId: string, file: File): Promise<{ url: string } | { error: string }> => {
  const validationError = validatePostImage(file)
  if (validationError) return { error: validationError }

  const ext = EXTENSION_BY_TYPE[file.type] ?? 'jpg'
  const path = `${authorId}/${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await supabase.storage.from('post-images').upload(path, file)
  if (uploadError) return { error: uploadError.message }

  const { data } = supabase.storage.from('post-images').getPublicUrl(path)
  return { url: data.publicUrl }
}
