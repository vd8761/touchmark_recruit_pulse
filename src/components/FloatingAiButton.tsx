'use client';
import Link from 'next/link';

export default function FloatingAiButton() {
    return (
        <Link
            href="/ai-chat"
            className="fixed bottom-6 right-6 z-50 rounded-full w-14 h-14 bg-gradient-to-br from-[#f0a500] to-[#e07b00] text-white shadow-lg hover:shadow-orange-500/25 flex items-center justify-center transition-all hover:scale-110 active:scale-95 group"
            title="Ask AI"
        >
            <div className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="drop-shadow-sm"
            >
                <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z" />
                <path d="M8 12h.01" />
                <path d="M12 12h.01" />
                <path d="M16 12h.01" />
            </svg>
        </Link>
    );
}
