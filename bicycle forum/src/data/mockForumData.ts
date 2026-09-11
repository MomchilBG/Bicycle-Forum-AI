export interface PostSummary {
  id: string
  title: string
  author: string
  commentCount: number
  createdAt: string
}

export interface PlatformStats {
  userCount: number
  postCount: number
}

const mockPosts: PostSummary[] = [
  { id: '1', title: 'Best tires for wet gravel commutes?', author: 'RidesInRain', commentCount: 42, createdAt: '2026-09-10' },
  { id: '2', title: 'Restored my old steel frame this weekend', author: 'RustBuster', commentCount: 37, createdAt: '2026-09-08' },
  { id: '3', title: 'Bikepacking the Balkans: route notes', author: 'MomchilBG', commentCount: 31, createdAt: '2026-09-11' },
  { id: '4', title: 'Disc brakes vs rim brakes in 2026', author: 'GearHead', commentCount: 28, createdAt: '2026-09-05' },
  { id: '5', title: 'How to fit a road bike properly', author: 'FitCoach', commentCount: 24, createdAt: '2026-09-09' },
  { id: '6', title: 'Cheap vs expensive helmets: worth it?', author: 'SafetyFirst', commentCount: 19, createdAt: '2026-09-07' },
  { id: '7', title: 'Winter commuting setup checklist', author: 'ColdRider', commentCount: 16, createdAt: '2026-09-11' },
  { id: '8', title: 'Single speed conversion questions', author: 'MinimalGears', commentCount: 14, createdAt: '2026-09-04' },
  { id: '9', title: 'Best local trails near the city center', author: 'TrailBlazer', commentCount: 12, createdAt: '2026-09-06' },
  { id: '10', title: 'Chain maintenance schedule that works', author: 'CleanDrivetrain', commentCount: 9, createdAt: '2026-09-03' },
]

// Placeholder data source; swap these for Supabase queries once the schema is in place.
export function getPlatformStats(): PlatformStats {
  return { userCount: 1284, postCount: 3927 }
}

export function getMostCommentedPosts(limit = 10): PostSummary[] {
  return [...mockPosts].sort((a, b) => b.commentCount - a.commentCount).slice(0, limit)
}

export function getMostRecentPosts(limit = 10): PostSummary[] {
  return [...mockPosts].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit)
}
