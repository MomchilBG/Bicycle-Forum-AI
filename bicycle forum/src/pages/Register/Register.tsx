import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import '../auth.css'

interface FormValues {
  firstName: string
  lastName: string
  username: string
  email: string
  password: string
  confirmPassword: string
}

type FormErrors = Partial<Record<keyof FormValues, string>>
type Touched = Partial<Record<keyof FormValues, boolean>>

const NAME_PATTERN = /^.{4,32}$/
const USERNAME_PATTERN = /^[a-z0-9_]{3,32}$/
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

// Only the checks that don't need a round-trip to the database - those run
// live as the user types/blurs. Username availability still has to be
// checked against Supabase at submit time.
function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {}

  if (!NAME_PATTERN.test(values.firstName.trim())) {
    errors.firstName = 'First name must be 4-32 characters.'
  }
  if (!NAME_PATTERN.test(values.lastName.trim())) {
    errors.lastName = 'Last name must be 4-32 characters.'
  }
  if (!USERNAME_PATTERN.test(values.username)) {
    errors.username = 'Username must be 3-32 characters: lowercase letters, numbers, or underscores.'
  }
  if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = 'Enter a valid email address.'
  }
  if (values.password.length < 6) {
    errors.password = 'Password must be at least 6 characters.'
  }
  if (values.confirmPassword !== values.password) {
    errors.confirmPassword = 'Passwords do not match.'
  }

  return errors
}

function Register() {
  const navigate = useNavigate()
  const [values, setValues] = useState<FormValues>({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [touched, setTouched] = useState<Touched>({})
  const [usernameTakenError, setUsernameTakenError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Derived from the latest values on every render, so an error clears the
  // moment it's fixed instead of waiting for the next blur or submit.
  const liveErrors = validate(values)

  function fieldError(field: keyof FormValues): string | undefined {
    if (!touched[field]) return undefined
    if (field === 'username' && usernameTakenError && !liveErrors.username) return usernameTakenError
    return liveErrors[field]
  }

  function updateField<K extends keyof FormValues>(field: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }))
    if (field === 'username') setUsernameTakenError(null)
  }

  function markTouched(field: keyof FormValues) {
    setTouched((current) => ({ ...current, [field]: true }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setSuccessMessage(null)
    setTouched({
      firstName: true,
      lastName: true,
      username: true,
      email: true,
      password: true,
      confirmPassword: true,
    })

    if (Object.keys(liveErrors).length > 0) return

    setSubmitting(true)

    // signUp()'s error message masks the underlying unique-constraint
    // violation from the profiles.username trigger (it just returns a
    // generic "Database error saving new user"), so availability has to be
    // checked proactively rather than parsed out of a failed signup.
    const { data: usernameTaken } = await supabase.rpc('is_username_taken', { p_username: values.username })
    if (usernameTaken) {
      setSubmitting(false)
      setUsernameTakenError('This username is already taken.')
      return
    }

    const { data, error } = await supabase.auth.signUp({
      email: values.email.trim(),
      password: values.password,
      options: {
        data: {
          first_name: values.firstName.trim(),
          last_name: values.lastName.trim(),
          username: values.username,
        },
      },
    })
    setSubmitting(false)

    if (error) {
      if (error.message.toLowerCase().includes('already registered')) {
        setFormError('This email is already registered.')
      } else if (error.message.includes('profiles_username_key')) {
        // Rare race: someone else took the username between the check above
        // and this insert.
        setUsernameTakenError('This username is already taken.')
      } else if (error.message.toLowerCase().includes('database error')) {
        setFormError('Something went wrong creating your account. Please try again.')
      } else {
        setFormError(error.message)
      }
      return
    }

    if (data.session) {
      navigate('/')
      return
    }

    setSuccessMessage('Check your email to confirm your account before logging in.')
  }

  return (
    <section id="auth-page">
      <form id="auth-card" onSubmit={handleSubmit} noValidate>
        <h1>Register</h1>

        <div className="auth-field">
          <label htmlFor="firstName">First name</label>
          <input
            id="firstName"
            value={values.firstName}
            onChange={(event) => updateField('firstName', event.target.value)}
            onBlur={() => markTouched('firstName')}
            placeholder="4-32 characters"
            maxLength={32}
            autoComplete="given-name"
          />
          {fieldError('firstName') && <span className="auth-error">{fieldError('firstName')}</span>}
        </div>

        <div className="auth-field">
          <label htmlFor="lastName">Last name</label>
          <input
            id="lastName"
            value={values.lastName}
            onChange={(event) => updateField('lastName', event.target.value)}
            onBlur={() => markTouched('lastName')}
            placeholder="4-32 characters"
            maxLength={32}
            autoComplete="family-name"
          />
          {fieldError('lastName') && <span className="auth-error">{fieldError('lastName')}</span>}
        </div>

        <div className="auth-field">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            value={values.username}
            onChange={(event) => updateField('username', event.target.value.toLowerCase())}
            onBlur={() => markTouched('username')}
            placeholder="3-32 chars: lowercase letters, numbers, underscores"
            maxLength={32}
            autoComplete="username"
          />
          {fieldError('username') && <span className="auth-error">{fieldError('username')}</span>}
        </div>

        <div className="auth-field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={values.email}
            onChange={(event) => updateField('email', event.target.value)}
            onBlur={() => markTouched('email')}
            placeholder="you@example.com"
            autoComplete="email"
          />
          {fieldError('email') && <span className="auth-error">{fieldError('email')}</span>}
        </div>

        <div className="auth-field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={values.password}
            onChange={(event) => updateField('password', event.target.value)}
            onBlur={() => markTouched('password')}
            placeholder="At least 6 characters"
            autoComplete="new-password"
          />
          {fieldError('password') && <span className="auth-error">{fieldError('password')}</span>}
        </div>

        <div className="auth-field">
          <label htmlFor="confirmPassword">Confirm password</label>
          <input
            id="confirmPassword"
            type="password"
            value={values.confirmPassword}
            onChange={(event) => updateField('confirmPassword', event.target.value)}
            onBlur={() => markTouched('confirmPassword')}
            placeholder="Re-enter your password"
            autoComplete="new-password"
          />
          {fieldError('confirmPassword') && <span className="auth-error">{fieldError('confirmPassword')}</span>}
        </div>

        {formError && <p className="auth-form-error">{formError}</p>}
        {successMessage && <p className="auth-success">{successMessage}</p>}

        <button type="submit" className="button primary" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </button>

        <p id="auth-switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </form>
    </section>
  )
}

export default Register
