import AiChatModal from "@/components/AiChatModal";

export default function AiChatWrapper({ isFullPage = false }: { isFullPage?: boolean }) {
  // Context is now loaded on-demand via /api/chat/context only when the user opens the chat,
  // preventing layout blocking, Google Sheets downloads, and DB queries on every page transition.
  return <AiChatModal />;
}
