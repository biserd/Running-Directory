import {
  createMcpHandler,
  hostHeaderValidationResponse,
  isJsonContentType,
  McpServer,
  originValidationResponse,
  readRequestBody,
} from "@modelcontextprotocol/server";
import { z } from "zod-v4";
import manifest from "../server.json";
import type { IStorage } from "./storage";

const endpoint = new URL(manifest.remotes[0].url);
const allowedHostnames = [endpoint.hostname, "localhost", "127.0.0.1", "[::1]"];
const maxRequestBytes = 16 * 1024;
const searchInput = z.strictObject({
  query: z.string().trim().min(2).max(80).optional().describe("Race name or city keyword"),
  state: z.string().regex(/^[A-Za-z]{2}$/).optional().describe("Two-letter US state code"),
  distance: z.enum(["5K", "10K", "Half Marathon", "Marathon", "Ultra"]).optional(),
  from: z.iso.date().optional().describe("Earliest race date (YYYY-MM-DD)"),
  through: z.iso.date().optional().describe("Latest race date (YYYY-MM-DD)"),
  limit: z.number().int().min(1).max(10).optional().describe("Maximum results, default 10"),
});

export function createRaceMcp(searchRaces: IStorage["getRacesAdvanced"]) {
  const handler = createMcpHandler(() => {
    const server = new McpServer({
      name: manifest.name,
      title: manifest.title,
      version: manifest.version,
      websiteUrl: manifest.websiteUrl,
      icons: manifest.icons,
    });

    server.registerTool("search_races", {
      title: "Find upcoming running races",
      description: "Search public US race listings by name or city, state, distance, and date. Returns basic race details and links to running.services, sorted by date.",
      inputSchema: searchInput,
      annotations: { readOnlyHint: true, openWorldHint: false },
    }, async ({ query, state, distance, from, through, limit = 10 }) => {
      const today = new Date().toISOString().slice(0, 10);
      const dateFrom = from && from > today ? from : today;
      if (through && through < dateFrom) {
        return { isError: true, content: [{ type: "text", text: "The end date must be on or after the upcoming search start date." }] };
      }

      const races = await searchRaces({ q: query, state: state?.toUpperCase(), distance, dateFrom, dateTo: through, limit, sort: "date" });
      const result = {
        races: races.map(({ name, date, city, state, distance, slug }) => ({
          name,
          date,
          city,
          state,
          distance,
          url: `${endpoint.origin}/races/${encodeURIComponent(slug)}`,
        })),
      };
      return { structuredContent: result, content: [{ type: "text", text: JSON.stringify(result) }] };
    });
    return server;
  }, { maxRequestBodySize: maxRequestBytes });

  return async (request: Request, rateLimiter: RateLimit): Promise<Response> => {
    const rejected = hostHeaderValidationResponse(request, allowedHostnames)
      ?? originValidationResponse(request, allowedHostnames);
    if (rejected) return rejected;

    const key = `race-mcp:${request.headers.get("CF-Connecting-IP") || "unknown"}`;
    if (!(await rateLimiter.limit({ key })).success) {
      return Response.json({ error: "MCP rate limit exceeded" }, {
        status: 429,
        headers: { "Retry-After": "60", "Cache-Control": "no-store" },
      });
    }

    if (request.method !== "POST" || !isJsonContentType(request.headers.get("Content-Type"))) {
      return handler.fetch(request);
    }

    // A legacy JSON-RPC batch could otherwise run several searches for one rate-limit unit.
    const body = await readRequestBody(request, maxRequestBytes);
    if (body.tooLarge) return new Response("MCP request body too large", { status: 413 });
    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(body.text);
    } catch {
      return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, { status: 400 });
    }
    if (Array.isArray(parsedBody)) {
      return Response.json({
        jsonrpc: "2.0", id: null, error: { code: -32600, message: "Send one MCP message per request" },
      }, { status: 400 });
    }
    return handler.fetch(request, { parsedBody });
  };
}
