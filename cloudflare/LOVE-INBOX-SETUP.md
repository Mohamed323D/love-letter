# Love Inbox on Cloudflare

This project now contains the server-side files needed for **Love Inbox**. The public love page posts messages to `/api/messages`, while only a browser holding Mido's signed session can read the inbox. The deployment must be a **Cloudflare Pages project connected to the GitHub repository** so Pages deploys the `functions/` directory alongside the Vite output.

## Connect the existing GitHub repository to Pages

The repository is already a ready-to-deploy static build. In Cloudflare, create a **Pages** project by choosing **Connect to Git**, then select the existing `Mohamed323D/love-letter` repository and its `main` branch. Keep the framework as **None**, leave the build command empty, and set the build output directory to `.` because `index.html`, `assets/`, `manus-storage/`, and `functions/` are at the repository root. This is important: a drag-and-drop Pages upload can serve the visual site, but the Git-connected project is the deployment that carries the `functions/` directory used by Love Inbox.

## Cloudflare dashboard setup

Create a D1 database called `love-inbox-db` from **Workers & Pages → D1 SQL Database**. Open its SQL console and run the full contents of [`love-inbox-schema.sql`](./love-inbox-schema.sql) exactly once.

Next, open the existing Pages project for this site. In **Settings → Bindings**, add a **D1 database binding** named `MESSAGES_DB` and select `love-inbox-db`. Redeploy after saving the binding.

In **Settings → Variables and Secrets**, add the following production **secrets**; do not use plain text variables and never commit them to Git:

| Secret name | What to enter |
|---|---|
| `INBOX_PASSWORD` | A new, long password used only by Mido at `/inbox`. |
| `INBOX_SESSION_SECRET` | A different random secret at least 32 characters long; use a password generator. |

After a GitHub deployment completes, visit `/inbox` to sign in as Mido. The dashboard reads the API on the same Cloudflare Pages domain, so no external form service and no cross-origin access are involved.

## Safety notes

The dashboard password is compared only in the Cloudflare Function; it is never bundled into the React site. The session cookie is signed, `HttpOnly`, `Secure`, and `SameSite=Strict`. Public submissions accept only a short message body; the name and subject stay optional so the experience can feel like a private, romantic version of Saraha.
