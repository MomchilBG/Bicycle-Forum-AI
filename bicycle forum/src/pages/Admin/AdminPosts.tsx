import { useEffect, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { parseSearchQuery, searchPosts } from '../../lib/search'
import type { SortOption } from '../../lib/search'
import type { PostSummary } from '../../lib/posts'
import { deletePost } from '../../lib/posts'
import { getComments, deleteComment } from '../../lib/postDetail'
import type { CommentItem } from '../../lib/postDetail'
import { getTagsForPost, replacePostTags } from '../../lib/tags'
import { formatDateTime } from '../../lib/formatDate'
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog'
import './Admin.css'

const adminTabClass = ({ isActive }: { isActive: boolean }) => isActive ? 'active' : undefined
const sortLinkClass = (current: SortOption, target: SortOption) => current === target ? 'active' : undefined

interface TagModalState {
  postId: string
  title: string
  tags: string[]
  // getTagsForPost() resolves after the modal opens with tags: [] - without
  // this, saving before it resolves would replace the post's real tags with
  // an empty list. Gates the Save button until the real tags are in.
  loaded: boolean
}

interface CommentsModalState {
  postId: string
  title: string
  comments: CommentItem[]
  loaded: boolean
}

const AdminPosts = () => {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortOption>('recent')
  const [posts, setPosts] = useState<PostSummary[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<PostSummary | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [tagModal, setTagModal] = useState<TagModalState | null>(null)
  const [tagInput, setTagInput] = useState('')
  const [tagError, setTagError] = useState<string | null>(null)
  const [savingTags, setSavingTags] = useState(false)

  const [commentsModal, setCommentsModal] = useState<CommentsModalState | null>(null)
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null)
  const [commentsError, setCommentsError] = useState<string | null>(null)

  const runSearch = async (nextSort: SortOption, nextPage: number) => {
    if (nextPage === 0) setLoading(true)
    else setLoadingMore(true)

    const result = await searchPosts(parseSearchQuery(query), nextSort, nextPage)

    if (nextPage === 0) setPosts(result.posts)
    else setPosts((current) => [...current, ...result.posts])

    setTotalCount(result.totalCount)
    setPage(nextPage)
    setLoading(false)
    setLoadingMore(false)
  }

  // Load the default (unfiltered, most-recent) list once on mount, same as
  // PostsBrowse does - only the initial load is automatic, sort/search/load
  // more are all explicit user actions after that. Fetches directly (like
  // PostsBrowse's own mount effect) rather than through runSearch, since
  // runSearch's synchronous setLoading(true) at the top - fine when called
  // from an event handler - trips the set-state-in-effect lint rule when
  // called straight from an effect body.
  useEffect(() => {
    searchPosts(parseSearchQuery(''), 'recent', 0).then((result) => {
      setPosts(result.posts)
      setTotalCount(result.totalCount)
      setLoading(false)
    })
  }, [])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void runSearch(sort, 0)
  }

  const handleSort = (target: SortOption) => {
    setSort(target)
    void runSearch(target, 0)
  }

  const handleLoadMore = () => void runSearch(sort, page + 1)

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError(null)

    const { error } = await deletePost(deleteTarget.id)
    setDeleting(false)

    if (error) {
      setDeleteError(error.message)
      return
    }

    setPosts((current) => current.filter((post) => post.id !== deleteTarget.id))
    setTotalCount((current) => Math.max(current - 1, 0))
    setDeleteTarget(null)
  }

  const openTagModal = async (post: PostSummary) => {
    setTagModal({ postId: post.id, title: post.title, tags: [], loaded: false })
    setTagInput('')
    setTagError(null)
    const tags = await getTagsForPost(post.id)
    setTagModal((current) => (current && current.postId === post.id ? { ...current, tags, loaded: true } : current))
  }

  const addTag = () => {
    if (!tagModal) return
    const trimmed = tagInput.replace(/[_\s]+/g, ' ').trim().toLowerCase()
    if (!trimmed) return

    if (trimmed.length > 32) {
      setTagError('Tags must be 32 characters or fewer.')
      return
    }
    if (tagModal.tags.includes(trimmed)) {
      setTagError('That tag is already added.')
      setTagInput('')
      return
    }

    setTagModal({ ...tagModal, tags: [...tagModal.tags, trimmed] })
    setTagInput('')
    setTagError(null)
  }

  const removeTag = (tag: string) => {
    if (!tagModal) return
    setTagModal({ ...tagModal, tags: tagModal.tags.filter((existing) => existing !== tag) })
  }

  const handleTagInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      addTag()
    }
  }

  const confirmTags = async () => {
    if (!tagModal || !tagModal.loaded) return
    setSavingTags(true)
    setTagError(null)

    const { error } = await replacePostTags(tagModal.postId, tagModal.tags)
    setSavingTags(false)

    if (error) {
      setTagError(error)
      return
    }

    setTagModal(null)
  }

  const openCommentsModal = async (post: PostSummary) => {
    setCommentsModal({ postId: post.id, title: post.title, comments: [], loaded: false })
    setCommentsError(null)
    const comments = await getComments(post.id)
    setCommentsModal((current) => (current && current.postId === post.id ? { ...current, comments, loaded: true } : current))
  }

  // Deleting a comment orphans (not deletes) its replies - they become
  // top-level comments, per the ON DELETE SET NULL cascade documented in
  // migration 16/19 - so refetch rather than filtering the deleted id out
  // locally, which would incorrectly hide its replies too.
  const handleDeleteComment = async (commentId: string) => {
    if (!commentsModal) return
    if (!window.confirm("Delete this comment? Any replies to it will become top-level comments. This can't be undone.")) return

    setDeletingCommentId(commentId)
    setCommentsError(null)

    const { error } = await deleteComment(commentId)

    if (error) {
      setDeletingCommentId(null)
      setCommentsError(error.message)
      return
    }

    const postId = commentsModal.postId
    const comments = await getComments(postId)
    setDeletingCommentId(null)
    setCommentsModal((current) => (current && current.postId === postId ? { ...current, comments } : current))
    setPosts((current) => current.map((post) => (post.id === postId ? { ...post, commentCount: Math.max(post.commentCount - 1, 0) } : post)))
  }

  const hasMore = posts.length < totalCount

  return (
    <section id="admin-page">
      <h1>Admin</h1>
      <nav id="admin-tabs">
        <NavLink to="/admin/users" className={adminTabClass}>
          Users
        </NavLink>
        <NavLink to="/admin/posts" className={adminTabClass}>
          Posts
        </NavLink>
      </nav>

      <form id="admin-post-search" onSubmit={handleSubmit}>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search posts or #tag_name"
          aria-label="Search posts"
        />
        <button type="submit" className="button primary">
          Search
        </button>
      </form>

      <div id="admin-post-sort">
        <button type="button" className={sortLinkClass(sort, 'recent')} onClick={() => handleSort('recent')}>
          Most recent
        </button>
        <button type="button" className={sortLinkClass(sort, 'score')} onClick={() => handleSort('score')}>
          Top score
        </button>
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : posts.length === 0 ? (
        <p>No posts match.</p>
      ) : (
        <>
          <ul id="admin-post-list">
            {posts.map((post) => (
              <li key={post.id} className="admin-post-row">
                <div className="admin-post-identity">
                  <Link to={`/posts/${post.id}`} className="admin-post-title">
                    {post.title}
                  </Link>
                  <span className="admin-post-meta">
                    by <Link to={`/users/${post.author}`}>{post.author}</Link> · {post.commentCount} comments
                    {post.score !== undefined && ` · ${post.score} score`} · {formatDateTime(post.createdAt)}
                  </span>
                </div>
                <div className="admin-post-actions">
                  <button type="button" className="button" onClick={() => void openCommentsModal(post)}>
                    Comments
                  </button>
                  <button type="button" className="button" onClick={() => void openTagModal(post)}>
                    Manage tags
                  </button>
                  <button type="button" className="button danger" onClick={() => setDeleteTarget(post)}>
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {hasMore && (
            <button type="button" className="button" onClick={handleLoadMore} disabled={loadingMore}>
              {loadingMore ? 'Loading…' : `Load more (${totalCount - posts.length} left)`}
            </button>
          )}
        </>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete post"
          message={`Delete "${deleteTarget.title}"? This also removes its comments and votes. This can't be undone.`}
          confirmLabel="Delete"
          danger
          confirming={deleting}
          error={deleteError}
          onConfirm={() => void confirmDelete()}
          onCancel={() => {
            setDeleteTarget(null)
            setDeleteError(null)
          }}
        />
      )}

      {tagModal && (
        <ConfirmDialog
          title={`Manage tags for "${tagModal.title}"`}
          confirmLabel="Save tags"
          confirming={savingTags}
          confirmDisabled={!tagModal.loaded}
          error={tagError}
          onConfirm={() => void confirmTags()}
          onCancel={() => setTagModal(null)}
        >
          {!tagModal.loaded ? (
            <p>Loading tags…</p>
          ) : (
            <div id="tag-input-row">
              <input
                value={tagInput}
                onChange={(event) => {
                  setTagInput(event.target.value.toLowerCase())
                  setTagError(null)
                }}
                onKeyDown={handleTagInputKeyDown}
                placeholder="Add a tag"
                maxLength={32}
              />
              <button type="button" className="button" onClick={addTag}>
                Add tag
              </button>
            </div>
          )}
          {tagModal.tags.length > 0 && (
            <ul id="tag-bubble-list">
              {tagModal.tags.map((tag) => (
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
        </ConfirmDialog>
      )}

      {commentsModal && (
        <div className="modal-overlay" onClick={() => setCommentsModal(null)}>
          <div className="modal-card admin-comments-modal" onClick={(event) => event.stopPropagation()}>
            <h2>Comments on &quot;{commentsModal.title}&quot;</h2>
            {commentsError && <p className="auth-form-error">{commentsError}</p>}
            {!commentsModal.loaded ? (
              <p>Loading…</p>
            ) : commentsModal.comments.length === 0 ? (
              <p>No comments on this post.</p>
            ) : (
              <ul id="admin-comment-list">
                {commentsModal.comments.map((comment) => (
                  <li key={comment.id} className="admin-comment-row">
                    <div className="admin-comment-body">
                      <span className="admin-comment-meta">
                        {comment.parentCommentId && 'Reply · '}
                        <Link to={`/users/${comment.author.username}`}>{comment.author.username}</Link> ·{' '}
                        {formatDateTime(comment.createdAt)}
                      </span>
                      <p className="admin-comment-content">{comment.content}</p>
                    </div>
                    <button
                      type="button"
                      className="button danger"
                      onClick={() => void handleDeleteComment(comment.id)}
                      disabled={deletingCommentId === comment.id}
                    >
                      {deletingCommentId === comment.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="modal-actions">
              <button type="button" className="button" onClick={() => setCommentsModal(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default AdminPosts
