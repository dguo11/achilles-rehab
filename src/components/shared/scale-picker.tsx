"use client";

export function ScalePicker({
  name,
  min = 0,
  max = 10,
  value,
  onChange,
  label,
}: {
  name: string;
  min?: number;
  max?: number;
  value: number | null;
  onChange: (n: number) => void;
  label: string;
}) {
  const range = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <div>
      <p className="text-sm font-medium">{label}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {range.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`flex h-9 w-9 items-center justify-center rounded-lg border-2 text-sm font-semibold ${
              value === n
                ? "border-teal-700 bg-teal-700 text-white"
                : "border-neutral-300 text-neutral-700 dark:border-neutral-700 dark:text-neutral-200"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <input type="hidden" name={name} value={value ?? ""} />
    </div>
  );
}
