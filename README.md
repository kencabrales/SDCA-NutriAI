This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to see the result.

## Password reset email configuration

Password reset emails are sent through Gmail SMTP using Nodemailer. Configure these server-side environment variables in local `.env.local` and in the deployment environment:

- `GMAIL_USER`: the Gmail account used to send NutriAI password-reset emails.
- `GMAIL_APP_PASSWORD`: a Google App Password generated for that Gmail account. Keep it secret; never commit it or expose it with a `NEXT_PUBLIC_` prefix.
- `APP_URL`: the public origin of the deployment. For local testing, use `http://localhost:3000`. For a Vercel preview, the request URL is used automatically when this variable is omitted.

To generate a Gmail App Password, enable 2-Step Verification on the Google account and create an app password at https://myaccount.google.com/apppasswords. Nodemailer connects to Gmail SMTP over TLS on port 465.

Password reset links expire after 30 minutes and are single-use. The application stores only a hash of each reset token. If SMTP delivery fails, the token is invalidated and a sanitized diagnostic is written to the server log.

## Password requirements

New passwords must be 8–128 characters long and contain at least one uppercase letter and one number. Special characters are optional. Passwords are stored using bcrypt. Existing legacy plaintext-password accounts are upgraded to bcrypt hashes after a successful login.
