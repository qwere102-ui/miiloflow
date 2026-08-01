import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Instagram, MessageSquare, MousePointerClick, Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

async function DashboardStats() {
  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getClaims();
  if (authError || !userData?.claims) {
    redirect("/auth/login");
  }

  const [{ count: accountCount }, { data: automations }, { count: clickCount }] =
    await Promise.all([
      supabase
        .from("instagram_accounts")
        .select("id", { count: "exact", head: true }),
      supabase.from("automations").select("id, is_active"),
      supabase.from("link_clicks").select("id", { count: "exact", head: true }),
    ]);

  const activeAutomations = automations?.filter((a) => a.is_active).length ?? 0;

  const stats = [
    {
      icon: Instagram,
      label: "연결된 계정",
      value: accountCount ?? 0,
    },
    {
      icon: MessageSquare,
      label: "활성 자동화",
      value: `${activeAutomations} / ${automations?.length ?? 0}`,
    },
    {
      icon: MousePointerClick,
      label: "누적 링크 클릭",
      value: clickCount ?? 0,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {stats.map(({ icon: Icon, label, value }) => (
        <Card key={label}>
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Icon size={18} />
            </div>
            <CardTitle className="text-sm font-normal text-muted-foreground">
              {label}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{value}</CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function ProtectedPage() {
  return (
    <div className="flex-1 w-full flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">대시보드</h1>
          <p className="text-sm text-muted-foreground">
            MiiloFlow 계정 및 자동화 현황을 한눈에 확인하세요.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/protected/instagram">
              <Instagram className="mr-1" size={16} />
              계정 관리
            </Link>
          </Button>
          <Button asChild>
            <Link href="/protected/automations/new">
              <Plus className="mr-1" size={16} />
              새 자동화
            </Link>
          </Button>
        </div>
      </div>

      <Suspense
        fallback={<p className="text-sm text-muted-foreground">불러오는 중...</p>}
      >
        <DashboardStats />
      </Suspense>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">시작하기</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
          <p>
            1.{" "}
            <Link href="/protected/instagram" className="underline text-foreground">
              인스타그램 계정을 연결
            </Link>
            하세요.
          </p>
          <p>
            2.{" "}
            <Link
              href="/protected/automations/new"
              className="underline text-foreground"
            >
              자동화를 생성
            </Link>
            해 댓글 키워드와 DM 메시지를 설정하세요.
          </p>
          <p>3. 게시물에 댓글이 달리면 자동으로 DM이 발송됩니다.</p>
        </CardContent>
      </Card>
    </div>
  );
}
