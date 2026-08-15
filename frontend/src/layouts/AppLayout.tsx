import { useEffect, useRef, useState } from "react";
import { NavLink, Navigate, Outlet } from "react-router-dom";
import { useMockAuth } from "../context/MockAuthContext";

const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
  `block px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
    isActive ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
  }`;

export default function AppLayout() {
  const { currentUser, logout } = useMockAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!currentUser) return <Navigate to="/login" replace />;

  // Volunteers have the same access as the Superintendent - both can view
  // the Students and Teachers management pages, unlike a plain teacher.
  const hasBroadAccess = currentUser.role === "superintendent" || currentUser.role === "volunteer";
  const roleLabel = currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-3 flex flex-wrap items-center gap-y-2 gap-x-3 justify-between">
          <div className="flex items-center gap-1 relative order-1" ref={menuRef}>
            <NavLink to="/" end className={navLinkClasses}>
              Dashboard
            </NavLink>
            <button
              onClick={() => setMenuOpen((open) => !open)}
              className="p-2 rounded-md text-slate-500 hover:bg-slate-100"
              aria-label="More navigation options"
              aria-expanded={menuOpen}
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {menuOpen && (
              <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-slate-200 rounded-md shadow-lg py-1 z-10">
                <NavLink to="/mark-attendance" className={navLinkClasses} onClick={() => setMenuOpen(false)}>
                  Attendance
                </NavLink>
                {hasBroadAccess && (
                  <>
                    <NavLink to="/students" className={navLinkClasses} onClick={() => setMenuOpen(false)}>
                      Students
                    </NavLink>
                    <NavLink to="/teachers" className={navLinkClasses} onClick={() => setMenuOpen(false)}>
                      Teachers
                    </NavLink>
                  </>
                )}
              </div>
            )}
          </div>

          <span className="order-3 sm:order-2 w-full sm:w-auto text-center font-semibold text-slate-800 text-sm sm:text-base sm:whitespace-nowrap">
            Sunday School Attendance
          </span>

          <div className="order-2 sm:order-3 flex items-center gap-2 sm:gap-3">
            <div className="flex flex-col items-end leading-tight">
              <span className="text-xs sm:text-sm text-slate-500 truncate max-w-[8rem] sm:max-w-none">
                {currentUser.fullName}
              </span>
              <span className="text-xs text-gray-600">({roleLabel})</span>
            </div>
            <button onClick={logout} className="text-xs sm:text-sm text-blue-600 hover:underline whitespace-nowrap">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <Outlet />
      </main>
    </div>
  );
}
