/** Love Inbox API: creates a signed, HTTP-only Mido dashboard session. */
import {
  createSession,
  hasConfiguration,
  json,
  type InboxEnv,
  type PagesContext,
  readJson,
  requireSameOrigin,
  sessionCookie,
  validPassword,
} from "../../_lib/inbox";

export const onRequestPost = async (context: PagesContext<InboxEnv>) => {
  const { request, env } = context;
  if (!requireSameOrigin(request)) return json({ error: "طلب غير مسموح." }, { status: 403 });
  if (!hasConfiguration(env)) return json({ error: "Love Inbox لم يتم إعداده بعد." }, { status: 503 });

  const payload = await readJson(request);
  const password = typeof payload?.password === "string" ? payload.password : "";
  if (!(await validPassword(password, env.INBOX_PASSWORD))) return json({ error: "كلمة السر غير صحيحة." }, { status: 401 });

  const session = await createSession(env.INBOX_SESSION_SECRET);
  return json({ authenticated: true }, { headers: { "Set-Cookie": sessionCookie(session) } });
};
