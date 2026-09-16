import { useNavigate } from 'react-router-dom'
import { useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useAuth, type Profile as ProfileRow } from '../../auth/AuthContext'
import { updateProfileBio, updateProfileName, uploadAvatar } from '../../lib/profile'
import { supabase } from '../../lib/supabaseClient'
import PasswordInput from '../../components/PasswordInput/PasswordInput'
import AuthField from '../../components/AuthField/AuthField'
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog'
import '../auth.css'
import '../profileShared.css'
import './Profile.css'

const NAME_PATTERN = /^.{4,32}$/
const BIO_MAX_LENGTH = 256

const Profile = () => {
  const { profile } = useAuth()
  if (!profile) return null
  return <ProfileContent profile={profile} />
}

// Split out so `profile` is guaranteed non-null on mount - lets the name
// fields initialize from it directly instead of syncing in via an effect.
const ProfileContent = ({ profile }: { profile: ProfileRow }) => {
  const { refreshProfile, signOut } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [firstName, setFirstName] = useState(profile.first_name)
  const [lastName, setLastName] = useState(profile.last_name ?? '')
  const [nameError, setNameError] = useState<string | null>(null)
  const [nameSuccess, setNameSuccess] = useState<string | null>(null)
  const [savingName, setSavingName] = useState(false)

  const [bio, setBio] = useState(profile.bio ?? '')
  const [bioError, setBioError] = useState<string | null>(null)
  const [bioSuccess, setBioSuccess] = useState<string | null>(null)
  const [savingBio, setSavingBio] = useState(false)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)
  const [savingPassword, setSavingPassword] = useState(false)

  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

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
    if (trimmedLast && !NAME_PATTERN.test(trimmedLast)) {
      setNameError('Last name must be 4-32 characters.')
      return
    }

    setSavingName(true)
    const { error } = await updateProfileName(profile.id, trimmedFirst, trimmedLast || null)
    setSavingName(false)

    if (error) {
      setNameError(error.message)
      return
    }

    await refreshProfile()
    setNameSuccess('Saved.')
  }

  const handleBioSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBioError(null)
    setBioSuccess(null)

    const trimmedBio = bio.trim()
    if (trimmedBio.length > BIO_MAX_LENGTH) {
      setBioError(`Bio must be ${BIO_MAX_LENGTH} characters or fewer.`)
      return
    }

    setSavingBio(true)
    const { error } = await updateProfileBio(profile.id, trimmedBio || null)
    setSavingBio(false)

    if (error) {
      setBioError(error.message)
      return
    }

    await refreshProfile()
    setBioSuccess('Saved.')
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

  const handleAvatarFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setAvatarError(null)
    setSelectedAvatarFile(event.target.files?.[0] ?? null)
  }

  const handleApplyAvatar = async () => {
    if (!selectedAvatarFile) return
    setAvatarError(null)
    setUploadingAvatar(true)

    const result = await uploadAvatar(profile.id, selectedAvatarFile)
    setUploadingAvatar(false)

    if ('error' in result) {
      setAvatarError(result.error)
      return
    }

    setSelectedAvatarFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    await refreshProfile()
  }

  const closeDeleteConfirm = () => {
    setShowDeleteConfirm(false)
    setDeletePassword('')
    setDeleteError(null)
  }

  const handleDeleteAccount = async () => {
    setDeleteError(null)
    setDeleting(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password: deletePassword,
    })
    if (signInError) {
      setDeleteError('Incorrect password.')
      setDeleting(false)
      return
    }

    const { error: rpcError } = await supabase.rpc('delete_own_account')
    if (rpcError) {
      setDeleteError(rpcError.message)
      setDeleting(false)
      return
    }

    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <section id="profile-page">
      <div className="profile-box" id="profile-photo-box">
        <h2>Profile photo</h2>
        <div id="profile-photo-row">
          <div id="profile-avatar">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" />
            ) : (
              <span id="profile-avatar-fallback">{profile.username.slice(0, 1).toUpperCase()}</span>
            )}
          </div>
          <div id="profile-photo-actions">
            <div id="profile-photo-buttons">
              <button type="button" className="button" onClick={() => fileInputRef.current?.click()}>
                Select image
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarFileChange} hidden />
              <button
                type="button"
                className="button primary"
                onClick={() => void handleApplyAvatar()}
                disabled={!selectedAvatarFile || uploadingAvatar}
              >
                {uploadingAvatar ? 'Applying…' : 'Apply'}
              </button>
            </div>
            {selectedAvatarFile && <p className="profile-subtitle">{selectedAvatarFile.name}</p>}
            {avatarError && <p className="auth-form-error">{avatarError}</p>}
          </div>
        </div>
      </div>

      <div className="profile-grid-2">
        <div className="profile-box">
          <h2>Username</h2>
          <p className="profile-subtitle">{profile.username}</p>
        </div>
        <div className="profile-box">
          <h2>Email</h2>
          <p className="profile-subtitle">{profile.email}</p>
        </div>
      </div>

      <div className="profile-grid-2">
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

      <form className="profile-card" id="profile-bio-box" onSubmit={handleBioSubmit}>
        <h2>Profile description</h2>
        <div className="auth-field">
          <textarea
            id="bio"
            aria-label="Profile description"
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            maxLength={BIO_MAX_LENGTH}
            rows={4}
            placeholder="Tell other riders a bit about yourself…"
          />
        </div>
        {bioError && <p className="auth-form-error">{bioError}</p>}
        {bioSuccess && <p className="auth-success">{bioSuccess}</p>}
        <button type="submit" className="button primary" disabled={savingBio}>
          {savingBio ? 'Saving…' : 'Save description'}
        </button>
      </form>

      <div id="profile-danger-zone">
        <button type="button" id="profile-logout" onClick={() => void signOut()}>
          Log out
        </button>
        <button type="button" className="button danger" onClick={() => setShowDeleteConfirm(true)}>
          Delete profile
        </button>
      </div>

      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete your account?"
          message="This permanently deletes your profile, posts, and comments. Enter your password to confirm."
          confirmLabel="Delete my account"
          danger
          confirming={deleting}
          confirmDisabled={!deletePassword}
          error={deleteError}
          onConfirm={() => void handleDeleteAccount()}
          onCancel={closeDeleteConfirm}
        >
          <AuthField htmlFor="deletePassword" label="Password">
            <PasswordInput
              id="deletePassword"
              value={deletePassword}
              onChange={(event) => setDeletePassword(event.target.value)}
              autoComplete="new-password"
            />
          </AuthField>
        </ConfirmDialog>
      )}
    </section>
  )
}

export default Profile
