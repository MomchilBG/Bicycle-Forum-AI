import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import type { SearchMode } from '../../lib/search'
import './SearchBar.css'

const MODE_PREFIX: Record<SearchMode, string> = {
  posts: '',
  tags: '#',
  users: 'u/',
}

const MODE_PLACEHOLDER: Record<SearchMode, string> = {
  posts: 'Search posts by title',
  tags: 'Search by tag_name',
  users: 'Search by username',
}

// Applies the selected mode's prefix to every token typed into the box, so
// picking "Tags"/"Users" from the dropdown means the user never has to type
// # or u/ themselves - mirrors how parseSearchQuery reads those prefixes
// back out on the results page.
const buildSearchQuery = (value: string, mode: SearchMode): string => {
  const prefix = MODE_PREFIX[mode]
  if (!prefix) return value.trim()

  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => (token.toLowerCase().startsWith(prefix) ? token : `${prefix}${token}`))
    .join(' ')
}

const SearchBar = () => {
  const navigate = useNavigate()
  const [value, setValue] = useState('')
  const [mode, setMode] = useState<SearchMode>('posts')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const query = buildSearchQuery(value, mode)
    navigate(query ? `/posts?q=${encodeURIComponent(query)}` : '/posts')
  }

  return (
    <form id="search-bar" role="search" onSubmit={handleSubmit}>
      <div id="search-bar-mode-wrap">
        <select
          id="search-bar-mode"
          value={mode}
          onChange={(event) => setMode(event.target.value as SearchMode)}
          aria-label="Search type"
        >
          <option value="posts">Posts</option>
          <option value="tags">Tags</option>
          <option value="users">Users</option>
        </select>
        <svg id="search-bar-mode-caret" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={MODE_PLACEHOLDER[mode]}
        aria-label="Search"
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
