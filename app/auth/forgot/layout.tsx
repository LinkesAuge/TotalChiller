import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Reset Your Password",
  description:
    "Request a password reset link for your [THC] Chiller & Killer account. We'll email you instructions to regain access to the [THC] Chiller & Killer community hub.",
  alternates: { canonical: "/auth/forgot" },
};

/** Layout wrapper providing metadata for the forgot password page. */
function ForgotPasswordLayout({ children }: { readonly children: ReactNode }): JSX.Element {
  return <>{children}</>;
}

export default ForgotPasswordLayout;
