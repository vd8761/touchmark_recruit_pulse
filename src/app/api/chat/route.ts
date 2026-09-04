import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const body = await req.json();

        let sessionId = body.sessionId;
        const userPrompt = body.messages[body.messages.length - 1]?.content;

        // Add the Golden Rules (System Prompt)
        const systemMessage = {
            role: 'system',
            content: `You are an expert AI assistant for Touchmark Recruit Pulse, an advanced recruitment and HR platform. 
Your job is to answer questions related to the application's domain, including recruitment metrics, candidate pipelines, invoices, user management, reports, and overall system functionality.

You have access to the current system data. You are strongly encouraged to use this data to perform advanced analytics, financial forecasting, and provide insightful recommendations. If the user asks for a forecast (e.g., "sales for the next six months"), workforce planning, or strategic advice based on existing business data, you MUST analyze the provided data, think logically, and generate a well-reasoned forecast or answer. 

CRITICAL FORECASTING INSTRUCTIONS:
- You must base your projections ONLY on the historical data and trends provided to you.
- Use sound, simple mathematical principles (like moving averages, run rates, or month-over-month growth) for your forecasts.
- Do NOT invent fake data, hallucinate complex algorithms, or share invalid information. 
- You must clearly explain the logic, mathematical basis, and assumptions you used to arrive at your forecast so the user can trust the results.

GOLDEN RULES:
1. Do not answer purely general knowledge questions unrelated to business, finance, or HR (e.g., "What is the capital of France?").
2. If the user asks an off-topic question, politely reply that you are designed to assist with Touchmark Recruit Pulse data and functionality.
3. For financial, forecasting, or strategic questions, provide detailed, transparent, and mathematically sound responses using the existing data as your foundation.`
        };

        // Inject the system message at the beginning of the chat history
        const apiMessages = [systemMessage, ...body.messages];

        // 1. If we have a sessionId, save the User message
        if (sessionId && session?.user?.email && userPrompt) {
            await prisma.aiChatMessage.create({
                data: {
                    session_id: sessionId,
                    role: 'user',
                    content: userPrompt,
                },
            });
        }

        const groqRes = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({ ...body, messages: apiMessages, sessionId: undefined }), // Remove sessionId before sending to OpenAI
        });

        const data = await groqRes.json();

        if (!groqRes.ok) {
            return NextResponse.json(data, { status: groqRes.status });
        }

        const aiResponse = data.choices?.[0]?.message?.content;

        // 2. If we have a sessionId, save the AI response
        if (sessionId && session?.user?.email && aiResponse) {
            await prisma.aiChatMessage.create({
                data: {
                    session_id: sessionId,
                    role: 'assistant',
                    content: aiResponse,
                },
            });

            // 3. Auto-generate title if this is the first exchange
            // We check if the chat has a generic "New Chat" title, then generate one
            const chatSession = await prisma.aiChatSession.findUnique({
                where: { id: sessionId },
                select: { title: true }
            });

            if (chatSession && chatSession.title === 'New Chat') {
                try {
                    // Call OpenAI just to generate a title
                    const titleRes = await fetch('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                        },
                        body: JSON.stringify({
                            model: 'gpt-4o-mini', // Fast, small model just for titling
                            messages: [
                                { role: 'system', content: 'You are a summarization bot. Generate a short, 3 to 5 word title for the user prompt. DO NOT include quotes or punctuation. Be direct and descriptive.' },
                                { role: 'user', content: userPrompt }
                            ],
                            max_tokens: 10,
                            temperature: 0.5,
                        })
                    });

                    if (titleRes.ok) {
                        const titleData = await titleRes.json();
                        let newTitle = titleData.choices?.[0]?.message?.content?.replace(/['"]+/g, '').trim();
                        if (newTitle) {
                            await prisma.aiChatSession.update({
                                where: { id: sessionId },
                                data: { title: newTitle }
                            });
                            // Inject the new title into the response so the frontend can update immediately
                            data._newTitle = newTitle;
                        }
                    }
                } catch (e) {
                    console.error('Failed to generate title:', e);
                }
            }
        }

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json(
            { error: { message: error.message ?? 'Internal server error' } },
            { status: 500 }
        );
    }
}

