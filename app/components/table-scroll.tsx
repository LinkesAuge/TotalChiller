"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface TableScrollProps {
  readonly children: ReactNode;
  readonly className?: string;
}

function TableScroll({ children, className }: TableScrollProps): JSX.Element {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const topRef = useRef<HTMLDivElement | null>(null);
  const topInnerRef = useRef<HTMLDivElement | null>(null);
  const [shouldShowTopScroll, setShouldShowTopScroll] = useState<boolean>(false);

  useEffect(() => {
    if (!bottomRef.current || !topInnerRef.current) {
      return;
    }
    function syncWidth(): void {
      if (!bottomRef.current || !topInnerRef.current) {
        return;
      }
      topInnerRef.current.style.width = `${bottomRef.current.scrollWidth}px`;
      const hasOverflow = bottomRef.current.scrollWidth > bottomRef.current.clientWidth + 1;
      setShouldShowTopScroll(hasOverflow);
    }
    syncWidth();
    const observer = new ResizeObserver(syncWidth);
    observer.observe(bottomRef.current);
    window.addEventListener("resize", syncWidth);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncWidth);
    };
  }, []);

  function handleTopScroll(): void {
    if (!bottomRef.current || !topRef.current) {
      return;
    }
    bottomRef.current.scrollLeft = topRef.current.scrollLeft;
  }

  function handleBottomScroll(): void {
    if (!bottomRef.current || !topRef.current) {
      return;
    }
    topRef.current.scrollLeft = bottomRef.current.scrollLeft;
  }

  const classes = ["table-scroll", className].filter(Boolean).join(" ");
  const topScrollClasses = ["table-scroll", "top-scroll", shouldShowTopScroll ? "" : "is-hidden"]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <div className={topScrollClasses} ref={topRef} onScroll={handleTopScroll}>
        <div ref={topInnerRef} />
      </div>
      <div className={classes} ref={bottomRef} onScroll={handleBottomScroll}>
        {children}
      </div>
    </>
  );
}

export default TableScroll;
