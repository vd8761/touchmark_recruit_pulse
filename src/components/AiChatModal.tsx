'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    cached?: boolean; // true = served from local cache instantly
}

interface CacheEntry {
    answer: string;
    metricsFingerprint: string; // short hash of metricsContext when cached
    timestamp: number;
}

const CACHE_KEY = 'recruitpulse_ai_cache';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Simple string hash for cache keying */
function simpleHash(str: string): string {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    }
    return Math.abs(h).toString(36);
}

function readCache(): Record<string, CacheEntry> {
    try {
        return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    } catch {
        return {};
    }
}

function writeCache(cache: Record<string, CacheEntry>) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch {
        // Storage quota exceeded — clear and retry
        localStorage.removeItem(CACHE_KEY);
    }
}

function pruneExpired(cache: Record<string, CacheEntry>): Record<string, CacheEntry> {
    const now = Date.now();
    return Object.fromEntries(
        Object.entries(cache).filter(([, v]) => now - v.timestamp < CACHE_TTL_MS)
    );
}

interface AiChatModalProps {
    metricsContext?: string;
}

export default function AiChatModal({ metricsContext }: AiChatModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content: "👋 Hi! I'm **RecruitPulse AI**.\n\nI can answer questions about your current sheet metrics — pipeline, revenue, deals, and more. What would you like to know?",
        },
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Fingerprint of current live metrics data (changes when data refreshes)
    const metricsFingerprint = metricsContext ? simpleHash(metricsContext) : 'none';

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen]);

    // ── Core API caller (reusable for both live & background refresh) ────
    const callAI = useCallback(async (
        question: string,
        conversationHistory: Message[],
        inr: (n: number) => string,
        buildContext: (raw: string) => string,
    ): Promise<string> => {
        const readableMetrics = metricsContext ? buildContext(metricsContext) : null;

        const systemContent = readableMetrics
            ? `You are RecruitPulse AI — a senior analytics advisor for Touchmark, an Indian recruitment & staffing company.

═══════════════════════════════════
CORE RULES — NEVER BREAK THESE
═══════════════════════════════════
1. CURRENCY: ALL money is in Indian Rupees. ALWAYS write ₹ (e.g. ₹2,49,900). NEVER write USD, dollars, or any non-INR symbol.
2. COUNTS: Deal counts, invoice counts, candidate counts are plain numbers — never add ₹ to them.
3. VENDORS: You have data for all 3 vendors. Always name the vendor when citing a figure.
4. FIELD NAME REPHRASING: Translate raw field names into natural business language:
   - profitInvoiced / Realized Revenue → "Revenue Earned"
   - lossDropped / Loss Dropped → "Revenue Lost"
   - atRiskSustenance / At Risk → "At-Risk Revenue"
   - invoicesGenerated → "Invoices Raised"
   - invoicesPaid → "Amount Collected"
   - joined / Gross Deals → "Placements Made"
   - pipeline → "Active Pipeline"
   - value → monetary amount; count → number of candidates/deals

═══════════════════════════════════
RESPONSE FORMAT — ALWAYS FOLLOW
═══════════════════════════════════
For every answer:
1. Start with a **bold headline** summarising the answer in one sentence.
2. Use bullet points with icons for each metric:
   - 📊 for pipeline / deal figures
   - ✅ for positive outcomes (revenue earned, collected)
   - ⚠️ for risks or losses (at-risk, dropped)
   - 🧾 for invoice details
   - 🏢 for vendor/company comparisons
3. Group by vendor when multiple vendors are involved.
4. End with a **💡 Key Takeaway** — one sentence insight.
5. Keep the total response concise (under 200 words) unless a detailed breakdown is explicitly asked.

═══════════════════════════════════
METRIC DEFINITIONS
═══════════════════════════════════
- Active Pipeline: Candidates currently in hiring funnel (Sourced → Offer Accepted). Value = estimated CTC worth.
- Placements Made: Candidates who joined a client. Value = their annual CTC.
- Revenue Earned: Actual billing to client ≈ 8.33% of CTC per placement.
- Invoices Raised: Total invoice value billed to clients.
- Amount Collected: Cash actually received from clients.
- Pending / Outstanding: Invoices Raised − Amount Collected.
- Revenue Lost: Value of candidates who dropped after joining.
- At-Risk Revenue: Value of candidates in probation who may drop.

═══════════════════════════════════
VENDOR SHEETS (ALL 3 AVAILABLE)
═══════════════════════════════════
- 🏢 Touchmark Workforce
- 🏢 Touchmark Descience
- 🏢 DOSC Placement

DATA:
${readableMetrics}`
            : `You are RecruitPulse AI — a senior analytics advisor for Touchmark, an Indian staffing company. All money is ₹ (INR). Be professional, structured, and use bullet points with icons.`;

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'openai/gpt-oss-20b',
                messages: [
                    { role: 'system', content: systemContent },
                    ...conversationHistory,
                    { role: 'user', content: question },
                ],
                max_tokens: 700,
                temperature: 0.2,
            }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data?.error?.message || 'API Error');
        return data?.choices?.[0]?.message?.content ?? 'Sorry, I could not get a response.';
    }, [metricsContext]);

    const sendMessage = async () => {
        const trimmed = input.trim();
        if (!trimmed || isLoading) return;

        const userMessage: Message = { role: 'user', content: trimmed };
        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        // ── Currency formatter (en-IN / INR) ────────────────────────────
        const inr = (num: number) =>
            new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);

        // Keys that represent counts (never formatted as money)
        const COUNT_KEYS = new Set(['count', 'deals', 'invoices', 'candidates', 'months']);

        // Recursively walk the JSON and build a readable string
        const buildContext = (raw: string): string => {
            try {
                const obj = JSON.parse(raw);

                const walk = (node: any, key = '', depth = 0): string => {
                    const indent = '  '.repeat(depth);
                    if (node === null || node === undefined) return 'N/A';

                    if (typeof node === 'number') {
                        const isCount = COUNT_KEYS.has(key.toLowerCase());
                        if (!isCount && node > 100) return `${inr(node)}`;
                        return String(node);
                    }

                    if (typeof node === 'string') return node;

                    if (Array.isArray(node)) {
                        if (node.length === 0) return 'none';
                        return node
                            .map((item, i) => `${indent}  [${i + 1}] ${walk(item, key, depth + 1)}`)
                            .join('\n');
                    }

                    if (typeof node === 'object') {
                        return Object.entries(node)
                            .map(([k, v]) => `${indent}${k}: ${walk(v, k, depth + 1)}`)
                            .join('\n');
                    }
                    return String(node);
                };

                return walk(obj);
            } catch {
                return raw;
            }
        };

        // ── Cache key: hash of (question + metricsFingerprint) ──────────
        const cacheKey = simpleHash(trimmed.toLowerCase() + metricsFingerprint);
        const cache = pruneExpired(readCache());
        const hit = cache[cacheKey];

        const conversationSoFar = messages; // snapshot before state update

        try {
            if (hit) {
                // ── CACHE HIT: show answer instantly ────────────────────
                setMessages((prev) => [...prev, { role: 'assistant', content: hit.answer, cached: true }]);
                setIsLoading(false);

                // ── STALE CHECK: if data has changed, silently refresh ──
                if (hit.metricsFingerprint !== metricsFingerprint) {
                    // Show a subtle "Refreshing with latest data..." notice
                    setTimeout(async () => {
                        try {
                            const fresh = await callAI(trimmed, conversationSoFar, inr, buildContext);
                            // Replace the cached message with fresh one
                            setMessages((prev) => {
                                const updated = [...prev];
                                // find last assistant message and replace
                                for (let i = updated.length - 1; i >= 0; i--) {
                                    if (updated[i].role === 'assistant') {
                                        updated[i] = { role: 'assistant', content: fresh + '\n\n_🔄 Updated with latest data._', cached: false };
                                        break;
                                    }
                                }
                                return updated;
                            });
                            // Update cache with fresh fingerprint
                            const updatedCache = { ...readCache(), [cacheKey]: { answer: fresh, metricsFingerprint, timestamp: Date.now() } };
                            writeCache(updatedCache);
                        } catch {
                            // Silent fail — cached answer remains
                        }
                    }, 100);
                }
            } else {
                // ── CACHE MISS: call AI and store result ─────────────────
                const aiReply = await callAI(trimmed, conversationSoFar, inr, buildContext);
                setMessages((prev) => [...prev, { role: 'assistant', content: aiReply }]);

                // Save to cache
                const updatedCache = pruneExpired({ ...readCache(), [cacheKey]: { answer: aiReply, metricsFingerprint, timestamp: Date.now() } });
                writeCache(updatedCache);
                setIsLoading(false);
            }
        } catch (err: any) {
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: `⚠️ Error: ${err.message ?? 'Something went wrong. Please try again.'}` },
            ]);
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const formatMessage = (text: string) => {
        return text.split('\n').map((line, i) => {
            const parts = line.split(/\*\*(.*?)\*\*/g);
            return (
                <p key={i} className={i > 0 ? 'mt-1' : ''}>
                    {parts.map((part, j) =>
                        j % 2 === 1 ? <strong key={j}>{part}</strong> : part
                    )}
                </p>
            );
        });
    };

    return (
        <>
            {/* Fullscreen solid backdrop */}
            {isOpen && (
                <div className="fixed inset-0 bg-[#fdf6ec] z-[9998]" />
            )}

            {/* Chat Panel */}
            <div
                className={`fixed flex flex-col transition-all duration-300 ease-out inset-0 z-[9999] bg-[#fdf6ec]
                    ${isOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-6 pointer-events-none'}
                `}
            >
                {/* Header */}
                <div
                    className="flex items-center gap-3 flex-shrink-0 border-b border-orange-300/30 bg-gradient-to-r from-[#f0a500] to-[#e07b00] px-8 py-5"
                >
                    <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white text-sm font-bold shadow-inner ring-2 ring-white/30">
                        AI
                    </div>
                    <div className="flex-1">
                        <p className="text-white font-bold text-sm leading-tight drop-shadow-sm">RecruitPulse AI</p>
                        <p className="text-orange-100 text-[11px] font-medium tracking-wide leading-none mt-0.5">Intelligent Analytics Assistant</p>
                    </div>

                    {/* Close */}
                    <button
                        onClick={() => setIsOpen(false)}
                        className="text-orange-100 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/15 text-base leading-none"
                        aria-label="Close chat"
                    >
                        ✕
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto py-4 space-y-3 scroll-smooth px-8 max-w-5xl mx-auto w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {messages.map((msg, index) => (
                        <div
                            key={index}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            {msg.role === 'assistant' && (
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#f0a500] to-[#e07b00] flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0 mt-1 shadow">
                                    AI
                                </div>
                            )}
                            <div
                                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm
                                    ${msg.role === 'user'
                                        ? 'bg-gradient-to-br from-[#f0a500] to-[#e07b00] text-white rounded-tr-sm'
                                        : 'bg-white text-gray-800 border border-orange-100 rounded-tl-sm'
                                    }`}
                            >
                                {formatMessage(msg.content)}
                            </div>
                        </div>
                    ))}

                    {/* Loading dots */}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#f0a500] to-[#e07b00] flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0 shadow">
                                AI
                            </div>
                            <div className="bg-white border border-orange-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                                <div className="flex gap-1 items-center h-4">
                                    <div className="w-2 h-2 rounded-full bg-[#f0a500] animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <div className="w-2 h-2 rounded-full bg-[#f0a500] animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <div className="w-2 h-2 rounded-full bg-[#f0a500] animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="border-t border-orange-100 flex gap-2 items-end bg-white/80 backdrop-blur-sm px-8 py-4 justify-center">
                    <div className="flex gap-2 w-full max-w-5xl">
                        <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask about your metrics..."
                        rows={1}
                        className="flex-1 resize-none border border-orange-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder-orange-300 focus:outline-none focus:ring-2 focus:ring-[#f0a500]/30 focus:border-[#f0a500] transition-all max-h-32 overflow-y-auto bg-white [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                        style={{ lineHeight: '1.5' }}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={isLoading || !input.trim()}
                        className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f0a500] to-[#e07b00] hover:from-[#e09900] hover:to-[#c96a00] disabled:from-gray-200 disabled:to-gray-200 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all duration-200 hover:shadow-md flex-shrink-0"
                        aria-label="Send message"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                        </svg>
                    </button>
                    </div>
                </div>
            </div>

            {/* Floating Button */}
            <div className="fixed bottom-6 right-6 z-50">
                {!isOpen && (
                    <span className="absolute inset-0 rounded-full bg-[#f0a500] opacity-40 animate-ping" />
                )}
                <button
                    onClick={() => setIsOpen((prev) => !prev)}
                    className={`relative flex items-center gap-2 px-4 h-12 rounded-full bg-gradient-to-r from-[#f0a500] to-[#e07b00] text-white shadow-lg hover:shadow-xl font-semibold text-sm transition-all duration-300 hover:scale-105 ${isOpen ? 'scale-95' : ''}`}
                    aria-label="Open RecruitPulse AI chat"
                >
                    {isOpen ? (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 flex-shrink-0">
                            <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
                            className="w-5 h-5 flex-shrink-0 animate-[spin_3s_linear_infinite]"
                            style={{ animationDirection: 'alternate', animationTimingFunction: 'ease-in-out' }}
                        >
                            <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                        </svg>
                    )}
                    <span>{isOpen ? 'Close' : 'Ask AI'}</span>
                </button>
            </div>
        </>
    );
}
