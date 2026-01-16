import { NextAuthOptions, getServerSession as getServerSessionBase } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { connectDB, User, type UserRole } from '@tds/database';
import { cookies } from 'next/headers';

// Extend the session types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string;
      role: UserRole;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: UserRole;
  }
}

const ALLOWED_DOMAIN = 'thedigitalstride.co.uk';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      // Only allow @thedigitalstride.co.uk emails
      const email = user.email?.toLowerCase();
      if (!email || !email.endsWith(`@${ALLOWED_DOMAIN}`)) {
        return false;
      }
      return true;
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        await connectDB();

        // Find or create user in database
        let dbUser = await User.findOne({ email: user.email?.toLowerCase() });

        if (!dbUser) {
          // First user becomes admin, rest are regular users
          const userCount = await User.countDocuments();
          dbUser = await User.create({
            email: user.email?.toLowerCase(),
            name: user.name,
            image: user.image,
            role: userCount === 0 ? 'admin' : 'user',
          });
        } else if (trigger === 'signIn') {
          // Update user info on sign in
          dbUser.name = user.name || dbUser.name;
          dbUser.image = user.image || dbUser.image;
          await dbUser.save();
        }

        token.id = dbUser._id.toString();
        token.role = dbUser.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
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
  },
};

// Wrapper for getServerSession that ensures request context is established
// This fixes Next.js 15 + Turbopack "cookies/headers called outside request scope" errors
export async function getServerSession() {
  // Access cookies first to ensure request context is established
  await cookies();
  return getServerSessionBase(authOptions);
}
