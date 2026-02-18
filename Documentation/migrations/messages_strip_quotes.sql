-- Migration: Strip trailing blockquotes from message content
-- One-time cleanup for the chat-timeline conversion.
-- Old replies had the previous message auto-quoted as "> " lines.
-- In the flat chat timeline the context is visible above, making these redundant.
-- Only strips trailing blockquote sections; mid-message quotes are preserved.

UPDATE messages
SET content = rtrim(regexp_replace(
  content,
  E'\\n{0,4}(>[ \\t].*\\n?)+\\s*$',
  ''
))
WHERE content ~ E'\\n>[ \\t]';
