-- ─────────────────────────────────────────────────────────────
-- UniPost · Post-RC1 correctness pass · ai_messages conversation ownership
--
-- ai_messages_insert_own (0003_ai.sql) only checked auth.uid() = user_id on
-- the new row — it never verified conversation_id actually belongs to that
-- user's own ai_conversations row. A user who knows/guesses another user's
-- conversation UUID could attach a row to it (app/api/ai/chat/route.ts
-- accepts a client-supplied conversationId with no ownership check before
-- inserting). The select_own policy still prevents any cross-user *read* of
-- that conversation, so this was data-integrity pollution, not a content
-- leak — but it's a real gap against the own-row invariant enforced
-- everywhere else, and would bite any future code that reads a conversation
-- via the admin client trusting conversation_id membership.
--
-- Purely additive narrowing — legitimate own-conversation inserts are
-- unaffected; only inserts against a conversation_id you don't own now fail.
-- ─────────────────────────────────────────────────────────────

drop policy if exists ai_messages_insert_own on public.ai_messages;
create policy ai_messages_insert_own on public.ai_messages for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.ai_conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );
