/** Love Inbox API: lets the browser check whether the current dashboard session is valid. */
import { hasConfiguration, hasValidSession, json, type InboxEnv, type PagesContext } from "../../_lib/inbox";

export const onRequestGet = async (context: PagesContext<InboxEnv>) => {
  if (!hasConfiguration(context.env)) return json({ authenticated: false, configured: false }, { status: 503 });
  const authenticated = await hasValidSession(context.request, context.env.INBOX_SESSION_SECRET);
  return json({ authenticated, configured: true });
};
