import type { ReactNode } from 'react'

export interface AuthFieldProps {
  htmlFor: string
  label: string
  error?: string
  children: ReactNode
}

const AuthField = ({ htmlFor, label, error, children }: AuthFieldProps) => (
  <div className="auth-field">
    <label htmlFor={htmlFor}>{label}</label>
    {children}
    {error && <span className="auth-error">{error}</span>}
  </div>
)

export default AuthField
