import type { Express, Request, Response, NextFunction } from "express";
import type { ViteDevServer } from "vite";
import fs from "fs";
import path from "path";
import { getSSRPrefetch } from "./ssr-prefetch";
import { getCachedHTML, setCachedHTML } from "./ssr-cache";

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function injectMetaTags(html: string, meta: any): string {
  html = html.replace(
    /<title>[^<]*<\/title>/,
    `<title>${escapeHtml(meta.title)}</title>`
  );
  html = html.replace(
    /<meta name="description" content="[^"]*" \/>/,
    `<meta name="description" content="${escapeAttr(meta.description)}" />`
  );
  html = html.replace(
    /<meta property="og:title" content="[^"]*" \/>/,
    `<meta property="og:title" content="${escapeAttr(meta.ogTitle || meta.title)}" />`
  );
  html = html.replace(
    /<meta property="og:description" content="[^"]*" \/>/,
    `<meta property="og:description" content="${escapeAttr(meta.ogDescription || meta.description)}" />`
  );
  if (meta.ogType) {
    html = html.replace(
      /<meta property="og:type" content="[^"]*" \/>/,
      `<meta property="og:type" content="${escapeAttr(meta.ogType)}" />`
    );
  }
  html = html.replace(
    /<meta name="twitter:title" content="[^"]*" \/>/,
    `<meta name="twitter:title" content="${escapeAttr(meta.ogTitle || meta.title)}" />`
  );
  html = html.replace(
    /<meta name="twitter:description" content="[^"]*" \/>/,
    `<meta name="twitter:description" content="${escapeAttr(meta.ogDescription || meta.description)}" />`
  );
  if (meta.canonicalUrl) {
    html = html.replace("</head>", `<link rel="canonical" href="${escapeAttr(meta.canonicalUrl)}" />\n</head>`);
  }
  return html;
}

function injectSSRContent(template: string, appHtml: string, dehydratedState: unknown, meta: any): string {
  let html = injectMetaTags(template, meta);

  html = html.replace(
    `<div id="root"></div>`,
    `<div id="root">${appHtml}</div>`
  );

  const stateScript = `<script>window.__REACT_QUERY_STATE__ = ${JSON.stringify(dehydratedState).replace(/</g, "\\u003c")}</script>`;
  html = html.replace("</head>", `${stateScript}\n</head>`);

  if (meta.jsonLd) {
    const jsonLdScript = `<script type="application/ld+json">${JSON.stringify(meta.jsonLd)}</script>`;
    html = html.replace("</head>", `${jsonLdScript}\n</head>`);
  }

  return html;
}

export function setupDevSSR(app: Express, vite: ViteDevServer) {
  app.use("/{*path}", async (req: Request, res: Response, next: NextFunction) => {
    const url = req.originalUrl;

    if (url.startsWith("/api/") || url.startsWith("/vite-hmr") || url.startsWith("/@") || url.includes(".")) {
      return next();
    }

    try {
      const currentDir = typeof __dirname !== "undefined" ? __dirname : import.meta.dirname;
      const clientTemplate = path.resolve(
        currentDir,
        "..",
        "client",
        "index.html",
      );

      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/entry-client.tsx"`,
      );
      template = await vite.transformIndexHtml(url, template);

      try {
        const { render } = await vite.ssrLoadModule("/src/entry-server.tsx");
        const prefetchFn = getSSRPrefetch(url);
        const { html: appHtml, dehydratedState, meta } = await render(url, prefetchFn);
        const finalHtml = injectSSRContent(template, appHtml, dehydratedState, meta);
        res.status(200).set({ "Content-Type": "text/html" }).end(finalHtml);
      } catch (ssrError) {
        console.error("SSR render failed, falling back to client rendering:", (ssrError as Error).message);
        const prefetchFn = getSSRPrefetch(url);
        if (prefetchFn) {
          const { QueryClient } = await import("@tanstack/react-query");
          const qc = new QueryClient();
          try {
            const meta = await prefetchFn(qc);
            const htmlWithMeta = injectMetaTags(template, meta);
            if (meta.jsonLd) {
              const jsonLdScript = `<script type="application/ld+json">${JSON.stringify(meta.jsonLd)}</script>`;
              const finalHtml = htmlWithMeta.replace("</head>", `${jsonLdScript}\n</head>`);
              return res.status(200).set({ "Content-Type": "text/html" }).end(finalHtml);
            }
            return res.status(200).set({ "Content-Type": "text/html" }).end(htmlWithMeta);
          } catch {
            // fall through
          }
          qc.clear();
        }
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      }
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      console.error("SSR template error:", e);
      next(e);
    }
  });
}

export function setupProdSSR(app: Express) {
  const currentDir = typeof __dirname !== "undefined" ? __dirname : import.meta.dirname;
  const distPath = path.resolve(currentDir, "public");

  app.use("/{*path}", async (req: Request, res: Response, next: NextFunction) => {
    const url = req.originalUrl;

    if (url.startsWith("/api/") || url.includes(".")) {
      return next();
    }

    try {
      const cached = getCachedHTML(url);
      if (cached) {
        return res.status(200).set({ "Content-Type": "text/html", "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" }).end(cached);
      }

      const template = await fs.promises.readFile(
        path.resolve(distPath, "index.html"),
        "utf-8"
      );

      const ssrBundlePath = path.resolve(currentDir, "server", "entry-server.js");
      const { render } = await import(ssrBundlePath);
      const prefetchFn = getSSRPrefetch(url);
      const { html: appHtml, dehydratedState, meta } = await render(url, prefetchFn);

      const finalHtml = injectSSRContent(template, appHtml, dehydratedState, meta);

      setCachedHTML(url, finalHtml);
      res.status(200).set({ "Content-Type": "text/html", "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" }).end(finalHtml);
    } catch (e) {
      console.error("SSR render error:", e);
      next(e);
    }
  });
}
