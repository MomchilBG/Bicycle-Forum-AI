# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

The Vite/React/TypeScript app lives in the `bicycle forum/` subdirectory (not the repo root) — run all commands from there:

```
cd "bicycle forum"
npm run dev       # start the Vite dev server
npm run build     # type-check (tsc -b) then production build
npm run lint      # eslint .
npm run preview   # preview the production build locally
```

There is no test runner configured yet (no test script, no test framework installed).

Supabase is set up: the client lives at `src/lib/supabaseClient.ts` (reads `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` from `.env.local` — copy `.env.example` to get started), generated row/table types are in `src/lib/database.types.ts`, and the schema lives in `supabase/migrations/01`–`18` (profiles/auth wiring, posts+comments, tags, badges, votes+reputation, hardening passes, an `avatars` Storage bucket, `posts.dislike_count`, `search_posts()`, comment replies, and immutability guards on posts/comments' identity fields now that both are editable). Apply new migrations with the Supabase MCP tools (`apply_migration` against the project, then mirror the same SQL into a new numbered file here) rather than hand-editing the live schema; regenerate `database.types.ts` via `generate_typescript_types` after any schema change instead of hand-editing it.

## Commit hygiene

Commit finished, working increments of the forum with clear, descriptive commit messages (not just at the end of a session) and push them, so `origin/main` always has a recent, working saved version of the project to fall back to. Verify `npm run lint` and `npm run build` pass before committing.

## Intended architecture (from Requirements.md)

The project is meant to be a **TypeScript + React + Vite** bicycle forum, with **Supabase** as the backing store and for authentication. Do not build a custom auth entity — Supabase auth is the system of record for login/session state.

Key domain entities and rules to preserve when implementing data models and validation:

- **User**: first name + last name (4–32 chars each), email (valid, unique) and/or username. Username is set at registration and immutable afterward; an optional profile photo is stored in the `avatars` Storage bucket (public read, owner-only write) and referenced by `profiles.avatar_url`.
- **Admin**: first name + last name (4–32 chars each), email (valid, unique), optional phone number.
- **Post**: belongs to a user, has a title (16–64 chars), content (32–8192 chars), comments, and separate upvote/downvote counts (`like_count`/`dislike_count`) — the UI shows their difference as a single score, with the raw split available on hover.
- **Comments** are replies to posts, authored by other users.
- **Votes**: one row per (voter, post-or-comment) in `votes` with `value` of `1` or `-1`; a trigger keeps `posts.like_count`/`dislike_count` and the content author's `profiles.reputation` in sync on insert/update/delete, and blocks voting on your own content.
- **Tags**: lowercase-only, deduplicated (reuse existing tag rows instead of creating duplicates), attached to a post at creation and editable afterward via the edit-post form. Post authors manage tags on their own posts; admins can manage tags on any post (not yet built - see status below). Tags drive search and are clickable wherever shown.
- **Reputation**: a per-user score that updates automatically when a post/comment is upvoted or downvoted (and reverses when a vote is removed).
- **Badges**: auto-awarded on milestones (post count, comment count, reputation thresholds, tenure); shown next to the username on posts and comments alike (not yet surfaced on the profile page itself).

Application surfaces to keep separated by access level:

- **Public part** (no auth): landing page with platform stats (user count, post count), top 10 most-commented posts, 10 most recent posts, registration/login, light/dark mode toggle.
- **Private part** (authenticated users): browse/sort/filter posts, view a single post with comments/likes/actions inline, edit profile (username is immutable after registration; optional profile photo), create posts, edit/delete only own posts and comments, comment on any post.
- **Admin part** (admin role): search users by username/email/display name, block/unblock users (blocked users cannot post or comment), delete any post, view/filter/sort all posts.

Table organization in Supabase is left to the implementation, but should reflect the entities and relationships above (users, posts, comments, tags, post_tags, votes/reputation, badges).

## Current implementation status

What's built so far, so a new session doesn't have to rediscover it from the diff:

- **Auth**: `src/auth/AuthProvider.tsx` + `AuthContext.ts` wrap Supabase auth, exposing `session`, `user`, `profile` (the `profiles` row), `loading`, `signOut`, and `refreshProfile` (call after writing to `profiles` so the rest of the app picks up the change without a reload). Register/Login pages are built (`src/pages/Register`, `src/pages/Login`); login accepts a username or email, resolving a username to its email via the `email_for_username` RPC first. Route guarding for authenticated-only pages is `src/components/RequireAuth/RequireAuth.tsx`.
- **Public part**: Home page (`src/pages/Home`) has the hero, platform stats (from the `platform_stats` view), and the most-commented/most-recent lists (10 each, via `src/lib/posts.ts`). The Join/Log in CTAs hide once signed in. Light/dark theme toggle is in `src/theme/`.
- **Navbar** (`src/components/Navbar`): Home, a "Posts" link (signed-in users only, to `/posts` with no query - just the plain browse view), "New post" (signed-in, non-blocked users), a search bar (signed-in only), then the signed-in user's avatar (linking to `/profile`) and the theme toggle. There's no separate log-out control here — it lives on the profile page instead, to avoid accidental clicks. It's `position: sticky` (stays visible while scrolling a long thread) - if you touch `#root`'s overflow again, keep it `overflow-x: clip` rather than `hidden`, since `hidden` implicitly forces `overflow-y: auto` and silently breaks the sticky positioning.
- **Profile page** (`/profile`, auth-guarded, `src/pages/Profile`): edit first/last name, change password, upload a profile photo (click the avatar itself — no separate button; `src/lib/profile.ts` handles the Storage upload), a "Your posts" panel, and the log-out button.
- **Create/edit post** (`/posts/new` and `/posts/:id/edit`, both auth-guarded, the latter also checking the viewer owns the post): share `src/components/PostForm` (title/content/tags field - type + "Add tag" button or Enter, lowercased like the username field, shown as removable bubbles) - `src/pages/CreatePost` and `src/pages/EditPost` differ only in initial values and the submit handler (insert vs. update-and-diff-tags). Blocked users see a notice instead of the form (also enforced server-side by RLS). `src/lib/tags.ts` reuses an existing `tags` row by name instead of creating a duplicate; `replacePostTags()` handles the edit case by clearing and reattaching rather than diffing.
- **Post view** (`/posts/:id`, `src/pages/PostView`, deliberately **not** auth-guarded — anyone can read a post and its comments, unlike the "Private part" grouping above, per an explicit product call): author card (avatar level with name/username, badges in their own row underneath), title/content, clickable tags (link to the equivalent search) under the content, upvote/downvote buttons with a net score box between them (hover or keyboard-focus reveals the raw upvote/downvote split), and a comments section. The post author sees Edit/Delete links; both post and comments show "(edited)" next to their timestamp once their content has actually changed (not just voted on - see the `updated_at` note below). Each comment shows its author's badges next to their username, can be replied to (one level of nesting - `comments.parent_comment_id`; replies don't themselves offer a further "Reply"), and its own author gets Edit (inline) / Delete links. Voting, commenting, replying, editing and deleting all require a signed-in, non-blocked user, enforced both client-side and via RLS/triggers (`src/lib/postDetail.ts` has the queries/mutations); signed-out visitors see "Log in to vote"/"Log in to comment" prompts instead. Delete uses a native `window.confirm()` - fine for real users, but it blocks Claude in Chrome's browser automation (per the tool's own warning), so verify delete via a direct authenticated REST call instead of clicking it when testing.
- **Browse/search** (`/posts`, auth-guarded, `src/pages/PostsBrowse`): a navbar search bar (`src/components/SearchBar`) parses `#tag_name word word` into tag filters and title words (an underscore in a `#tag` stands in for a space, since the box itself is space-delimited) and navigates to `/posts?q=...`; the page lists matching posts (Most recent / Top score sort, Load more pagination) via the `search_posts()` Postgres function, which requires a post to match every given word and carry every given tag. Visiting `/posts` directly (e.g. the navbar's "Posts" link) is the same page with an empty query - all posts, most recent first.
- **404**: any unmatched path renders `src/pages/NotFound` inside the normal layout (navbar still shows).
- **Colors**: badges are gold/amber (`--badge`/`--badge-bg`/`--badge-border`) and tags are purple/accent (`--accent`/`--accent-bg`/`--accent-border`) - deliberately different so the two pill styles read as distinct concepts. Error messages (`.auth-error`, `.auth-form-error`) are tinted bubbles via `--danger-bg`/`--danger-border`, sized to their text.
- **`updated_at` gotcha**: `posts`/`comments` each have their own trigger (`set_posts_updated_at`/`set_comments_updated_at`) that only bumps `updated_at` when the user-editable columns actually change (title/content for posts, content for comments) - NOT the generic shared `set_updated_at()` used by `profiles`. If you add a new mutable column to either table, make sure it's covered by that same trigger's condition, or actions that touch it (like votes touching `like_count`) will start silently marking things as edited.
- **Shared bits**: `PasswordInput` (`src/components/PasswordInput`) gives every password field a show/hide eye-icon toggle. `formatDateTime()` (`src/lib/formatDate.ts`) renders timestamps in the viewer's own timezone, year down to minutes. `src/lib/publicProfiles.ts` has the shared `public_profiles()` batching helper used by posts/postDetail/search. The page always reserves a vertical scrollbar (`overflow-y: scroll` on `:root`) so short pages don't shift width relative to long ones.
- **Not built yet**: the entire admin part (user search, block/unblock, delete-any-post — `is_admin()`/`profiles.role` exist at the DB level but there's no admin UI), and badges aren't yet shown on the profile page itself.
