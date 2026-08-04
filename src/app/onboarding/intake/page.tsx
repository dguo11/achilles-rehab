import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { IntakeWizard } from "@/components/intake/intake-wizard";

export default async function IntakePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: existingSelection } = await supabase
    .from("user_protocol_selections")
    .select("id")
    .eq("user_id", user.id)
    .neq("status", "discontinued")
    .limit(1)
    .maybeSingle();

  if (existingSelection) {
    redirect("/plan/review");
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-8">
      <IntakeWizard />
    </main>
  );
}
