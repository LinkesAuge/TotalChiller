"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";

import type { NotificationRow, NotificationPrefs } from "@/lib/types/domain";

const POLL_INTERVAL_MS = 60_000;

const TYPE_ROUTES: Record<string, string> = {
  message: "/messages",
  news: "/news",
  event: "/events",
  approval: "/profile",
};

/**
 * Returns a human-readable "time ago" string using translation keys.
 */
function formatTimeAgo(dateString: string, t: ReturnType<typeof useTranslations>, locale: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffSeconds = Math.floor((now - then) / 1000);
  if (diffSeconds < 60) {
    return t("justNow");
  }
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return t("minutesAgo", { count: diffMinutes });
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return t("hoursAgo", { count: diffHours });
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return t("daysAgo", { count: diffDays });
  }
  return new Date(dateString).toLocaleDateString(locale);
}

/**
 * Returns an SVG icon for the notification type.
 */
function getTypeIcon(type: string): JSX.Element {
  if (type === "message") {
    return (
      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M2 3h12v8H4l-2 2V3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    );
  }
  if (type === "news") {
    return (
      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <line x1="5" y1="5" x2="11" y2="5" stroke="currentColor" strokeWidth="1.5" />
        <line x1="5" y1="8" x2="11" y2="8" stroke="currentColor" strokeWidth="1.5" />
        <line x1="5" y1="11" x2="9" y2="11" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }
  if (type === "event") {
    return (
      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <line x1="5" y1="2" x2="5" y2="5" stroke="currentColor" strokeWidth="1.5" />
        <line x1="11" y1="2" x2="11" y2="5" stroke="currentColor" strokeWidth="1.5" />
        <line x1="2" y1="7" x2="14" y2="7" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
      <line x1="8" y1="5" x2="8" y2="9" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8" cy="11.5" r="0.75" fill="currentColor" />
    </svg>
  );
}

/**
 * Bell icon with unread count badge and a dropdown panel showing recent notifications.
 */
function NotificationBell(): JSX.Element {
  const t = useTranslations("notificationBell");
  const locale = useLocale();
  const router = useRouter();
  const [notifications, setNotifications] = useState<readonly NotificationRow[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    messages_enabled: true,
    news_enabled: true,
    events_enabled: true,
    system_enabled: true,
  });
  const panelRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async (): Promise<void> => {
    const response = await fetch("/api/notifications");
    if (response.ok) {
      const result = await response.json();
      setNotifications(result.data ?? []);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
    const interval = setInterval(() => {
      void loadNotifications();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    async function loadPrefs(): Promise<void> {
      const response = await fetch("/api/notification-settings");
      if (response.ok) {
        const result = await response.json();
        if (result.data) {
          setPrefs(result.data);
        }
      }
    }
    void loadPrefs();
  }, [isOpen]);

  async function handleTogglePref(key: keyof NotificationPrefs): Promise<void> {
    const nextValue = !prefs[key];
    setPrefs((current) => ({ ...current, [key]: nextValue }));
    const response = await fetch("/api/notification-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: nextValue }),
    });
    if (!response.ok) {
      setPrefs((current) => ({ ...current, [key]: !nextValue }));
    }
    void loadNotifications();
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.is_read).length,
    [notifications],
  );

  async function handleMarkAllRead(): Promise<void> {
    await fetch("/api/notifications/mark-all-read", { method: "POST" });
    setNotifications((current) => current.map((notification) => ({ ...notification, is_read: true })));
  }

  async function handleClickNotification(notification: NotificationRow): Promise<void> {
    if (!notification.is_read) {
      await fetch(`/api/notifications/${notification.id}`, { method: "PATCH" });
      setNotifications((current) =>
        current.map((item) => (item.id === notification.id ? { ...item, is_read: true } : item)),
      );
    }
    setIsOpen(false);
    const route = TYPE_ROUTES[notification.type] ?? "/messages";
    router.push(route);
  }

  return (
    <div className="notification-bell" ref={panelRef}>
      <button
        type="button"
        className="notification-bell__trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={unreadCount > 0 ? t("ariaLabelUnread", { count: unreadCount }) : t("ariaLabel")}
      >
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path
            d="M10 2a5 5 0 0 0-5 5v3l-1.5 2.5h13L15 10V7a5 5 0 0 0-5-5z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d="M8 16a2 2 0 1 0 4 0" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        {unreadCount > 0 ? (
          <span className="notification-bell__badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
        ) : null}
      </button>
      {isOpen ? (
        <div className="notification-bell__panel">
          <div className="notification-bell__header">
            <strong>{t("title")}</strong>
            <div className="notification-bell__header-actions">
              {unreadCount > 0 ? (
                <button type="button" className="notification-bell__mark-read" onClick={handleMarkAllRead}>
                  {t("markAllRead")}
                </button>
              ) : null}
              <button
                type="button"
                className="notification-bell__gear"
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                aria-label={t("settingsAriaLabel")}
              >
                <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
                  <path
                    d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  />
                </svg>
              </button>
            </div>
          </div>
          {isSettingsOpen ? (
            <div className="notification-bell__settings">
              <div className="notification-bell__setting-row">
                <span>{t("messages")}</span>
                <label className="toggle-switch toggle-switch--sm">
                  <input
                    type="checkbox"
                    checked={prefs.messages_enabled}
                    onChange={() => handleTogglePref("messages_enabled")}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>
              <div className="notification-bell__setting-row">
                <span>{t("news")}</span>
                <label className="toggle-switch toggle-switch--sm">
                  <input
                    type="checkbox"
                    checked={prefs.news_enabled}
                    onChange={() => handleTogglePref("news_enabled")}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>
              <div className="notification-bell__setting-row">
                <span>{t("events")}</span>
                <label className="toggle-switch toggle-switch--sm">
                  <input
                    type="checkbox"
                    checked={prefs.events_enabled}
                    onChange={() => handleTogglePref("events_enabled")}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>
              <div className="notification-bell__setting-row">
                <span>{t("system")}</span>
                <label className="toggle-switch toggle-switch--sm">
                  <input
                    type="checkbox"
                    checked={prefs.system_enabled}
                    onChange={() => handleTogglePref("system_enabled")}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>
            </div>
          ) : null}
          <div className="notification-bell__list">
            {notifications.length === 0 ? (
              <div className="notification-bell__empty">{t("noNotifications")}</div>
            ) : (
              notifications.slice(0, 20).map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  className={`notification-bell__item ${notification.is_read ? "" : "unread"}`}
                  onClick={() => handleClickNotification(notification)}
                >
                  <span className="notification-bell__icon">{getTypeIcon(notification.type)}</span>
                  <div className="notification-bell__content">
                    <div className="notification-bell__title">{notification.title}</div>
                    {notification.body ? <div className="notification-bell__body">{notification.body}</div> : null}
                  </div>
                  <span className="notification-bell__time">{formatTimeAgo(notification.created_at, t, locale)}</span>
                </button>
              ))
            )}
          </div>
          <a className="notification-bell__footer" href="/messages">
            {t("viewAllMessages")}
          </a>
        </div>
      ) : null}
    </div>
  );
}

export default NotificationBell;
