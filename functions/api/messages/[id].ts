import {
  hasConfiguration,
  hasValidSession,
  isValidMessageId,
  json,
  type InboxEnv,
  type PagesContext,
  requireSameOrigin,
} from "../../_lib/inbox";

export const onRequestDelete = async (context: PagesContext<InboxEnv>) => {
  const { request, env } = context;
  if (!requireSameOrigin(request)) return json({ error: "طلب غير مسموح." }, { status: 403 });
  if (!hasConfiguration(env)) return json({ error: "Love Inbox لم يتم إعداده بعد." }, { status: 503 });
  if (!(await hasValidSession(request, env.INBOX_SESSION_SECRET))) return json({ error: "يلزم تسجيل الدخول." }, { status: 401 });

  const id = context.params.id;
  if (!isValidMessageId(id)) return json({ error: "رسالة غير صالحة." }, { status: 400 });

  await env.MESSAGES_DB.prepare("DELETE FROM message_state WHERE message_id = ?").bind(id).run();
  await env.MESSAGES_DB.prepare("DELETE FROM messages WHERE id = ?").bind(id).run();
  return json({ ok: true });
};
