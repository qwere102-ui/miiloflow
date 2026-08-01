import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Instagram, XCircle } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DisconnectButton } from "./disconnect-button";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_state: "인증 요청이 만료되었거나 위조되었습니다. 다시 시도해주세요.",
  connection_failed: "인스타그램 계정 연결에 실패했습니다. 다시 시도해주세요.",
};

async function InstagramAccountsList({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const { connected, error } = await searchParams;

  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getClaims();
  if (authError || !userData?.claims) {
    redirect("/auth/login");
  }

  const { data: accounts } = await supabase
    .from("instagram_accounts")
    .select("id, username, connected_at, is_active")
    .order("connected_at", { ascending: false });

  return (
    <>
      {connected && (
        <div className="flex items-center gap-2 rounded-md border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400">
          <CheckCircle2 size={16} />
          인스타그램 계정이 연결되었습니다.
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <XCircle size={16} />
          {ERROR_MESSAGES[error] ?? "알 수 없는 오류가 발생했습니다."}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {accounts?.length ? (
          accounts.map((account) => (
            <Card key={account.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Instagram size={18} />@{account.username}
                </CardTitle>
                <CardDescription>
                  {account.is_active ? "연결됨" : "비활성"} ·{" "}
                  {new Date(account.connected_at).toLocaleDateString("ko-KR")}
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <DisconnectButton accountId={account.id} username={account.username} />
              </CardFooter>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              아직 연결된 인스타그램 계정이 없습니다.
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}

export default function InstagramPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  return (
    <div className="flex-1 w-full flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">인스타그램 계정</h1>
          <p className="text-sm text-muted-foreground">
            자동화를 사용하려면 인스타그램 프로페셔널 계정을 연결하세요.
          </p>
        </div>
        <Button asChild>
          <a href="/api/instagram/connect" className="gap-2">
            <Instagram size={16} />
            계정 연결
          </a>
        </Button>
      </div>

      <Suspense fallback={<p className="text-sm text-muted-foreground">불러오는 중...</p>}>
        <InstagramAccountsList searchParams={searchParams} />
      </Suspense>

      <div className="text-sm text-muted-foreground">
        자동화를 만들려면{" "}
        <Link href="/protected/automations" className="underline">
          자동화 관리 페이지
        </Link>
        로 이동하세요.
      </div>
    </div>
  );
}
