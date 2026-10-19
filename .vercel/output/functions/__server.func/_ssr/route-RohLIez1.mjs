//#region node_modules/.nitro/vite/services/ssr/assets/route-RohLIez1.js
var LIVE_ENGINES = [
	{
		id: "grok",
		name: "Grok",
		detail: "Plain language. Reads a public page only when you ask it to.",
		tool: null
	},
	{
		id: "scan",
		name: "Web scan",
		detail: "One public page: platform, CDNs, endpoints, headers, and an excerpt.",
		tool: "scan"
	},
	{
		id: "network",
		name: "Network",
		detail: "Status, timing, redirects, and response headers for a single GET.",
		tool: "headers"
	},
	{
		id: "stack",
		name: "Stack",
		detail: "CMS, framework, host, and analytics fingerprints.",
		tool: "tech"
	},
	{
		id: "shell",
		name: "Command",
		detail: "Only the commands you type. No model call between turns.",
		tool: null
	}
];
var UNAVAILABLE_ENGINES = [
	{
		name: "OpenAI CLI",
		detail: "Not connected. This session does not store an OpenAI key or spawn that CLI."
	},
	{
		name: "Hugging Face CLI",
		detail: "Not connected. Hub downloads and model pulls do not run from the chat."
	},
	{
		name: "Local runner",
		detail: "Not connected. Weights are not kept on this device."
	}
];
var WELCOME = "The session is idle. Talk normally, or send a command.\n\n/scan https://example.com reads one public page and returns the platform, CDNs, endpoints, and response headers in this thread.\n\nNothing here keeps a shell open.";
var HELP_TEXT = `Commands, one job at a time:

/scan https://example.com
  Page, stack, CDNs, endpoints, headers, excerpt

/headers https://example.com
  Status, timing, redirects, response headers

/tech https://example.com
  CMS, framework, host, analytics

/apis https://example.com
  Third-party hosts and paths named on the page

/note a line to keep
/session
/help

Grok accepts a normal sentence. Web scan, Network, and Stack treat a domain as the job. Command runs only what you type.

Private networks, raw shell, and other vendors' CLIs are not part of this session.`;
var ARCHITECTURE = [
	{
		k: "01",
		t: "Chat is the only control. A sentence and a command land in the same thread."
	},
	{
		k: "02",
		t: "A command runs as itself. With Grok selected, a short planner either answers or picks one public-page tool."
	},
	{
		k: "03",
		t: "The page is read once, off the keyboard, and comes back as a card. The job ends when the card lands."
	},
	{
		k: "04",
		t: "History stays on this device. Private addresses and raw shell commands never run."
	}
];
function engineById(id) {
	return LIVE_ENGINES.find((engine) => engine.id === id) ?? LIVE_ENGINES[0];
}
var URL_RE = /https?:\/\/[^\s<>"'`]+/i;
var DOMAIN_RE = /\b(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s<>"'`]*)?/i;
function extractUrl(text, aggressive) {
	const explicit = text.match(URL_RE);
	if (explicit) return trimTail(explicit[0]);
	if (!aggressive) return null;
	const domain = text.match(DOMAIN_RE);
	if (!domain) return null;
	return "https://" + trimTail(domain[0]);
}
function trimTail(value) {
	return value.replace(/[),.;]+$/g, "");
}
function refersToLast(text) {
	return /\b(again|rescan|same site|that site|this site|previous site|last site)\b/i.test(text);
}
function isHelp(text) {
	return /^(help|\?|\/help|what can you (do|run)|which commands|commands)\??$/i.test(text.trim());
}
function isArchitecture(text) {
	return /how (does|do) (this|it|the session|you) work/i.test(text);
}
function isConceptual(text) {
	if (extractUrl(text, false)) return false;
	const namedSite = Boolean(extractUrl(text, true));
	const aboutARead = /\b(site|page|url|domain|website|headers?|scan|stack|cdn|api)\b/i.test(text);
	if (namedSite && aboutARead) return false;
	return /^(what|why|how|explain|define|who)\b/i.test(text.trim());
}
/** A verb that clearly asks for a page tool, not a definition. */
function obviousTool(text) {
	const t = text.toLowerCase();
	if (/\b(response header|network tab|headers?)\b/.test(t) && /\b(header|network)\b/.test(t)) {
		if (/\bheaders?\b/.test(t) && !/\b(scan|stack|cms|endpoint|cdn|api)\b/.test(t)) return "headers";
	}
	if (/\b(stack|cms|fingerprint|framework|wordpress|shopify)\b/.test(t) && /\b(scan|detect|identify|running|use|uses|on)\b/.test(t)) return "tech";
	if (/\b(endpoints?|cdns?|apis?)\b/.test(t) && /\b(find|list|extract|show|scan|on|from)\b/.test(t)) return "apis";
	if (/\b(scan|analyze|analyse|inspect|fetch|download)\b/.test(t)) return "scan";
	if (/\bheaders?\b/.test(t)) return "headers";
	if (/\b(tech stack|fingerprint|what cms|which cms)\b/.test(t)) return "tech";
	return null;
}
function parseSlash(text) {
	const match = text.trim().match(/^\/([a-z]+)(?:\s+([\s\S]*))?$/i);
	if (!match) return null;
	return {
		name: match[1].toLowerCase(),
		rest: (match[2] ?? "").trim()
	};
}
var SLASH_TOOL = {
	scan: "scan",
	fetch: "scan",
	read: "scan",
	headers: "headers",
	header: "headers",
	network: "headers",
	tech: "tech",
	stack: "tech",
	apis: "apis",
	api: "apis",
	endpoints: "apis"
};
function routeLocal(text, engine, lastUrl) {
	const trimmed = text.trim();
	if (!trimmed) return {
		type: "hint",
		text: "Type a site or a command."
	};
	if (isHelp(trimmed)) return { type: "help" };
	if (isArchitecture(trimmed)) return {
		type: "hint",
		text: "Open Session for the four steps. Short version: the chat picks one public-page tool, the read runs once, and the session goes idle again."
	};
	const slash = parseSlash(trimmed);
	if (slash) {
		if (slash.name === "help") return { type: "help" };
		if (slash.name === "session" || slash.name === "status") return { type: "session" };
		if (slash.name === "clear") return { type: "clear" };
		if (slash.name === "note") {
			if (!slash.rest) return {
				type: "hint",
				text: "Add a line after /note. It stays on this device."
			};
			return {
				type: "note",
				text: slash.rest.slice(0, 280)
			};
		}
		const tool = SLASH_TOOL[slash.name];
		if (!tool) return {
			type: "hint",
			text: "Unknown command. " + HELP_TEXT.split("\n\n").slice(0, 1).join("\n")
		};
		const url = extractUrl(slash.rest, true) ?? (slash.rest ? null : lastUrl);
		if (!url) return {
			type: "need-url",
			tool
		};
		return {
			type: "run",
			tool,
			url
		};
	}
	if (engine === "shell") {
		const url = extractUrl(trimmed, false);
		const tool = obviousTool(trimmed);
		if (tool && url) return {
			type: "run",
			tool,
			url
		};
		return {
			type: "hint",
			text: "Command mode does not guess. Try /scan https://example.com, /headers, /tech, /apis, /note, or /help."
		};
	}
	const live = engineById(engine);
	const tool = obviousTool(trimmed) ?? live.tool;
	const url = extractUrl(trimmed, (engine !== "grok" || tool !== null) && !isConceptual(trimmed));
	if (engine === "grok") {
		if (isConceptual(trimmed) && !extractUrl(trimmed, false)) return { type: "plan" };
		if (tool && url) return {
			type: "run",
			tool,
			url
		};
		if (tool && !url && refersToLast(trimmed) && lastUrl) return {
			type: "run",
			tool,
			url: lastUrl
		};
		if (tool && !url && !isConceptual(trimmed) && obviousTool(trimmed)) return {
			type: "need-url",
			tool
		};
		return { type: "plan" };
	}
	const chosen = obviousTool(trimmed) ?? live.tool ?? "scan";
	if (url) return {
		type: "run",
		tool: chosen,
		url
	};
	if (refersToLast(trimmed) && lastUrl) return {
		type: "run",
		tool: chosen,
		url: lastUrl
	};
	if (isConceptual(trimmed)) return {
		type: "hint",
		text: "This engine reads sites, it does not chat. Switch to Grok for a plain answer, or send a public address."
	};
	return {
		type: "need-url",
		tool: chosen
	};
}
function helpText() {
	return HELP_TEXT;
}
function hostLabel(value) {
	try {
		return new URL(value).host;
	} catch {
		return value;
	}
}
var NEED_URL = {
	scan: "Send the public address to read. Example: example.com",
	headers: "Send the public address whose headers you want.",
	tech: "Send the public address to fingerprint.",
	apis: "Send the public address to search for endpoints and CDNs."
};
function needUrlText(tool) {
	return NEED_URL[tool];
}
function runReply(tool, url) {
	const host = hostLabel(url);
	if (tool === "headers") return `One GET to ${host}. Headers are from that response, not a guess.`;
	if (tool === "tech") return `Fingerprint for ${host}, taken from the HTML and response headers.`;
	if (tool === "apis") return `Hosts and paths named on ${host}. Listed from the page. robots.txt is the only extra fetch.`;
	return `Read ${host}. The card is the page, not a model guess.`;
}
//#endregion
export { engineById as a, needUrlText as c, WELCOME as i, routeLocal as l, LIVE_ENGINES as n, helpText as o, UNAVAILABLE_ENGINES as r, hostLabel as s, ARCHITECTURE as t, runReply as u };
