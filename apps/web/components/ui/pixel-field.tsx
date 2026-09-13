import { cn } from "@/lib/shared/utils";

/**
 * A dot matrix that reacts to the AI draft pipeline (HAS-18).
 *
 * The same visual language as `./data-art.tsx` — a point cloud in one or two
 * accent colours at irregular density — with one addition: a `state` that the
 * draft request drives. It is a status indicator built out of the design
 * system's own vocabulary rather than a spinner or a sparkle, which
 * `design.md` rules out.
 *
 * Positions and resting opacities are derived from the index, so the field is
 * identical on the server and the client and stable across a visual snapshot.
 * Motion is opacity only and lives in the `.pixel-field` rules in globals.css.
 */

export type PixelFieldState = "idle" | "thinking" | "ready" | "error";

const ACCENTS = {
  blue: { primary: "#4d6ad9", secondary: "#d8d9d5" },
  green: { primary: "#57d98b", secondary: "#d8d9d5" },
  orange: { primary: "#e9832d", secondary: "#d8d9d5" },
} as const;

export function PixelField({
  state = "idle",
  columns = 9,
  rows = 6,
  className,
}: {
  state?: PixelFieldState;
  columns?: number;
  rows?: number;
  className?: string;
}) {
  const accent =
    ACCENTS[
      state === "error" ? "orange" : state === "ready" ? "green" : "blue"
    ];
  const cells = Array.from({ length: columns * rows }, (_, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    return {
      x: 2 + column * 4,
      y: 2 + row * 4,
      // Irregular density, deterministic: design.md §10.2 asks for uneven
      // fields with fade zones rather than a uniform grid.
      rest: 0.22 + ((index * 23) % 55) / 100,
      radius: index % 7 === 0 ? 1.15 : 0.85,
      color: index % 5 === 0 ? accent.secondary : accent.primary,
      // The stagger runs on the diagonal, so the reveal reads as one sweep.
      delay: ((row + column) % 7) * 0.11,
    };
  });

  return (
    <svg
      aria-hidden="true"
      role="presentation"
      data-state={state}
      className={cn("pixel-field pointer-events-none select-none", className)}
      viewBox={`0 0 ${columns * 4} ${rows * 4}`}
      fill="none"
    >
      {cells.map((cell, index) => (
        <circle
          key={index}
          className="pixel-dot"
          cx={cell.x}
          cy={cell.y}
          r={cell.radius}
          fill={cell.color}
          style={
            {
              "--pixel-rest": cell.rest,
              "--pixel-delay": `${cell.delay}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </svg>
  );
}
