import { BASELINE_RED_FLAGS } from "@/lib/safety/red-flags";
import type { PlanSnapshot } from "@/lib/plan/types";

function RedFlagList({
  title,
  subtitle,
  signs,
  action,
}: {
  title: string;
  subtitle?: string;
  signs: string[];
  action: string;
}) {
  return (
    <div>
      <h3 className="text-sm font-bold text-red-900 dark:text-red-100">{title}</h3>
      {subtitle && <p className="text-xs text-red-800/80 dark:text-red-200/80">{subtitle}</p>}
      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-red-900 dark:text-red-100">
        {signs.map((sign) => (
          <li key={sign}>{sign}</li>
        ))}
      </ul>
      <p className="mt-1 text-sm font-medium text-red-900 dark:text-red-100">{action}</p>
    </div>
  );
}

/**
 * Always shows the Achilla baseline safety list; additionally shows the
 * protocol's own list when its `red_flags.source` is `'protocol'` (i.e. it
 * actually came from the source document, like MGB). When a protocol has no
 * list of its own — its `red_flags` already *is* the achilla-baseline
 * content, as seeded for Willits — showing the baseline block a second time
 * would just duplicate it, so it's shown alone in that case.
 */
export function RedFlagsPanel({ protocol }: { protocol: PlanSnapshot["protocol"] }) {
  const hasOwnProtocolList = protocol.redFlags?.source === "protocol";

  return (
    <section className="flex flex-col gap-4 rounded-2xl border-2 border-red-300 bg-red-50 p-5 dark:border-red-900 dark:bg-red-950/30">
      <h2 className="text-lg font-bold text-red-900 dark:text-red-100">When to contact your care team</h2>

      {hasOwnProtocolList && protocol.redFlags && (
        <RedFlagList
          title={`From the ${protocol.name} protocol`}
          signs={protocol.redFlags.signs}
          action={protocol.redFlags.action}
        />
      )}

      <RedFlagList
        title={BASELINE_RED_FLAGS.title}
        subtitle={BASELINE_RED_FLAGS.attribution}
        signs={[...BASELINE_RED_FLAGS.signs]}
        action={BASELINE_RED_FLAGS.action}
      />
    </section>
  );
}
