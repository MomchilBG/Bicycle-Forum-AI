import type { PostSummary } from '../../data/mockForumData'
import './PostSummaryCard.css'

function PostSummaryCard({ post }: { post: PostSummary }) {
  return (
    <li className="post-summary-card">
      <span className="post-title">{post.title}</span>
      <span className="post-meta">
        by {post.author} · {post.commentCount} comments · {post.createdAt}
      </span>
    </li>
  )
}

export default PostSummaryCard
