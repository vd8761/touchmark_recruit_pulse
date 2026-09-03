import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
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

    // Verify the chat session belongs to the user
    const chatSession = await prisma.aiChatSession.findFirst({
      where: {
        id,
        user_id: user.id,
      },
    });

    if (!chatSession) {
      return NextResponse.json({ error: 'Chat session not found' }, { status: 404 });
    }

    // Fetch messages for this session
    const messages = await prisma.aiChatMessage.findMany({
      where: { session_id: id },
      orderBy: { created_at: 'asc' },
      select: {
        id: true,
        role: true,
        content: true,
        created_at: true,
      },
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error('Failed to fetch chat messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
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

    // Delete the session (cascade will delete messages)
    await prisma.aiChatSession.deleteMany({
      where: {
        id,
        user_id: user.id, // Ensure they can only delete their own
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete chat session:', error);
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
  }
}
