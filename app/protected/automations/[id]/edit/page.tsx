import { Suspense } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { updateAutomation } from "../../actions";
import { AutomationTargetFields } from "../../automation-target-fields";
import { AutomationFormFields } from "../../automation-form-fields";

async function EditAutomationForm({
  automationId,
  searchParams,
}: {
  automationId: string;
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getClaims();
  if (authError || !userData?.claims) {
    redirect("/auth/login");
  }

  const [{ data: automation }, { data: accounts }] = await Promise.all([
    supabase.from("automations").select("*").eq("id", automationId).single(),
    supabase.from("instagram_accounts").select("id, username").eq("is_active", true),
  ]);

  if (!automation) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          자동화를 찾을 수 없습니다.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {decodeURIComponent(error)}
        </div>
      )}

      <form action={updateAutomation} className="flex flex-col gap-6">
        <input type="hidden" name="id" value={automation.id} />
        <AutomationTargetFields
          accounts={accounts ?? []}
          initial={{
            accountId: automation.instagram_account_id,
            targetScope: automation.target_scope,
            targetPostId: automation.target_post_id ?? undefined,
          }}
        />
        <AutomationFormFields
          defaultValues={{
            name: automation.name,
            keyword_mode: automation.keyword_mode,
            keywords: (automation.keywords ?? []).join(", "),
            dm_initial_message: automation.dm_initial_message,
            dm_follow_recheck_button_text: automation.dm_follow_recheck_button_text,
            dm_final_message: automation.dm_final_message ?? undefined,
            dm_final_link_url: automation.dm_final_link_url ?? undefined,
            dm_final_button_text: automation.dm_final_button_text ?? undefined,
          }}
        />
        <Button type="submit">자동화 수정</Button>
      </form>
    </>
  );
}

export default function EditAutomationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <div className="flex-1 w-full flex flex-col gap-8 max-w-2xl">
      <h1 className="text-2xl font-bold">자동화 수정</h1>
      <Suspense fallback={<p className="text-sm text-muted-foreground">불러오는 중...</p>}>
        <EditAutomationFormResolver params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function EditAutomationFormResolver({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  return <EditAutomationForm automationId={id} searchParams={searchParams} />;
}
