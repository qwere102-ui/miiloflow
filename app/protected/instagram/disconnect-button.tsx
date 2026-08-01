"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { disconnectInstagramAccount } from "./actions";

export function DisconnectButton({
  accountId,
  username,
}: {
  accountId: string;
  username: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="destructive"
      size="sm"
      disabled={isPending}
      onClick={() => {
        if (
          !confirm(
            `@${username} 연결을 해제하시겠습니까? 이 계정을 사용하는 자동화도 함께 삭제됩니다.`,
          )
        ) {
          return;
        }
        const formData = new FormData();
        formData.set("id", accountId);
        startTransition(() => {
          disconnectInstagramAccount(formData);
        });
      }}
    >
      연결 해제
    </Button>
  );
}
