import Link from "next/link";

import { logout } from "./actions";
import DashboardTabs from "./DashboardTabs";

/** The dashboard's top bar: back to the site, the Overview and Calendar tabs, and sign out. */
export default function DashboardNav() {
  return (
    <>
      <nav className="eyebrow flex items-center justify-between">
        <Link href="/" className="link-draw">
          Studio L
        </Link>
        <span className="flex items-center gap-5">
          <Link href="/social" className="link-draw">
            Social
          </Link>
          <form action={logout}>
            <button type="submit" className="eyebrow link-draw">
              Sign out
            </button>
          </form>
        </span>
      </nav>
      <DashboardTabs />
    </>
  );
}
