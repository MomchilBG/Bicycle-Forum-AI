import { NavLink } from 'react-router-dom'
import { useTheme } from '../../theme/ThemeContext'
import { useAuth } from '../../auth/AuthContext'
import SearchBar from '../SearchBar/SearchBar'
import './Navbar.css'

function navLinkClass({ isActive }: { isActive: boolean }) {
  return isActive ? 'active' : undefined
}

function Navbar() {
  const { theme, toggleTheme } = useTheme()
  const { profile } = useAuth()
  const isDark = theme === 'dark' || (theme === null && window.matchMedia('(prefers-color-scheme: dark)').matches)

  return (
    <header id="navbar">
      <NavLink to="/" id="brand">
        🚲 Bicycle Forum
      </NavLink>
      <nav>
        <NavLink to="/" end className={navLinkClass}>
          Home
        </NavLink>
        {profile ? (
          !profile.is_blocked && (
            <NavLink to="/posts/new" className={navLinkClass}>
              New post
            </NavLink>
          )
        ) : (
          <>
            <NavLink to="/login" className={navLinkClass}>
              Log in
            </NavLink>
            <NavLink to="/register" className={navLinkClass}>
              Register
            </NavLink>
          </>
        )}
      </nav>
      {profile && <SearchBar />}
      {profile && (
        <NavLink to="/profile" id="nav-avatar" aria-label="Your profile" className={navLinkClass}>
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" />
          ) : (
            <span id="nav-avatar-fallback">{profile.username.slice(0, 1).toUpperCase()}</span>
          )}
        </NavLink>
      )}
      <button
        type="button"
        id="theme-toggle"
        onClick={toggleTheme}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDark ? '☀️' : '🌙'}
      </button>
    </header>
  )
}

export default Navbar
