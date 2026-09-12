import { useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { createPost } from '../../lib/posts'
import { attachTagsToPost } from '../../lib/tags'
import '../auth.css'
import './CreatePost.css'

const TITLE_PATTERN = /^.{16,64}$/
const CONTENT_PATTERN = /^[\s\S]{32,8192}$/

function CreatePost() {
  const navigate = useNavigate()
  const { profile } = useAuth()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagError, setTagError] = useState<string | null>(null)
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

  function addTag() {
    const trimmed = tagInput.trim()
    if (!trimmed) return

    if (trimmed.length > 32) {
      setTagError('Tags must be 32 characters or fewer.')
      return
    }
    if (tags.includes(trimmed)) {
      setTagError('That tag is already added.')
      setTagInput('')
      return
    }

    setTags((current) => [...current, trimmed])
    setTagInput('')
    setTagError(null)
  }

  function removeTag(tag: string) {
    setTags((current) => current.filter((existing) => existing !== tag))
  }

  function handleTagKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      addTag()
    }
  }

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
    const { data, error } = await createPost(authorId, trimmedTitle, trimmedContent)

    if (error || !data) {
      setSubmitting(false)
      setFormError(error?.message ?? 'Something went wrong creating your post.')
      return
    }

    if (tags.length > 0) {
      const { error: tagAttachError } = await attachTagsToPost(data.id, tags)
      if (tagAttachError) {
        setSubmitting(false)
        setFormError(`Post created, but tags failed to save: ${tagAttachError}`)
        return
      }
    }

    setSubmitting(false)
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

        <div className="auth-field">
          <label htmlFor="tagInput">Tags</label>
          <div id="tag-input-row">
            <input
              id="tagInput"
              value={tagInput}
              onChange={(event) => {
                setTagInput(event.target.value.toLowerCase())
                setTagError(null)
              }}
              onKeyDown={handleTagKeyDown}
              placeholder="Add a tag"
              maxLength={32}
            />
            <button type="button" className="button" onClick={addTag}>
              Add tag
            </button>
          </div>
          {tagError && <span className="auth-error">{tagError}</span>}
          {tags.length > 0 && (
            <ul id="tag-bubble-list">
              {tags.map((tag) => (
                <li key={tag} className="tag-bubble">
                  <span>{tag}</span>
                  <button type="button" onClick={() => removeTag(tag)} aria-label={`Remove tag ${tag}`}>
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {formError && <p className="auth-form-error">{formError}</p>}

        <button type="submit" className="button primary" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create Post'}
        </button>
      </form>
    </section>
  )
}

export default CreatePost
