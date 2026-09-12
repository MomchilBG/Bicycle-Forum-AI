import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import './SearchBar.css'

function SearchBar() {
  const navigate = useNavigate()
  const [value, setValue] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = value.trim()
    navigate(trimmed ? `/posts?q=${encodeURIComponent(trimmed)}` : '/posts')
  }

  return (
    <form id="search-bar" role="search" onSubmit={handleSubmit}>
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search posts or #tag_name"
        aria-label="Search posts"
      />
      <button type="submit" aria-label="Search">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </button>
    </form>
  )
}

export default SearchBar
