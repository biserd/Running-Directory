import { createWriteStream } from "node:fs";
import { once } from "node:events";
import { gzip } from "node:zlib";
import { promisify } from "node:util";
import pg from "pg";

const gzipAsync = promisify(gzip);

const TABLES = [
  "states",
  "cities",
  "organizers",
  "race_series",
  "sources",
  "routes",
  "races",
  "race_occurrences",
  "source_records",
  "collections",
  "influencers",
  "podcasts",
  "books",
  "users",
  "race_claims",
  "saved_searches",
  "race_alerts",
  "alert_dispatches",
  "outbound_clicks",
  "featured_requests",
  "race_page_views",
  "magic_link_tokens",
  "favorites",
  "session",
  "api_keys",
  "sponsorships",
  "market_reports",
  "market_report_access",
  "monetization_requests",
  "reviews",
  "race_field_provenance",
] as const;

const outputPath = process.argv[2] || "running-directory-d1-data.sql.gz";
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

function quoteIdentifier(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function sqlValue(value: unknown): string {
  if (value == null) return "NULL";
  if (value instanceof Date) return String(value.getTime());
  if (typeof value === "boolean") return value ? "1" : "0";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "bigint") return value.toString();
  if (Buffer.isBuffer(value)) return `X'${value.toString("hex")}'`;
  const stringValue = typeof value === "string" ? value : JSON.stringify(value);
  return `'${stringValue.replace(/'/g, "''")}'`;
}

async function write(stream: ReturnType<typeof createWriteStream>, value: string) {
  if (!stream.write(value)) {
    await once(stream, "drain");
  }
}

async function main() {
  const client = new pg.Client({ connectionString });
  await client.connect();

  const sqlPath = outputPath.replace(/\.gz$/i, "");
  const stream = createWriteStream(sqlPath, { encoding: "utf8" });
  await write(stream, "PRAGMA defer_foreign_keys = true;\n");

  let totalRows = 0;
  try {
    for (const table of TABLES) {
      const result = await client.query(`SELECT * FROM ${quoteIdentifier(table)} ORDER BY 1`);
      for (const row of result.rows as Record<string, unknown>[]) {
        const columns = Object.keys(row);
        const values = columns.map((column) => sqlValue(row[column]));
        await write(
          stream,
          `INSERT OR REPLACE INTO ${quoteIdentifier(table)} (${columns.map(quoteIdentifier).join(", ")}) VALUES (${values.join(", ")});\n`,
        );
      }
      totalRows += result.rowCount ?? 0;
      console.log(`[d1-export] ${table}: ${result.rowCount ?? 0} rows`);
    }
  } finally {
    await client.end();
    stream.end();
    await once(stream, "close");
  }

  const { readFile, writeFile, unlink } = await import("node:fs/promises");
  const sql = await readFile(sqlPath);
  const compressed = await gzipAsync(sql, { level: 9 });
  await writeFile(outputPath, compressed);
  await unlink(sqlPath);
  console.log(`[d1-export] complete: ${totalRows} rows, ${compressed.byteLength} compressed bytes -> ${outputPath}`);
}

main().catch((error) => {
  console.error("[d1-export] failed", error);
  process.exit(1);
});
