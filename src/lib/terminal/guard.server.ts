import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Public-web allowlist for the page reader.
 * Hostnames are resolved before the fetch. Private, link-local, loopback,
 * and metadata addresses are refused. This is not a general shell.
 */

export class PublicUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublicUrlError";
  }
}

export class SafeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SafeError";
  }
}

const BLOCKED_HOSTS = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata.google",
  "metadata",
  "kubernetes.default",
  "host.docker.internal",
  "host.containers.internal",
]);

const BLOCKED_SUFFIXES = [".local", ".localhost", ".internal", ".home.arpa", ".localdomain", ".lan"];

export function toSafeMessage(err: unknown): string {
  if (err instanceof PublicUrlError || err instanceof SafeError) return err.message;
  return "Could not read that site.";
}

export async function assertPublicUrl(raw: string): Promise<URL> {
  const url = normalizeHttpUrl(raw);
  await assertResolvedPublic(url);
  return url;
}

export function normalizeHttpUrl(raw: string): URL {
  let text = raw.trim();
  if (text.length === 0 || text.length > 2000) {
    throw new PublicUrlError("That does not look like a public web address.");
  }
  if (!/^[a-z][a-z0-9+.-]*:/i.test(text)) text = "https://" + text;

  let url: URL;
  try {
    url = new URL(text);
  } catch {
    throw new PublicUrlError("That does not look like a public web address.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new PublicUrlError("Only public http and https pages can be read.");
  }
  if (url.username || url.password) {
    throw new PublicUrlError("Addresses that include a username or password are blocked.");
  }
  if (url.port && url.port !== "80" && url.port !== "443") {
    throw new PublicUrlError("Only public pages on port 80 or 443 can be read.");
  }

  let host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!host || host.includes("%")) {
    throw new PublicUrlError("That does not look like a public web address.");
  }
  url.hostname = host;
  url.hash = "";

  if (BLOCKED_HOSTS.has(host) || BLOCKED_SUFFIXES.some((suffix) => host.endsWith(suffix))) {
    throw new PublicUrlError("Private and local addresses are blocked.");
  }
  if (/^\d+$/.test(host) || host.includes("0x")) {
    throw new PublicUrlError("That address is blocked.");
  }

  const literal = ipv4Literal(host);
  if (literal === "blocked") throw new PublicUrlError("That address is blocked.");
  if (literal && isBlockedIp(literal)) throw new PublicUrlError("Private and local addresses are blocked.");
  if (host.includes(":") && isBlockedIp(host)) throw new PublicUrlError("Private and local addresses are blocked.");

  return url;
}

async function assertResolvedPublic(url: URL): Promise<void> {
  const host = url.hostname;
  if (isIP(host)) {
    if (isBlockedIp(host)) throw new PublicUrlError("Private and local addresses are blocked.");
    return;
  }

  let records: { address: string }[];
  try {
    records = await withTimeout(lookup(host, { all: true, verbatim: true }), 4000);
  } catch (err) {
    if (err instanceof PublicUrlError || err instanceof SafeError) throw err;
    throw new SafeError("Could not resolve that host.");
  }
  if (records.length === 0) throw new SafeError("Could not resolve that host.");
  // Any private answer rejects the name, so a mixed DNS record cannot slip through.
  if (records.some((record) => isBlockedIp(record.address))) {
    throw new PublicUrlError("That host is not a public site.");
  }
}

function ipv4Literal(host: string): string | "blocked" | null {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return null;
  const parts = host.split(".");
  if (parts.some((part) => part.length > 1 && part.startsWith("0"))) return "blocked";
  const nums = parts.map((part) => Number(part));
  if (nums.some((n) => n > 255)) return "blocked";
  return nums.join(".");
}

export function isBlockedIp(ip: string): boolean {
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

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new SafeError("Could not resolve that host.")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}
