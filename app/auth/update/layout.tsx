import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Update Password",
  description: "Set a new password for your [THC] Chiller & Killer account.",
};

/** Layout wrapper providing metadata for the password update page. */
function UpdatePasswordLayout({ children }: { readonly children: ReactNode }): JSX.Element {
  return <>{children}</>;
}

export default UpdatePasswordLayout;
