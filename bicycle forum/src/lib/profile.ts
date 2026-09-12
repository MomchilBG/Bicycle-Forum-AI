import { supabase } from './supabaseClient'

export async function updateProfileName(userId: string, firstName: string, lastName: string) {
  return supabase.from('profiles').update({ first_name: firstName, last_name: lastName }).eq('id', userId)
}

const MAX_AVATAR_BYTES = 2 * 1024 * 1024

export async function uploadAvatar(userId: string, file: File): Promise<{ url: string } | { error: string }> {
  if (!file.type.startsWith('image/')) {
    return { error: 'Please choose an image file.' }
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return { error: 'Image must be 2MB or smaller.' }
  }

  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${userId}/avatar.${ext}`

  const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
  if (uploadError) return { error: uploadError.message }

  // Path is stable across re-uploads, so cache-bust the URL that gets stored
  // or the browser (and other viewers) may keep showing the old image.
  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  const url = `${data.publicUrl}?v=${Date.now()}`

  const { error: updateError } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', userId)
  if (updateError) return { error: updateError.message }

  return { url }
}
