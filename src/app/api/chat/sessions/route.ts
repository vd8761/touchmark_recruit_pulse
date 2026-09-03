import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: Fetch all chat sessions for the logged-in user
export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // We need to fetch the user's ID using their email since session.user.id might not be available
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const chatSessions = await prisma.aiChatSession.findMany({
      where: { user_id: user.id },
      orderBy: { updated_at: 'desc' },
      select: {
        id: true,
        title: true,
        created_at: true,
        updated_at: true,
      },
    });

    return NextResponse.json(chatSessions);
  } catch (error) {
    console.error('Failed to fetch chat sessions:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}

// POST: Create a new chat session
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { title } = await req.json();

    const newSession = await prisma.aiChatSession.create({
      data: {
        title: title || 'New Chat',
        user_id: user.id,
      },
    });

    return NextResponse.json(newSession);
  } catch (error) {
    console.error('Failed to create chat session:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}
