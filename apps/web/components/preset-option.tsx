"use client";

/**
 * One radio option in the wizard's Template step.
 *
 * Shared by the built-in preset picker and the organization template picker
 * (HAS-13) so both read as one list of starting points, and both stay in the
 * same `preset` radio group: exactly one starting point can be applied.
 */
export function PresetOption({
  name,
  tagline,
  meta,
  selected,
  onSelect,
}: {
  name: string;
  tagline: string;
  meta: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-card border p-4 ${selected ? "border-primary bg-[rgba(87,217,139,.06)]" : "bg-card"}`}
    >
      <input
        className="mt-1 accent-primary"
        type="radio"
        name="preset"
        checked={selected}
        onChange={onSelect}
      />
      <span className="min-w-0">
        <span className="block font-semibold">{name}</span>
        <span className="mt-1 block text-sm leading-6 text-muted-foreground">
          {tagline}
        </span>
        <span className="mt-2 block text-xs text-muted-foreground">{meta}</span>
      </span>
    </label>
  );
}
