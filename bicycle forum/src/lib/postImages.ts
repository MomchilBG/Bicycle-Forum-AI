import { supabase } from './supabaseClient'

export const ALLOWED_POST_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']

export const ALLOWED_POST_IMAGE_LABEL = 'PNG, JPG/JPEG, WEBP, GIF, or AVIF'

export const MAX_POST_IMAGE_BYTES = 5 * 1024 * 1024

export const MAX_POST_IMAGES = 5

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

// Deliberately just a storage upload with no table write - the caller folds
// the resulting URL into its own post_images insert, so a brand-new post's
// images are attached in one batch rather than one row at a time.
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

export const getImagesForPost = async (postId: string): Promise<string[]> => {
  const { data } = await supabase.from('post_images').select('image_url').eq('post_id', postId).order('position', { ascending: true })
  return (data ?? []).map((row) => row.image_url)
}

// Editing a post's images: same clear-and-reattach approach as
// replacePostTags() - simplest correct way to turn an ordered list of "the
// images this post should now have" into the right rows, without diffing
// position changes. Positions are just the array index, so re-inserting
// always renumbers cleanly.
export const replacePostImages = async (postId: string, imageUrls: string[]): Promise<{ error: string | null }> => {
  const { error: deleteError } = await supabase.from('post_images').delete().eq('post_id', postId)
  if (deleteError) return { error: deleteError.message }

  if (imageUrls.length === 0) return { error: null }

  const { error } = await supabase
    .from('post_images')
    .insert(imageUrls.map((imageUrl, position) => ({ post_id: postId, image_url: imageUrl, position })))

  return { error: error?.message ?? null }
}
