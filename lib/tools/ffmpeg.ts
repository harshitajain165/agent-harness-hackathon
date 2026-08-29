import { execFile } from "node:child_process";
import { promisify } from "node:util";

export const execFileAsync = promisify(execFile);

/** Probes a media file's duration via ffprobe. Used to pace recording steps to match
 *  narration length exactly, rather than guessing a fixed wait. */
export async function probeDurationMs(path: string): Promise<number> {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    path,
  ]);
  const seconds = parseFloat(stdout.trim());
  if (!Number.isFinite(seconds)) throw new Error(`Could not probe duration of ${path}`);
  return Math.round(seconds * 1000);
}
