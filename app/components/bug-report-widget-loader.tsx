"use client";

import dynamic from "next/dynamic";

const BugReportWidget = dynamic(() => import("./bug-report-widget"), {
  ssr: false,
});

function BugReportWidgetLoader(): JSX.Element {
  return <BugReportWidget />;
}

export default BugReportWidgetLoader;
