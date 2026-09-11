import { NavLink } from 'react-router-dom'
import { useTheme } from '../../theme/ThemeContext'
import './Navbar.css'

function navLinkClass({ isActive }: { isActive: boolean }) {
  return isActive ? 'active' : undefined
}

function Navbar() {
  const { theme, toggleTheme } = useTheme()
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
        <NavLink to="/login" className={navLinkClass}>
          Log in
        </NavLink>
        <NavLink to="/register" className={navLinkClass}>
          Register
        </NavLink>
      </nav>
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
