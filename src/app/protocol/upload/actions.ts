"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { extractProtocolFromDocument } from "@/lib/gemini/extract-protocol";

export type UploadActionState = { error?: string };

export async function submitProtocolTextAction(
  _prevState: UploadActionState,
  formData: FormData,
): Promise<UploadActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const text = String(formData.get("documentText") ?? "").trim();
  if (!text) return { error: "Paste the text of your protocol document first." };
  if (text.length < 50) return { error: "That looks too short to be a protocol document." };

  const filePath = `${user.id}/${Date.now()}.txt`;
  const { error: uploadError } = await supabase.storage
    .from("protocol-uploads")
    .upload(filePath, new Blob([text], { type: "text/plain" }), { contentType: "text/plain" });
  if (uploadError) return { error: "Couldn't save your document. Please try again." };

  const { data: uploadRow, error: insertError } = await supabase
    .from("custom_protocol_uploads")
    .insert({ user_id: user.id, original_file_path: filePath, parsed_status: "pending" })
    .select("id")
    .single();
  if (insertError || !uploadRow) return { error: "Couldn't save your document. Please try again." };

  const result = await extractProtocolFromDocument(text);

  if (!result.ok) {
    await supabase
      .from("custom_protocol_uploads")
      .update({ parsed_status: "failed", parsed_json: { error: result.error } })
      .eq("id", uploadRow.id)
      .eq("user_id", user.id);
    // Still forward to review — the user can build the protocol manually
    // from a blank template rather than being stuck.
    redirect(`/protocol/upload/${uploadRow.id}/review`);
  }

  await supabase
    .from("custom_protocol_uploads")
    .update({ parsed_status: "parsed", parsed_json: result.data })
    .eq("id", uploadRow.id)
    .eq("user_id", user.id);

  redirect(`/protocol/upload/${uploadRow.id}/review`);
}
