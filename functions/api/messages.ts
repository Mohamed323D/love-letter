/** Love Inbox API: public submission and Mido-only chronological message listing. */
import {
  hasConfiguration,
  hasValidSession,
  json,
  type InboxEnv,
  type PagesContext,
  readJson,
  requireSameOrigin,
  validateSubmission,
} from "../_lib/inbox";

type MessageRow = {
  id: string;
  senderName: string;
  subject: string;
  message: string;
  createdAt: string;
  isRead: number;
};

export const onRequest = async (context: PagesContext<InboxEnv>) => {
  const { request, env } = context;
  if (!hasConfiguration(env)) return json({ error: "Love Inbox لم يتم إعداده بعد." }, { status: 503 });

  if (request.method === "POST") {
    if (!requireSameOrigin(request)) return json({ error: "طلب غير مسموح." }, { status: 403 });
    const payload = await readJson(request);
    if (!payload) return json({ error: "البيانات المرسلة غير صالحة." }, { status: 400 });
    const submission = validateSubmission(payload);
    if ("error" in submission) return json({ error: submission.error }, { status: 400 });

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    await env.MESSAGES_DB
      .prepare("INSERT INTO messages (id, sender_name, subject, message, created_at, is_read) VALUES (?, ?, ?, ?, ?, 0)")
      .bind(id, submission.senderName, submission.subject, submission.message, createdAt)
      .run();

    return json({ ok: true, id, createdAt }, { status: 201 });
  }

  if (request.method === "GET") {
    if (!(await hasValidSession(request, env.INBOX_SESSION_SECRET))) return json({ error: "يلزم تسجيل الدخول." }, { status: 401 });
    const { results } = await env.MESSAGES_DB
      .prepare("SELECT id, sender_name AS senderName, subject, message, created_at AS createdAt, is_read AS isRead FROM messages ORDER BY created_at DESC LIMIT 500")
      .all<MessageRow>();
    return json({ messages: results });
  }

  return json({ error: "الطريقة غير مدعومة." }, { status: 405, headers: { Allow: "GET, POST" } });
};
