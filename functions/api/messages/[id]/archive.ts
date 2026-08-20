import {
  hasConfiguration,
  hasValidSession,
  isValidMessageId,
  json,
  readJson,
  type InboxEnv,
  type PagesContext,
  requireSameOrigin,
} from "../../../_lib/inbox";

export const onRequestPatch = async (context: PagesContext<InboxEnv>) => {
  const { request, env } = context;
  if (!requireSameOrigin(request)) return json({ error: "طلب غير مسموح." }, { status: 403 });
  if (!hasConfiguration(env)) return json({ error: "Love Inbox لم يتم إعداده بعد." }, { status: 503 });
  if (!(await hasValidSession(request, env.INBOX_SESSION_SECRET))) return json({ error: "يلزم تسجيل الدخول." }, { status: 401 });

  const id = context.params.id;
  const payload = await readJson(request);
  if (!isValidMessageId(id) || !payload || typeof payload.archived !== "boolean") return json({ error: "حالة الأرشفة غير صالحة." }, { status: 400 });

  const archivedAt = payload.archived ? new Date().toISOString() : null;
  await env.MESSAGES_DB
    .prepare("INSERT INTO message_state (message_id, is_archived, archived_at) VALUES (?, ?, ?) ON CONFLICT(message_id) DO UPDATE SET is_archived = excluded.is_archived, archived_at = excluded.archived_at")
    .bind(id, payload.archived ? 1 : 0, archivedAt)
    .run();

  return json({ ok: true, archived: payload.archived });
};
