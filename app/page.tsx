import type { Metadata } from "next";
import { AgentHarness } from "@/components/harness/agent-harness";

export const metadata: Metadata = {
  title: "Agent",
  description: "Chat with your agent — thinking, tools, streaming, and approvals.",
};

export default function Page() {
  return <AgentHarness />;
}
