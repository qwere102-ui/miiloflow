import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { deleteAutomationAction, toggleAutomationAction } from "./actions";

async function AutomationsList() {
  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getClaims();
  if (authError || !userData?.claims) {
    redirect("/auth/login");
  }

  const { data: automations } = await supabase
    .from("automations")
    .select("*, instagram_accounts(username)")
    .order("created_at", { ascending: false });

  return (
    <div className="grid gap-4">
      {automations?.length ? (
        automations.map((automation) => (
          <Card key={automation.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {automation.name}
                  <Badge variant={automation.is_active ? "default" : "secondary"}>
                    {automation.is_active ? "활성" : "중지"}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  @{automation.instagram_accounts?.username ?? "알 수 없음"} ·{" "}
                  {automation.target_scope === "all_posts"
                    ? "모든 게시물"
                    : `게시물 ${automation.target_post_id}`}{" "}
                  ·{" "}
                  {automation.keyword_mode === "all_comments"
                    ? "모든 댓글"
                    : `키워드: ${(automation.keywords ?? []).join(", ")}`}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/protected/automations/${automation.id}/edit`}>
                    수정
                  </Link>
                </Button>
                <form action={toggleAutomationAction}>
                  <input type="hidden" name="id" value={automation.id} />
                  <Button type="submit" variant="outline" size="sm">
                    {automation.is_active ? "중지" : "활성화"}
                  </Button>
                </form>
                <form action={deleteAutomationAction}>
                  <input type="hidden" name="id" value={automation.id} />
                  <Button type="submit" variant="destructive" size="sm">
                    삭제
                  </Button>
                </form>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              초기 DM: {automation.dm_initial_message}
            </CardContent>
          </Card>
        ))
      ) : (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            아직 만든 자동화가 없습니다.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function AutomationsPage() {
  return (
    <div className="flex-1 w-full flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">자동화</h1>
          <p className="text-sm text-muted-foreground">
            댓글을 감지해 DM을 보내는 자동화 규칙을 관리하세요.
          </p>
        </div>
        <Button asChild>
          <Link href="/protected/automations/new" className="gap-2">
            <Plus size={16} />
            새 자동화
          </Link>
        </Button>
      </div>

      <Suspense fallback={<p className="text-sm text-muted-foreground">불러오는 중...</p>}>
        <AutomationsList />
      </Suspense>
    </div>
  );
}
