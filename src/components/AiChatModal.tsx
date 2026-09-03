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

export default function AiChatModal({ metricsContext }: { metricsContext?: string }) {
    const [isOpen, setIsOpen] = useState(false);
    
    // Core chat states
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

    const [randomCards, setRandomCards] = useState<any[]>([]);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => textareaRef.current?.focus(), 300);
        }
    }, [isOpen]);

    useEffect(() => {
        if (messages.length === 0) {
            let dynamicPrompts: any[] = [];
            
            try {
                if (metricsContext) {
                    const parsed = JSON.parse(metricsContext);
                    const positions = parsed?.appData?.positions?.list || [];
                    const clients = parsed?.appData?.clients?.list || [];
                    
                    // 1. Pipeline Prompt
                    dynamicPrompts.push({
                        title: "Revenue Pipeline",
                        subtitle: "What is the total expected revenue pipeline right now?",
                        icon: "📈"
                    });

                    // 2. Client specific prompts
                    if (clients.length > 0) {
                        const randomClient = clients[Math.floor(Math.random() * clients.length)];
                        if (randomClient && randomClient.company_name) {
                            dynamicPrompts.push({
                                title: `${randomClient.company_name} Overview`,
                                subtitle: `Give me a summary of all active requirements and pipeline for ${randomClient.company_name}.`,
                                icon: "🏢"
                            });
                        }
                    } else {
                        dynamicPrompts.push({
                            title: "Top Clients",
                            subtitle: "Which clients have the most requirements right now?",
                            icon: "🏢"
                        });
                    }

                    // 3. Position specific prompts
                    if (positions.length > 0) {
                        const randomRole = positions[Math.floor(Math.random() * positions.length)];
                        if (randomRole && randomRole.role && randomRole.client) {
                            dynamicPrompts.push({
                                title: `Status: ${randomRole.role}`,
                                subtitle: `What is the current status of the ${randomRole.role} role for ${randomRole.client}?`,
                                icon: "🔍"
                            });
                            dynamicPrompts.push({
                                title: "Deal Value",
                                subtitle: `What is the total expected deal value for the ${randomRole.role} position?`,
                                icon: "💵"
                            });
                        }
                    } else {
                        dynamicPrompts.push({
                            title: "High Priority Roles",
                            subtitle: "Show me all high priority open positions",
                            icon: "🚨"
                        });
                    }

                    // 4. Analytics Prompt
                    dynamicPrompts.push({
                        title: "Monthly Summary",
                        subtitle: "Summarize placements and revenue for this month",
                        icon: "📊"
                    });
                } else {
                    // Fallback if no context
                    dynamicPrompts = [
                        { title: "High Priority Roles", subtitle: "Show me all high priority open positions", icon: "🚨" },
                        { title: "Revenue Pipeline", subtitle: "What is the total expected revenue pipeline?", icon: "📈" },
                        { title: "Top Clients", subtitle: "Which clients have the most requirements right now?", icon: "🏢" },
                        { title: "Monthly Summary", subtitle: "Summarize placements and revenue for this month", icon: "📊" }
                    ];
                }
            } catch (e) {
                dynamicPrompts = [
                    { title: "High Priority Roles", subtitle: "Show me all high priority open positions", icon: "🚨" },
                    { title: "Revenue Pipeline", subtitle: "What is the total expected revenue pipeline?", icon: "📈" },
                    { title: "Top Clients", subtitle: "Which clients have the most requirements right now?", icon: "🏢" },
                    { title: "Monthly Summary", subtitle: "Summarize placements and revenue for this month", icon: "📊" }
                ];
            }

            const shuffled = dynamicPrompts.sort(() => 0.5 - Math.random());
            setRandomCards(shuffled.slice(0, 4));
        }
    }, [messages.length, activeSessionId, isOpen, metricsContext]);

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

    const sendMessage = async (overrideText?: string | React.MouseEvent) => {
        const rawText = typeof overrideText === 'string' ? overrideText : input;
        const trimmed = rawText.trim();
        if (!trimmed || isLoading) return;

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

        const readableMetrics = metricsContext ? buildContext(metricsContext) : null;

        const systemContent = readableMetrics
            ? `You are RecruitPulse AI — an intelligent assistant for the Touchmark Recruit Pulse platform, an Indian recruitment & staffing company.

You have access to TWO separate data sources. Understand the difference clearly:

═══════════════════════════════════
DATA SOURCE 1: SHEET METRICS (Google Sheets — External)
═══════════════════════════════════
- This is an external Google Sheet tracking closed deals/placements.
- Contains: pipeline (active candidates), revenue earned, invoices raised, amount collected, revenue lost, at-risk revenue.
- Vendors: Touchmark Workforce, Touchmark Descience, DOSC Placement.
- Use this for revenue, billing, and placement outcome questions.

═══════════════════════════════════
DATA SOURCE 2: APPLICATION DATABASE (Internal)
═══════════════════════════════════
- This is the live app database with Clients, Positions (open job requirements), and Users.
- POSITIONS have full financial data:
  - perResourceCostINR = the fee/cost per candidate for that role (in ₹)
  - openings = number of candidates required for that role
  - totalDealValueINR = perResourceCostINR × openings (pre-calculated for you)
  - positions.totalDealValueINR = aggregate total deal value of ALL open positions
- OVERALL APP PIPELINE: Use \`appData.overallPipeline\` for platform-wide metrics (matches the Dashboard exactly).
  - \`pendingPipelineINR\`: The expected revenue from all open/active roles (Overall Pending Pipeline).
  - \`realizedRevenueINR\`: The revenue from all closed placements (Overall Realized Revenue).
- Use this for questions about open roles, current deal pipeline value, clients, or team.

═══════════════════════════════════
CORE RULES — NEVER BREAK THESE
═══════════════════════════════════
1. CURRENCY: ALL money is in Indian Rupees. ALWAYS write ₹ (e.g. ₹2,49,900). NEVER write USD or any non-INR symbol.
2. COUNTS: Position counts, deal counts, candidate counts are plain numbers — never add ₹.
3. DEAL VALUE FROM POSITIONS: To answer "total deal value of open positions", use appData.positions.totalDealValueINR directly. Do NOT say data is unavailable.
4. GENERAL KNOWLEDGE: NEVER answer questions unrelated to this application (e.g. "Who is the CEO of Google?"). Politely decline.
5. FIELD NAME REPHRASING: Translate raw field names into natural business language:
   - profitInvoiced → "Revenue Earned"
   - lossDropped → "Revenue Lost"
   - atRiskSustenance → "At-Risk Revenue"
   - invoicesGenerated → "Invoices Raised"
   - invoicesPaid → "Amount Collected"
   - joined → "Placements Made"
   - pipeline → "Active Pipeline"
   - perResourceCostINR → "Fee per Candidate"
   - totalDealValueINR → "Deal Value"

═══════════════════════════════════
RESPONSE FORMAT — ALWAYS FOLLOW
═══════════════════════════════════
1. Start with a **bold headline** summarising the answer in one sentence.
2. Use bullet points with icons for each data point:
   - 📊 for pipeline / deal / position figures
   - ✅ for positive outcomes (revenue earned, collected, active clients)
   - ⚠️ for risks or losses (at-risk, dropped, on-hold positions)
   - 🧾 for invoice details
   - 🏢 for client/vendor comparisons
   - 👤 for user/team information
3. For lists of positions, clients, or users — ALWAYS render them as a **markdown table** with columns. Example:
   | Role | Client | Location | Priority | Deal Value | Expected Join |
   |------|--------|----------|----------|------------|---------------|
   | Developer | Esales | Chennai | High | ₹4,00,000 | 07 Sep 2026 |
4. End with a **💡 Key Takeaway** — one sentence insight.
5. Keep the total response concise (under 400 words) unless a detailed breakdown is explicitly asked.

DATA:
${readableMetrics}`
            : `You are RecruitPulse AI — an intelligent assistant for the Touchmark Recruit Pulse platform, an Indian staffing company. All money is ₹ (INR). Be professional, structured, and use bullet points with icons. Refuse general knowledge questions politely.`;

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
        <>
            {/* Fullscreen solid backdrop */}
            {isOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998]" />
            )}

            {/* Chat Panel Modal */}
            <div
                className={`fixed inset-0 flex flex-col overflow-hidden shadow-2xl transition-all duration-300 ease-out z-[9999] bg-[#fdf6ec]
                    ${isOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}
                `}
            >
                {/* Header */}
                <div className="flex items-center justify-between flex-shrink-0 border-b border-orange-300/30 bg-gradient-to-r from-[#f0a500] to-[#e07b00] px-6 py-4">
                    <div className="flex items-center gap-3">
                         <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white text-sm font-bold shadow-inner ring-2 ring-white/30">AI</div>
                         <div>
                             <p className="text-white font-bold text-sm leading-tight drop-shadow-sm">RecruitPulse AI</p>
                             <p className="text-orange-100 text-[11px] font-medium tracking-wide leading-none mt-0.5">Intelligent Analytics Assistant</p>
                         </div>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="text-orange-100 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/15 text-lg leading-none" aria-label="Close chat">✕</button>
                </div>

                {/* Main Body (Sidebar + Chat) */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar (History) */}
                    <div className="w-64 flex-shrink-0 bg-white border-r border-orange-100 flex flex-col hidden md:flex">
                        <div className="p-4 border-b border-orange-50">
                            <button 
                                onClick={handleNewChat}
                                className="w-full flex items-center justify-center gap-1.5 py-2 bg-gradient-to-r from-[#f0a500] to-[#e07b00] text-white rounded-lg text-sm font-semibold shadow-sm hover:shadow-md transition-shadow"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                                New Chat
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
                        <div className="flex-1 overflow-y-auto p-4 md:p-8">
                            <div className="max-w-4xl mx-auto space-y-6">
                                {messages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full space-y-10 mt-10 md:mt-20">
                                        <div className="text-center space-y-4">
                                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#f0a500] to-[#e07b00] flex items-center justify-center text-white text-2xl font-bold shadow-lg mx-auto">
                                                AI
                                            </div>
                                            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">How can I help you today?</h2>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl w-full mx-auto px-4">
                                            {randomCards.map((card, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => sendMessage(card.subtitle)}
                                                    className="flex flex-col items-start p-4 bg-white border border-orange-100 rounded-xl hover:bg-orange-50/50 hover:border-orange-200 transition-all text-left group shadow-sm hover:shadow"
                                                >
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-lg">{card.icon}</span>
                                                        <span className="font-semibold text-slate-700 text-sm">{card.title}</span>
                                                    </div>
                                                    <span className="text-slate-500 text-xs font-medium pl-8 group-hover:text-slate-600 transition-colors">
                                                        "{card.subtitle}"
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    messages.map((msg, idx) => (
                                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            {msg.role === 'assistant' && (
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#f0a500] to-[#e07b00] flex items-center justify-center text-white text-xs font-bold mr-3 flex-shrink-0 mt-1 shadow">
                                                    AI
                                                </div>
                                            )}
                                            <div className={`max-w-[90%] md:max-w-[85%] rounded-2xl px-5 py-4 text-[15px] leading-relaxed shadow-sm ${
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
                        <div className="p-4 md:p-6 bg-white border-t border-orange-100">
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
            </div>

            {/* Floating Button */}
            <div className="fixed bottom-6 right-6 z-50">
                {!isOpen && (
                    <span className="absolute inset-0 rounded-full bg-[#f0a500] opacity-40 animate-ping" />
                )}
                <button
                    onClick={() => {
                        if (!isOpen) {
                            setActiveSessionId(null);
                            setMessages([]);
                            setInput('');
                        }
                        setIsOpen(!isOpen);
                    }}
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
