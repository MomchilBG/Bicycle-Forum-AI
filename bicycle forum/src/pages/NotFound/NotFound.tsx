import { Link } from 'react-router-dom'
import './NotFound.css'

function NotFound() {
  return (
    <section id="not-found-page">
      <h1>404</h1>
      <p>This page doesn&apos;t exist.</p>
      <Link to="/" className="button primary">
        Back to home
      </Link>
    </section>
  )
}

export default NotFound
