// src/lib/auth.ts
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GithubProvider from "next-auth/providers/github";

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GithubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // You can integrate with your backend here
      if (account?.provider === 'google' || account?.provider === 'github') {
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/oauth-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: user.email,
              name: user.name,
              provider: account.provider,
              providerId: account.providerAccountId,
              accessToken: account.access_token,
            }),
          });
          
          if (response.ok) {
            return true;
          }
        } catch (error) {
          console.error('OAuth integration error:', error);
        }
      }
      return true;
    },
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.provider = account.provider;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        (session as any).accessToken = token.accessToken;
        (session as any).provider = token.provider;
      }
      return session;
    },
  },
  pages: {
    signIn: '/client/login',
    error: '/client/login',
  },
  debug: process.env.NODE_ENV === 'development',
});