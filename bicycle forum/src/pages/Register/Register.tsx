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

const NAME_PATTERN = /^.{4,32}$/
const USERNAME_PATTERN = /^[a-z0-9_]{3,32}$/
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

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
  const [errors, setErrors] = useState<FormErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function updateField<K extends keyof FormValues>(field: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setSuccessMessage(null)

    const fieldErrors = validate(values)
    setErrors(fieldErrors)
    if (Object.keys(fieldErrors).length > 0) return

    setSubmitting(true)

    // signUp()'s error message masks the underlying unique-constraint
    // violation from the profiles.username trigger (it just returns a
    // generic "Database error saving new user"), so availability has to be
    // checked proactively rather than parsed out of a failed signup.
    const { data: usernameTaken } = await supabase.rpc('is_username_taken', { p_username: values.username })
    if (usernameTaken) {
      setSubmitting(false)
      setErrors((current) => ({ ...current, username: 'This username is already taken.' }))
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
        setFormError('This username is already taken.')
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
            autoComplete="given-name"
          />
          {errors.firstName && <span className="auth-error">{errors.firstName}</span>}
        </div>

        <div className="auth-field">
          <label htmlFor="lastName">Last name</label>
          <input
            id="lastName"
            value={values.lastName}
            onChange={(event) => updateField('lastName', event.target.value)}
            autoComplete="family-name"
          />
          {errors.lastName && <span className="auth-error">{errors.lastName}</span>}
        </div>

        <div className="auth-field">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            value={values.username}
            onChange={(event) => updateField('username', event.target.value.toLowerCase())}
            autoComplete="username"
          />
          {errors.username && <span className="auth-error">{errors.username}</span>}
        </div>

        <div className="auth-field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={values.email}
            onChange={(event) => updateField('email', event.target.value)}
            autoComplete="email"
          />
          {errors.email && <span className="auth-error">{errors.email}</span>}
        </div>

        <div className="auth-field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={values.password}
            onChange={(event) => updateField('password', event.target.value)}
            autoComplete="new-password"
          />
          {errors.password && <span className="auth-error">{errors.password}</span>}
        </div>

        <div className="auth-field">
          <label htmlFor="confirmPassword">Confirm password</label>
          <input
            id="confirmPassword"
            type="password"
            value={values.confirmPassword}
            onChange={(event) => updateField('confirmPassword', event.target.value)}
            autoComplete="new-password"
          />
          {errors.confirmPassword && <span className="auth-error">{errors.confirmPassword}</span>}
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
