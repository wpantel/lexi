"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SettingsIcon, TodayIcon, WordsIcon } from "./Icons";

const items = [
  { href: "/", label: "Today", Icon: TodayIcon },
  { href: "/words", label: "Words", Icon: WordsIcon },
  { href: "/settings", label: "Settings", Icon: SettingsIcon },
];

const SESSION_ROUTES = ["/learn", "/review", "/practice"];

export function Nav() {
  const pathname = usePathname();
  // Study sessions are focused, full-screen tasks with their own way out.
  if (SESSION_ROUTES.some((r) => pathname.startsWith(r))) return null;
  return (
    <nav className="nav" aria-label="Main">
      <div className="nav-inner">
        <Link href="/" className="brand">
          <span className="brand-mark" lang="ko" aria-hidden="true">
            <i>렉</i>
            <i>시</i>
          </span>
          Lexi
        </Link>
        <div className="nav-links">
          {items.map(({ href, label, Icon }) => (
            <Link key={href} href={href} className="nav-link" aria-current={pathname === href ? "page" : undefined}>
              <Icon />
              {label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
