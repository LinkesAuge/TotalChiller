import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your account security, identity, and notification preferences.",
};

/** Layout wrapper providing metadata for the settings page. */
function SettingsLayout({ children }: { readonly children: ReactNode }): JSX.Element {
  return <>{children}</>;
}

export default SettingsLayout;
