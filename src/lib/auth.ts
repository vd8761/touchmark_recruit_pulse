import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
const { verify } = require("otplib");

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        otp: { label: "OTP", type: "text" },
        setupSecret: { label: "Setup Secret", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing email or password");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { role: true }
        });

        if (!user || !user.password_hash) {
          throw new Error("Invalid credentials");
        }

        const isValid = await bcrypt.compare(credentials.password, user.password_hash);
        if (!isValid) {
          throw new Error("Invalid credentials");
        }

        if (user.status !== "Active") {
          throw new Error("Your account has been deactivated");
        }

        // --- 2FA Verification ---
        if (user.two_fa_method !== "NONE") {
          if (!credentials.otp) {
            throw new Error("2FA OTP required");
          }

          if (user.two_fa_method === "AUTHENTICATOR") {
            if (credentials.setupSecret) {
              // Verifying for the first time during setup
              const isValidOTP = await verify({ token: credentials.otp, secret: credentials.setupSecret });
              if (!isValidOTP.valid) {
                throw new Error("Invalid Authenticator code");
              }
              // Save it to the database now that it is verified!
              await prisma.user.update({
                where: { id: user.id },
                data: { two_fa_secret: credentials.setupSecret }
              });
            } else {
              // Normal login
              if (!user.two_fa_secret) {
                throw new Error("Authenticator not set up");
              }
              const isValidOTP = await verify({ token: credentials.otp, secret: user.two_fa_secret });
              if (!isValidOTP.valid) {
                throw new Error("Invalid Authenticator code");
              }
            }
          }

          if (user.two_fa_method === "EMAIL") {
            if (!user.email_otp || !user.email_otp_expiry) {
              throw new Error("No OTP generated");
            }
            if (user.email_otp !== credentials.otp) {
              throw new Error("Invalid email OTP");
            }
            if (new Date() > user.email_otp_expiry) {
              throw new Error("Email OTP has expired");
            }
            // Clear the OTP
            await prisma.user.update({
              where: { id: user.id },
              data: { email_otp: null, email_otp_expiry: null }
            });
          }
        }

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { last_login: new Date() }
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role.role_name,
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || "touchmark_super_secret_key_change_in_prod",
};
