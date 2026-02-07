import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Sign In to Your Account",
  description:
    "Sign in to your TotalChiller account to access The Chillers community hub. View clan stats, coordinate events, and track chest scores.",
  alternates: { canonical: "/auth/login" },
};

/** Layout wrapper providing metadata for the login page. */
function LoginLayout({ children }: { readonly children: ReactNode }): JSX.Element {
  return <>{children}</>;
}

export default LoginLayout;
