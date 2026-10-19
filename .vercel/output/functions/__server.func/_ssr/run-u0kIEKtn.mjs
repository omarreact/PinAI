import { n as TSS_SERVER_FUNCTION, t as createServerFn } from "./ssr.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/run-u0kIEKtn.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
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
var runTurn_createServerFn_handler = createServerRpc({
	id: "bbfde046b22bc8ff235573bd053217db70bb6021d3a378ea402c2b21dbcfd2c7",
	name: "runTurn",
	filename: "src/lib/terminal/run.ts"
}, (opts) => runTurn.__executeServer(opts));
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
}).handler(runTurn_createServerFn_handler, async ({ data }) => {
	const { executeTurn } = await import("./execute.server-FS5Niay8.mjs");
	return executeTurn(data);
});
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
//#endregion
export { runTurn_createServerFn_handler };
