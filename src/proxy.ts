import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  // Protect everything except for api, _next/static, _next/image, favicon.ico, and the login page itself
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login).*)"],
};
