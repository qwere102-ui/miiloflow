"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface InstagramAccountOption {
  id: string;
  username: string;
}

interface MediaItem {
  id: string;
  caption?: string;
  media_type: string;
  media_url?: string;
  thumbnail_url?: string;
  timestamp: string;
}

export function AutomationTargetFields({
  accounts,
  initial,
}: {
  accounts: InstagramAccountOption[];
  initial?: {
    accountId?: string;
    targetScope?: "all_posts" | "specific_post";
    targetPostId?: string;
  };
}) {
  const [accountId, setAccountId] = useState(
    initial?.accountId || accounts[0]?.id || "",
  );
  const [targetScope, setTargetScope] = useState<"all_posts" | "specific_post">(
    initial?.targetScope || "all_posts",
  );
  const [media, setMedia] = useState<MediaItem[] | null>(null);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState(initial?.targetPostId || "");
  const isFirstAccountRender = useRef(true);

  useEffect(() => {
    if (isFirstAccountRender.current) {
      isFirstAccountRender.current = false;
      return;
    }
    setMedia(null);
    setMediaError(false);
    setSelectedPostId("");
  }, [accountId]);

  useEffect(() => {
    if (targetScope !== "specific_post" || !accountId || media || loadingMedia) {
      return;
    }
    setLoadingMedia(true);
    fetch(`/api/instagram/media?account_id=${accountId}`)
      .then((res) => {
        if (!res.ok) throw new Error("failed");
        return res.json();
      })
      .then((data) => setMedia(data.media ?? []))
      .catch(() => setMediaError(true))
      .finally(() => setLoadingMedia(false));
  }, [targetScope, accountId, media, loadingMedia]);

  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor="instagram_account_id">연결된 인스타그램 계정</Label>
        <Select
          name="instagram_account_id"
          value={accountId}
          onValueChange={setAccountId}
          required
        >
          <SelectTrigger id="instagram_account_id" className="w-full">
            <SelectValue placeholder="계정을 선택하세요" />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                @{account.username}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="target_scope">적용 대상</Label>
        <Select
          name="target_scope"
          value={targetScope}
          onValueChange={(value) =>
            setTargetScope(value as "all_posts" | "specific_post")
          }
          required
        >
          <SelectTrigger id="target_scope" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all_posts">모든 게시물</SelectItem>
            <SelectItem value="specific_post">특정 게시물</SelectItem>
          </SelectContent>
        </Select>

        {targetScope === "specific_post" && (
          <div className="mt-2">
            <input type="hidden" name="target_post_id" value={selectedPostId} />

            {loadingMedia && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                게시물을 불러오는 중...
              </div>
            )}

            {!loadingMedia && mediaError && (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-destructive">
                  게시물을 불러오지 못했습니다. 게시물(미디어) ID를 직접 입력하세요.
                </p>
                <Input
                  value={selectedPostId}
                  onChange={(e) => setSelectedPostId(e.target.value)}
                  placeholder="게시물(미디어) ID"
                />
              </div>
            )}

            {!loadingMedia && !mediaError && media?.length === 0 && (
              <p className="text-sm text-muted-foreground">
                이 계정에 게시물이 없습니다.
              </p>
            )}

            {!loadingMedia && !mediaError && media && media.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-72 overflow-y-auto p-1">
                {media.map((item) => {
                  const thumbnail = item.thumbnail_url || item.media_url;
                  const isSelected = selectedPostId === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedPostId(item.id)}
                      className={cn(
                        "relative aspect-square overflow-hidden rounded-md border-2",
                        isSelected ? "border-primary" : "border-transparent",
                      )}
                      title={item.caption?.slice(0, 80) || item.id}
                    >
                      {thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumbnail}
                          alt={item.caption || "게시물"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-muted text-xs text-muted-foreground p-1 text-center">
                          {item.media_type}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
