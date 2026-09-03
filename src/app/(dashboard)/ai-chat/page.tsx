import AiChatWrapper from '@/components/AiChatWrapper';

export default function AiChatPage() {
    return (
        <div className="h-full -m-6 flex flex-col">
            {/* The wrapper handles data fetching and rendering the new AiChatClient */}
            <AiChatWrapper isFullPage={true} />
        </div>
    );
}
