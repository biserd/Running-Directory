import assert from "node:assert/strict";
import test from "node:test";
import manifest from "../server.json";
import { createRaceMcp } from "./race-mcp";
import type { IStorage } from "./storage";

const url = manifest.remotes[0].url;
const allow: RateLimit = { limit: async () => ({ success: true }) };

async function rpc(
  handler: ReturnType<typeof createRaceMcp>,
  method: string,
  params: Record<string, unknown> = {},
  version = "2026-07-28",
) {
  const response = await handler(new Request(url, {
    method: "POST",
    headers: {
      Host: new URL(url).host,
      Accept: "application/json, text/event-stream",
      "Content-Type": "application/json",
      "MCP-Protocol-Version": version,
      "Mcp-Method": method,
      ...(method === "tools/call" ? { "Mcp-Name": String(params.name) } : {}),
    },
    body: JSON.stringify({
      jsonrpc: "2.0", id: 1, method,
      params: version === "2026-07-28" ? {
        ...params,
        _meta: {
          "io.modelcontextprotocol/protocolVersion": version,
          "io.modelcontextprotocol/clientCapabilities": {},
          "io.modelcontextprotocol/clientInfo": { name: "race-mcp-test", version: "1.0.0" },
        },
      } : params,
    }),
  }), allow);
  const body = await response.text();
  assert.equal(response.status, 200, body);
  const data = body.split("\n").find((line) => line.startsWith("data: "));
  return JSON.parse(data ? data.slice(6) : body);
}

test("anonymous clients can discover only the public race search tool in both protocol versions", async () => {
  const handler = createRaceMcp(async () => []);
  const current = await rpc(handler, "server/discover");
  assert.ok(current.result.capabilities.tools);
  assert.deepEqual(current.result._meta["io.modelcontextprotocol/serverInfo"].icons, manifest.icons);

  const legacyVersion = "2025-11-25";
  const legacy = await rpc(handler, "initialize", {
    protocolVersion: legacyVersion,
    capabilities: {},
    clientInfo: { name: "race-mcp-test", version: "1.0.0" },
  }, legacyVersion);
  assert.deepEqual(legacy.result.serverInfo.icons, manifest.icons);

  for (const version of ["2026-07-28", legacyVersion]) {
    const { result } = await rpc(handler, "tools/list", {}, version);
    assert.deepEqual(result.tools.map(({ name }: { name: string }) => name), ["search_races"]);
    assert.equal(result.tools[0].annotations.readOnlyHint, true);
  }
});

test("search validates filters and returns only public race fields", async () => {
  type Search = IStorage["getRacesAdvanced"];
  const queries: Parameters<Search>[0][] = [];
  const race = {
    name: "Example Marathon", date: "2099-04-01", city: "Boston", state: "MA",
    distance: "Marathon", slug: "example-marathon", prScore: 100, organizerId: 42,
  } as Awaited<ReturnType<Search>>[number];
  const handler = createRaceMcp(async (filters) => {
    queries.push(filters);
    return [race];
  });
  const { result } = await rpc(handler, "tools/call", {
    name: "search_races", arguments: { query: " Boston ", state: "ma", distance: "Marathon", from: "2099-03-01", limit: 2 },
  });
  assert.deepEqual(result.structuredContent, { races: [{
    name: race.name, date: race.date, city: race.city, state: race.state,
    distance: race.distance, url: "https://running.services/races/example-marathon",
  }] });
  assert.deepEqual(queries, [{
    q: "Boston", state: "MA", distance: "Marathon", dateFrom: "2099-03-01", dateTo: undefined, limit: 2, sort: "date",
  }]);

  const invalid = await rpc(handler, "tools/call", { name: "search_races", arguments: { limit: 100 } });
  const privateTool = await rpc(handler, "tools/call", { name: "account_details", arguments: {} });
  assert.ok(invalid.error || invalid.result?.isError);
  assert.ok(privateTool.error || privateTool.result?.isError);
  assert.equal(queries.length, 1);
});

test("rate limiting and origin validation run before tool execution", async () => {
  const handler = createRaceMcp(async () => assert.fail("Unexpected search"));
  const limited = await handler(new Request(url, {
    method: "POST", headers: { Host: "running.services", "CF-Connecting-IP": "192.0.2.1" },
  }), {
    async limit({ key }) {
      assert.equal(key, "race-mcp:192.0.2.1");
      return { success: false };
    },
  });
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("Retry-After"), "60");

  const rejected = await handler(new Request(url, {
    headers: { Host: "running.services", Origin: "https://example.com" },
  }), { limit: async () => assert.fail("Unexpected limiter call") });
  assert.equal(rejected.status, 403);
});

test("a legacy batch cannot run several searches against one rate-limit unit", async () => {
  const handler = createRaceMcp(async () => assert.fail("Unexpected search"));
  const call = { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "search_races", arguments: {} } };
  const response = await handler(new Request(url, {
    method: "POST",
    headers: { Host: "running.services", "Content-Type": "application/json" },
    body: JSON.stringify([call, { ...call, id: 2 }]),
  }), allow);
  assert.equal(response.status, 400);
});
