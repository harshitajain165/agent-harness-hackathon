import { readFileSync } from "node:fs";
import { join } from "node:path";
import { TrueForge } from "@truefoundry/trueforge-sdk";
import { AGENT_NAME, MCP_SERVER_NAME, agentSpec } from "./agent-spec";

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
  const baseUrl = process.env.TRUEFORGE_BASE_URL ?? "http://localhost:8790";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const client = new TrueForge({ baseUrl });

  const mcpUrl = `${appUrl}/api/mcp`;
  console.log(`Registering MCP server "${MCP_SERVER_NAME}" -> ${mcpUrl}`);
  await client.settings.mcpServers.createOrUpdate({
    manifest: {
      name: MCP_SERVER_NAME,
      type: "remote",
      url: mcpUrl,
      description: "Nolan's own tools (Phase 1: record_demo, publish_post).",
    },
  });

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
