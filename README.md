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

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


## Password reset email configuration

Password reset emails are sent through Resend. Configure these server-side environment variables in local `.env.local` and the deployment environment (for example, Vercel Project Settings):

- `RESEND_API_KEY`: Resend API key. Keep this secret; do not prefix it with `NEXT_PUBLIC_`.
- `EMAIL_FROM`: A sender address verified with Resend, for example `NutriAI <security@your-verified-domain.example>`.
- `APP_URL`: The public origin of this NutriAI deployment, for example `https://your-app.example`. This is used to build password-reset links.

Password reset links expire after 30 minutes and are single-use. The application stores only a hash of each reset token.

## Password requirements

New passwords must be 8–128 characters long and contain at least one uppercase letter and one number. Special characters are optional. Passwords are stored using bcrypt. Existing legacy plaintext-password accounts are upgraded to bcrypt hashes after a successful login.
