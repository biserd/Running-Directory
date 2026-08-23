import { env } from "cloudflare:workers";
import { httpServerHandler } from "cloudflare:node";
import express, {
  type NextFunction,
  type Request as ExpressRequest,
  type Response as ExpressResponse,
} from "express";
import session from "express-session";
import { createServer } from "node:http";
import { D1SessionStore } from "./d1-session-store";
import { registerRoutes } from "./routes";
import { registerSEORoutes } from "./seo";
import { setupWorkerSSR } from "./ssr-render";

const APP_PORT = 8787;
const app = express();
const server = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

app.set("trust proxy", 1);
app.use((req, res, next) => {
  if (req.hostname.toLowerCase() === "www.running.services") {
    return res.redirect(301, `https://running.services${req.originalUrl}`);
  }
  next();
});
app.use(
  express.json({
    verify: (req, _res, buffer) => {
      req.rawBody = buffer;
    },
  }),
);
app.use(express.urlencoded({ extended: false }));
app.use(
  session({
    store: new D1SessionStore(env.DB),
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true,
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      sameSite: "lax",
    },
  }),
);

app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on("finish", () => {
    if (req.path.startsWith("/api")) {
      console.log(JSON.stringify({
        event: "http_request",
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: Date.now() - startedAt,
      }));
    }
  });
  next();
});

app.use((req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
  const path = req.path;
  if (path.length > 1 && path.endsWith("/") && !path.startsWith("/api/")) {
    const query = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
    return res.redirect(301, path.slice(0, -1) + query);
  }
  next();
});

registerSEORoutes(app);
await registerRoutes(server, app);

app.use(async (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
  if (!req.path.includes(".")) {
    return next();
  }
  try {
    const asset = await env.ASSETS.fetch(
      new Request(new URL(req.originalUrl, `https://${req.headers.host || "running.services"}`)),
    );
    if (asset.status === 404) {
      return next();
    }
    res.status(asset.status);
    asset.headers.forEach((value, key) => res.setHeader(key, value));
    const body = Buffer.from(await asset.arrayBuffer());
    return res.end(body);
  } catch (error) {
    return next(error);
  }
});

setupWorkerSSR(app);

app.use((error: unknown, _req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
  console.error("Unhandled request error:", error);
  if (res.headersSent) {
    return next(error);
  }
  return res.status(500).json({ message: "Internal Server Error" });
});

server.listen(APP_PORT);
const nodeHandler = httpServerHandler({ port: APP_PORT });

export default {
  fetch: nodeHandler.fetch!,

  scheduled(
    _controller: ScheduledController,
    _workerEnv: Env,
    ctx: ExecutionContext,
  ): void {
    ctx.waitUntil(
      import("./alerts/scheduler")
        .then(({ runAlertDispatch }) => runAlertDispatch())
        .then((result) => console.log(JSON.stringify({ event: "alert_dispatch", ...result })))
        .catch((error) => console.error("Scheduled alert dispatch failed:", error)),
    );
  },
} satisfies ExportedHandler<Env>;
