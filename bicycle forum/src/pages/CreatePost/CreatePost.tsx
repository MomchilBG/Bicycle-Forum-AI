import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { createPost } from '../../lib/posts'
import '../auth.css'
import './CreatePost.css'

const TITLE_PATTERN = /^.{16,64}$/
const CONTENT_PATTERN = /^[\s\S]{32,8192}$/

function CreatePost() {
  const navigate = useNavigate()
  const { profile } = useAuth()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // profile lags session by one fetch - guard against submitting before it
  // resolves, rather than force-unwrapping it below.
  if (!profile) {
    return (
      <section id="create-post-page">
        <p>Loading…</p>
      </section>
    )
  }

  if (profile.is_blocked) {
    return (
      <section id="create-post-page">
        <p className="auth-form-error">Your account has been blocked from posting.</p>
      </section>
    )
  }

  const authorId = profile.id

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    const trimmedTitle = title.trim()
    const trimmedContent = content.trim()

    if (!TITLE_PATTERN.test(trimmedTitle)) {
      setFormError('Title must be 16-64 characters.')
      return
    }
    if (!CONTENT_PATTERN.test(trimmedContent)) {
      setFormError('Content must be 32-8192 characters.')
      return
    }

    setSubmitting(true)
    const { error } = await createPost(authorId, trimmedTitle, trimmedContent)
    setSubmitting(false)

    if (error) {
      setFormError(error.message)
      return
    }

    navigate('/profile')
  }

  return (
    <section id="create-post-page">
      <form id="create-post-card" onSubmit={handleSubmit} noValidate>
        <h1>New post</h1>

        <div className="auth-field">
          <label htmlFor="title">Title</label>
          <input
            id="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="16-64 characters"
            maxLength={64}
          />
        </div>

        <div className="auth-field">
          <label htmlFor="content">Content</label>
          <textarea
            id="content"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="32-8192 characters"
            rows={10}
            maxLength={8192}
          />
        </div>

        {formError && <p className="auth-form-error">{formError}</p>}

        <button type="submit" className="button primary" disabled={submitting}>
          {submitting ? 'Posting…' : 'Post'}
        </button>
      </form>
    </section>
  )
}

export default CreatePost
