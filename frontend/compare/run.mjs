// npm run compare: builds the old design (from the untouched checkout) and this redesign as offline
// demos, then serves both at http://localhost:5170/.
//   npm run compare -- --no-build    serve what is already built
//   OLD_DIR=<path>                   the frontend folder holding the old design
import { spawn, spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const frontend = resolve(here, "..");
const out = resolve(frontend, ".compare");
const oldDir = resolve(process.env.OLD_DIR ?? resolve(frontend, "../../pathtopro/frontend"));

function build(cwd, side) {
  console.log(`Building ${side === "old" ? "the old design" : "the redesign"}...`);
  // Vite's own script, not npx through a shell: a shell would split a path with a space in it
  const vite = resolve(cwd, "node_modules/vite/bin/vite.js");
  const r = spawnSync(process.execPath, [vite, "build", "--outDir", resolve(out, side), "--emptyOutDir", "--logLevel", "warn"], {
    cwd,
    stdio: "inherit",
    env: { ...process.env, VITE_DEMO: "1", VITE_BASE: `/${side}/` },
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

if (!process.argv.includes("--no-build")) {
  if (!existsSync(oldDir)) {
    console.error(`Old design not found at ${oldDir}. Set OLD_DIR to its frontend folder.`);
    process.exit(1);
  }
  build(oldDir, "old");
  build(frontend, "new");
}
spawn(process.execPath, [resolve(here, "server.mjs")], { stdio: "inherit", env: { ...process.env, COMPARE_BUILDS: out } });
