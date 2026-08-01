import { Suspense } from "react";
import Link from "next/link";
import {
  Instagram,
  MessageCircle,
  Send,
  UserCheck,
  MousePointerClick,
  Sparkles,
} from "lucide-react";

import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { hasEnvVars } from "@/lib/utils";

const FEATURES = [
  {
    icon: Instagram,
    title: "계정 연결",
    description: "인스타그램 프로페셔널 계정을 몇 초 만에 연결하세요.",
  },
  {
    icon: MessageCircle,
    title: "키워드 댓글 감지",
    description: "특정 게시물 또는 전체 게시물에서 지정한 키워드가 담긴 댓글을 자동으로 찾아냅니다.",
  },
  {
    icon: Send,
    title: "자동 DM 발송",
    description: "댓글 작성자에게 즉시 맞춤 DM을 보내 대화를 이어갑니다.",
  },
  {
    icon: UserCheck,
    title: "팔로우 확인 분기",
    description: "팔로우 여부를 확인해 미팔로우 시 재확인 버튼을, 팔로우 시 최종 메시지를 보냅니다.",
  },
  {
    icon: MousePointerClick,
    title: "링크 클릭 추적",
    description: "최종 메시지의 링크 클릭 수를 자동으로 기록해 성과를 확인할 수 있습니다.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col items-center">
        <nav className="w-full flex justify-center border-b border-b-foreground/10">
          <div className="w-full max-w-5xl flex flex-wrap gap-y-2 justify-between items-center p-3 px-5 text-sm">
            <Link href="/" className="font-semibold text-base">
              MiiloFlow
            </Link>
            {!hasEnvVars ? (
              <EnvVarWarning />
            ) : (
              <Suspense>
                <AuthButton />
              </Suspense>
            )}
          </div>
        </nav>

        <section className="w-full max-w-5xl flex flex-col items-center gap-6 text-center px-5 pt-20 pb-16">
          <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
            <Sparkles size={14} />
            인스타그램 댓글 · DM 자동화
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight max-w-2xl !leading-tight">
            댓글 하나로 시작되는
            <br />
            자동 DM 마케팅
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl">
            게시물에 달린 댓글을 감지해 자동으로 DM을 보내고, 팔로우 여부에 따라
            다른 메시지를 전달하세요. MiiloFlow가 반응부터 전환까지 자동화합니다.
          </p>
          <div className="flex gap-3 mt-2">
            <Button asChild size="lg">
              <Link href="/auth/sign-up">무료로 시작하기</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/auth/login">로그인</Link>
            </Button>
          </div>
        </section>

        <section className="w-full max-w-5xl px-5 pb-24">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <Card key={title}>
                <CardHeader className="gap-3">
                  <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon size={18} />
                  </div>
                  <CardTitle className="text-base">{title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {description}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <footer className="w-full flex items-center justify-center border-t mx-auto text-center text-xs gap-8 py-10 text-muted-foreground">
          <p>MiiloFlow</p>
          <ThemeSwitcher />
        </footer>
      </div>
    </main>
  );
}
