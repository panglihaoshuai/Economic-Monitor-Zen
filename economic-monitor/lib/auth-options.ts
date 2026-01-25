import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { supabaseAdmin } from './supabase';
import type { Database } from './database.types';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;

      // Check if user exists, if not create them
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', user.email)
        .single();

      if (!existingUser) {
        await supabaseAdmin.from('users').insert({
          id: user.id,
          email: user.email!,
          name: user.name,
          image: user.image,
          language: 'zh',
          risk_tolerance: 'moderate',
        } as Database['public']['Tables']['users']['Insert']);

        // Initialize default indicators for new user
        try {
          await supabaseAdmin.rpc('initialize_user_indicators', {
            user_id: user.id,
          });
        } catch (e) {
          // RPC might not exist, continue without it
          console.warn('initialize_user_indicators RPC not found');
        }
      } else {
        // Update user info
        await supabaseAdmin
          .from('users')
          .update({
            name: user.name,
            image: user.image,
          } as Partial<Database['public']['Tables']['users']['Update']>)
          .eq('id', user.id);
      }

      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
      }
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};
