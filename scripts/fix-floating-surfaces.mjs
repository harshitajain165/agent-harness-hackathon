#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "../components/ui");

const floatingOld =
  /rounded-lg border bg-neutral-0 not-dark:bg-clip-padding shadow-lg\/5[^"]*before:shadow-\[0_1px[^"]*\][^"]*dark:before:shadow-\[[^\]]+\]/g;

const floatingNew = "rounded-[10px] bg-neutral-0 shadow-lg outline-none";

const popoverOld =
  /rounded-lg border bg-neutral-0 not-dark:bg-clip-padding text-popover-foreground shadow-lg\/5 outline-none transition-\[width,height,scale,opacity\] before:pointer-events-none before:absolute before:inset-0 before:rounded-\[calc\(var\(--radius-lg\)-1px\)\] before:shadow-\[0_1px[^"]+\] has-data-\[slot=calendar\]:rounded-xl has-data-\[slot=calendar\]:before:rounded-\[calc\(var\(--radius-xl\)-1px\)\] data-starting-style:scale-98 data-starting-style:opacity-0 dark:before:shadow-\[[^\]]+\]/g;

const popoverNew =
  "rounded-[10px] bg-neutral-0 text-fg shadow-lg outline-none transition-[width,height,opacity] has-data-[slot=calendar]:rounded-[10px] data-starting-style:opacity-0";

let count = 0;
for (const file of fs.readdirSync(dir)) {
  if (!file.endsWith(".tsx")) continue;
  const fp = path.join(dir, file);
  let content = fs.readFileSync(fp, "utf8");
  const original = content;
  content = content.replace(floatingOld, floatingNew);
  content = content.replace(popoverOld, popoverNew);
  if (content !== original) {
    fs.writeFileSync(fp, content);
    count++;
  }
}

console.log(`Updated floating surfaces in ${count} files`);
