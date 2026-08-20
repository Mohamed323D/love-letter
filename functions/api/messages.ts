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
  isArchived: number;
};

const PREVIEW_SUBMISSION_ORIGIN = "https://lovepageher-brracizl.manus.space";

function previewCorsHeaders(request: Request): Record<string, string> {
  return request.headers.get("Origin") === PREVIEW_SUBMISSION_ORIGIN
    ? { "Access-Control-Allow-Origin": PREVIEW_SUBMISSION_ORIGIN, Vary: "Origin" }
    : {};
}

function acceptsPublicSubmission(request: Request) {
  return requireSameOrigin(request) || request.headers.get("Origin") === PREVIEW_SUBMISSION_ORIGIN;
}

export const onRequest = async (context: PagesContext<InboxEnv>) => {
  const { request, env } = context;
  if (!hasConfiguration(env)) return json({ error: "Love Inbox لم يتم إعداده بعد." }, { status: 503 });

  if (request.method === "OPTIONS" && request.headers.get("Origin") === PREVIEW_SUBMISSION_ORIGIN) {
    return new Response(null, {
      status: 204,
      headers: {
        ...previewCorsHeaders(request),
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  if (request.method === "POST") {
    if (!acceptsPublicSubmission(request)) return json({ error: "طلب غير مسموح." }, { status: 403, headers: previewCorsHeaders(request) });
    const payload = await readJson(request);
    if (!payload) return json({ error: "البيانات المرسلة غير صالحة." }, { status: 400, headers: previewCorsHeaders(request) });
    const submission = validateSubmission(payload);
    if ("error" in submission) return json({ error: submission.error }, { status: 400, headers: previewCorsHeaders(request) });

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    await env.MESSAGES_DB
      .prepare("INSERT INTO messages (id, sender_name, subject, message, created_at, is_read) VALUES (?, ?, ?, ?, ?, 0)")
      .bind(id, submission.senderName, submission.subject, submission.message, createdAt)
      .run();

    return json({ ok: true, id, createdAt }, { status: 201, headers: previewCorsHeaders(request) });
  }

  if (request.method === "GET") {
    if (!(await hasValidSession(request, env.INBOX_SESSION_SECRET))) return json({ error: "يلزم تسجيل الدخول." }, { status: 401 });
    const view = new URL(request.url).searchParams.get("view") === "archived" ? "archived" : "inbox";
    const archivedFlag = view === "archived" ? 1 : 0;
    const { results } = await env.MESSAGES_DB
      .prepare("SELECT m.id, m.sender_name AS senderName, m.subject, m.message, m.created_at AS createdAt, m.is_read AS isRead, COALESCE(s.is_archived, 0) AS isArchived FROM messages m LEFT JOIN message_state s ON s.message_id = m.id WHERE COALESCE(s.is_archived, 0) = ? ORDER BY m.created_at DESC LIMIT 500")
      .bind(archivedFlag)
      .all<MessageRow>();
    return json({ messages: results, view });
  }

  return json({ error: "الطريقة غير مدعومة." }, { status: 405, headers: { Allow: "GET, POST" } });
};
