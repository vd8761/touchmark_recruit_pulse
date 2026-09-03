'use client';
import { useState, useRef, useEffect } from 'react';

type Message = {
    role: 'user' | 'assistant' | 'system';
    content: string;
};

type ChatSession = {
    id: string;
    title: string;
    updated_at: string;
};

export default function AiChatWindow({ metricsContext }: { metricsContext: string }) {
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };
    useEffect(() => scrollToBottom(), [messages]);

    // Fetch sessions on load
    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        try {
            const res = await fetch('/api/chat/sessions');
            if (res.ok) {
                const data = await res.json();
                setSessions(data);
            }
        } catch (e) {
            console.error('Failed to fetch sessions', e);
        }
    };

    // When active session changes, load its messages
    useEffect(() => {
        if (!activeSessionId) {
            setMessages([]);
            return;
        }

        const fetchMessages = async () => {
            try {
                const res = await fetch(`/api/chat/sessions/${activeSessionId}`);
                if (res.ok) {
                    const data = await res.json();
                    // Keep only role and content
                    setMessages(data.map((m: any) => ({ role: m.role, content: m.content })));
                }
            } catch (e) {
                console.error('Failed to fetch messages', e);
            }
        };

        fetchMessages();
    }, [activeSessionId]);

    const handleNewChat = async () => {
        try {
            const res = await fetch('/api/chat/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: 'New Chat' })
            });
            if (res.ok) {
                const newSession = await res.json();
                setSessions([newSession, ...sessions]);
                setActiveSessionId(newSession.id);
            }
        } catch (e) {
            console.error('Failed to create new session', e);
        }
    };

    const sendMessage = async () => {
        const trimmed = input.trim();
        if (!trimmed || isLoading) return;

        // If no active session, create one instantly before sending
        let currentSessionId = activeSessionId;
        if (!currentSessionId) {
            try {
                const res = await fetch('/api/chat/sessions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title: 'New Chat' })
                });
                if (res.ok) {
                    const newSession = await res.json();
                    setSessions([newSession, ...sessions]);
                    currentSessionId = newSession.id;
                    setActiveSessionId(currentSessionId);
                }
            } catch (e) {
                console.error('Failed to auto-create session', e);
                return;
            }
        }

        const userMessage: Message = { role: 'user', content: trimmed };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        const inr = (num: number) =>
            new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);
        const COUNT_KEYS = new Set(['count', 'deals', 'invoices', 'candidates', 'months']);

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
                        return node.map((item, i) => `${indent}  [${i + 1}] ${walk(item, key, depth + 1)}`).join('\n');
                    }
                    if (typeof node === 'object') {
                        return Object.entries(node).map(([k, v]) => `${indent}${k}: ${walk(v, k, depth + 1)}`).join('\n');
                    }
                    return String(node);
                };
                return walk(obj);
            } catch {
                return raw;
            }
        };

        const readableMetrics = buildContext(metricsContext);

        const systemContent = `You are RecruitPulse AI... 
DATA:
${readableMetrics}`;

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'gpt-4o',
                    sessionId: currentSessionId,
                    messages: [
                        { role: 'system', content: systemContent },
                        ...newMessages.map(m => ({ role: m.role, content: m.content }))
                    ],
                    max_tokens: 2000,
                    temperature: 0.2,
                }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data?.error?.message || 'API Error');
            
            const aiContent = data?.choices?.[0]?.message?.content ?? 'Sorry, I could not get a response.';
            setMessages(prev => [...prev, { role: 'assistant', content: aiContent }]);

            // If backend auto-generated a title for a new chat, update sidebar
            if (data._newTitle) {
                setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, title: data._newTitle } : s));
            }

        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, { role: 'assistant', content: 'An error occurred while connecting to the AI.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // Time grouping logic for sidebar
    const groupSessions = () => {
        const groups: Record<string, ChatSession[]> = {
            'Today': [],
            'Yesterday': [],
            'Previous 7 Days': [],
            'Previous 30 Days': [],
            'Older': []
        };

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const yesterday = today - 86400000;
        const last7 = today - (86400000 * 7);
        const last30 = today - (86400000 * 30);

        sessions.forEach(session => {
            const date = new Date(session.updated_at).getTime();
            if (date >= today) groups['Today'].push(session);
            else if (date >= yesterday) groups['Yesterday'].push(session);
            else if (date >= last7) groups['Previous 7 Days'].push(session);
            else if (date >= last30) groups['Previous 30 Days'].push(session);
            else groups['Older'].push(session);
        });

        return groups;
    };

    const groupedSessions = groupSessions();

    const renderInline = (text: string, keyPrefix: string) => {
        const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
        return tokens.map((tok, i) => {
            if (tok.startsWith('**') && tok.endsWith('**'))
                return <strong key={`${keyPrefix}-b${i}`}>{tok.slice(2, -2)}</strong>;
            if (tok.startsWith('`') && tok.endsWith('`'))
                return <code key={`${keyPrefix}-c${i}`} className="bg-orange-50 text-orange-700 rounded px-1 py-0.5 text-[11px] font-mono">{tok.slice(1, -1)}</code>;
            return tok;
        });
    };

    const formatMessage = (text: string) => {
        const lines = text.split('\n');
        const output: React.ReactNode[] = [];
        let i = 0;

        while (i < lines.length) {
            const line = lines[i];

            if (/^[-*═]{3,}$/.test(line.trim())) {
                output.push(<hr key={i} className="my-2 border-orange-100" />);
                i++; continue;
            }

            if (/^#{1,3}\s/.test(line)) {
                const level = (line.match(/^(#+)/) || [''])[0].length;
                const headingText = line.replace(/^#+\s/, '');
                const cls = level === 1
                    ? 'text-base font-bold text-slate-900 mt-3 mb-1'
                    : level === 2
                    ? 'text-sm font-bold text-slate-800 mt-2 mb-1'
                    : 'text-xs font-bold text-slate-700 mt-1 mb-0.5';
                output.push(<p key={i} className={cls}>{renderInline(headingText, `h${i}`)}</p>);
                i++; continue;
            }

            if (line.trim().startsWith('|')) {
                const tableRows: string[][] = [];
                while (i < lines.length && lines[i].trim().startsWith('|')) {
                    const row = lines[i].trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
                    tableRows.push(row);
                    i++;
                }
                const nonSep = tableRows.filter(r => !r.every(c => /^[-:\s]+$/.test(c)));
                if (nonSep.length > 0) {
                    const [header, ...rows] = nonSep;
                    output.push(
                        <div key={`table-${i}`} className="overflow-x-auto my-3 rounded-lg border border-orange-100 shadow-sm">
                            <table className="w-full text-xs text-left border-collapse">
                                <thead>
                                    <tr className="bg-gradient-to-r from-[#f0a500]/15 to-[#e07b00]/10">
                                        {header.map((h, ci) => (
                                            <th key={ci} className="px-3 py-2 font-bold text-slate-700 border-b border-orange-100 whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row, ri) => (
                                        <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-orange-50/30'}>
                                            {row.map((cell, ci) => {
                                                let cellCls = 'px-3 py-2 text-slate-700 border-b border-orange-50 align-middle';
                                                let badge: React.ReactNode = null;
                                                if (/^(High|Critical)$/i.test(cell)) badge = <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">{cell}</span>;
                                                else if (/^Medium$/i.test(cell)) badge = <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">{cell}</span>;
                                                else if (/^(Low|Open)$/i.test(cell)) badge = <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">{cell}</span>;
                                                else if (/^(Closed|Inactive)$/i.test(cell)) badge = <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">{cell}</span>;
                                                else if (/^On Hold$/i.test(cell)) badge = <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">{cell}</span>;
                                                return (
                                                    <td key={ci} className={cellCls}>
                                                        {badge ?? <span>{renderInline(cell, `cell-${ri}-${ci}`)}</span>}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    );
                }
                continue;
            }

            if (/^([-*]|\d+\.)\s/.test(line)) {
                const bulletLines: string[] = [];
                while (i < lines.length && /^([-*]|\d+\.)\s/.test(lines[i])) {
                    bulletLines.push(lines[i]);
                    i++;
                }
                output.push(
                    <ul key={`ul-${i}`} className="my-1.5 space-y-1 pl-1">
                        {bulletLines.map((bl, bi) => {
                            const content = bl.replace(/^([-*]|\d+\.)\s/, '');
                            return (
                                <li key={bi} className="flex items-start gap-1.5 text-sm text-slate-700">
                                    <span className="mt-0.5 text-[#f0a500] flex-shrink-0">•</span>
                                    <span>{renderInline(content, `li-${bi}`)}</span>
                                </li>
                            );
                        })}
                    </ul>
                );
                continue;
            }

            if (line.trim() === '') {
                output.push(<div key={`sp-${i}`} className="h-1" />);
                i++; continue;
            }

            output.push(
                <p key={i} className="text-sm text-slate-700 leading-relaxed">
                    {renderInline(line, `p${i}`)}
                </p>
            );
            i++;
        }
        return output;
    };

    return (
        <div className="flex w-full h-full bg-[#fdf6ec]">
            {/* Sidebar (History) */}
            <div className="w-64 flex-shrink-0 bg-white border-r border-orange-100 flex flex-col">
                <div className="p-4 border-b border-orange-50">
                    <button 
                        onClick={handleNewChat}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-[#f0a500] to-[#e07b00] text-white rounded-lg font-medium shadow-sm hover:shadow-md transition-shadow"
                    >
                        <span>➕</span> New Chat
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 space-y-6">
                    {Object.entries(groupedSessions).map(([groupName, groupSessions]) => {
                        if (groupSessions.length === 0) return null;
                        return (
                            <div key={groupName}>
                                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2">{groupName}</h3>
                                <ul className="space-y-1">
                                    {groupSessions.map(session => (
                                        <li key={session.id}>
                                            <button
                                                onClick={() => setActiveSessionId(session.id)}
                                                className={`w-full text-left px-3 py-2 rounded-md text-sm truncate transition-colors ${
                                                    activeSessionId === session.id 
                                                        ? 'bg-orange-100 text-orange-900 font-medium' 
                                                        : 'text-slate-600 hover:bg-slate-50'
                                                }`}
                                            >
                                                {session.title}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col">
                <div className="flex-1 overflow-y-auto p-8">
                    <div className="max-w-4xl mx-auto space-y-6">
                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center space-y-4 mt-20">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#f0a500] to-[#e07b00] flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                                    AI
                                </div>
                                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">How can I help you today?</h2>
                                <p className="text-slate-500 max-w-md">Ask me about open positions, revenue pipelines, or candidate metrics.</p>
                            </div>
                        ) : (
                            messages.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    {msg.role === 'assistant' && (
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#f0a500] to-[#e07b00] flex items-center justify-center text-white text-xs font-bold mr-3 flex-shrink-0 mt-1 shadow">
                                            AI
                                        </div>
                                    )}
                                    <div className={`max-w-[85%] rounded-2xl px-5 py-4 text-[15px] leading-relaxed shadow-sm ${
                                        msg.role === 'user' 
                                            ? 'bg-gradient-to-br from-[#f0a500] to-[#e07b00] text-white rounded-tr-sm' 
                                            : 'bg-white text-slate-800 border border-orange-100 rounded-tl-sm'
                                    }`}>
                                        <div className={msg.role === 'user' ? 'text-white [&_p]:text-white [&_li]:text-white [&_span]:text-white [&_strong]:text-white' : ''}>
                                            {formatMessage(msg.content)}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                        
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#f0a500] to-[#e07b00] flex items-center justify-center text-white text-xs font-bold mr-3 flex-shrink-0 shadow">AI</div>
                                <div className="bg-white border border-orange-100 rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm flex items-center gap-1.5 h-12">
                                    <div className="w-2.5 h-2.5 rounded-full bg-[#f0a500] animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <div className="w-2.5 h-2.5 rounded-full bg-[#f0a500] animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <div className="w-2.5 h-2.5 rounded-full bg-[#f0a500] animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* Input Area */}
                <div className="p-6 bg-white border-t border-orange-100">
                    <div className="max-w-4xl mx-auto relative">
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => {
                                setInput(e.target.value);
                                e.target.style.height = 'auto';
                                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                            }}
                            onKeyDown={handleKeyDown}
                            placeholder="Message RecruitPulse AI..."
                            className="w-full pl-5 pr-14 py-4 rounded-xl border border-orange-200 bg-orange-50/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#f0a500]/50 focus:border-[#f0a500] resize-none overflow-y-auto text-[15px] shadow-sm transition-all"
                            rows={1}
                            style={{ minHeight: '56px' }}
                        />
                        <button
                            onClick={sendMessage}
                            disabled={!input.trim() || isLoading}
                            className="absolute right-3 top-[11px] p-2 bg-[#f0a500] text-white rounded-lg disabled:opacity-40 disabled:bg-slate-300 hover:bg-[#e07b00] transition-colors shadow-sm"
                            aria-label="Send message"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="22" y1="2" x2="11" y2="13"></line>
                                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                            </svg>
                        </button>
                    </div>
                    <p className="text-center text-[11px] text-slate-400 mt-3 font-medium tracking-wide">
                        RecruitPulse AI can make mistakes. Consider verifying important metrics.
                    </p>
                </div>
            </div>
        </div>
    );
}
