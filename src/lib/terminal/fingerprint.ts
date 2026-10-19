import type { HeaderPair, HostHit, StackHit } from "./types";

export type FingerprintInput = {
  html: string;
  headers: HeaderPair[];
  pageHost: string;
};

const CDN_SUFFIXES = [
  "cdn.jsdelivr.net",
  "unpkg.com",
  "cdnjs.cloudflare.com",
  "ajax.googleapis.com",
  "fonts.gstatic.com",
  "fonts.googleapis.com",
  "bootstrapcdn.com",
  "cdn.shopify.com",
  "cloudfront.net",
  "akamaized.net",
  "fastly.net",
  "fastlylb.net",
  "wp.com",
  "gravatar.com",
];

export function fingerprint(input: FingerprintInput): { stack: StackHit[]; hosts: HostHit[]; endpoints: string[] } {
  const html = input.html.slice(0, 1_200_000);
  const lower = html.toLowerCase();
  const headers = input.headers.map((header) => ({
    name: header.name.toLowerCase(),
    value: header.value,
  }));
  const headerValue = (name: string) => headers.find((header) => header.name === name)?.value ?? "";
  const generator = meta(html, "generator");
  const hits: StackHit[] = [];

  const add = (name: string, group: string, when: boolean) => {
    if (!when) return;
    if (hits.some((hit) => hit.name.toLowerCase() === name.toLowerCase() && hit.group === group)) return;
    hits.push({ name, group });
  };

  add(clip(generator, 80), "Generator", Boolean(generator));
  add("WordPress", "CMS", has(lower, "/wp-content/") || has(lower, "/wp-includes/") || /wordpress/i.test(generator));
  add("Drupal", "CMS", /drupal/i.test(generator) || has(lower, "drupal.settings") || has(lower, "/sites/default/files"));
  add("Joomla", "CMS", /joomla/i.test(generator) || has(lower, "/media/system/js/"));
  add("Shopify", "CMS", has(lower, "cdn.shopify.com") || Boolean(headerValue("x-shopid")));
  add("Squarespace", "CMS", has(lower, "squarespace.com") || has(lower, "static1.squarespace"));
  add("Wix", "CMS", has(lower, "wixstatic.com") || headers.some((header) => header.name.startsWith("x-wix")));
  add("Webflow", "CMS", has(lower, "data-wf-site") || has(lower, "website-files.com"));
  add("Ghost", "CMS", /ghost/i.test(generator) || has(lower, "ghost.org"));
  add("Next.js", "Framework", has(lower, "/_next/") || has(lower, "__next_data__"));
  add("Nuxt", "Framework", has(lower, "/_nuxt/") || has(lower, "__nuxt__"));
  add("Gatsby", "Framework", has(lower, "___gatsby"));
  add("SvelteKit", "Framework", has(lower, "__sveltekit"));
  add("Remix", "Framework", has(lower, "__remixcontext") || has(lower, "__remix"));
  add("Angular", "Framework", has(lower, "ng-version"));
  add("React", "Framework", has(lower, "react-dom") || has(lower, "data-reactroot") || has(lower, "react.production"));
  add("Vue", "Framework", has(lower, "vue.runtime") || has(lower, "vue.min.js") || has(lower, "vue.global"));
  add("jQuery", "Library", /jquery[-.]?(?:min\.)?js/.test(lower));
  add("Bootstrap", "Library", has(lower, "bootstrap.min") || has(lower, "bootstrapcdn.com"));
  add("Tailwind CDN", "Library", has(lower, "cdn.tailwindcss.com"));
  add("Google Fonts", "CDN", has(lower, "fonts.googleapis.com") || has(lower, "fonts.gstatic.com"));
  add("Google Tag Manager", "Analytics", has(lower, "googletagmanager.com"));
  add("Google Analytics", "Analytics", has(lower, "google-analytics.com") || has(lower, "gtag/js"));
  add("Stripe", "Library", has(lower, "js.stripe.com"));
  add("HubSpot", "Analytics", has(lower, "hs-scripts.com") || has(lower, "hs-analytics.net"));
  add("Intercom", "Analytics", has(lower, "widget.intercom.io"));
  add("Segment", "Analytics", has(lower, "cdn.segment.com"));
  add("Sentry", "Library", has(lower, "sentry-cdn.com") || has(lower, "browser.sentry.io"));
  add("Cloudflare", "Host", Boolean(headerValue("cf-ray")) || /cloudflare/i.test(headerValue("server")));
  add("Vercel", "Host", Boolean(headerValue("x-vercel-id")) || /vercel/i.test(headerValue("server")));
  add("Netlify", "Host", Boolean(headerValue("x-nf-request-id")));
  add("Fastly", "Host", /fastly/i.test(headerValue("via")) || Boolean(headerValue("x-served-by")));
  add("CloudFront", "Host", Boolean(headerValue("x-amz-cf-id")) || Boolean(headerValue("x-amz-cf-pop")));
  add("Akamai", "Host", headers.some((header) => header.name.startsWith("x-akamai")));

  const server = headerValue("server");
  if (server && !hits.some((hit) => hit.group === "Host" || hit.group === "Server")) {
    add(clip(server, 48), "Server", true);
  }
  const powered = headerValue("x-powered-by");
  if (powered && powered.length <= 48 && /^[a-z0-9./ ()-]+$/i.test(powered)) {
    add(powered, "Server", true);
  }

  const urls = collectUrls(html);
  const hosts = collectHosts(urls, input.pageHost);
  const endpoints = collectEndpoints(urls, html, input.pageHost);

  let noteChallenge = false;
  if (/just a moment|cf-browser-verification|attention required/i.test(html) || headerValue("cf-mitigated")) {
    noteChallenge = true;
  }

  return {
    stack: noteChallenge
      ? [{ name: "Edge challenge page", group: "Note" }, ...hits].slice(0, 24)
      : hits.slice(0, 24),
    hosts: hosts.slice(0, 24),
    endpoints: endpoints.slice(0, 40),
  };
}

