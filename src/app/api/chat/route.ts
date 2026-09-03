import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Add the Golden Rules (System Prompt)
        const systemMessage = {
            role: 'system',
            content: `You are an expert AI assistant for Touchmark Recruit Pulse, an advanced recruitment and HR platform. 
Your ONLY job is to answer questions related to the application's domain, including but not limited to: recruitment metrics, candidate pipelines, invoices, user management, roles, reports, and overall system functionality.

GOLDEN RULES:
1. NEVER answer general knowledge questions (e.g., "Who is the CEO of Google?", "What is the capital of France?", etc.).
2. If the user asks an off-topic question, politely reply: "I am specifically designed to assist with Touchmark Recruit Pulse data and functionality. I cannot answer general questions."
3. Keep your answers concise, professional, and focused on recruitment and platform features.`
        };

        // Inject the system message at the beginning of the chat history
        if (body.messages) {
            body.messages = [systemMessage, ...body.messages];
        }

        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            },
            body: JSON.stringify(body),
        });

        const data = await groqRes.json();

        if (!groqRes.ok) {
            return NextResponse.json(data, { status: groqRes.status });
        }

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json(
            { error: { message: error.message ?? 'Internal server error' } },
            { status: 500 }
        );
    }
}
