import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { getUserProfileByUsername } from '../../lib/userProfile'
import type { UserProfilePage as UserProfileData } from '../../lib/userProfile'
import PostSummaryCard from '../../components/PostSummaryCard/PostSummaryCard'
import { formatDateTime } from '../../lib/formatDate'
import '../profileShared.css'
import './UserProfile.css'

const UserProfile = () => {
  const { username } = useParams<{ username: string }>()
  if (!username) return null
  // Keyed on the username so navigating between profiles remounts this
  // (and resets all of its fetch state) instead of needing to reset it in an effect.
  return <UserProfileForUsername key={username} username={username} />
}

const UserProfileForUsername = ({ username }: { username: string }) => {
  const { profile: viewerProfile } = useAuth()
  const [data, setData] = useState<UserProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let cancelled = false

    getUserProfileByUsername(username).then((result) => {
      if (cancelled) return
      setData(result)
      setNotFound(!result)
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [username])

  if (loading) {
    return (
      <section id="user-profile-page">
        <p>Loading…</p>
      </section>
    )
  }

  if (notFound || !data) {
    return (
      <section id="user-profile-page">
        <p>This user doesn&apos;t exist.</p>
      </section>
    )
  }

  const isOwnProfile = viewerProfile?.id === data.id

  return (
    <section id="user-profile-page">
      <div id="user-profile-header">
        <div id="user-profile-avatar">
          {data.avatarUrl ? (
            <img src={data.avatarUrl} alt="" />
          ) : (
            <span id="user-profile-avatar-fallback">{data.username.slice(0, 1).toUpperCase()}</span>
          )}
        </div>
        <div id="user-profile-identity">
          <h1>{data.username}</h1>
          <p id="user-profile-subtitle">
            {data.firstName} {data.lastName} · {data.reputation} reputation
          </p>
          <p id="user-profile-joined">Joined {formatDateTime(data.createdAt)}</p>
        </div>
        {isOwnProfile && (
          <Link to="/profile" className="button primary" id="user-profile-edit-link">
            Edit your profile
          </Link>
        )}
      </div>

      <div className="profile-stats">
        <div className="profile-stat">
          <span className="profile-stat-value">{data.postCount}</span>
          <span className="profile-stat-label">Posts</span>
        </div>
        <div className="profile-stat">
          <span className="profile-stat-value">{data.commentCount}</span>
          <span className="profile-stat-label">Comments</span>
        </div>
      </div>

      {data.badges.length > 0 && (
        <div className="profile-badges">
          <h2>Badges</h2>
          <ul>
            {data.badges.map((badge) => (
              <li key={badge.id} title={badge.description}>
                <span className="badge-pill">{badge.name}</span>
                <span className="user-badge-date">Earned {formatDateTime(badge.awardedAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div id="user-profile-posts">
        <h2>Posts</h2>
        {data.posts.length === 0 ? (
          <p>{data.username} hasn&apos;t created any posts yet.</p>
        ) : (
          <ul>
            {data.posts.map((post) => (
              <PostSummaryCard key={post.id} post={post} />
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

export default UserProfile
