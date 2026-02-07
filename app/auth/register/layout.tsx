import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Create Your Account",
  description:
    "Create a TotalChiller account to join The Chillers Total Battle clan. Access chest tracking, event coordination, and analytics charts.",
  alternates: { canonical: "/auth/register" },
};

/** Layout wrapper providing metadata for the registration page. */
function RegisterLayout({ children }: { readonly children: ReactNode }): JSX.Element {
  return <>{children}</>;
}

export default RegisterLayout;
