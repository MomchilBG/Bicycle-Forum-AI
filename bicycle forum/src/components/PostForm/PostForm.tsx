import { useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import '../../pages/auth.css'
import './PostForm.css'

const TITLE_PATTERN = /^.{4,64}$/
const CONTENT_PATTERN = /^[\s\S]{16,8192}$/

export interface PostFormProps {
  heading: string
  initialTitle?: string
  initialContent?: string
  initialTags?: string[]
  submitLabel: string
  submittingLabel: string
  cancelHref?: string
  onSubmit: (title: string, content: string, tags: string[]) => Promise<{ error: string | null }>
}

const PostForm = ({
  heading,
  initialTitle = '',
  initialContent = '',
  initialTags = [],
  submitLabel,
  submittingLabel,
  cancelHref,
  onSubmit,
}: PostFormProps) => {
  const [title, setTitle] = useState(initialTitle)
  const [content, setContent] = useState(initialContent)
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>(initialTags)
  const [tagError, setTagError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const addTag = () => {
    // Underscores are reserved as the navbar search box's stand-in for a
    // space in a multi-word #tag (see lib/search.ts) - normalize them away
    // here so a tag can never contain one for real, which would otherwise
    // make it permanently unfindable via its own "click to search" link.
    const trimmed = tagInput.replace(/[_\s]+/g, ' ').trim()
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

  const removeTag = (tag: string) => {
    setTags((current) => current.filter((existing) => existing !== tag))
  }

  const handleTagKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      addTag()
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)

    const trimmedTitle = title.trim()
    const trimmedContent = content.trim()

    if (!TITLE_PATTERN.test(trimmedTitle)) {
      setFormError('Title must be 4-64 characters.')
      return
    }
    if (!CONTENT_PATTERN.test(trimmedContent)) {
      setFormError('Content must be 16-8192 characters.')
      return
    }

    setSubmitting(true)
    const { error } = await onSubmit(trimmedTitle, trimmedContent, tags)
    setSubmitting(false)

    if (error) setFormError(error)
  }

  return (
    <section id="post-form-page">
      <form id="post-form-card" onSubmit={handleSubmit} noValidate>
        <h1>{heading}</h1>

        <div className="auth-field">
          <label htmlFor="title">Title</label>
          <input
            id="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="4-64 characters"
            maxLength={64}
          />
        </div>

        <div className="auth-field">
          <label htmlFor="content">Content</label>
          <textarea
            id="content"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="16-8192 characters"
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
                    <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                      <line x1="4" y1="4" x2="20" y2="20" />
                      <line x1="20" y1="4" x2="4" y2="20" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {formError && <p className="auth-form-error">{formError}</p>}

        <div id="post-form-actions">
          {cancelHref && (
            <Link to={cancelHref} className="button">
              Cancel
            </Link>
          )}
          <button type="submit" className="button primary" disabled={submitting}>
            {submitting ? submittingLabel : submitLabel}
          </button>
        </div>
      </form>
    </section>
  )
}

export default PostForm
