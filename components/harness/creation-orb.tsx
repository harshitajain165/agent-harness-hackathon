"use client";

import { useEffect, useRef } from "react";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

const COLS = 52;
const ORB_PX = 240;
const BIRTH_MS = 880;
const FLOW_RAD_PER_MS = 0.00055;

function easeOutQuint(t: number) {
  return 1 - (1 - t) ** 5;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function hash(ix: number, iy: number) {
  let n = Math.imul(ix, 374761393) + Math.imul(iy, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function valueNoise(x: number, y: number) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  return lerp(
    lerp(hash(x0, y0), hash(x0 + 1, y0), sx),
    lerp(hash(x0, y0 + 1), hash(x0 + 1, y0 + 1), sx),
    sy
  );
}

function fbm(x: number, y: number) {
  let value = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < 4; i++) {
    value += amp * valueNoise(x * freq, y * freq);
    amp *= 0.5;
    freq *= 2.05;
  }
  return value;
}

function paint(
  ctx: CanvasRenderingContext2D,
  size: number,
  dpr: number,
  time: number,
  birth: number,
  color: string
) {
  const cell = size / COLS;
  const radius = (size / 2) * lerp(0.22, 0.98, birth);
  const grown = lerp(0.72, 1, birth);
  const cx = size / 2;
  const cy = size / 2;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = color;

  for (let j = 0; j < COLS; j++) {
    for (let i = 0; i < COLS; i++) {
      const x = ((i + 0.5) / COLS) * 2 - 1;
      const y = ((j + 0.5) / COLS) * 2 - 1;
      const r = Math.hypot(x, y);
      if (r > 1) continue;

      const arrive = easeOutQuint(Math.min(1, Math.max(0, (birth - r * 0.38) / 0.62)));
      if (arrive <= 0) continue;

      const warp = fbm(x * 1.35 + time * 0.2, y * 1.85) - 0.5;
      const grain = fbm(x * 2.8 - time * 0.08, y * 1.2 + 3.2);
      const ridge = 0.5 + 0.5 * Math.sin(y * 11.2 + x * 0.9 + warp * 3.6 + time);
      const field = ridge ** 1.35 * 0.84 + grain * 0.16;
      const rim = 1 - Math.min(1, Math.max(0, (r - 0.78) / 0.22));
      const density = field * rim * arrive;
      if (density < 0.045) continue;

      const side = Math.max(1, Math.round(cell * (0.16 + 0.78 * density) * grown));
      ctx.fillRect(
        Math.round(cx + x * radius - side / 2),
        Math.round(cy + y * radius - side / 2),
        side,
        side
      );
    }
  }
}

export function CreationOrb({ className }: { className?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = media.matches;
    const onReduce = () => {
      reduced = media.matches;
    };
    media.addEventListener("change", onReduce);

    let frame = 0;
    let started = 0;
    let running = true;

    const draw = (now: number) => {
      const size = Math.max(ORB_PX, Math.floor(wrap.getBoundingClientRect().width));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const pixels = Math.max(1, Math.floor(size * dpr));
      if (canvas.width !== pixels) {
        canvas.width = pixels;
        canvas.height = pixels;
      }
      if (!started) started = now;
      const elapsed = now - started;
      paint(
        ctx,
        size,
        dpr,
        reduced ? 0.9 : elapsed * FLOW_RAD_PER_MS,
        reduced ? 1 : easeOutQuint(Math.min(1, elapsed / BIRTH_MS)),
        getComputedStyle(wrap).color || "#0a0a0a"
      );
    };

    const tick = (now: number) => {
      if (!running) return;
      draw(now);
      if (!reduced) frame = window.requestAnimationFrame(tick);
    };

    draw(performance.now());
    if (!reduced) frame = window.requestAnimationFrame(tick);

    const observer = new ResizeObserver(() => {
      if (reduced) draw(performance.now());
    });
    observer.observe(wrap);

    return () => {
      running = false;
      media.removeEventListener("change", onReduce);
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className={cn("size-[240px] shrink-0 text-neutral-950", className)}
    >
      <canvas ref={canvasRef} className="block size-full" aria-hidden />
    </div>
  );
}

export function VideoCreating({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Creating video"
      className={cn(
        "flex h-full min-h-0 flex-col items-center justify-center gap-4 bg-neutral-0 px-6",
        className
      )}
    >
      <CreationOrb />
      <Text size="sm" color="secondary">
        Creating
      </Text>
    </div>
  );
}
