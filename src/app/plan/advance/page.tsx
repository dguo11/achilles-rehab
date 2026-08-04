import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdvancePhaseForm } from "@/components/plan/advance-phase-form";
import type { PhaseRow } from "@/lib/plan/current-phase";
import { UnverifiedProtocolBadge } from "@/components/protocol/unverified-protocol-badge";
import { DisclaimerBanner } from "@/components/disclaimer-banner";

const PHASE_COLUMNS =
  "id, order_index, number, name, timeframe_label, timeframe_start_days, timeframe_end_days, goals, weight_bearing, interventions, criteria_to_progress, criteria_to_discharge, continues_from_order_indexes, assistive_devices";

export default async function AdvancePhasePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: selection } = await supabase
    .from("user_protocol_selections")
    .select("protocol_id, current_phase_order_index")
    .eq("user_id", user.id)
    .neq("status", "discontinued")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!selection) redirect("/onboarding/intake");

  const { data: protocol } = await supabase
    .from("protocols")
    .select("gating, is_verified")
    .eq("id", selection.protocol_id)
    .single();

  const { data: phases } = await supabase
    .from("protocol_phases")
    .select(PHASE_COLUMNS)
    .eq("protocol_id", selection.protocol_id)
    .order("order_index", { ascending: true });

  const activePhase = (phases as PhaseRow[] | null)?.find(
    (p) => p.order_index === selection.current_phase_order_index,
  );
  const nextPhase = (phases as PhaseRow[] | null)?.find(
    (p) => p.order_index === selection.current_phase_order_index + 1,
  );

  if (!activePhase || !nextPhase) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-5 py-10">
        <h1 className="text-xl font-bold">You&apos;re on the final phase</h1>
        <p className="text-neutral-600 dark:text-neutral-300">
          There&apos;s no further phase to advance to in this protocol.
        </p>
      </main>
    );
  }

  const criteria =
    protocol?.gating === "time_and_criterion" && Array.isArray(activePhase.criteria_to_progress)
      ? (activePhase.criteria_to_progress as string[])
      : [];

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-5 py-8">
      <div>
        <p className="text-sm font-medium text-teal-700 dark:text-teal-400">Phase advancement</p>
        <h1 className="text-2xl font-bold tracking-tight">
          Ready to move to {nextPhase.name ?? nextPhase.timeframe_label}?
        </h1>
        {protocol?.is_verified === false && <UnverifiedProtocolBadge />}
      </div>

      {criteria.length > 0 ? (
        <p className="text-neutral-600 dark:text-neutral-300">
          Confirm each of the following before moving on — ideally with your PT.
        </p>
      ) : (
        <p className="text-neutral-600 dark:text-neutral-300">
          This protocol is time-based. Confirm you&apos;re ready to move into the next timeframe.
        </p>
      )}

      <AdvancePhaseForm
        criteria={criteria}
        nextPhaseName={nextPhase.name ?? nextPhase.timeframe_label}
      />

      <DisclaimerBanner />
    </main>
  );
}
