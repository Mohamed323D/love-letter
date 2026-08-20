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
  if (!isValidMessageId(id) || !payload || typeof payload.isRead !== "boolean") return json({ error: "حالة الرسالة غير صالحة." }, { status: 400 });

  await env.MESSAGES_DB.prepare("UPDATE messages SET is_read = ? WHERE id = ?").bind(payload.isRead ? 1 : 0, id).run();
  return json({ ok: true, isRead: payload.isRead });
};
