export type ThinkingVariant = "steps" | "reasoning" | "search" | "coding";

export type ThinkingStep = {
  id: string;
  label: string;
  detail?: string;
  status: "running" | "done";
  href?: string;
};

export type ToolCall = {
  id: string;
  name: string;
  label: string;
  input?: string;
};

export type DiffLine = {
  text: string;
  tone: "add" | "del" | "ctx";
};

export type DiffFile = {
  path: string;
  added: number;
  removed: number;
  lines: DiffLine[];
};

export type ToolResult = {
  id: string;
  name: string;
  status: "done" | "error";
  detail?: string;
  diff?: DiffFile[];
};

export type ApprovalQuestion = {
  id: string;
  prompt: string;
  type: "single" | "multi";
  options: string[];
};

export type ApprovalRequest = {
  id: string;
  title: string;
  message: string;
  questions?: ApprovalQuestion[];
};

export type RecordsArtifact = {
  kind: "records";
  title: string;
  columns: string[];
  rows: Record<string, string>[];
};

export type DiffArtifact = {
  kind: "diff";
  title: string;
  files: DiffFile[];
};

export type VideoClip = {
  id: string;
  label: string;
  startMs: number;
  endMs: number;
};

export type VideoArtifact = {
  kind: "video";
  title: string;
  durationMs: number;
  clips: VideoClip[];
  /** Playable URL (e.g. /artifacts/<id>.webm). Optional — older/mock artifacts have no
   *  real file and VideoEditor falls back to its label-only placeholder. */
  src?: string;
};

export type ImagePostImage = {
  src: string;
  caption?: string;
};

export type ImagePostArtifact = {
  kind: "image_post";
  title: string;
  format: "single" | "carousel";
  images: ImagePostImage[];
};

export type Artifact = RecordsArtifact | DiffArtifact | VideoArtifact | ImagePostArtifact;

export type AgentEvent =
  | {
      type: "thinking";
      data: { label: string; variant?: ThinkingVariant; query?: string; steps?: ThinkingStep[] };
    }
  | { type: "token"; data: { text: string } }
  | { type: "tool_call"; data: ToolCall }
  | { type: "tool_result"; data: ToolResult }
  | { type: "confirmation_required"; data: ApprovalRequest }
  | { type: "artifact"; data: Artifact }
  | { type: "error"; data: { message: string } }
  | { type: "done"; data?: { conversationId?: string } };

export type ChatRole = "user" | "assistant";

export type ChatMessageInput = {
  role: ChatRole;
  content: string;
};

export type ChatRequest = {
  conversationId?: string;
  messages: ChatMessageInput[];
};

export type ConfirmRequest = {
  conversationId: string;
  confirmationId: string;
  accepted: boolean;
  answers?: Record<string, string | string[]>;
};
