import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { castVote, createComment, getComments, getPostDetail } from '../../lib/postDetail'
import type { CommentItem, PostDetail } from '../../lib/postDetail'
import { formatDateTime } from '../../lib/formatDate'
import '../auth.css'
import './PostView.css'

function AuthorAvatar({ author }: { author: { username: string; avatarUrl: string | null } }) {
  return author.avatarUrl ? (
    <img className="author-avatar" src={author.avatarUrl} alt="" />
  ) : (
    <span className="author-avatar author-avatar-fallback">{author.username.slice(0, 1).toUpperCase()}</span>
  )
}

function PostView() {
  const { id } = useParams<{ id: string }>()
  if (!id) return null
  // Keyed on the post id so navigating between posts remounts this (and
  // resets all of its fetch state) instead of needing to reset it in an effect.
  return <PostViewForPost key={id} postId={id} />
}

function PostViewForPost({ postId }: { postId: string }) {
  const { profile, user } = useAuth()

  const [post, setPost] = useState<PostDetail | null>(null)
  const [comments, setComments] = useState<CommentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [voting, setVoting] = useState(false)
  const [voteError, setVoteError] = useState<string | null>(null)
  const [commentText, setCommentText] = useState('')
  const [commentError, setCommentError] = useState<string | null>(null)
  const [submittingComment, setSubmittingComment] = useState(false)

  useEffect(() => {
    let cancelled = false

    Promise.all([getPostDetail(postId, user?.id ?? null), getComments(postId)]).then(
      ([postResult, commentsResult]) => {
        if (cancelled) return
        setPost(postResult)
        setNotFound(!postResult)
        setComments(commentsResult)
        setLoading(false)
      },
    )

    return () => {
      cancelled = true
    }
  }, [postId, user?.id])

  async function refreshPost() {
    const result = await getPostDetail(postId, user?.id ?? null)
    setPost(result)
  }

  async function handleVote(value: 1 | -1) {
    if (!user || voting) return
    setVoting(true)
    setVoteError(null)

    const { error } = await castVote(postId, user.id, value)
    if (error) {
      setVoteError(error.message)
      setVoting(false)
      return
    }

    await refreshPost()
    setVoting(false)
  }

  async function handleCommentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!profile) return
    setCommentError(null)

    const trimmed = commentText.trim()
    if (trimmed.length === 0 || trimmed.length > 8192) {
      setCommentError('Comment must be 1-8192 characters.')
      return
    }

    setSubmittingComment(true)
    const { error } = await createComment(postId, profile.id, trimmed)
    setSubmittingComment(false)

    if (error) {
      setCommentError(error.message)
      return
    }

    setCommentText('')
    const updatedComments = await getComments(postId)
    setComments(updatedComments)
  }

  if (loading) {
    return (
      <section id="post-view-page">
        <p>Loading…</p>
      </section>
    )
  }

  if (notFound || !post) {
    return (
      <section id="post-view-page">
        <p>This post doesn&apos;t exist.</p>
      </section>
    )
  }

  const isOwnPost = profile?.id === post.author.id
  const canVote = !!profile && !profile.is_blocked && !isOwnPost
  const canComment = !!profile && !profile.is_blocked

  return (
    <section id="post-view-page">
      <article id="post-view">
        <div className="post-author-card">
          <AuthorAvatar author={post.author} />
          <div>
            <div className="post-author-name">
              {post.author.firstName} {post.author.lastName}
            </div>
            <div className="post-author-username">@{post.author.username}</div>
            {post.authorBadges.length > 0 && (
              <ul className="badge-list">
                {post.authorBadges.map((badge) => (
                  <li key={badge.id} title={badge.description}>
                    {badge.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <h1>{post.title}</h1>
        <p className="post-view-meta">{formatDateTime(post.createdAt)}</p>
        <div className="post-view-content">{post.content}</div>

        <div id="post-votes">
          <button
            type="button"
            className={post.myVote === 1 ? 'active' : ''}
            onClick={() => handleVote(1)}
            disabled={!canVote || voting}
            aria-label="Upvote"
            title={isOwnPost ? "You can't vote on your own post" : 'Upvote'}
          >
            ▲
          </button>
          <div id="post-vote-score" tabIndex={0}>
            {post.upvoteCount - post.downvoteCount}
            <span id="post-vote-tooltip">
              {post.upvoteCount} upvote{post.upvoteCount === 1 ? '' : 's'} · {post.downvoteCount} downvote
              {post.downvoteCount === 1 ? '' : 's'}
            </span>
          </div>
          <button
            type="button"
            className={post.myVote === -1 ? 'active' : ''}
            onClick={() => handleVote(-1)}
            disabled={!canVote || voting}
            aria-label="Downvote"
            title={isOwnPost ? "You can't vote on your own post" : 'Downvote'}
          >
            ▼
          </button>
          {!user && <span className="post-view-hint">Log in to vote.</span>}
          {voteError && <span className="auth-error">{voteError}</span>}
        </div>

        <section id="post-comments">
          <h2>Comments ({comments.length})</h2>

          {comments.length === 0 ? (
            <p>No comments yet.</p>
          ) : (
            <ul id="comment-list">
              {comments.map((comment) => (
                <li key={comment.id} className="comment-item">
                  <AuthorAvatar author={comment.author} />
                  <div>
                    <div className="comment-meta">
                      <span className="comment-author">{comment.author.username}</span>
                      <span className="comment-date">{formatDateTime(comment.createdAt)}</span>
                    </div>
                    <p className="comment-content">{comment.content}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {canComment ? (
            <form id="comment-form" onSubmit={handleCommentSubmit}>
              <textarea
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                placeholder="Write a comment…"
                rows={3}
                maxLength={8192}
              />
              {commentError && <p className="auth-form-error">{commentError}</p>}
              <button type="submit" className="button primary" disabled={submittingComment}>
                {submittingComment ? 'Posting…' : 'Comment'}
              </button>
            </form>
          ) : !user ? (
            <p className="post-view-hint">
              <Link to="/login">Log in</Link> to leave a comment.
            </p>
          ) : profile?.is_blocked ? (
            <p className="auth-form-error">You&apos;ve been blocked from commenting.</p>
          ) : null}
        </section>
      </article>
    </section>
  )
}

export default PostView
