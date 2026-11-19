import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/User';
import { getPasswordPolicyError, hashPassword } from '@/lib/passwords';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const { token, password } = await request.json();
    const passwordError = getPasswordPolicyError(password);
    if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/i.test(token)) {
      return NextResponse.json({ error: 'This password reset link is invalid or has expired.' }, { status: 400 });
    }

    await dbConnect();
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const passwordHash = await hashPassword(password);
    const updatedUser = await User.findOneAndUpdate(
      {
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: { $gt: new Date() },
      },
      {
        $set: { password: passwordHash, passwordChangedAt: new Date() },
        $unset: {
          passwordResetTokenHash: 1,
          passwordResetExpiresAt: 1,
          passwordResetRequestedAt: 1,
        },
      },
      { new: true }
    ).select('_id');

    if (!updatedUser) {
      return NextResponse.json({ error: 'This password reset link is invalid or has expired.' }, { status: 400 });
    }

    return NextResponse.json({ message: 'Your password has been reset. You can now sign in with your new password.' });
  } catch (error) {
    console.error('Password reset failed:', error);
    return NextResponse.json({ error: 'Unable to reset your password right now.' }, { status: 500 });
  }
}
