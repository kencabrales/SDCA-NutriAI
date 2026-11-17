import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/User';
import AIUsageEvent from '@/lib/AIUsageEvent';
import AIUsageSetting from '@/lib/AIUsageSetting';

async function requireAdmin(userId) {
  if (!userId) return null;
  const admin = await User.findById(userId).select('role isAdmin').lean();
  return admin && (admin.role === 'admin' || admin.isAdmin === true) ? admin : null;
}

export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { userId, projectLabel, model, rpmLimit, tpmLimit, rpdLimit } = body || {};
    if (!(await requireAdmin(userId))) {
      return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
    }

    const cleanProject = String(projectLabel || '').trim().slice(0, 80);
    const cleanModel = String(model || '').trim().slice(0, 120);
    if (!cleanProject || !cleanModel) {
      return NextResponse.json({ error: 'Project label and model are required.' }, { status: 400 });
    }

    const parseLimit = (value) => {
      if (value === '' || value === null || value === undefined) return null;
      const number = Number(value);
      return Number.isFinite(number) && number > 0 ? Math.floor(number) : null;
    };
    const settings = await AIUsageSetting.findOneAndUpdate(
      { projectLabel: cleanProject, model: cleanModel },
      {
        $set: {
          rpmLimit: parseLimit(rpmLimit),
          tpmLimit: parseLimit(tpmLimit),
          rpdLimit: parseLimit(rpdLimit),
          updatedBy: userId,
        },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    ).lean();

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('AI usage settings update error:', error);
    return NextResponse.json({ error: 'Unable to save AI usage limits.' }, { status: 500 });
  }
}
