import { readFileSync } from "node:fs";
import { join } from "node:path";

// Standalone script (run via `tsx`, outside Next.js) — Next.js auto-loads .env.local,
// this doesn't, so load it by hand. Best-effort: fine if neither file exists.
function loadDotEnv(path: string) {
  let content: string;
  try {
    content = readFileSync(path, "utf-8");
  } catch {
    return;
  }
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadDotEnv(join(process.cwd(), ".env.local"));
loadDotEnv(join(process.cwd(), ".env"));

async function main() {
  // Dynamic import, deliberately after loadDotEnv above: a static import would be hoisted
  // and evaluated before this file's own top-level statements run, so agent-spec.ts's
  // process.env reads (TRUEFORGE_AGENT_NAME, TRUEFORGE_MODEL) would see an empty
  // environment and silently fall back to defaults regardless of .env.local.
  const { AGENT_NAME, MCP_SERVER_NAME, BRIGHTDATA_SERVER_NAME, agentSpec } = await import("./agent-spec");
  const { TrueForge } = await import("@truefoundry/trueforge-sdk");

  // ?? only falls back on undefined/null, not on the empty string .env.example documents
  // these vars as defaulting to — an explicitly-blank value would otherwise survive as "".
  const baseUrl = process.env.TRUEFORGE_BASE_URL?.trim() || "http://localhost:8790";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
  const mcpSecret = process.env.MCP_SECRET;
  const client = new TrueForge({ baseUrl });

  const mcpUrl = `${appUrl}/api/mcp`;
  console.log(`Registering MCP server "${MCP_SERVER_NAME}" -> ${mcpUrl}`);
  await client.settings.mcpServers.createOrUpdate({
    manifest: {
      name: MCP_SERVER_NAME,
      type: "remote",
      url: mcpUrl,
      description: "Nolan's own tools (Phase 1: record_demo, publish_post).",
      // Only set when MCP_SECRET is configured — see app/api/mcp/route.ts. Without it,
      // the endpoint stays open, which is the current default for frictionless local dev.
      ...(mcpSecret ? { auth: { type: "header", headers: { "x-mcp-secret": mcpSecret } } } : {}),
    },
  });

  // Bright Data's hosted MCP server. The `groups` query parameter is required: without
  // it only the five base tools are exposed and none of the web_data_* social ones exist.
  // Bearer-header auth keeps the token out of the URL (it also accepts ?token=, verified).
  const brightDataToken = process.env.BRIGHTDATA_API_TOKEN;
  if (brightDataToken) {
    const brightDataUrl = "https://mcp.brightdata.com/mcp?groups=social,advanced_scraping";
    console.log(`Registering MCP server "${BRIGHTDATA_SERVER_NAME}" -> ${brightDataUrl}`);
    await client.settings.mcpServers.createOrUpdate({
      manifest: {
        name: BRIGHTDATA_SERVER_NAME,
        type: "remote",
        url: brightDataUrl,
        description: "Bright Data: web search and structured social/video data.",
        auth: { type: "header", headers: { Authorization: `Bearer ${brightDataToken}` } },
      },
    });
  } else {
    console.warn(
      `BRIGHTDATA_API_TOKEN is not set — skipping "${BRIGHTDATA_SERVER_NAME}". ` +
        "The agent spec still references it, so competitor research will fail until it is configured."
    );
  }

  console.log(`Registering agent "${AGENT_NAME}"`);
  const { data: existing } = await client.agents.list();
  const found = existing.find((agent) => agent.name === AGENT_NAME);

  if (found) {
    await client.agents.update(found.id, { manifest: agentSpec });
    console.log(`Updated agent "${AGENT_NAME}" (id=${found.id})`);
  } else {
    const { data: created } = await client.agents.create({ name: AGENT_NAME, manifest: agentSpec });
    console.log(`Created agent "${AGENT_NAME}" (id=${created.id})`);
  }

  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
