import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth, type Profile as ProfileRow } from '../../auth/AuthContext'
import { updateProfileName, uploadAvatar } from '../../lib/profile'
import { getPostsByAuthor } from '../../lib/posts'
import type { PostSummary } from '../../lib/posts'
import { supabase } from '../../lib/supabaseClient'
import PostSummaryCard from '../../components/PostSummaryCard/PostSummaryCard'
import PasswordInput from '../../components/PasswordInput/PasswordInput'
import AuthField from '../../components/AuthField/AuthField'
import '../auth.css'
import './Profile.css'

const NAME_PATTERN = /^.{4,32}$/

const Profile = () => {
  const { profile } = useAuth()
  if (!profile) return null
  return <ProfileContent profile={profile} />
}

// Split out so `profile` is guaranteed non-null on mount - lets the name
// fields initialize from it directly instead of syncing in via an effect.
const ProfileContent = ({ profile }: { profile: ProfileRow }) => {
  const { refreshProfile, signOut } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [firstName, setFirstName] = useState(profile.first_name)
  const [lastName, setLastName] = useState(profile.last_name)
  const [nameError, setNameError] = useState<string | null>(null)
  const [nameSuccess, setNameSuccess] = useState<string | null>(null)
  const [savingName, setSavingName] = useState(false)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)
  const [savingPassword, setSavingPassword] = useState(false)

  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const [posts, setPosts] = useState<PostSummary[]>([])
  const [postsLoading, setPostsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    getPostsByAuthor(profile.id, profile.username).then((result) => {
      if (!cancelled) {
        setPosts(result)
        setPostsLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [profile.id, profile.username])

  const handleNameSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setNameError(null)
    setNameSuccess(null)

    const trimmedFirst = firstName.trim()
    const trimmedLast = lastName.trim()

    if (!NAME_PATTERN.test(trimmedFirst)) {
      setNameError('First name must be 4-32 characters.')
      return
    }
    if (!NAME_PATTERN.test(trimmedLast)) {
      setNameError('Last name must be 4-32 characters.')
      return
    }

    setSavingName(true)
    const { error } = await updateProfileName(profile.id, trimmedFirst, trimmedLast)
    setSavingName(false)

    if (error) {
      setNameError(error.message)
      return
    }

    await refreshProfile()
    setNameSuccess('Saved.')
  }

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(null)

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.')
      return
    }

    setSavingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSavingPassword(false)

    if (error) {
      setPasswordError(error.message)
      return
    }

    setNewPassword('')
    setConfirmPassword('')
    setPasswordSuccess('Password updated.')
  }

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setAvatarError(null)
    setUploadingAvatar(true)

    const result = await uploadAvatar(profile.id, file)
    setUploadingAvatar(false)
    if (fileInputRef.current) fileInputRef.current.value = ''

    if ('error' in result) {
      setAvatarError(result.error)
      return
    }

    await refreshProfile()
  }

  return (
    <section id="profile-page">
      <div id="profile-header">
        <button
          type="button"
          id="profile-avatar"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingAvatar}
          aria-label="Change profile photo"
          title="Change profile photo"
        >
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" />
          ) : (
            <span id="profile-avatar-fallback">{profile.username.slice(0, 1).toUpperCase()}</span>
          )}
          <span id="profile-avatar-overlay">{uploadingAvatar ? 'Uploading…' : 'Change photo'}</span>
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} hidden />
        <div id="profile-identity">
          <h1>{profile.username}</h1>
          <p id="profile-subtitle">
            {profile.first_name} {profile.last_name} · {profile.reputation} reputation
          </p>
          {avatarError && <span className="auth-error">{avatarError}</span>}
        </div>
        <button type="button" id="profile-logout" onClick={() => void signOut()}>
          Log out
        </button>
      </div>

      <div id="profile-panels">
        <form className="profile-card" onSubmit={handleNameSubmit}>
          <h2>Your name</h2>
          <AuthField htmlFor="firstName" label="First name">
            <input
              id="firstName"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              maxLength={32}
              autoComplete="given-name"
            />
          </AuthField>
          <AuthField htmlFor="lastName" label="Last name">
            <input
              id="lastName"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              maxLength={32}
              autoComplete="family-name"
            />
          </AuthField>
          {nameError && <p className="auth-form-error">{nameError}</p>}
          {nameSuccess && <p className="auth-success">{nameSuccess}</p>}
          <button type="submit" className="button primary" disabled={savingName}>
            {savingName ? 'Saving…' : 'Save name'}
          </button>
        </form>

        <form className="profile-card" onSubmit={handlePasswordSubmit}>
          <h2>Change password</h2>
          <AuthField htmlFor="newPassword" label="New password">
            <PasswordInput
              id="newPassword"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="At least 6 characters"
              autoComplete="new-password"
            />
          </AuthField>
          <AuthField htmlFor="confirmPassword" label="Confirm new password">
            <PasswordInput
              id="confirmPassword"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
            />
          </AuthField>
          {passwordError && <p className="auth-form-error">{passwordError}</p>}
          {passwordSuccess && <p className="auth-success">{passwordSuccess}</p>}
          <button type="submit" className="button primary" disabled={savingPassword}>
            {savingPassword ? 'Saving…' : 'Update password'}
          </button>
        </form>
      </div>

      <div id="profile-posts">
        <div id="profile-posts-header">
          <h2>Your posts</h2>
          {!profile.is_blocked && (
            <Link to="/posts/new" className="button primary">
              New post
            </Link>
          )}
        </div>
        {profile.is_blocked && (
          <p className="auth-form-error">Your account has been blocked from posting and commenting.</p>
        )}
        {postsLoading ? (
          <p>Loading…</p>
        ) : posts.length === 0 ? (
          <p>You haven&apos;t created any posts yet.</p>
        ) : (
          <ul>
            {posts.map((post) => (
              <PostSummaryCard key={post.id} post={post} />
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

export default Profile
