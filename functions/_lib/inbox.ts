/**
 * Love Inbox backend contract.
 * Cloudflare Pages Functions + D1 keep submissions on the same origin as the love page.
 */
export type D1Statement = {
  bind: (...values: unknown[]) => D1Statement;
  run: () => Promise<{ success?: boolean }>;
  all: <T>() => Promise<{ results: T[] }>;
};

export type D1Database = {
  prepare: (query: string) => D1Statement;
};

export type InboxEnv = {
  MESSAGES_DB: D1Database;
  INBOX_PASSWORD: string;
  INBOX_SESSION_SECRET: string;
};

export type PagesContext<Env = Record<string, unknown>> = {
  request: Request;
  env: Env;
  params: Record<string, string | string[]>;
};

type JsonOptions = {
  status?: number;
  headers?: HeadersInit;
};

export function json(data: unknown, options: JsonOptions = {}) {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "same-origin");
  return new Response(JSON.stringify(data), { status: options.status ?? 200, headers });
}

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("Origin");
  return origin === null || origin === new URL(request.url).origin;
}

export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const data: unknown = await request.json();
    if (typeof data !== "object" || data === null || Array.isArray(data)) return null;
    return data as Record<string, unknown>;
  } catch {
    return null;
  }
}

function normalize(value: unknown, limit: number) {
  if (typeof value !== "string") return "";
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, limit);
}

export type Submission = {
  senderName: string;
  subject: string;
  message: string;
};

export function validateSubmission(payload: Record<string, unknown>): Submission | { error: string } {
  if (normalize(payload.website, 120)) return { error: "تعذر إرسال الرسالة." };

  const senderName = normalize(payload.name, 80) || "رسالة مجهولة / anonymous";
  const subject = normalize(payload.subject, 120) || "رسالة من القلب / a note from the heart";
  const message = normalize(payload.message, 2800);

  if (message.length < 3) return { error: "اكتبي رسالة صغيرة من قلبك الأول." };
  return { senderName, subject, message };
}

export function isValidMessageId(value: string | string[] | undefined): value is string {
  return typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value);
}

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function hmac(value: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

function timingSafeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

function readCookie(request: Request, name: string) {
  const cookie = request.headers.get("Cookie") ?? "";
  const item = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  if (!item) return null;
  try {
    return decodeURIComponent(item.slice(name.length + 1));
  } catch {
    return null;
  }
}

const SESSION_NAME = "love_inbox_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

export async function createSession(secret: string) {
  const payload = toBase64Url(new TextEncoder().encode(JSON.stringify({ exp: Date.now() + (SESSION_MAX_AGE_SECONDS * 1000), v: 1 })));
  const signature = toBase64Url(await hmac(payload, secret));
  return `${payload}.${signature}`;
}

export async function hasValidSession(request: Request, secret: string) {
  const token = readCookie(request, SESSION_NAME);
  if (!token) return false;

  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return false;

  try {
    const expected = await hmac(payload, secret);
    if (!timingSafeEqual(fromBase64Url(signature), expected)) return false;
    const data: unknown = JSON.parse(new TextDecoder().decode(fromBase64Url(payload)));
    return typeof data === "object" && data !== null && "exp" in data && typeof data.exp === "number" && data.exp > Date.now();
  } catch {
    return false;
  }
}

export function sessionCookie(session: string) {
  return `${SESSION_NAME}=${encodeURIComponent(session)}; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}; HttpOnly; Secure; SameSite=Strict`;
}

export function clearedSessionCookie() {
  return `${SESSION_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}

export function hasConfiguration(env: Partial<InboxEnv>) {
  return Boolean(env.MESSAGES_DB && env.INBOX_PASSWORD && env.INBOX_SESSION_SECRET);
}

export async function validPassword(value: string, expected: string) {
  const encoder = new TextEncoder();
  return timingSafeEqual(await hmac(value, expected), await hmac(expected, expected));
}