export function meta(html: string, name: string): string {
  const re = /<meta\b[^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    const tag = match[0];
    const key = (attr(tag, "name") || attr(tag, "property") || "").toLowerCase();
    if (key === name) return decode(attr(tag, "content") ?? "").trim();
  }
  return "";
}

export function pageTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match) return null;
  const text = decode(match[1].replace(/\s+/g, " ").trim());
  return text ? clip(text, 180) : null;
}

export function pageExcerpt(html: string): string | null {
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const text = decode(stripped);
  return text ? text.slice(0, 700) : null;
}

function collectUrls(html: string): string[] {
  const found: string[] = [];
  const tagRe = /<(script|link|img|a|form|source)\b[^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = tagRe.exec(html)) && found.length < 400) {
    const tag = match[0];
    const value = attr(tag, "src") || attr(tag, "href") || attr(tag, "action");
    if (value) found.push(value.trim());
  }
  return found;
}

function collectHosts(urls: string[], pageHost: string): HostHit[] {
  const seen = new Set<string>();
  const hosts: HostHit[] = [];
  const pageKey = siteKey(pageHost);
  for (const value of urls) {
    const host = hostOf(value, pageHost);
    if (!host || host === pageHost || seen.has(host)) continue;
    if (siteKey(host) === pageKey) continue;
    seen.add(host);
    hosts.push({ host, role: roleFor(host) });
  }
  const rank: Record<string, number> = { cdn: 0, analytics: 1, "third-party": 2 };
  hosts.sort((a, b) => (rank[a.role] ?? 9) - (rank[b.role] ?? 9) || a.host.localeCompare(b.host));
  return hosts;
}

function collectEndpoints(urls: string[], html: string, pageHost: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (value: string) => {
    const clean = value.replace(/&/g, "&").split("#")[0]?.trim() ?? "";
    if (!clean || clean.length > 180 || seen.has(clean)) return;
    seen.add(clean);
    out.push(clean);
  };

  for (const value of urls) {
    if (looksLikeEndpoint(value)) push(displayRef(value, pageHost));
  }

  const literal = /["']((?:https?:\/\/[^"'\\\s]{0,160})?\/(?:api|graphql|wp-json|rest|ajax)[^"'\\\s]{0,120})["']/gi;
  let match: RegExpExecArray | null;
  let guard = 0;
  while ((match = literal.exec(html)) && guard < 80) {
    guard += 1;
    push(displayRef(match[1], pageHost));
  }
  return out;
}

function looksLikeEndpoint(value: string): boolean {
  return /\/(api|graphql|wp-json|rest|ajax)(\/|$|\?)|\/v\d+\//i.test(value) || /\.json(\?|$)/i.test(value);
}

function displayRef(value: string, pageHost: string): string {
  try {
    if (value.startsWith("/") && !value.startsWith("//")) return value.slice(0, 180);
    const url = new URL(value, "https://" + pageHost);
    if (url.host === pageHost) return (url.pathname + url.search).slice(0, 180);
    return url.href.slice(0, 180);
  } catch {
    return value.slice(0, 180);
  }
}

function hostOf(value: string, pageHost: string): string | null {
  try {
    if (value.startsWith("/") && !value.startsWith("//")) return null;
    const url = new URL(value, "https://" + pageHost);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.host.toLowerCase();
  } catch {
    return null;
  }
}

function roleFor(host: string): string {
  if (CDN_SUFFIXES.some((suffix) => host === suffix || host.endsWith("." + suffix))) return "cdn";
  if (/google-analytics|googletagmanager|doubleclick|hotjar|segment\.com|sentry|intercom|hs-scripts|hs-analytics|facebook\.net/.test(host)) {
    return "analytics";
  }
  return "third-party";
}

function attr(tag: string, name: string): string | null {
  const re = new RegExp("\\b" + name + "\\s*=\\s*(\"([^\"]*)\"|'([^']*)'|([^\\s>]+))", "i");
  const match = tag.match(re);
  if (!match) return null;
  return match[2] ?? match[3] ?? match[4] ?? null;
}

function has(haystack: string, needle: string): boolean {
  return haystack.includes(needle);
}

function clip(value: string, max: number): string {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max - 1) + "…" : clean;
}

function siteKey(host: string): string {
  const parts = host.split(".").filter(Boolean);
  if (parts.length <= 2) return parts.join(".");
  const tail = parts.slice(-2).join(".");
  const multi = new Set(["co.uk", "org.uk", "ac.uk", "com.au", "co.jp", "com.br", "co.in", "co.nz"]);
  if (multi.has(tail) && parts.length >= 3) return parts.slice(-3).join(".");
  return tail;
}

function decode(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => safeChar(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num: string) => safeChar(Number(num)))
    .replace(/&nbsp;/g, " ")
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, '"')
    .replace(/&#39;|'/g, "'")
    .replace(/&ndash;|&mdash;/g, "–")
    .replace(/&hellip;/g, "…");
}

function safeChar(code: number): string {
  if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return "";
  if (code >= 0xd800 && code <= 0xdfff) return "";
  return String.fromCodePoint(code);
}
