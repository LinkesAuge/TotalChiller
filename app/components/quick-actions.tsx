import Link from "next/link";

interface QuickAction {
  readonly label: string;
  readonly href: string;
  readonly iconPath: string;
}

const QUICK_ACTIONS: readonly QuickAction[] = [
  {
    label: "Upload CSV",
    href: "/data-import",
    iconPath: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12",
  },
  {
    label: "Review Rules",
    href: "/admin?tab=validation",
    iconPath: "M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z",
  },
  {
    label: "Events Calendar",
    href: "/events",
    iconPath: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  },
];

/**
 * Shared quick-action strip used across dashboard-style sections.
 */
function QuickActions(): JSX.Element {
  return (
    <div className="quick-actions-bar" aria-label="Quick actions">
      {QUICK_ACTIONS.map((action) => (
        <Link key={action.label} href={action.href} className="action-btn">
          <img src="/assets/vip/backs_1.png" alt="" className="leather-bg" width={200} height={40} />
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#e4c778"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d={action.iconPath} />
          </svg>
          <span>{action.label}</span>
        </Link>
      ))}
    </div>
  );
}

export default QuickActions;
