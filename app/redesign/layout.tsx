import type { ReactNode } from "react";

interface RedesignLayoutProps {
  readonly children: ReactNode;
}

/**
 * Layout for redesign preview pages.
 * Hides the main app sidebar and removes the grid layout
 * so each version can render as a standalone full-page experience.
 */
function RedesignLayout({ children }: RedesignLayoutProps): JSX.Element {
  return (
    <>
      <style>{`
        /* Override root layout for redesign routes */
        .layout { display: block !important; grid-template-columns: none !important; }
        .layout > .sidebar { display: none !important; }
        .layout > .content {
          margin-left: 0 !important;
          width: 100% !important;
          min-height: 100vh !important;
          padding: 0 !important;
          max-width: none !important;
          height: auto !important;
          overflow-x: hidden !important;
          overflow-y: visible !important;
        }
        .layout > .content > .app-footer { display: none !important; }
      `}</style>
      {children}
    </>
  );
}

export default RedesignLayout;
