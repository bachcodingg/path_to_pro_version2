// Serves the old and new demo builds side by side from one origin, so the compare page can
// drive both frames (same sign-in, same page, synced scrolling). No dependencies.
//   /            compare page
//   /old/*       the design before (built from the untouched checkout)
//   /new/*       the redesign
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT ?? 5170);
const builds = process.env.COMPARE_BUILDS ?? resolve(here, "..", ".compare");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json",
};

function send(res, file) {
  res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream", "Cache-Control": "no-store" });
  createReadStream(file).pipe(res);
}

createServer((req, res) => {
  const path = posix.normalize(decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (path === "/" || path === "/index.html") return send(res, join(here, "index.html"));
  const m = path.match(/^\/(old|new)(\/.*)?$/);
  if (!m) return res.writeHead(404).end("Not found");
  const [, side, rest = "/"] = m;
  // The installable-app layer would cache each build; a comparison always wants the latest
  if (/\/(sw|registerSW|workbox-[^/]*)\.js$/.test(rest)) {
    res.writeHead(200, { "Content-Type": "text/javascript" });
    return res.end("");
  }
  const root = join(builds, side);
  const file = join(root, rest);
  if (file.startsWith(root) && existsSync(file) && statSync(file).isFile()) return send(res, file);
  if (extname(rest)) return res.writeHead(404).end("Not found");
  return send(res, join(root, "index.html")); // client-side routes
}).listen(port, "127.0.0.1", () => console.log(`Compare the designs at http://localhost:${port}/`));
