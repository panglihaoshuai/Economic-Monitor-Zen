import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { 
        error: 'AI Analysis feature is currently unavailable',
        message: 'The AI analysis feature has been temporarily disabled. Please check back later.'
      },
      { status: 503 }
    );
  } catch (error) {
    console.error('Analysis trigger error:', error);
    return NextResponse.json(
      { error: 'Analysis failed' },
      { status: 500 }
    );
  }
}
