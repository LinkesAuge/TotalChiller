# Forum System Design — Reddit-style Discussion Board

**Date**: 2026-02-07  
**Status**: Implemented

## Overview

A Reddit-like discussion forum for [THC] Chiller & Killer, enabling members to create posts, vote, comment, and engage in categorized discussions. Designed for clan coordination, strategy sharing, and community building.

## Architecture

### Database Schema

| Table                 | Purpose                                                                 |
| --------------------- | ----------------------------------------------------------------------- |
| `forum_categories`    | Fixed categories (General, Strategy, War, Off-Topic, Help, Suggestions) |
| `forum_posts`         | User-created discussion threads                                         |
| `forum_votes`         | Upvote/downvote on posts (one per user per post)                        |
| `forum_comments`      | Threaded comments with nesting                                          |
| `forum_comment_votes` | Upvote/downvote on comments                                             |

### Key Design Decisions

1. **Single-page pattern**: `/forum` route with `forum-client.tsx` managing list/detail views via state, matching existing app patterns (news, events, messages).
2. **Clan-scoped**: All forum data is scoped to the user's current clan via `clan_id`.
3. **Vote system**: Net score (upvotes - downvotes) with one vote per user per post/comment. Users can change their vote.
4. **Threaded comments**: One level of nesting (parent comments and replies), keeping UI simple.
5. **Categories**: Stored in DB, seeded with defaults. Not user-creatable.
6. **Sorting**: Hot (score + recency), New (chronological), Top (highest score).
7. **Role-based moderation**: Content managers (owner/admin/moderator/editor) can pin, lock, and delete any post.
8. **Author resolution**: Client-side profile resolution, matching existing pattern.

### UI Components

- **Forum List View**: Category tabs, sort toggle, post cards with vote arrows
- **Post Detail View**: Full post content, vote buttons, comment thread
- **Create Post Form**: Title, content (textarea with markdown toolbar + preview), category selector
- **Unified Comment/Reply Form**: Single form at top of comments section with markdown toolbar, Write/Preview tabs, image upload/paste/drop, and markdown hint. Contextually handles top-level comments and replies — clicking "Reply" on a comment shows a "Replying to [username]" indicator and scrolls to the form.
- **Comment Edit Form**: Inline markdown toolbar with Write/Preview tabs and image support
- **Vote Button**: Up/down arrows with score display

### Data Flow

1. User loads `/forum` → fetch categories + posts for current clan
2. Category/sort selection → re-fetch filtered posts
3. Click post → switch to detail view, fetch comments
4. Vote → optimistic update + Supabase upsert
5. Comment → insert + refresh thread

## Translations

Added to both `de.json` and `en.json` under the `forum` key.

## CSS

Forum-specific styles added to `globals.css` following existing card/grid patterns with the dark/gold theme.
