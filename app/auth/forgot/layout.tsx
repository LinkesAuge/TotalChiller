import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Reset Your Password",
  description:
    "Request a password reset link for your TotalChiller account. We will send you an email with instructions to regain access to The Chillers community hub.",
  alternates: { canonical: "/auth/forgot" },
};

/** Layout wrapper providing metadata for the forgot password page. */
function ForgotPasswordLayout({ children }: { readonly children: ReactNode }): JSX.Element {
  return <>{children}</>;
}

export default ForgotPasswordLayout;
