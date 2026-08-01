import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createAutomation } from "../actions";
import { AutomationTargetFields } from "../automation-target-fields";
import { AutomationFormFields } from "../automation-form-fields";

async function NewAutomationForm({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getClaims();
  if (authError || !userData?.claims) {
    redirect("/auth/login");
  }

  const { data: accounts } = await supabase
    .from("instagram_accounts")
    .select("id, username")
    .eq("is_active", true);

  if (!accounts?.length) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          먼저{" "}
          <Link href="/protected/instagram" className="underline">
            인스타그램 계정을 연결
          </Link>
          해야 자동화를 만들 수 있습니다.
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

      <form action={createAutomation} className="flex flex-col gap-6">
        <AutomationTargetFields accounts={accounts} />
        <AutomationFormFields />
        <Button type="submit">자동화 만들기</Button>
      </form>
    </>
  );
}

export default function NewAutomationPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <div className="flex-1 w-full flex flex-col gap-8 max-w-2xl">
      <h1 className="text-2xl font-bold">새 자동화</h1>
      <Suspense fallback={<p className="text-sm text-muted-foreground">불러오는 중...</p>}>
        <NewAutomationForm searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
