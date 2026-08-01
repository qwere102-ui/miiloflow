import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AutomationFormValues {
  name?: string;
  keyword_mode?: string;
  keywords?: string;
  dm_initial_message?: string;
  dm_follow_recheck_button_text?: string;
  dm_final_message?: string;
  dm_final_link_url?: string;
  dm_final_button_text?: string;
}

export function AutomationFormFields({
  defaultValues = {},
}: {
  defaultValues?: AutomationFormValues;
}) {
  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor="name">자동화 이름</Label>
        <Input
          id="name"
          name="name"
          placeholder="예: 신제품 이벤트"
          defaultValue={defaultValues.name}
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="keyword_mode">댓글 감지 조건</Label>
        <Select
          name="keyword_mode"
          defaultValue={defaultValues.keyword_mode ?? "all_comments"}
          required
        >
          <SelectTrigger id="keyword_mode" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all_comments">모든 댓글</SelectItem>
            <SelectItem value="specific_keywords">특정 키워드 포함</SelectItem>
          </SelectContent>
        </Select>
        <Input
          name="keywords"
          placeholder="키워드 감지 선택 시 쉼표로 구분 (예: 이벤트,링크)"
          defaultValue={defaultValues.keywords}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="dm_initial_message">댓글 감지 시 보낼 초기 DM</Label>
        <Textarea
          id="dm_initial_message"
          name="dm_initial_message"
          required
          placeholder="댓글 남겨주셔서 감사합니다! 답장을 보내주세요."
          defaultValue={defaultValues.dm_initial_message}
          className="min-h-32"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="dm_follow_recheck_button_text">
          팔로우 미확인 시 버튼 문구
        </Label>
        <Input
          id="dm_follow_recheck_button_text"
          name="dm_follow_recheck_button_text"
          defaultValue={defaultValues.dm_follow_recheck_button_text ?? "팔로우 다시 확인"}
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="dm_final_message">팔로우 확인 후 최종 메시지</Label>
        <Textarea
          id="dm_final_message"
          name="dm_final_message"
          placeholder="팔로우 감사합니다! 아래 버튼을 눌러 확인하세요."
          defaultValue={defaultValues.dm_final_message}
          className="min-h-32"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="dm_final_link_url">최종 메시지 링크 URL</Label>
        <Input
          id="dm_final_link_url"
          name="dm_final_link_url"
          type="url"
          placeholder="https://example.com"
          defaultValue={defaultValues.dm_final_link_url}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="dm_final_button_text">최종 메시지 버튼 문구</Label>
        <Input
          id="dm_final_button_text"
          name="dm_final_button_text"
          defaultValue={defaultValues.dm_final_button_text ?? "바로가기"}
        />
      </div>
    </>
  );
}
