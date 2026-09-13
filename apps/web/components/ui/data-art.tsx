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

export function DataArt({
  className,
  variant = "orb",
  accent = "green",
}: DataArtProps) {
  const colors = palettes[accent];
  const points = Array.from({ length: 40 }, (_, index) => {
    const row = Math.floor(index / 10);
    const column = index % 10;
    const offset = (row % 2) * 2;
    const opacity = 0.25 + ((index * 17) % 70) / 100;
    return {
      cx: 12 + column * 9 + offset,
      cy: 16 + row * 9,
      opacity,
      color: index % 4 === 0 ? colors.secondary : colors.primary,
      radius: index % 5 === 0 ? 1.4 : 1,
    };
  });

  return (
    <svg
      aria-hidden="true"
      className={cn("pointer-events-none select-none", className)}
      viewBox="0 0 110 64"
      fill="none"
      role="presentation"
    >
      {variant === "rings" &&
        [16, 23, 30].map((radius, index) => (
          <circle
            key={radius}
            cx="55"
            cy="32"
            r={radius}
            stroke={index === 1 ? colors.primary : colors.secondary}
            strokeDasharray="1 3"
            strokeOpacity={0.45 - index * 0.08}
          />
        ))}
      {variant === "mesh" && (
        <>
          <path
            d="M7 42 29 19l23 18 23-25 21 16"
            stroke={colors.primary}
            strokeDasharray="1 3"
            strokeOpacity=".55"
          />
          <path
            d="m9 50 21-19 22 14 23-21 18 12"
            stroke={colors.secondary}
            strokeDasharray="1 4"
            strokeOpacity=".45"
          />
        </>
      )}
      {variant === "nodes" &&
        [
          [22, 32, 10, 17],
          [22, 32, 10, 47],
          [88, 32, 100, 17],
          [88, 32, 100, 47],
        ].map(([x1, y1, x2, y2], index) => (
          <path
            key={`${x1}-${y1}-${x2}-${y2}`}
            d={`M${x1} ${y1} L${x2} ${y2}`}
            stroke={index % 2 ? colors.secondary : colors.primary}
            strokeDasharray="1 3"
            strokeOpacity=".5"
          />
        ))}
      {(variant === "orb" || variant === "mesh" || variant === "nodes") &&
        points.map((point, index) => (
          <circle
            key={index}
            cx={point.cx}
            cy={point.cy}
            r={point.radius}
            fill={point.color}
            fillOpacity={point.opacity}
          />
        ))}
      {variant === "orb" && (
        <ellipse
          cx="55"
          cy="32"
          rx="43"
          ry="23"
          stroke={colors.primary}
          strokeDasharray="1 4"
          strokeOpacity=".38"
        />
      )}
    </svg>
  );
}
