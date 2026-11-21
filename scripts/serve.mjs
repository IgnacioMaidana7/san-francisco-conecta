import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, sep, extname } from "node:path";
import { gzipSync } from "node:zlib";
const root = resolve("dist");
const cache = new Map();
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
};
async function file(path) {
  // Leer de nuevo: una compilación posterior debe verse sin reiniciar la vista previa.
  const info = await stat(path);
  const previous = cache.get(path);
  if (previous?.mtime === info.mtimeMs && previous.size === info.size)
    return previous;
  const body = await readFile(path);
  const result = {
    body,
    compressed: gzipSync(body),
    mtime: info.mtimeMs,
    size: info.size,
  };
  cache.set(path, result);
  return result;
}
const server = createServer(async (req, res) => {
  if (!["GET", "HEAD"].includes(req.method)) {
    res.writeHead(405).end();
    return;
  }
  let path;
  try {
    path = resolve(
      root,
      "." + decodeURIComponent(new URL(req.url, "http://localhost").pathname),
    );
  } catch {
    res.writeHead(400).end("Invalid URL");
    return;
  }
  if (path !== root && !path.startsWith(root + sep)) {
    res.writeHead(403).end();
    return;
  }
  if (!extname(path)) path = resolve(root, "index.html");
  try {
    const { body, compressed } = await file(path);
    const gzip =
      /\bgzip\b/.test(req.headers["accept-encoding"] ?? "") &&
      [".html", ".js", ".css", ".svg", ".json", ".webmanifest"].includes(
        extname(path),
      );
    res.writeHead(200, {
      "Content-Type": types[extname(path)] ?? "application/octet-stream",
      "Content-Length": gzip ? compressed.length : body.length,
      "Cache-Control": "no-cache",
      Vary: "Accept-Encoding",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      ...(gzip ? { "Content-Encoding": "gzip" } : {}),
    });
    res.end(req.method === "HEAD" ? undefined : gzip ? compressed : body);
  } catch {
    res
      .writeHead(404, { "Content-Type": "text/plain" })
      .end("Not found. Run npm run build first.");
  }
});
server.listen(4173, "127.0.0.1", () =>
  console.log(
    "Local: http://127.0.0.1:4173/ (compilación con compresión HTTP)",
  ),
);
server.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
process.on("SIGINT", () => server.close(() => process.exit(0)));
