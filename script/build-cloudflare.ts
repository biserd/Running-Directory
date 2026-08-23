import { build as viteBuild } from "vite";
import { rm } from "fs/promises";
import path from "path";

async function buildCloudflare() {
  await rm("dist", { recursive: true, force: true });

  console.log("building client assets...");
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
  await viteBuild({
    build: {
      ssr: "src/entry-server.tsx",
      outDir: path.resolve(import.meta.dirname, "..", "dist", "server"),
      emptyOutDir: true,
    },
  });
}

buildCloudflare().catch((error) => {
  console.error(error);
  process.exit(1);
});
