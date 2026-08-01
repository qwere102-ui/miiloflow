"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { automationSchema, parseKeywords } from "@/lib/validation/automation";

export async function createAutomation(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = automationSchema.safeParse(raw);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "입력값을 확인하세요";
    redirect(`/protected/automations/new?error=${encodeURIComponent(message)}`);
  }

  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getClaims();
  if (authError || !userData?.claims) {
    redirect("/auth/login");
  }

  const data = parsed.data;
  const { error } = await supabase.from("automations").insert({
    user_id: userData.claims.sub,
    instagram_account_id: data.instagram_account_id,
    name: data.name,
    target_scope: data.target_scope,
    target_post_id: data.target_scope === "specific_post" ? data.target_post_id : null,
    keyword_mode: data.keyword_mode,
    keywords:
      data.keyword_mode === "specific_keywords" ? parseKeywords(data.keywords) : [],
    dm_initial_message: data.dm_initial_message,
    dm_follow_recheck_button_text: data.dm_follow_recheck_button_text,
    dm_final_message: data.dm_final_message || null,
    dm_final_link_url: data.dm_final_link_url || null,
    dm_final_button_text: data.dm_final_button_text || null,
  });

  if (error) {
    redirect(
      `/protected/automations/new?error=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath("/protected/automations");
  redirect("/protected/automations");
}

export async function updateAutomation(formData: FormData) {
  const id = String(formData.get("id"));
  const raw = Object.fromEntries(formData.entries());
  const parsed = automationSchema.safeParse(raw);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "입력값을 확인하세요";
    redirect(
      `/protected/automations/${id}/edit?error=${encodeURIComponent(message)}`,
    );
  }

  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getClaims();
  if (authError || !userData?.claims) {
    redirect("/auth/login");
  }

  const data = parsed.data;
  const { error } = await supabase
    .from("automations")
    .update({
      instagram_account_id: data.instagram_account_id,
      name: data.name,
      target_scope: data.target_scope,
      target_post_id: data.target_scope === "specific_post" ? data.target_post_id : null,
      keyword_mode: data.keyword_mode,
      keywords:
        data.keyword_mode === "specific_keywords" ? parseKeywords(data.keywords) : [],
      dm_initial_message: data.dm_initial_message,
      dm_follow_recheck_button_text: data.dm_follow_recheck_button_text,
      dm_final_message: data.dm_final_message || null,
      dm_final_link_url: data.dm_final_link_url || null,
      dm_final_button_text: data.dm_final_button_text || null,
    })
    .eq("id", id);

  if (error) {
    redirect(
      `/protected/automations/${id}/edit?error=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath("/protected/automations");
  redirect("/protected/automations");
}

export async function toggleAutomationAction(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = await createClient();
  const { data: current } = await supabase
    .from("automations")
    .select("is_active")
    .eq("id", id)
    .single();
  if (!current) return;
  await supabase
    .from("automations")
    .update({ is_active: !current.is_active })
    .eq("id", id);
  revalidatePath("/protected/automations");
}

export async function deleteAutomationAction(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("automations").delete().eq("id", id);
  revalidatePath("/protected/automations");
}
