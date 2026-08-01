import { z } from "zod";

export const automationSchema = z
  .object({
    name: z.string().trim().min(1, "이름을 입력하세요").max(100),
    instagram_account_id: z.string().uuid("연결된 인스타그램 계정을 선택하세요"),
    target_scope: z.enum(["all_posts", "specific_post"]),
    target_post_id: z.string().trim().optional(),
    keyword_mode: z.enum(["all_comments", "specific_keywords"]),
    keywords: z.string().trim().optional(),
    dm_initial_message: z.string().trim().min(1, "초기 DM 메시지를 입력하세요").max(1000),
    dm_follow_recheck_button_text: z.string().trim().min(1).max(50),
    dm_final_message: z.string().trim().max(1000).optional(),
    dm_final_link_url: z
      .union([z.string().trim().url("올바른 URL을 입력하세요"), z.literal("")])
      .optional(),
    dm_final_button_text: z.string().trim().max(50).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.target_scope === "specific_post" && !data.target_post_id) {
      ctx.addIssue({
        code: "custom",
        path: ["target_post_id"],
        message: "특정 게시물 ID를 입력하세요",
      });
    }
    if (data.keyword_mode === "specific_keywords" && !data.keywords) {
      ctx.addIssue({
        code: "custom",
        path: ["keywords"],
        message: "감지할 키워드를 하나 이상 입력하세요",
      });
    }
  });

export type AutomationInput = z.infer<typeof automationSchema>;

export function parseKeywords(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}
