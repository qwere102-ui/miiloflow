"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function disconnectInstagramAccount(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("instagram_accounts").delete().eq("id", id);
  revalidatePath("/protected/instagram");
  revalidatePath("/protected/automations");
}
