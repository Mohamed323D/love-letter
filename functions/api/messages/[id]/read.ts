/** Love Inbox API: Mido can mark a submitted message as read from the private dashboard. */
import {
  hasConfiguration,
  hasValidSession,
  json,
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
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "رسالة غير صالحة." }, { status: 400 });
  await env.MESSAGES_DB.prepare("UPDATE messages SET is_read = 1 WHERE id = ?").bind(id).run();
  return json({ ok: true });
};
