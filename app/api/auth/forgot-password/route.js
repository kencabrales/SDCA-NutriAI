import { NextResponse } from 'next/server';
import { createHash, randomBytes } from 'node:crypto';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/User';

export const runtime = 'nodejs';

const GENERIC_MESSAGE = 'If an account with that email exists, a password reset link will be sent shortly.';

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

export async function POST(request) {
  try {
    const { email } = await request.json();
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!normalizedEmail || normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
    }

    // Return the same configuration response for every address, before looking
    // up an account, so deployment setup does not disclose account existence.
    if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
      return NextResponse.json(
        { error: 'Password reset email is not configured yet. Please contact the administrator.' },
        { status: 503 }
      );
    }

    await dbConnect();
    const user = await User.findOne({ email: normalizedEmail }).select('_id email firstName passwordResetRequestedAt');

    if (!user) {
      return NextResponse.json({ message: GENERIC_MESSAGE });
    }

    const now = new Date();
    const lastRequestedAt = user.passwordResetRequestedAt ? new Date(user.passwordResetRequestedAt).getTime() : 0;
    if (lastRequestedAt && now.getTime() - lastRequestedAt < 60_000) {
      return NextResponse.json({ message: GENERIC_MESSAGE });
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000);
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          passwordResetTokenHash: sha256(token),
          passwordResetExpiresAt: expiresAt,
          passwordResetRequestedAt: now,
        },
      }
    );

    const appUrl = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin).replace(/\/+$/, '');
    const resetUrl = appUrl + '/reset-password?token=' + encodeURIComponent(token);
    const safeName = String(user.firstName || 'there').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[char]));

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + process.env.RESEND_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [normalizedEmail],
        subject: 'Reset your NutriAI password',
        html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033;max-width:560px;margin:0 auto"><h2>Reset your NutriAI password</h2><p>Hello ${safeName},</p><p>We received a request to reset your NutriAI password. This link expires in 30 minutes and can only be used once.</p><p><a href="${resetUrl}" style="display:inline-block;background:#00A86B;color:white;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Reset password</a></p><p>If you did not request this, you can ignore this email. Your password will not change.</p></div>`,
      }),
    });

    if (!emailResponse.ok) {
      const providerDetails = await emailResponse.text().catch(() => '');
      console.error('NutriAI password reset email failed:', emailResponse.status, providerDetails.slice(0, 500));
      // Keep the response generic so the endpoint does not reveal whether an
      // account exists when the email provider has an outage.
    }

    return NextResponse.json({ message: GENERIC_MESSAGE });
  } catch (error) {
    console.error('Forgot password request failed:', error);
    return NextResponse.json({ error: 'Unable to process the password reset request right now.' }, { status: 500 });
  }
}
