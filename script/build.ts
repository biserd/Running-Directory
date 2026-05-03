import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile } from "fs/promises";
import path from "path";

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times
const allowlist = [
  "@google/generative-ai",
  "axios",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "pg",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild({
    build: {
      rollupOptions: {
        input: {
          main: "client/index.html",
        },
      },
    },
  });

  console.log("building SSR bundle...");
  // outDir must be an absolute path because vite.config.ts sets root: "client"
  // and a relative outDir would resolve to client/dist/server, not dist/server.
  await viteBuild({
    build: {
      ssr: "src/entry-server.tsx",
      outDir: path.resolve(import.meta.dirname, "..", "dist", "server"),
      emptyOutDir: true,
    },
  });

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    // ESM matches package.json "type": "module" and lets us use import.meta
    // natively (server/ssr-render.ts and server/vite.ts both depend on it).
    // The banner shims __dirname / __filename / require so existing CJS-style
    // references (server/index.ts, server/static.ts) keep working inside the
    // bundle.
    format: "esm",
    outfile: "dist/index.js",
    banner: {
      js: [
        "import { createRequire as __cjsCompatCreateRequire } from 'module';",
        "import { fileURLToPath as __cjsCompatFileURLToPath } from 'url';",
        "import { dirname as __cjsCompatDirname } from 'path';",
        "const require = __cjsCompatCreateRequire(import.meta.url);",
        "const __filename = __cjsCompatFileURLToPath(import.meta.url);",
        "const __dirname = __cjsCompatDirname(__filename);",
      ].join("\n"),
    },
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
