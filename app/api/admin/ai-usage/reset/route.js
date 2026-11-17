import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/User';
import AIUsageEvent from '@/lib/AIUsageEvent';

export async function DELETE(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'Admin user is required.' }, { status: 400 });

    const admin = await User.findById(userId).select('role isAdmin').lean();
    if (!admin || !(admin.role === 'admin' || admin.isAdmin === true)) {
      return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
    }

    const result = await AIUsageEvent.deleteMany({});
    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount || 0,
      message: 'Stored AI monitoring events were cleared. Google Gemini quotas were not changed.',
    });
  } catch (error) {
    console.error('AI usage reset error:', error);
    return NextResponse.json({ error: 'Unable to reset AI monitoring history.' }, { status: 500 });
  }
}
