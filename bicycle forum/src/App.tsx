import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import RequireAuth from './components/RequireAuth/RequireAuth'
import Home from './pages/Home/Home'
import Login from './pages/Login/Login'
import Register from './pages/Register/Register'
import Profile from './pages/Profile/Profile'
import CreatePost from './pages/CreatePost/CreatePost'
import EditPost from './pages/EditPost/EditPost'
import PostView from './pages/PostView/PostView'
import PostsBrowse from './pages/PostsBrowse/PostsBrowse'
import UserProfile from './pages/UserProfile/UserProfile'
import NotFound from './pages/NotFound/NotFound'

const App = () => (
  <Routes>
    <Route element={<Layout />}>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/posts/:id" element={<PostView />} />
      <Route path="/users/:username" element={<UserProfile />} />
      <Route element={<RequireAuth />}>
        <Route path="/profile" element={<Profile />} />
        <Route path="/posts/new" element={<CreatePost />} />
        <Route path="/posts/:id/edit" element={<EditPost />} />
        <Route path="/posts" element={<PostsBrowse />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Route>
  </Routes>
)

export default App
