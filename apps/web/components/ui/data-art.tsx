import { cn } from "@/lib/shared/utils";

type DataArtProps = {
  className?: string;
  variant?: "orb" | "mesh" | "rings" | "nodes";
  accent?: "green" | "blue" | "white";
};

const palettes = {
  green: { primary: "#57D98B", secondary: "#D8D9D5" },
  blue: { primary: "#4D6AD9", secondary: "#D8D9D5" },
  white: { primary: "#D8D9D5", secondary: "#57D98B" },
} as const;

type Point = readonly [x: number, y: number, opacity?: number];

/*
 * Sparse, fixed point clouds keep the art stable in screenshots and avoid
 * drawing a second chart or a rigid decorative silhouette inside a card. The
 * variant names preserve each call site's placement intent; none draws a
 * literal geometric ring, mesh, or node connection anymore.
 */
const POINTS: Record<NonNullable<DataArtProps["variant"]>, readonly Point[]> = {
  orb: [
    [10, 39],
    [16, 31],
    [22, 36],
    [28, 26],
    [35, 31],
    [41, 22],
    [48, 28],
    [55, 20],
    [62, 27],
    [69, 23],
    [76, 32],
    [84, 27],
    [91, 37],
    [99, 32],
    [20, 46, 0.38],
    [32, 42, 0.48],
    [45, 39, 0.56],
    [58, 37, 0.42],
    [71, 42, 0.5],
    [87, 46, 0.34],
  ],
  mesh: [
    [9, 44],
    [15, 38],
    [21, 33],
    [27, 27],
    [34, 31],
    [41, 37],
    [48, 42],
    [55, 35],
    [62, 28],
    [69, 24],
    [76, 30],
    [83, 36],
    [91, 42],
    [100, 37],
    [18, 50, 0.38],
    [31, 44, 0.42],
    [45, 29, 0.48],
    [58, 47, 0.36],
    [72, 38, 0.45],
    [86, 27, 0.4],
  ],
  rings: [
    [12, 30],
    [18, 24],
    [26, 20],
    [35, 18],
    [45, 20],
    [54, 25],
    [62, 31],
    [70, 38],
    [79, 43],
    [88, 42],
    [97, 36],
    [22, 40, 0.42],
    [32, 44, 0.38],
    [43, 45, 0.48],
    [55, 42, 0.36],
    [67, 47, 0.42],
    [80, 49, 0.34],
    [92, 46, 0.4],
  ],
  nodes: [
    [14, 32],
    [21, 24],
    [21, 41],
    [30, 30, 0.58],
    [39, 35],
    [50, 25],
    [50, 43],
    [61, 31],
    [71, 35, 0.62],
    [80, 23],
    [80, 43],
    [91, 32],
    [26, 16, 0.34],
    [43, 49, 0.35],
    [67, 15, 0.32],
    [86, 50, 0.32],
  ],
};

export function DataArt({
  className,
  variant = "orb",
  accent = "green",
}: DataArtProps) {
  const colors = palettes[accent];
  const points = POINTS[variant].map(([cx, cy, opacity], index) => ({
    cx,
    cy,
    opacity: opacity ?? (index % 4 === 0 ? 0.64 : 0.45),
    color: index % 5 === 0 ? colors.secondary : colors.primary,
    radius: index % 6 === 0 ? 1.35 : 1,
  }));

  return (
    <svg
      aria-hidden="true"
      className={cn("pointer-events-none select-none", className)}
      viewBox="0 0 110 64"
      fill="none"
      role="presentation"
    >
      {points.map((point, index) => (
        <circle
          key={`${point.cx}-${point.cy}-${index}`}
          cx={point.cx}
          cy={point.cy}
          r={point.radius}
          fill={point.color}
          fillOpacity={point.opacity}
        />
      ))}
    </svg>
  );
}
