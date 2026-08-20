/** Love Inbox API: clears Mido's private dashboard session. */
import { clearedSessionCookie, json, type InboxEnv, type PagesContext, requireSameOrigin } from "../../_lib/inbox";

export const onRequestPost = async (context: PagesContext<InboxEnv>) => {
  if (!requireSameOrigin(context.request)) return json({ error: "طلب غير مسموح." }, { status: 403 });
  return json({ authenticated: false }, { headers: { "Set-Cookie": clearedSessionCookie() } });
};
