const WIDTH = 88;
const HEIGHT = 28;
const PAD_X = 2;
const PAD_Y = 3;

function pathFor(values: number[]): { line: string; area: string } {
  if (values.length === 0) return { line: "", area: "" };

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  const step = values.length === 1 ? 0 : (WIDTH - PAD_X * 2) / (values.length - 1);

  const points = values.map((value, index) => {
    const x = PAD_X + index * step;
    const y = HEIGHT - PAD_Y - ((value - min) / span) * (HEIGHT - PAD_Y * 2);
    return { x, y };
  });

  const line = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ");
  const last = points[points.length - 1];
  const first = points[0];
  const area = `${line} L${last.x.toFixed(1)} ${HEIGHT} L${first.x.toFixed(1)} ${HEIGHT} Z`;

  return { line, area };
}

export function Sparkline({
  values,
  color = "#f37a2d",
}: {
  values: number[];
  color?: string;
}) {
  const { line, area } = pathFor(values);
  const last = values[values.length - 1] ?? 0;
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const span = Math.max(1, max - min);
  const x =
    values.length <= 1 ? WIDTH / 2 : WIDTH - PAD_X;
  const y = HEIGHT - PAD_Y - ((last - min) / span) * (HEIGHT - PAD_Y * 2);

  return (
    <svg
      width={WIDTH}
      height={HEIGHT}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="block overflow-visible"
      aria-hidden
    >
      <path d={area} fill={color} opacity={0.12} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={x} cy={y} r="2" fill={color} />
    </svg>
  );
}
