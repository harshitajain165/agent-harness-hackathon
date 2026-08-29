#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "../components/ui");

const replacements = [
  [/text-muted-foreground/g, "text-fg-secondary"],
  [/placeholder:text-fg-secondary\/72/g, "placeholder:text-fg-tertiary"],
  [/placeholder:text-muted-foreground\/72/g, "placeholder:text-fg-tertiary"],
  [/text-foreground/g, "text-fg"],
  [/bg-background/g, "bg-neutral-0"],
  [/text-popover-foreground/g, "text-fg"],
  [/bg-popover/g, "bg-neutral-0"],
  [/bg-muted\/72/g, "bg-neutral-100"],
  [/bg-muted/g, "bg-neutral-100"],
  [/bg-accent/g, "bg-neutral-100"],
  [/hover:bg-accent/g, "hover:bg-neutral-100"],
  [/data-pressed:bg-accent/g, "data-pressed:bg-neutral-100"],
  [/border-input/g, "border-neutral-200"],
  [/ring-ring/g, "ring-brand-border-focus"],
  [/focus-visible:ring-ring/g, "focus-visible:ring-brand-border-focus"],
  [/font-semibold/g, "font-medium"],
  [/opacity-64/g, "opacity-50"],
];

let count = 0;
for (const file of fs.readdirSync(dir)) {
  if (!file.endsWith(".tsx")) continue;
  const fp = path.join(dir, file);
  let content = fs.readFileSync(fp, "utf8");
  let changed = false;
  for (const [from, to] of replacements) {
    const next = content.replace(from, to);
    if (next !== content) {
      content = next;
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(fp, content);
    count++;
  }
}

console.log(`Restyled ${count} files in ${dir}`);
