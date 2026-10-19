import { i as __toESM } from "../_runtime.mjs";
import { a as engineById, c as needUrlText, i as WELCOME, l as routeLocal, n as LIVE_ENGINES, o as helpText, r as UNAVAILABLE_ENGINES, s as hostLabel, t as ARCHITECTURE, u as runReply } from "./route-RohLIez1.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { a as Download, i as SendHorizontal, o as Copy, r as SlidersHorizontal, s as ChevronDown, t as X } from "../_libs/lucide-react.mjs";
import { a as DialogOverlay, i as DialogDescription, n as DialogClose, o as DialogPortal, r as DialogContent, s as DialogTitle, t as Dialog } from "../_libs/@radix-ui/react-dialog+[...].mjs";
import { n as TSS_SERVER_FUNCTION, r as getServerFnById, t as createServerFn } from "./ssr.mjs";
import { t as clsx } from "../_libs/clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
import { n as persist, r as create, t as createJSONStorage } from "../_libs/zustand.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-CRfQ4uIz.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var ENGINES = [
	"grok",
	"scan",
	"network",
	"stack",
	"shell"
];
var TOOLS = [
	"scan",
	"headers",
	"tech",
	"apis"
];
var runTurn = createServerFn({ method: "POST" }).validator((input) => {
	if (!input || typeof input !== "object") throw new Error("Bad request");
	const data = input;
	const text = typeof data.text === "string" ? data.text.trim() : "";
	if (!text || text.length > 2e3) throw new Error("Message is empty or too long.");
	if (typeof data.engine !== "string" || !ENGINES.includes(data.engine)) throw new Error("Unknown engine.");
	const tool = data.tool === null || data.tool === void 0 ? null : typeof data.tool === "string" && TOOLS.includes(data.tool) ? data.tool : null;
	if (data.tool != null && tool === null) throw new Error("Unknown tool.");
	const url = cleanUrl(data.url);
	const lastUrl = cleanUrl(data.lastUrl);
	return {
		text,
		engine: data.engine,
		lastUrl,
		tool: data.tool == null ? null : tool,
		url,
		history: cleanHistory(data.history)
	};
}).handler(createSsrRpc("bbfde046b22bc8ff235573bd053217db70bb6021d3a378ea402c2b21dbcfd2c7"));
function cleanUrl(value) {
	if (typeof value !== "string") return null;
	const text = value.trim();
	if (!text || text.length > 2e3) return null;
	return text;
}
function cleanHistory(value) {
	if (!Array.isArray(value)) return [];
	const out = [];
	for (const item of value.slice(-4)) {
		if (!item || typeof item !== "object") continue;
		const rec = item;
		const role = rec.role === "assistant" ? "assistant" : rec.role === "user" ? "user" : null;
		const text = typeof rec.text === "string" ? rec.text.slice(0, 400) : "";
		if (role && text) out.push({
			role,
			text
		});
	}
	return out;
}
function welcome() {
	return {
		id: "welcome",
		role: "assistant",
		text: WELCOME
	};
}
var useTerminal = create()(persist((set, get) => ({
	engineId: "grok",
	messages: [welcome()],
	lastUrl: null,
	notes: [],
	turns: 0,
	setEngine: (engineId) => set({ engineId }),
	append: (message) => set({ messages: [...get().messages, message].slice(-60) }),
	patch: (id, partial) => set({ messages: get().messages.map((message) => message.id === id ? {
		...message,
		...partial
	} : message) }),
	setLastUrl: (lastUrl) => set({ lastUrl }),
	bump: () => set({ turns: get().turns + 1 }),
	addNote: (text) => set({ notes: [...get().notes, text].slice(-20) }),
	clear: () => set({
		messages: [{
			...welcome(),
			id: `welcome-${Date.now()}`
		}],
		lastUrl: null,
		notes: [],
		turns: 0
	})
}), {
	name: "ai-terminal-mobile",
	skipHydration: true,
	storage: createJSONStorage(() => localStorage),
	partialize: (state) => ({
		engineId: state.engineId,
		messages: state.messages.filter((message) => !message.pending).slice(-40).map(slim),
		lastUrl: state.lastUrl,
		notes: state.notes,
		turns: state.turns
	})
}));
function slim(message) {
	if (!message.report) return message;
	const report = {
		...message.report,
		excerpt: message.report.excerpt?.slice(0, 700) ?? null
	};
	return {
		...message,
		report
	};
}
var OPEN = {
	scan: {
		network: false,
		stack: true,
		hosts: true,
		endpoints: true,
		probes: true,
		excerpt: true
	},
	headers: {
		network: true,
		stack: false,
		hosts: false,
		endpoints: false,
		probes: false,
		excerpt: false
	},
	tech: {
		network: false,
		stack: true,
		hosts: true,
		endpoints: false,
		probes: false,
		excerpt: false
	},
	apis: {
		network: false,
		stack: false,
		hosts: true,
		endpoints: true,
		probes: true,
		excerpt: false
	}
};
function ReportCard({ report }) {
	const open = OPEN[report.mode];
	const host = hostLabel(report.finalUrl || report.requestedUrl);
	const [copied, setCopied] = (0, import_react.useState)(null);
	const timer = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		return () => {
			if (timer.current) clearTimeout(timer.current);
		};
	}, []);
	function flash(key) {
		setCopied(key);
		if (timer.current) clearTimeout(timer.current);
		timer.current = setTimeout(() => setCopied(null), 1400);
	}
	async function copy(key, value) {
		try {
			await navigator.clipboard.writeText(value);
			flash(key);
		} catch {
			flash("failed");
		}
	}
	function save() {
		const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
		const href = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = href;
		link.download = `terminal-${host.replace(/[^\w.-]+/g, "_")}.json`;
		link.click();
		URL.revokeObjectURL(href);
	}
	const statusClass = report.status >= 400 ? "text-danger" : report.status >= 300 ? "text-warn" : "text-foreground";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: "mt-2 overflow-hidden rounded-xl border border-border bg-card",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "break-all text-base font-medium",
						children: host
					}),
					report.title ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm text-muted",
						children: report.title
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs tabular-nums",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: statusClass,
								children: report.status || "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "text-muted",
								children: [report.ms, " ms"]
							}),
							report.contentType ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-faint",
								children: report.contentType.split(";")[0]
							}) : null,
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-faint",
								children: formatBytes(report.bytes)
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 break-all font-mono text-xs text-faint",
						children: report.finalUrl
					}),
					report.note ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 text-sm text-muted",
						children: report.note
					}) : null,
					report.description ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm text-muted",
						children: report.description
					}) : null
				]
			}),
			report.redirects.length > 1 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
				title: "Redirects",
				count: report.redirects.length,
				defaultOpen: true,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
					className: "flex flex-col gap-2",
					children: report.redirects.map((hop, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "min-w-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "font-mono text-xs tabular-nums text-muted",
							children: [
								hop.status,
								" · ",
								hop.ms,
								" ms"
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "break-all font-mono text-xs",
							children: hop.url
						})]
					}, `${hop.url}-${index}`))
				})
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
				title: "Network",
				count: report.responseHeaders.length,
				defaultOpen: open.network,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mb-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "font-mono text-xs text-muted",
							children: "request"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-1 break-all font-mono text-xs",
							children: [
								report.request.method,
								" ",
								report.request.url
							]
						}),
						report.request.headers.map((header) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-2 min-w-0",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "font-mono text-xs text-faint",
								children: header.name
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "break-all font-mono text-xs",
								children: header.value
							})]
						}, header.name))
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "border-t border-border pt-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "font-mono text-xs text-muted",
						children: "response"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-2 flex max-h-64 flex-col gap-2 overflow-auto",
						children: report.responseHeaders.map((header, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "font-mono text-xs text-faint",
								children: header.name
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "break-all font-mono text-xs",
								children: header.value
							})]
						}, `${header.name}-${index}`))
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
				title: "Stack",
				count: report.stack.length,
				defaultOpen: open.stack,
				children: report.stack.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted",
					children: "No familiar platform showed up in the HTML or headers."
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "flex flex-wrap gap-2",
					children: report.stack.map((hit) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "rounded-md border border-border bg-subtle px-2 py-1 text-xs",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-muted",
								children: hit.group
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-faint",
								children: " / "
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: hit.name })
						]
					}, `${hit.group}-${hit.name}`))
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
				title: "Hosts",
				count: report.hosts.length,
				defaultOpen: open.hosts,
				children: report.hosts.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted",
					children: "No third-party hosts on this page."
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "flex max-h-64 flex-col gap-2 overflow-auto",
					children: report.hosts.map((hostHit) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "flex min-w-0 items-baseline justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "break-all font-mono text-xs",
							children: hostHit.host
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "shrink-0 font-mono text-xs text-faint",
							children: hostHit.role
						})]
					}, hostHit.host))
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
				title: "Endpoints",
				count: report.endpoints.length,
				defaultOpen: open.endpoints,
				children: report.endpoints.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted",
					children: "No API-style paths were named in the markup."
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "flex max-h-64 flex-col gap-2 overflow-auto",
					children: report.endpoints.map((endpoint) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
						className: "break-all font-mono text-xs",
						children: endpoint
					}, endpoint))
				})
			}),
			report.probes.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
				title: "Checked paths",
				count: report.probes.length,
				defaultOpen: open.probes,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "flex flex-col gap-3",
					children: report.probes.map((probe) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "min-w-0",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "font-mono text-xs tabular-nums text-muted",
								children: probe.status || "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "break-all font-mono text-xs",
								children: probe.url
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 text-sm text-muted",
								children: probe.note
							})
						]
					}, probe.url))
				})
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
				title: "Excerpt",
				defaultOpen: open.excerpt,
				children: report.excerpt ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm leading-normal text-foreground",
					children: report.excerpt
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted",
					children: "No text body on this response."
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 gap-2 border-t border-border p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: cn(actionClass, "press"),
						onClick: () => copy("json", JSON.stringify(report, null, 2)),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, {
							className: "size-4",
							"aria-hidden": "true"
						}), copied === "json" ? "Copied" : "Copy JSON"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: cn(actionClass, "press"),
						onClick: save,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, {
							className: "size-4",
							"aria-hidden": "true"
						}), "Save report"]
					}),
					report.excerpt ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: cn(actionClass, "press col-span-2"),
						onClick: () => copy("text", report.excerpt ?? ""),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, {
							className: "size-4",
							"aria-hidden": "true"
						}), copied === "text" ? "Copied" : copied === "failed" ? "Copy blocked" : "Copy text"]
					}) : null
				]
			})
		]
	});
}
function Section({ title, count, defaultOpen, children }) {
	const [open, setOpen] = (0, import_react.useState)(Boolean(defaultOpen));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", {
		className: "group border-t border-border",
		open,
		onToggle: (event) => setOpen(event.currentTarget.open),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("summary", {
			className: "flex min-h-11 cursor-pointer items-center justify-between gap-3 px-4 text-sm font-medium",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: title }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "flex items-center gap-2",
				children: [typeof count === "number" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "font-mono text-xs text-muted tabular-nums",
					children: count
				}) : null, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "size-4 text-faint motion-safe:transition-transform motion-safe:duration-150 group-open:rotate-180" })]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "px-4 pb-4",
			children
		})]
	});
}
function formatBytes(bytes) {
	if (!bytes) return "0 B";
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1048576) return `${Math.round(bytes / 102.4) / 10} KB`;
	return `${Math.round(bytes / 104857.6) / 10} MB`;
}
var actionClass = "inline-flex h-11 items-center justify-center gap-2 rounded-md border border-border bg-subtle px-3 text-sm font-medium text-foreground";
function EngineSheet({ open, onOpenChange }) {
	const engineId = useTerminal((state) => state.engineId);
	const setEngine = useTerminal((state) => state.setEngine);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Sheet, {
		open,
		onOpenChange,
		title: "Engine",
		description: "Choose what a message does.",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "flex flex-col gap-2",
				children: LIVE_ENGINES.map((engine) => {
					const selected = engine.id === engineId;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						"aria-current": selected ? "true" : void 0,
						onClick: () => {
							setEngine(engine.id);
							onOpenChange(false);
						},
						className: cn("press flex min-h-11 w-full flex-col items-start rounded-md border px-3 py-3 text-left", selected ? "border-foreground bg-subtle" : "border-border bg-background"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-sm font-medium",
							children: engine.name
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "mt-1 text-sm text-muted",
							children: engine.detail
						})]
					}) }, engine.id);
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "mb-2 mt-6 text-sm font-medium text-muted",
				children: "Not connected"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "flex flex-col gap-2",
				children: UNAVAILABLE_ENGINES.map((engine) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "rounded-md border border-border px-3 py-3 opacity-70",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-sm font-medium",
						children: engine.name
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm text-muted",
						children: engine.detail
					})]
				}, engine.name))
			})
		]
	});
}
function SessionSheet({ open, onOpenChange }) {
	const engineId = useTerminal((state) => state.engineId);
	const lastUrl = useTerminal((state) => state.lastUrl);
	const notes = useTerminal((state) => state.notes);
	const turns = useTerminal((state) => state.turns);
	const clear = useTerminal((state) => state.clear);
	const [confirm, setConfirm] = (0, import_react.useState)(false);
	const engine = engineById(engineId);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Sheet, {
		open,
		onOpenChange,
		title: "Session",
		description: "What this chat keeps, and what it refuses.",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
				className: "grid grid-cols-2 gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Engine",
						value: engine.name
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Turns",
						value: String(turns)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "col-span-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
							className: "text-xs text-muted",
							children: "Last site"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
							className: "mt-1 break-all font-mono text-sm",
							children: lastUrl ? hostLabel(lastUrl) : "None yet"
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "mb-2 mt-6 text-sm font-medium",
				children: "Notes"
			}),
			notes.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "No notes yet. Send /note and a line to keep it on this device."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "flex flex-col gap-2",
				children: notes.map((note, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
					className: "rounded-md border border-border bg-background px-3 py-2 text-sm",
					children: note
				}, `${note}-${index}`))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "mb-2 mt-6 text-sm font-medium",
				children: "How a turn runs"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
				className: "flex flex-col gap-3",
				children: ARCHITECTURE.map((step) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "flex gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-mono text-xs text-faint",
						children: step.k
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: step.t
					})]
				}, step.k))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "press mt-6 h-11 w-full rounded-md border border-border text-sm font-medium text-danger",
				onClick: () => {
					if (!confirm) {
						setConfirm(true);
						return;
					}
					clear();
					setConfirm(false);
					onOpenChange(false);
				},
				children: confirm ? "Confirm clear" : "Clear history"
			})
		]
	});
}
function ArchitectureList() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
		className: "flex flex-col gap-4",
		children: ARCHITECTURE.map((step) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "font-mono text-xs text-faint",
			children: step.k
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-1 text-sm text-muted",
			children: step.t
		})] }, step.k))
	});
}
function Stat({ label, value }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
		className: "text-xs text-muted",
		children: label
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
		className: "mt-1 text-sm font-medium tabular-nums",
		children: value
	})] });
}
function Sheet({ open, onOpenChange, title, description, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
		open,
		onOpenChange,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogPortal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogOverlay, { className: "fixed inset-0 z-40 bg-background/80" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogContent, {
			className: "fixed inset-x-0 bottom-0 z-50 flex justify-center outline-none",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "sheet-panel safe-bottom max-h-dvh w-full overflow-y-auto rounded-t-xl border border-border bg-card p-4 md:mb-8 md:max-w-md md:rounded-xl",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mb-4 flex items-start justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, {
						className: "text-lg font-medium",
						children: title
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, {
						className: "mt-1 text-sm text-muted",
						children: description
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogClose, {
						"aria-label": "Close",
						className: "press inline-flex size-11 items-center justify-center rounded-md border border-border",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-4" })
					})]
				}), children]
			})
		})] })
	});
}
var SUGGESTIONS = [
	{
		label: "Read wordpress.org",
		text: "/scan https://wordpress.org"
	},
	{
		label: "Headers",
		engine: "network"
	},
	{
		label: "Stack",
		engine: "stack"
	},
	{
		label: "APIs",
		text: "/apis https://wordpress.org"
	},
	{
		label: "Help",
		text: "/help"
	}
];
function TerminalApp() {
	const engineId = useTerminal((state) => state.engineId);
	const messages = useTerminal((state) => state.messages);
	useTerminal((state) => state.lastUrl);
	const turns = useTerminal((state) => state.turns);
	const setEngine = useTerminal((state) => state.setEngine);
	const engine = engineById(engineId);
	const busy = messages.some((message) => message.pending);
	const latest = [...messages].reverse().find((message) => message.report)?.report ?? null;
	const [engineOpen, setEngineOpen] = (0, import_react.useState)(false);
	const [sessionOpen, setSessionOpen] = (0, import_react.useState)(false);
	const [draft, setDraft] = (0, import_react.useState)("");
	const scrollerRef = (0, import_react.useRef)(null);
	const inputRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		useTerminal.persist.rehydrate()?.then(() => {
			const id = useTerminal.getState().engineId;
			if (!LIVE_ENGINES.some((item) => item.id === id)) useTerminal.getState().setEngine("grok");
			useTerminal.setState({ messages: useTerminal.getState().messages.filter((message) => !message.pending) });
		});
	}, []);
	(0, import_react.useEffect)(() => {
		const el = scrollerRef.current;
		if (!el) return;
		el.scrollTop = el.scrollHeight;
	}, [messages]);
	(0, import_react.useEffect)(() => {
		if (window.matchMedia("(min-width: 768px)").matches) inputRef.current?.focus();
	}, [engineId]);
	async function send(text) {
		const value = text.trim();
		if (!value || busy) return;
		const state = useTerminal.getState();
		const decision = routeLocal(value, state.engineId, state.lastUrl);
		const user = {
			id: uid(),
			role: "user",
			text: value
		};
		state.append(user);
		setDraft("");
		if (inputRef.current) inputRef.current.style.height = "auto";
		if (decision.type === "help") {
			state.append({
				id: uid(),
				role: "assistant",
				text: helpText()
			});
			state.bump();
			return;
		}
		if (decision.type === "session") {
			const now = useTerminal.getState();
			state.append({
				id: uid(),
				role: "assistant",
				text: `Engine ${engineById(now.engineId).name}. Turns ${now.turns}. Last site ${now.lastUrl ? hostLabel(now.lastUrl) : "none"}. Notes ${now.notes.length}.`
			});
			return;
		}
		if (decision.type === "clear") {
			state.clear();
			return;
		}
		if (decision.type === "note") {
			state.addNote(decision.text);
			state.append({
				id: uid(),
				role: "assistant",
				text: "Noted on this device."
			});
			state.bump();
			return;
		}
		if (decision.type === "hint") {
			state.append({
				id: uid(),
				role: "assistant",
				text: decision.text
			});
			return;
		}
		if (decision.type === "need-url") {
			state.append({
				id: uid(),
				role: "assistant",
				text: needUrlText(decision.tool)
			});
			return;
		}
		const pendingId = uid();
		const pendingText = decision.type === "plan" ? "Asking Grok" : "Reading the page";
		state.append({
			id: pendingId,
			role: "assistant",
			text: pendingText,
			pending: true
		});
		try {
			const history = useTerminal.getState().messages.filter((message) => !message.pending && !message.id.startsWith("welcome")).slice(-5, -1).map((message) => ({
				role: message.role,
				text: message.text.slice(0, 400)
			}));
			const result = await runTurn({ data: {
				text: value,
				engine: state.engineId,
				lastUrl: state.lastUrl,
				tool: decision.type === "run" ? decision.tool : null,
				url: decision.type === "run" ? decision.url : null,
				history
			} });
			if (!useTerminal.getState().messages.some((message) => message.id === pendingId)) return;
			if (!result.ok) {
				useTerminal.getState().patch(pendingId, {
					pending: false,
					failed: true,
					text: result.error
				});
				return;
			}
			useTerminal.getState().patch(pendingId, {
				pending: false,
				failed: false,
				text: result.reply || (result.tool ? runReply(result.tool, result.report?.finalUrl ?? "") : ""),
				tool: result.tool,
				report: result.report
			});
			useTerminal.getState().bump();
			if (result.report?.finalUrl) useTerminal.getState().setLastUrl(result.report.finalUrl);
		} catch (err) {
			const message = err instanceof Error ? err.message : "The turn failed.";
			if (!useTerminal.getState().messages.some((item) => item.id === pendingId)) return;
			useTerminal.getState().patch(pendingId, {
				pending: false,
				failed: true,
				text: message
			});
		}
	}
	function onSuggestion(item) {
		if (item.engine) {
			setEngine(item.engine);
			inputRef.current?.focus();
			return;
		}
		if (item.text) send(item.text);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-dvh overflow-hidden bg-background text-foreground",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
				className: "hidden w-60 shrink-0 flex-col border-r border-border md:flex",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "safe-top px-4 py-5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: busy ? "dot dot-busy" : "dot",
								"aria-hidden": "true"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
								className: "text-lg font-medium tracking-tight",
								children: "Terminal"
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 font-mono text-xs text-faint",
							children: "Mobile"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
						className: "flex flex-1 flex-col gap-2 overflow-y-auto px-3",
						"aria-label": "Engines",
						children: LIVE_ENGINES.map((item) => {
							const selected = item.id === engineId;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								"aria-current": selected ? "true" : void 0,
								onClick: () => setEngine(item.id),
								className: cn("press rounded-md border px-3 py-3 text-left", selected ? "border-foreground bg-subtle" : "border-transparent hover:bg-subtle"),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-sm font-medium",
									children: item.name
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-1 text-xs text-muted",
									children: item.detail
								})]
							}, item.id);
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "border-t border-border px-4 py-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "font-mono text-xs text-faint",
							children: "Turns"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-1 text-sm tabular-nums",
							children: turns
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "flex min-w-0 flex-1 flex-col",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
						className: "safe-top flex items-center gap-2 border-b border-border px-3 py-2 md:px-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex min-w-0 items-center gap-2 md:hidden",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: busy ? "dot dot-busy" : "dot",
									"aria-hidden": "true"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-sm font-medium",
									children: "Terminal"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "press flex h-11 min-w-0 flex-1 items-center justify-between rounded-md border border-border bg-card px-3 md:hidden",
								onClick: () => setEngineOpen(true),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "truncate text-sm font-medium",
									children: engine.name
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, {
									className: "size-4 text-faint",
									"aria-hidden": "true"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "hidden min-w-0 flex-1 md:block",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-sm font-medium",
									children: engine.name
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-xs text-muted",
									children: busy ? "Running" : "Idle"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								"aria-label": "Session",
								className: "press inline-flex size-11 items-center justify-center rounded-md border border-border bg-card",
								onClick: () => setSessionOpen(true),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SlidersHorizontal, {
									className: "size-4",
									"aria-hidden": "true"
								})
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						ref: scrollerRef,
						className: "min-h-0 flex-1 overflow-y-auto",
						"data-testid": "transcript",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mx-auto flex w-full max-w-2xl flex-col gap-3 px-3 py-4 md:px-5",
							role: "log",
							"aria-live": "polite",
							"aria-relevant": "additions",
							children: messages.map((message) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageView, { message }, message.id))
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "safe-bottom border-t border-border",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "scroll-x mx-auto flex w-full max-w-2xl gap-2 px-3 py-2 md:px-5",
							children: SUGGESTIONS.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "press h-11 shrink-0 rounded-md border border-border bg-card px-3 text-sm",
								onClick: () => onSuggestion(item),
								children: item.label
							}, item.label))
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
							className: "mx-auto flex w-full max-w-2xl items-end gap-2 px-3 pb-3 md:px-5",
							onSubmit: (event) => {
								event.preventDefault();
								send(draft);
							},
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
									className: "sr-only",
									htmlFor: "terminal-input",
									children: "Message"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
									id: "terminal-input",
									ref: inputRef,
									"data-testid": "composer",
									rows: 1,
									value: draft,
									placeholder: placeholder(engine.id),
									enterKeyHint: "send",
									autoCapitalize: "off",
									autoCorrect: "off",
									className: "max-h-32 min-h-11 flex-1 resize-none rounded-md border border-border bg-subtle px-3 py-3 text-base text-foreground outline-none placeholder:text-faint focus:border-foreground",
									onChange: (event) => {
										setDraft(event.target.value);
										const el = event.target;
										el.style.height = "auto";
										el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
									},
									onKeyDown: (event) => {
										if (event.key === "Enter" && !event.shiftKey) {
											event.preventDefault();
											send(draft);
										}
									}
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "submit",
									"aria-label": "Send",
									disabled: busy || draft.trim().length === 0,
									className: "press inline-flex size-11 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-40",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SendHorizontal, {
										className: "size-4",
										"aria-hidden": "true"
									})
								})
							]
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
				className: "hidden w-80 shrink-0 flex-col border-l border-border lg:flex",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "safe-top border-b border-border px-5 py-5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-sm font-medium",
						children: "Latest read"
					}), latest ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "break-all text-sm font-medium",
								children: hostLabel(latest.finalUrl)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-1 font-mono text-xs tabular-nums text-muted",
								children: [
									latest.status,
									" · ",
									latest.ms,
									" ms"
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
								className: "mt-3 flex flex-col gap-1",
								children: [latest.stack.slice(0, 6).map((hit) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
									className: "text-sm text-muted",
									children: [
										hit.group,
										" / ",
										hit.name
									]
								}, `${hit.group}-${hit.name}`)), latest.stack.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
									className: "text-sm text-muted",
									children: "No platform marker."
								}) : null]
							})
						]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm text-muted",
						children: "No page yet. A read shows up here after the first card."
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex-1 overflow-y-auto px-5 py-5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-sm font-medium",
						children: "How a turn runs"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArchitectureList, {})
					})]
				})]
			}),
			engineOpen ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EngineSheet, {
				open: engineOpen,
				onOpenChange: setEngineOpen
			}) : null,
			sessionOpen ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SessionSheet, {
				open: sessionOpen,
				onOpenChange: setSessionOpen
			}) : null
		]
	});
}
function MessageView({ message }) {
	const mine = message.role === "user";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("msg-in flex", mine ? "justify-end" : "justify-start"),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: cn("min-w-0", mine ? "max-w-sm" : "w-full"),
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: cn("rounded-lg px-3 py-3 text-sm leading-normal", mine ? "bg-primary text-primary-foreground" : cn("w-fit max-w-full border bg-card text-foreground", message.failed ? "border-danger" : "border-border"), message.pending && "text-muted"),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "whitespace-pre-wrap break-words",
					children: message.text
				})
			}), message.report ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReportCard, { report: message.report }) : null]
		})
	});
}
function placeholder(engine) {
	if (engine === "grok") return "Ask, or name a public site";
	if (engine === "network") return "Site to inspect headers";
	if (engine === "stack") return "Site to fingerprint";
	if (engine === "shell") return "/scan https://example.com";
	return "https:// or a domain";
}
function uid() {
	return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TerminalApp, {});
}
//#endregion
export { Home as component };
