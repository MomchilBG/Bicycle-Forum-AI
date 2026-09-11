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

There is no test runner configured yet (no test script, no test framework installed). Supabase has not been added yet either — no client, env vars, or schema exist in the repo yet; see Requirements.md for what the schema needs to cover.

## Commit hygiene

Commit finished, working increments of the forum with clear, descriptive commit messages (not just at the end of a session) and push them, so `origin/main` always has a recent, working saved version of the project to fall back to. Verify `npm run lint` and `npm run build` pass before committing.

## Intended architecture (from Requirements.md)

The project is meant to be a **TypeScript + React + Vite** bicycle forum, with **Supabase** as the backing store and for authentication. Do not build a custom auth entity — Supabase auth is the system of record for login/session state.

Key domain entities and rules to preserve when implementing data models and validation:

- **User**: first name + last name (4–32 chars each), email (valid, unique) and/or username.
- **Admin**: first name + last name (4–32 chars each), email (valid, unique), optional phone number.
- **Post**: belongs to a user, has a title (16–64 chars), content (32–8192 chars), comments, and a like count.
- **Comments** are replies to posts, authored by other users.
- **Tags**: lowercase-only, deduplicated (reuse existing tag rows instead of creating duplicates), attached to a post during post-editing (not at creation time). Post authors manage tags on their own posts; admins can manage tags on any post. Tags drive search.
- **Reputation**: a per-user score that updates automatically when a post/comment is upvoted or downvoted (and reverses when a vote is removed).
- **Badges**: auto-awarded on milestones (post count, comment count, reputation thresholds, tenure); shown on profile and next to the username on posts/comments.

Application surfaces to keep separated by access level:

- **Public part** (no auth): landing page with platform stats (user count, post count), top 10 most-commented posts, 10 most recent posts, registration/login, light/dark mode toggle.
- **Private part** (authenticated users): browse/sort/filter posts, view a single post with comments/likes/actions inline, edit profile (username is immutable after registration; optional profile photo), create posts, edit/delete only own posts and comments, comment on any post.
- **Admin part** (admin role): search users by username/email/display name, block/unblock users (blocked users cannot post or comment), delete any post, view/filter/sort all posts.

Table organization in Supabase is left to the implementation, but should reflect the entities and relationships above (users, posts, comments, tags, post_tags, votes/reputation, badges).
