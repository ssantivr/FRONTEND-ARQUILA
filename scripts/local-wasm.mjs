// Windows only, on machines where Smart App Control blocks the unsigned native Rollup binary
// (rollup.win32-x64-msvc.node), so Vite and Vitest cannot start. Run it after every install:
//
//     npm ci && npm run local:wasm
//
// It replaces node_modules/rollup with @rollup/wasm-node of the same version: the same Rollup
// compiled to WebAssembly, which loads no native binary. Nothing in the repository changes:
// package.json and package-lock.json keep the native Rollup that CI and Vercel use on Linux,
// and the next `npm ci` puts it back.
import { execFileSync, execSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const ROLLUP = join(ROOT, "node_modules", "rollup");

if (process.platform !== "win32" && !process.argv.includes("--force")) {
    console.log("local:wasm solo hace falta en Windows; aquí no cambia nada.");
    process.exit(0);
}

const installed = JSON.parse(readFileSync(join(ROLLUP, "package.json"), "utf8"));

if (installed.name === "@rollup/wasm-node") {
    console.log(`node_modules/rollup ya es @rollup/wasm-node ${installed.version}.`);
    process.exit(0);
}

const version = installed.version;

if (!/^\d+\.\d+\.\d+$/.test(version)) {
    console.error(`Versión de Rollup inesperada: ${version}.`);
    process.exit(1);
}

const work = mkdtempSync(join(tmpdir(), "arquila-rollup-wasm-"));

try {
    // npm.cmd is a batch file, which Node only runs through a shell: one fixed command line,
    // with the version checked above to hold nothing but digits and dots.
    const [packed] = JSON.parse(
        execSync(`npm pack @rollup/wasm-node@${version} --json --silent`, {
            cwd: work,
            encoding: "utf8",
        }),
    );
    // A relative name, so neither tar of Windows nor that of Git Bash reads a drive letter.
    execFileSync("tar", ["-xzf", packed.filename], { cwd: work });

    rmSync(ROLLUP, { recursive: true, force: true });
    cpSync(join(work, "package"), ROLLUP, { recursive: true });
} finally {
    rmSync(work, { recursive: true, force: true });
}

const check = execFileSync(
    process.execPath,
    ["-e", 'const r = require("rollup"); console.log(r.VERSION)'],
    { cwd: ROOT, encoding: "utf8" },
).trim();

if (check !== version || !readdirSync(join(ROLLUP, "dist")).includes("wasm-node")) {
    console.error(`No quedó @rollup/wasm-node ${version} (Rollup responde ${check}).`);
    process.exit(1);
}

console.log(`node_modules/rollup es ahora @rollup/wasm-node ${version}, solo en este equipo.`);
