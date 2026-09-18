import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { getPostForEdit, updatePost } from '../../lib/posts'
import type { EditablePost } from '../../lib/posts'
import { replacePostTags } from '../../lib/tags'
import { uploadPostImage } from '../../lib/postImages'
import PostForm from '../../components/PostForm/PostForm'
import type { PostImageChange } from '../../components/PostForm/PostForm'

const EditPost = () => {
  const { id } = useParams<{ id: string }>()
  if (!id) return null
  return <EditPostForId postId={id} />
}

const EditPostForId = ({ postId }: { postId: string }) => {
  const navigate = useNavigate()
  const { profile } = useAuth()

  const [post, setPost] = useState<EditablePost | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let cancelled = false

    getPostForEdit(postId).then((result) => {
      if (cancelled) return
      setPost(result)
      setNotFound(!result)
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [postId])

  if (!profile || loading) {
    return (
      <section id="post-form-page">
        <p>Loading…</p>
      </section>
    )
  }

  if (notFound || !post) {
    return (
      <section id="post-form-page">
        <p>This post doesn&apos;t exist.</p>
      </section>
    )
  }

  if (post.authorId !== profile.id) {
    return (
      <section id="post-form-page">
        <p className="auth-form-error">You can only edit your own posts.</p>
      </section>
    )
  }

  if (profile.is_blocked) {
    return (
      <section id="post-form-page">
        <p className="auth-form-error">Your account has been blocked from editing posts.</p>
      </section>
    )
  }

  const handleSubmit = async (title: string, content: string, tags: string[], image: PostImageChange): Promise<{ error: string | null }> => {
    let imageUrl: string | null | undefined
    if (image.file) {
      const imageResult = await uploadPostImage(profile.id, image.file)
      if ('error' in imageResult) {
        return { error: `Image failed to upload: ${imageResult.error}` }
      }
      imageUrl = imageResult.url
    } else if (image.remove) {
      imageUrl = null
    }

    const { error } = await updatePost(postId, title, content, imageUrl)
    if (error) return { error: error.message }

    const { error: tagError } = await replacePostTags(postId, tags)
    if (tagError) return { error: `Post updated, but tags failed to save: ${tagError}` }

    navigate(`/posts/${postId}`)
    return { error: null }
  }

  return (
    <PostForm
      key={postId}
      heading="Edit post"
      initialTitle={post.title}
      initialContent={post.content}
      initialTags={post.tags}
      initialImageUrl={post.imageUrl}
      submitLabel="Save changes"
      submittingLabel="Saving…"
      cancelHref={`/posts/${postId}`}
      onSubmit={handleSubmit}
    />
  )
}

export default EditPost
