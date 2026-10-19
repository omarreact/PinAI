import { u as runReply } from "./route-RohLIez1.mjs";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
//#region node_modules/.nitro/vite/services/ssr/assets/execute.server-FS5Niay8.js
var CDN_SUFFIXES = [
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
	"gravatar.com"
];
function fingerprint(input) {
	const html = input.html.slice(0, 12e5);
	const lower = html.toLowerCase();
	const headers = input.headers.map((header) => ({
		name: header.name.toLowerCase(),
		value: header.value
	}));
	const headerValue = (name) => headers.find((header) => header.name === name)?.value ?? "";
	const generator = meta(html, "generator");
	const hits = [];
	const add = (name, group, when) => {
		if (!when) return;
		if (hits.some((hit) => hit.name.toLowerCase() === name.toLowerCase() && hit.group === group)) return;
		hits.push({
			name,
			group
		});
	};
	add(clip$1(generator, 80), "Generator", Boolean(generator));
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
	if (server && !hits.some((hit) => hit.group === "Host" || hit.group === "Server")) add(clip$1(server, 48), "Server", true);
	const powered = headerValue("x-powered-by");
	if (powered && powered.length <= 48 && /^[a-z0-9./ ()-]+$/i.test(powered)) add(powered, "Server", true);
	const urls = collectUrls(html);
	const hosts = collectHosts(urls, input.pageHost);
	const endpoints = collectEndpoints(urls, html, input.pageHost);
	let noteChallenge = false;
	if (/just a moment|cf-browser-verification|attention required/i.test(html) || headerValue("cf-mitigated")) noteChallenge = true;
	return {
		stack: noteChallenge ? [{
			name: "Edge challenge page",
			group: "Note"
		}, ...hits].slice(0, 24) : hits.slice(0, 24),
		hosts: hosts.slice(0, 24),
		endpoints: endpoints.slice(0, 40)
	};
}
function meta(html, name) {
	const re = /<meta\b[^>]*>/gi;
	let match;
	while (match = re.exec(html)) {
		const tag = match[0];
		if ((attr(tag, "name") || attr(tag, "property") || "").toLowerCase() === name) return decode(attr(tag, "content") ?? "").trim();
	}
	return "";
}
function pageTitle(html) {
	const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
	if (!match) return null;
	const text = decode(match[1].replace(/\s+/g, " ").trim());
	return text ? clip$1(text, 180) : null;
}
function pageExcerpt(html) {
	const text = decode(html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<noscript[\s\S]*?<\/noscript>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
	return text ? text.slice(0, 700) : null;
}
function collectUrls(html) {
	const found = [];
	const tagRe = /<(script|link|img|a|form|source)\b[^>]*>/gi;
	let match;
	while ((match = tagRe.exec(html)) && found.length < 400) {
		const tag = match[0];
		const value = attr(tag, "src") || attr(tag, "href") || attr(tag, "action");
		if (value) found.push(value.trim());
	}
	return found;
}
function collectHosts(urls, pageHost) {
	const seen = /* @__PURE__ */ new Set();
	const hosts = [];
	for (const value of urls) {
		const host = hostOf(value, pageHost);
		if (!host || host === pageHost || seen.has(host)) continue;
		seen.add(host);
		hosts.push({
			host,
			role: roleFor(host)
		});
	}
	return hosts;
}
function collectEndpoints(urls, html, pageHost) {
	const seen = /* @__PURE__ */ new Set();
	const out = [];
	const push = (value) => {
		const clean = value.replace(/&/g, "&").split("#")[0]?.trim() ?? "";
		if (!clean || clean.length > 180 || seen.has(clean)) return;
		seen.add(clean);
		out.push(clean);
	};
	for (const value of urls) if (looksLikeEndpoint(value)) push(displayRef(value, pageHost));
	const literal = /["']((?:https?:\/\/[^"'\\\s]{0,160})?\/(?:api|graphql|wp-json|rest|ajax)[^"'\\\s]{0,120})["']/gi;
	let match;
	let guard = 0;
	while ((match = literal.exec(html)) && guard < 80) {
		guard += 1;
		push(displayRef(match[1], pageHost));
	}
	return out;
}
function looksLikeEndpoint(value) {
	return /\/(api|graphql|wp-json|rest|ajax)(\/|$|\?)|\/v\d+\//i.test(value) || /\.json(\?|$)/i.test(value);
}
function displayRef(value, pageHost) {
	try {
		if (value.startsWith("/") && !value.startsWith("//")) return value.slice(0, 180);
		const url = new URL(value, "https://" + pageHost);
		if (url.host === pageHost) return (url.pathname + url.search).slice(0, 180);
		return url.href.slice(0, 180);
	} catch {
		return value.slice(0, 180);
	}
}
function hostOf(value, pageHost) {
	try {
		if (value.startsWith("/") && !value.startsWith("//")) return null;
		const url = new URL(value, "https://" + pageHost);
		if (url.protocol !== "http:" && url.protocol !== "https:") return null;
		return url.host.toLowerCase();
	} catch {
		return null;
	}
}
function roleFor(host) {
	if (CDN_SUFFIXES.some((suffix) => host === suffix || host.endsWith("." + suffix))) return "cdn";
	if (/google-analytics|googletagmanager|doubleclick|hotjar|segment\.com|sentry|intercom|hs-scripts|hs-analytics|facebook\.net/.test(host)) return "analytics";
	return "third-party";
}
function attr(tag, name) {
	const re = new RegExp("\\b" + name + "\\s*=\\s*(\"([^\"]*)\"|'([^']*)'|([^\\s>]+))", "i");
	const match = tag.match(re);
	if (!match) return null;
	return match[2] ?? match[3] ?? match[4] ?? null;
}
function has(haystack, needle) {
	return haystack.includes(needle);
}
function clip$1(value, max) {
	const clean = value.replace(/\s+/g, " ").trim();
	return clean.length > max ? clean.slice(0, max - 1) + "…" : clean;
}
function decode(value) {
	return value.replace(/&nbsp;/g, " ").replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">").replace(/"/g, "\"").replace(/&#39;|'/g, "'");
}
/**
* Public-web allowlist for the page reader.
* Hostnames are resolved before the fetch. Private, link-local, loopback,
* and metadata addresses are refused. This is not a general shell.
*/
var PublicUrlError = class extends Error {
	constructor(message) {
		super(message);
		this.name = "PublicUrlError";
	}
};
var SafeError = class extends Error {
	constructor(message) {
		super(message);
		this.name = "SafeError";
	}
};
var BLOCKED_HOSTS = /* @__PURE__ */ new Set([
	"localhost",
	"localhost.localdomain",
	"metadata.google.internal",
	"metadata.google",
	"metadata",
	"kubernetes.default",
	"host.docker.internal",
	"host.containers.internal"
]);
var BLOCKED_SUFFIXES = [
	".local",
	".localhost",
	".internal",
	".home.arpa",
	".localdomain",
	".lan"
];
function toSafeMessage(err) {
	if (err instanceof PublicUrlError || err instanceof SafeError) return err.message;
	return "Could not read that site.";
}
async function assertPublicUrl(raw) {
	const url = normalizeHttpUrl(raw);
	await assertResolvedPublic(url);
	return url;
}
function normalizeHttpUrl(raw) {
	let text = raw.trim();
	if (text.length === 0 || text.length > 2e3) throw new PublicUrlError("That does not look like a public web address.");
	if (!/^[a-z][a-z0-9+.-]*:/i.test(text)) text = "https://" + text;
	let url;
	try {
		url = new URL(text);
	} catch {
		throw new PublicUrlError("That does not look like a public web address.");
	}
	if (url.protocol !== "http:" && url.protocol !== "https:") throw new PublicUrlError("Only public http and https pages can be read.");
	if (url.username || url.password) throw new PublicUrlError("Addresses that include a username or password are blocked.");
	if (url.port && url.port !== "80" && url.port !== "443") throw new PublicUrlError("Only public pages on port 80 or 443 can be read.");
	let host = url.hostname.toLowerCase().replace(/\.$/, "");
	if (!host || host.includes("%")) throw new PublicUrlError("That does not look like a public web address.");
	url.hostname = host;
	url.hash = "";
	if (BLOCKED_HOSTS.has(host) || BLOCKED_SUFFIXES.some((suffix) => host.endsWith(suffix))) throw new PublicUrlError("Private and local addresses are blocked.");
	if (/^\d+$/.test(host) || host.includes("0x")) throw new PublicUrlError("That address is blocked.");
	const literal = ipv4Literal(host);
	if (literal === "blocked") throw new PublicUrlError("That address is blocked.");
	if (literal && isBlockedIp(literal)) throw new PublicUrlError("Private and local addresses are blocked.");
	if (host.includes(":") && isBlockedIp(host)) throw new PublicUrlError("Private and local addresses are blocked.");
	return url;
}
async function assertResolvedPublic(url) {
	const host = url.hostname;
	if (isIP(host)) {
		if (isBlockedIp(host)) throw new PublicUrlError("Private and local addresses are blocked.");
		return;
	}
	let records;
	try {
		records = await withTimeout(lookup(host, {
			all: true,
			verbatim: true
		}), 4e3);
	} catch (err) {
		if (err instanceof PublicUrlError || err instanceof SafeError) throw err;
		throw new SafeError("Could not resolve that host.");
	}
	if (records.length === 0) throw new SafeError("Could not resolve that host.");
	if (records.some((record) => isBlockedIp(record.address))) throw new PublicUrlError("That host is not a public site.");
}
function ipv4Literal(host) {
	if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return null;
	const parts = host.split(".");
	if (parts.some((part) => part.length > 1 && part.startsWith("0"))) return "blocked";
	const nums = parts.map((part) => Number(part));
	if (nums.some((n) => n > 255)) return "blocked";
	return nums.join(".");
}
function isBlockedIp(ip) {
	const value = ip.toLowerCase();
	if (value.includes(":")) {
		if (value === "::1" || value === "::" || value === "0:0:0:0:0:0:0:1") return true;
		if (value.startsWith("fe80:") || value.startsWith("fc") || value.startsWith("fd")) return true;
		const mapped = value.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
		if (mapped) return isBlockedIp(mapped[1]);
		return false;
	}
	const parts = value.split(".").map((part) => Number(part));
	if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true;
	const [a, b] = parts;
	if (a === 0 || a === 10 || a === 127) return true;
	if (a === 169 && b === 254) return true;
	if (a === 172 && b >= 16 && b <= 31) return true;
	if (a === 192 && b === 168) return true;
	if (a === 100 && b >= 64 && b <= 127) return true;
	if (a === 192 && b === 0 && parts[2] === 0) return true;
	if (a === 192 && b === 0 && parts[2] === 2) return true;
	if (a === 198 && (b === 18 || b === 19)) return true;
	if (a === 198 && b === 51 && parts[2] === 100) return true;
	if (a === 203 && b === 0 && parts[2] === 113) return true;
	if (a >= 224) return true;
	return false;
}
function withTimeout(promise, ms) {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => reject(new SafeError("Could not resolve that host.")), ms);
		promise.then((value) => {
			clearTimeout(timer);
			resolve(value);
		}, (err) => {
			clearTimeout(timer);
			reject(err);
		});
	});
}
/**
* One public GET, plus at most two polite extras (robots.txt, and
* /wp-json/ when the page already looks like WordPress).
* Paths found in the markup are listed. They are not crawled.
*/
var UA = "AITerminalMobile/1.0 (public page reader)";
var REQUEST_HEADERS = [
	{
		name: "user-agent",
		value: UA
	},
	{
		name: "accept",
		value: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8"
	},
	{
		name: "accept-language",
		value: "en"
	}
];
var PREFERRED_HEADERS = [
	"server",
	"content-type",
	"content-length",
	"cache-control",
	"x-powered-by",
	"cf-ray",
	"via",
	"location",
	"strict-transport-security",
	"content-security-policy"
];
async function analyzePublicPage(rawUrl, mode) {
	const main = await requestPublic(rawUrl, 12e5);
	const pageHost = new URL(main.finalUrl).host;
	const html = main.textual && isMarkup(main) ? main.text : "";
	const found = fingerprint({
		html,
		headers: main.headers,
		pageHost
	});
	const report = {
		mode,
		requestedUrl: main.requestedUrl,
		finalUrl: main.finalUrl,
		status: main.status,
		ms: main.ms,
		contentType: main.contentType,
		redirects: main.redirects,
		title: html ? pageTitle(html) : null,
		description: html ? clip(meta(html, "description"), 240) || null : null,
		note: found.stack.some((hit) => hit.name === "Edge challenge page") ? "The host returned a challenge page, so this fingerprint is the edge, not the app behind it." : main.truncated ? "The page was cut off at the size limit." : null,
		request: {
			method: "GET",
			url: main.finalUrl,
			headers: REQUEST_HEADERS
		},
		responseHeaders: redactHeaders(main.headers),
		stack: found.stack,
		hosts: found.hosts,
		endpoints: found.endpoints,
		probes: [],
		excerpt: excerptFor(main),
		truncated: main.truncated,
		bytes: main.bytes
	};
	if (mode === "scan" || mode === "apis") report.probes = await extraProbes(main.finalUrl, html);
	return report;
}
async function extraProbes(finalUrl, html) {
	const origin = new URL(finalUrl);
	const jobs = [new URL("/robots.txt", origin).href];
	if (/\/wp-content\/|\/wp-includes\/|\/wp-json\//i.test(html)) jobs.push(new URL("/wp-json/", origin).href);
	const probes = [];
	for (const job of jobs.slice(0, 2)) probes.push(await probe(job));
	return probes;
}
async function probe(rawUrl) {
	try {
		const hit = await requestPublic(rawUrl, 8e4);
		let note = hit.contentType ?? "no content type";
		if (hit.textual && hit.contentType?.includes("json")) try {
			const json = JSON.parse(hit.text);
			if (json && typeof json === "object" && !Array.isArray(json)) note = "keys: " + Object.keys(json).slice(0, 12).join(", ");
		} catch {
			note = hit.contentType ?? note;
		}
		else if (hit.textual && /robots\.txt/i.test(rawUrl)) {
			const lines = hit.text.split("\n").map((line) => line.trim()).filter((line) => line && !line.startsWith("#")).slice(0, 4);
			if (lines.length) note = lines.join(" | ").slice(0, 180);
		}
		return {
			url: hit.finalUrl,
			status: hit.status,
			note: note.slice(0, 200)
		};
	} catch (err) {
		return {
			url: rawUrl,
			status: 0,
			note: toSafeMessage(err)
		};
	}
}
async function requestPublic(rawUrl, maxBytes) {
	let current = await assertPublicUrl(rawUrl);
	const requestedUrl = current.href;
	const redirects = [];
	const seen = /* @__PURE__ */ new Set();
	for (let hop = 0; hop < 5; hop += 1) {
		if (seen.has(current.href)) throw new SafeError("The redirects looped.");
		seen.add(current.href);
		const started = Date.now();
		const response = await fetchOnce(current);
		const ms = Date.now() - started;
		redirects.push({
			url: current.href,
			status: response.status,
			ms
		});
		if (isRedirect(response.status)) {
			const location = response.headers.get("location");
			await response.body?.cancel();
			if (!location) break;
			let next;
			try {
				next = await assertPublicUrl(new URL(location, current).href);
			} catch (err) {
				if (err instanceof PublicUrlError || err instanceof SafeError) throw err;
				throw new PublicUrlError("A redirect left the public web and was blocked.");
			}
			current = next;
			continue;
		}
		const contentType = response.headers.get("content-type");
		const headers = collectHeaders(response.headers);
		const textual = isTextual(contentType);
		let text = "";
		let bytes = 0;
		let truncated = false;
		if (textual) {
			const body = await readLimited(response, maxBytes);
			text = body.text;
			bytes = body.bytes;
			truncated = body.truncated;
		} else {
			const length = Number(response.headers.get("content-length"));
			bytes = Number.isFinite(length) ? length : 0;
			await response.body?.cancel();
		}
		return {
			requestedUrl,
			finalUrl: current.href,
			status: response.status,
			ms: redirects.reduce((sum, item) => sum + item.ms, 0),
			contentType,
			redirects,
			headers,
			text,
			bytes,
			truncated,
			textual
		};
	}
	throw new SafeError("Too many redirects.");
}
async function fetchOnce(url) {
	const ctrl = new AbortController();
	const timer = setTimeout(() => ctrl.abort(), 12e3);
	try {
		return await fetch(url, {
			method: "GET",
			redirect: "manual",
			signal: ctrl.signal,
			cache: "no-store",
			headers: {
				"user-agent": UA,
				accept: REQUEST_HEADERS[1].value,
				"accept-language": "en"
			}
		});
	} catch (err) {
		if (err instanceof Error && err.name === "AbortError") throw new SafeError("The host took too long to answer.");
		throw new SafeError("Could not reach that host.");
	} finally {
		clearTimeout(timer);
	}
}
async function readLimited(res, maxBytes) {
	const reader = res.body?.getReader();
	if (!reader) return {
		text: "",
		bytes: 0,
		truncated: false
	};
	const chunks = [];
	let bytes = 0;
	let truncated = false;
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		if (!value) continue;
		if (bytes + value.byteLength > maxBytes) {
			const room = maxBytes - bytes;
			if (room > 0) chunks.push(value.slice(0, room));
			bytes = maxBytes;
			truncated = true;
			await reader.cancel();
			break;
		}
		chunks.push(value);
		bytes += value.byteLength;
	}
	const buf = new Uint8Array(bytes);
	let offset = 0;
	for (const chunk of chunks) {
		buf.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return {
		text: new TextDecoder("utf-8", { fatal: false }).decode(buf),
		bytes,
		truncated
	};
}
function collectHeaders(headers) {
	const pairs = [];
	headers.forEach((value, name) => {
		pairs.push({
			name: name.toLowerCase(),
			value
		});
	});
	return pairs;
}
function redactHeaders(headers) {
	const hidden = /* @__PURE__ */ new Set([
		"set-cookie",
		"cookie",
		"authorization",
		"proxy-authorization"
	]);
	const cookieCount = headers.filter((header) => header.name === "set-cookie").length;
	const visible = headers.filter((header) => !hidden.has(header.name) && !/token|api-key|secret/i.test(header.name));
	visible.sort((a, b) => {
		const ai = PREFERRED_HEADERS.indexOf(a.name);
		const bi = PREFERRED_HEADERS.indexOf(b.name);
		if (ai !== -1 || bi !== -1) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
		return a.name.localeCompare(b.name);
	});
	const clipped = visible.slice(0, 36).map((header) => ({
		name: header.name,
		value: header.value.length > 300 ? header.value.slice(0, 300) + "…" : header.value
	}));
	if (cookieCount > 0) clipped.push({
		name: "set-cookie",
		value: cookieCount === 1 ? "(hidden)" : `(hidden, ${cookieCount})`
	});
	return clipped;
}
function excerptFor(hit) {
	if (!hit.textual || !hit.text) return null;
	if (hit.contentType?.includes("json") || looksLikeJson(hit.text)) return prettyJson(hit.text).slice(0, 700);
	if (isMarkup(hit)) return pageExcerpt(hit.text);
	return hit.text.replace(/\s+/g, " ").trim().slice(0, 700) || null;
}
function isMarkup(hit) {
	const type = hit.contentType ?? "";
	return /html|xml|svg/.test(type) || /^\s*</.test(hit.text);
}
function isTextual(contentType) {
	if (!contentType) return true;
	return /text\/|json|xml|javascript|svg|urlencoded/.test(contentType);
}
function looksLikeJson(text) {
	const trimmed = text.trim();
	return trimmed.startsWith("{") || trimmed.startsWith("[");
}
function prettyJson(text) {
	try {
		return JSON.stringify(JSON.parse(text), null, 2);
	} catch {
		return text;
	}
}
function isRedirect(status) {
	return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}
function clip(value, max) {
	const clean = value.replace(/\s+/g, " ").trim();
	return clean.length > max ? clean.slice(0, max - 1) + "…" : clean;
}
/**
* Chat → tool bridge.
* The client has already classified slash commands. This module either
* runs one allowlisted page tool, or asks Grok to choose between a short
* reply and one of those tools. There is no shell and no second process.
*/
var buckets = /* @__PURE__ */ new Map();
var TOOLS = /* @__PURE__ */ new Set([
	"scan",
	"headers",
	"tech",
	"apis"
]);
async function executeTurn(input) {
	try {
		if (input.tool) {
			if (!input.url) return {
				ok: false,
				error: "Send a public address with that command."
			};
			return await runTool(input.tool, input.url);
		}
		if (input.engine !== "grok") return {
			ok: true,
			reply: "Name a public site, or send a command such as /scan https://example.com.",
			tool: null,
			report: null,
			usedModel: false
		};
		return await planWithGrok(input);
	} catch (err) {
		console.error("terminal turn failed", err instanceof Error ? err.name : "unknown");
		return {
			ok: false,
			error: toSafeMessage(err)
		};
	}
}
async function runTool(tool, url) {
	if (!allow("fetch", 8)) return {
		ok: false,
		error: "Too many page reads in a short time. Wait a minute."
	};
	const report = await analyzePublicPage(url, tool);
	return {
		ok: true,
		reply: runReply(tool, report.finalUrl || url),
		tool,
		report,
		usedModel: false
	};
}
async function planWithGrok(input) {
	const apiKey = process.env.XAI_API_KEY;
	if (!apiKey) return {
		ok: true,
		reply: "Grok is not available in this session. Web commands still run: /scan https://example.com",
		tool: null,
		report: null,
		usedModel: false
	};
	if (!allow("llm", 6)) return {
		ok: false,
		error: "The model is pausing for a minute. A command such as /scan still runs."
	};
	const plan = await askPlanner(apiKey, input);
	if (plan.intent === "tool" && plan.tool) {
		const url = plan.url || input.lastUrl;
		if (!url) return {
			ok: true,
			reply: plan.reply || "Send the public address to read.",
			tool: null,
			report: null,
			usedModel: true
		};
		const ran = await runTool(plan.tool, url);
		if (!ran.ok) return ran;
		return {
			...ran,
			reply: plan.reply || ran.reply,
			usedModel: true
		};
	}
	return {
		ok: true,
		reply: plan.reply || "I didn't get a reply. Try /scan https://example.com.",
		tool: null,
		report: null,
		usedModel: true
	};
}
async function askPlanner(apiKey, input) {
	const ctrl = new AbortController();
	const timer = setTimeout(() => ctrl.abort(), 2e4);
	try {
		const res = await fetch("https://api.x.ai/v1/chat/completions", {
			method: "POST",
			signal: ctrl.signal,
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`
			},
			body: JSON.stringify({
				model: "grok-4.5",
				temperature: 0,
				max_tokens: 220,
				messages: [
					{
						role: "system",
						content: systemPrompt(input.lastUrl, input.engine)
					},
					...input.history.map((item) => ({
						role: item.role,
						content: item.text
					})),
					{
						role: "user",
						content: input.text
					}
				]
			})
		});
		if (!res.ok) throw new Error(`status ${res.status}`);
		return parsePlan((await res.json()).choices?.[0]?.message?.content ?? "");
	} catch (err) {
		if (err instanceof Error && err.name === "AbortError") return {
			intent: "chat",
			tool: null,
			url: null,
			reply: "The model took too long. A /scan command still runs."
		};
		return {
			intent: "chat",
			tool: null,
			url: null,
			reply: "The model didn't answer. Commands still run, for example /scan https://example.com."
		};
	} finally {
		clearTimeout(timer);
	}
}
function systemPrompt(lastUrl, engine) {
	return [
		"You are the chat side of AI Terminal Mobile. The user never sees a shell. You answer briefly, or you request one public-web tool. You cannot run arbitrary commands.",
		"Tools: scan (page, stack, CDNs, endpoints, headers, excerpt), headers (status, timing, redirects, headers), tech (CMS and framework), apis (hosts and paths named on the page).",
		"Return only JSON: {\"intent\":\"chat\"|\"tool\",\"tool\":null|\"scan\"|\"headers\"|\"tech\"|\"apis\",\"url\":null|\"https://...\",\"reply\":\"short plain text\"}",
		"If they want a public site inspected, intent is tool and url is an absolute http(s) address. Use the previous site when they mean that site.",
		`Previous site: ${lastUrl ?? "none"}. Active engine: ${engine}.`,
		"If a site is required and none is known, intent is chat and the reply asks for the address.",
		"Do not invent headers, status codes, or tech stacks. Do not claim a tool ran.",
		"If they ask to attack, exploit, log in, bypass a control, scan a private network, or run a shell command, intent is chat. Say that only public page reads are available.",
		"reply is 1-3 sentences, no markdown fence, under 70 words."
	].join("\n");
}
function parsePlan(raw) {
	const start = raw.indexOf("{");
	const end = raw.lastIndexOf("}");
	if (start >= 0 && end > start) try {
		const json = JSON.parse(raw.slice(start, end + 1));
		const intent = json.intent === "tool" ? "tool" : "chat";
		const tool = typeof json.tool === "string" && TOOLS.has(json.tool) ? json.tool : null;
		const url = typeof json.url === "string" && json.url.trim() ? json.url.trim().slice(0, 2e3) : null;
		const reply = typeof json.reply === "string" ? json.reply.replace(/\s+/g, " ").trim().slice(0, 600) : "";
		if (intent === "tool" && tool) return {
			intent,
			tool,
			url,
			reply
		};
		return {
			intent: "chat",
			tool: null,
			url: null,
			reply: reply || raw.trim().slice(0, 600)
		};
	} catch {}
	return {
		intent: "chat",
		tool: null,
		url: null,
		reply: raw.replace(/```[\s\S]*?```/g, " ").replace(/\s+/g, " ").trim().slice(0, 600)
	};
}
function allow(bucket, limit) {
	const now = Date.now();
	const prev = (buckets.get(bucket) ?? []).filter((stamp) => now - stamp < 6e4);
	if (prev.length >= limit) {
		buckets.set(bucket, prev);
		return false;
	}
	prev.push(now);
	buckets.set(bucket, prev);
	return true;
}
//#endregion
export { executeTurn };
