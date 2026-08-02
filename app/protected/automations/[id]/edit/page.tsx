import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Send } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { sendTestMessage, updateAutomation } from "../../actions";
import { AutomationTargetFields } from "../../automation-target-fields";
import { AutomationFormFields } from "../../automation-form-fields";

async function EditAutomationForm({
  automationId,
  searchParams,
}: {
  automationId: string;
  searchParams: Promise<{ error?: string; testError?: string; testSuccess?: string }>;
}) {
  const { error, testError, testSuccess } = await searchParams;

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

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Send size={16} />
            테스트 발송
          </CardTitle>
          <CardDescription>
            Instagram 테스터 계정의 IGSID로 초기 DM을 바로 보내봅니다. 웹훅 없이
            발송 기능 자체가 동작하는지 확인할 때 사용하세요. (수신자 ID는 Meta
            대시보드의 &quot;API 통합 도우미&quot; 도구에서 확인할 수 있습니다)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {testSuccess && (
            <p className="mb-3 text-sm text-green-600 dark:text-green-400">
              발송 요청을 보냈습니다. 테스터 계정 DM함을 확인하세요.
            </p>
          )}
          {testError && (
            <p className="mb-3 text-sm text-destructive">
              발송 실패: {decodeURIComponent(testError)}
            </p>
          )}
          <form action={sendTestMessage} className="flex gap-2">
            <input type="hidden" name="automationId" value={automation.id} />
            <div className="flex-1 grid gap-2">
              <Label htmlFor="recipientId" className="sr-only">
                받는 사람 Instagram ID
              </Label>
              <Input
                id="recipientId"
                name="recipientId"
                placeholder="받는 사람 Instagram ID (IGSID, 숫자)"
                required
              />
            </div>
            <Button type="submit" variant="outline">
              발송
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}

export default function EditAutomationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; testError?: string; testSuccess?: string }>;
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
  searchParams: Promise<{ error?: string; testError?: string; testSuccess?: string }>;
}) {
  const { id } = await params;
  return <EditAutomationForm automationId={id} searchParams={searchParams} />;
}
