import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/User';
import { comparePassword, getPasswordPolicyError, hashPassword } from '@/lib/passwords';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const { userId, currentPassword, newPassword } = await request.json();
    if (typeof userId !== 'string' || !/^[a-f\d]{24}$/i.test(userId)) {
      return NextResponse.json({ error: 'A valid account is required.' }, { status: 400 });
    }
    if (typeof currentPassword !== 'string' || !currentPassword) {
      return NextResponse.json({ error: 'Enter your current password.' }, { status: 400 });
    }

    const passwordError = getPasswordPolicyError(newPassword);
    if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });

    await dbConnect();
    const user = await User.findById(userId).select('_id password');
    if (!user || !(await comparePassword(currentPassword, user.password))) {
      return NextResponse.json({ error: 'Your current password is incorrect.' }, { status: 400 });
    }
    if (await comparePassword(newPassword, user.password)) {
      return NextResponse.json({ error: 'Your new password must be different from your current password.' }, { status: 400 });
    }

    const passwordHash = await hashPassword(newPassword);
    await User.updateOne(
      { _id: user._id },
      {
        $set: { password: passwordHash, passwordChangedAt: new Date() },
        $unset: {
          passwordResetTokenHash: 1,
          passwordResetExpiresAt: 1,
          passwordResetRequestedAt: 1,
        },
      }
    );

    return NextResponse.json({ message: 'Your password has been changed successfully.' });
  } catch (error) {
    console.error('Change password failed:', error);
    return NextResponse.json({ error: 'Unable to change your password right now.' }, { status: 500 });
  }
}
