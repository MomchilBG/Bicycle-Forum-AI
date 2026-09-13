import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import PostSummaryCard from '../../components/PostSummaryCard/PostSummaryCard'
import { parseSearchQuery, searchPosts } from '../../lib/search'
import type { SortOption } from '../../lib/search'
import type { PostSummary } from '../../lib/posts'
import './PostsBrowse.css'

const sortLinkClass = (current: SortOption, target: SortOption) => current === target ? 'active' : undefined

const PostsBrowse = () => {
  const [searchParams] = useSearchParams()
  const q = searchParams.get('q') ?? ''
  const sort: SortOption = searchParams.get('sort') === 'score' ? 'score' : 'recent'

  // Keyed on the search criteria so changing them remounts this (and resets
  // its fetch/pagination state) instead of needing to reset it in an effect.
  return <PostsBrowseResults key={`${q}::${sort}`} q={q} sort={sort} />
}

const PostsBrowseResults = ({ q, sort }: { q: string; sort: SortOption }) => {
  const [posts, setPosts] = useState<PostSummary[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(0)

  useEffect(() => {
    let cancelled = false

    searchPosts(parseSearchQuery(q), sort, 0).then((result) => {
      if (cancelled) return
      setPosts(result.posts)
      setTotalCount(result.totalCount)
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [q, sort])

  const handleLoadMore = async () => {
    setLoadingMore(true)
    const nextPage = page + 1
    const result = await searchPosts(parseSearchQuery(q), sort, nextPage)
    setPosts((current) => [...current, ...result.posts])
    setPage(nextPage)
    setLoadingMore(false)
  }

  const hasMore = posts.length < totalCount

  const sortLink = (target: SortOption): string => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    params.set('sort', target)
    return `/posts?${params.toString()}`
  }

  return (
    <section id="posts-browse-page">
      <div id="posts-browse-header">
        <h1>{q ? `Results for "${q}"` : 'Browse posts'}</h1>
        <div id="posts-browse-sort">
          <Link to={sortLink('recent')} className={sortLinkClass(sort, 'recent')}>
            Most recent
          </Link>
          <Link to={sortLink('score')} className={sortLinkClass(sort, 'score')}>
            Top score
          </Link>
        </div>
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : posts.length === 0 ? (
        <p>No posts match your search.</p>
      ) : (
        <>
          <ul id="posts-browse-list">
            {posts.map((post) => (
              <PostSummaryCard key={post.id} post={post} />
            ))}
          </ul>
          {hasMore && (
            <button type="button" className="button" onClick={handleLoadMore} disabled={loadingMore}>
              {loadingMore ? 'Loading…' : `Load more (${totalCount - posts.length} left)`}
            </button>
          )}
        </>
      )}
    </section>
  )
}

export default PostsBrowse
