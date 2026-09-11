import { Link } from 'react-router-dom'
import PostSummaryCard from '../../components/PostSummaryCard/PostSummaryCard'
import { getMostCommentedPosts, getMostRecentPosts, getPlatformStats } from '../../data/mockForumData'
import './Home.css'

const features = [
  { title: 'Post & discuss', description: 'Share posts and reply to other riders — from bike builds to route reports.' },
  { title: 'Tags & search', description: 'Find posts fast by searching tags like "gravel" or "maintenance".' },
  { title: 'Reputation & badges', description: 'Earn reputation from upvotes and unlock badges as you contribute.' },
  { title: 'Light & dark mode', description: 'Switch themes any time with the toggle in the navbar.' },
]

function Home() {
  const stats = getPlatformStats()
  const mostCommented = getMostCommentedPosts()
  const mostRecent = getMostRecentPosts()

  return (
    <>
      <section id="hero">
        <h1>Welcome to the Bicycle Forum</h1>
        <p>A place for cyclists to share builds, routes, and advice.</p>
        <div id="hero-stats">
          <div>
            <strong>{stats.userCount.toLocaleString()}</strong>
            <span>riders joined</span>
          </div>
          <div>
            <strong>{stats.postCount.toLocaleString()}</strong>
            <span>posts created</span>
          </div>
        </div>
        <div id="hero-cta">
          <Link to="/register" className="button primary">
            Join the forum
          </Link>
          <Link to="/login" className="button">
            Log in
          </Link>
        </div>
      </section>

      <section id="features">
        {features.map((feature) => (
          <div key={feature.title} className="feature-card">
            <h2>{feature.title}</h2>
            <p>{feature.description}</p>
          </div>
        ))}
      </section>

      <section id="post-lists">
        <div>
          <h2>Most commented</h2>
          <ul>
            {mostCommented.map((post) => (
              <PostSummaryCard key={post.id} post={post} />
            ))}
          </ul>
        </div>
        <div>
          <h2>Most recent</h2>
          <ul>
            {mostRecent.map((post) => (
              <PostSummaryCard key={post.id} post={post} />
            ))}
          </ul>
        </div>
      </section>
    </>
  )
}

export default Home
