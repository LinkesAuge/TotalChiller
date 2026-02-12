# Email-Model Messaging System Redesign

**Date**: 2026-02-12
**Status**: Approved

## Summary

Redesign the messaging system from a flat "one row per recipient" model to an email-style model with proper message/recipient separation, Gmail-style threading, and clean outbox behavior.

## Key Decisions

1. **Full email model** — flat inbox with individual messages, not conversation-grouped
2. **One sent entry per send** — broadcasts/multi-recipient sends create ONE `messages` row + N `message_recipients` rows
3. **Gmail-style thread collapsing** — inbox groups messages by `thread_id`, shows latest message + unread count
4. **Reply-to-sender threading** — private messages support reply chains via `thread_id`/`parent_id`
5. **Broadcasts are one-way** — no reply button on clan/global broadcasts
6. **Reply to sender only** — no "Reply All" functionality

## Data Model

### `messages` table (one row per authored message)

| Column         | Type                   | Description                                                |
| -------------- | ---------------------- | ---------------------------------------------------------- |
| `id`           | uuid PK                |                                                            |
| `sender_id`    | uuid FK → auth.users   | Null for system messages                                   |
| `subject`      | text                   | Optional subject line                                      |
| `content`      | text                   | Message body (markdown)                                    |
| `message_type` | text                   | `private`, `broadcast`, `clan`, `system`                   |
| `thread_id`    | uuid FK → messages(id) | Points to root message of thread (null = this IS the root) |
| `parent_id`    | uuid FK → messages(id) | Direct parent being replied to                             |
| `created_at`   | timestamptz            |                                                            |

### `message_recipients` table (one row per recipient)

| Column         | Type                   | Description               |
| -------------- | ---------------------- | ------------------------- |
| `id`           | uuid PK                |                           |
| `message_id`   | uuid FK → messages(id) |                           |
| `recipient_id` | uuid FK → auth.users   |                           |
| `is_read`      | boolean                | Default false             |
| `deleted_at`   | timestamptz            | Soft delete per recipient |
| `created_at`   | timestamptz            |                           |

### RLS Policies

**messages:**

- SELECT: `sender_id = auth.uid()` OR `id IN (SELECT message_id FROM message_recipients WHERE recipient_id = auth.uid() AND deleted_at IS NULL)`
- INSERT: `sender_id = auth.uid()`

**message_recipients:**

- SELECT: `recipient_id = auth.uid()`
- UPDATE: `recipient_id = auth.uid()` (mark read)
- DELETE: not allowed (use soft delete via `deleted_at`)

## API Design

### `GET /api/messages/inbox`

- Returns threads for the authenticated user
- Groups by `thread_id` (or message `id` for standalone messages)
- Returns latest message per thread + unread count + thread message count
- Joins profiles for sender names
- Filters: `?type=all|private|broadcast|clan`, `?search=term`
- Excludes soft-deleted (`deleted_at IS NOT NULL`)

### `GET /api/messages/sent`

- Returns `messages WHERE sender_id = me`, one row per message
- Joins `message_recipients` to include recipient list per message
- Filters: `?type=all|private|broadcast|clan`, `?search=term`

### `GET /api/messages/thread/[threadId]`

- Returns all messages in a thread, ordered chronologically
- Auto-marks unread messages as read for the requesting user
- Returns recipient list for each message

### `POST /api/messages` (unified send)

- Body: `{ recipient_ids, subject, content, message_type, parent_id? }`
- Creates ONE row in `messages`
- Creates N rows in `message_recipients`
- If `parent_id` is set, inherits `thread_id` from parent (or uses parent's `id` if parent is root)
- message_type `broadcast`/`clan` requires content-manager role
- For broadcast/clan: resolves recipient list from all users or clan members
- Generates notifications for each recipient

### `PATCH /api/messages/read/[messageId]`

- Marks message as read for the requesting user
- Updates `message_recipients.is_read` where `recipient_id = auth.uid()`

### `DELETE /api/messages/[id]`

- Soft-deletes: sets `deleted_at` on the recipient's `message_recipients` row

## UI Design

### Left Panel (Message List)

- **Inbox/Sent toggle** at top
- **Compose button**
- **Filter tabs**: All | Private | Clan | Broadcast
- **Search bar**

**Inbox items (collapsed threads):**

- Subject, sender name, latest message snippet, timestamp
- Unread count badge
- Broadcast/clan badge icon
- Sorted by latest activity

**Sent items:**

- Subject, snippet, timestamp
- Multi-recipient: "To: Alice, Bob, +3 others"
- Broadcasts: "To: All members" / "To: ClanName"
- Sorted by date sent

### Right Panel (Thread/Message View)

- Thread: all messages stacked chronologically
- Each message as a card with From, date, subject, content
- Reply box at bottom (private threads only)
- Sent view: message content + full recipient list

### Compose Form

- To field: searchable multi-recipient picker with chips
- Content managers: Broadcast to All / Broadcast to Clan options
- Subject field (required for new, auto "Re: " for replies)
- Markdown editor with image upload

## Migration Strategy

1. Create new `messages` table (renamed from old)
2. Create `message_recipients` table
3. Migrate existing data:
   - Each `broadcast_group_id` group → 1 message + N recipients
   - Regular messages → 1 message + 1 recipient
   - System messages → 1 message + 1 recipient (sender_id null)
4. Preserve read status, timestamps, subjects, content
5. Existing messages get `thread_id = null` (standalone)

## Files Changed

- `Documentation/migrations/messages_v2.sql` — new migration
- `lib/types/domain.ts` — updated types
- `app/api/messages/route.ts` — rewritten (inbox endpoint)
- `app/api/messages/sent/route.ts` — new (sent endpoint)
- `app/api/messages/thread/[threadId]/route.ts` — new (thread endpoint)
- `app/api/messages/[id]/route.ts` — updated (read/delete)
- `app/api/messages/broadcast/route.ts` — removed (merged into main POST)
- `app/messages/messages-client.tsx` — rewritten
- `messages/en.json`, `messages/de.json` — updated i18n keys
