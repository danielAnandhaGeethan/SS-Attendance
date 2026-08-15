import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Teacher } from "../types/domain";
import { mockTeachers } from "../mocks/data";
import { deleteCookie, getCookie, setCookie } from "../utils/cookies";

// Stand-in for real Supabase Auth + backend session lookup. The real
// version will authenticate via Supabase Auth and look up the matching
// teachers row; this mock instead matches by name against the mock data,
// since no backend/login flow exists yet. Replace once the backend is
// wired up.

// Session cookie: stores { teacherId, expiresAt } so a page reload can
// restore the logged-in user, and self-expires 15 minutes after login
// regardless of activity (no sliding renewal).
const SESSION_COOKIE = "session";
const SESSION_DURATION_MS = 15 * 60 * 1000;

interface StoredSession {
  teacherId: string;
  expiresAt: number;
}

function readSession(): StoredSession | null {
  const raw = getCookie(SESSION_COOKIE);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredSession;
    if (typeof parsed.teacherId !== "string" || typeof parsed.expiresAt !== "number") return null;
    if (parsed.expiresAt <= Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

interface MockAuthContextValue {
  currentUser: Teacher | null;
  findMatches: (name: string) => Teacher[];
  login: (teacherId: string) => void;
  logout: () => void;
}

const MockAuthContext = createContext<MockAuthContextValue | null>(null);

export function MockAuthProvider({ children }: { children: ReactNode }) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => readSession()?.teacherId ?? null);
  const currentUser = mockTeachers.find((t) => t.id === currentUserId) ?? null;
  const expiryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearExpiryTimer() {
    if (expiryTimer.current !== null) {
      clearTimeout(expiryTimer.current);
      expiryTimer.current = null;
    }
  }

  function scheduleExpiry(msFromNow: number) {
    clearExpiryTimer();
    expiryTimer.current = setTimeout(() => {
      deleteCookie(SESSION_COOKIE);
      setCurrentUserId(null);
    }, msFromNow);
  }

  // On mount, resume any still-valid session's countdown to logout.
  useEffect(() => {
    const session = readSession();
    if (session) {
      scheduleExpiry(session.expiresAt - Date.now());
    }
    return clearExpiryTimer;
  }, []);

  function findMatches(name: string): Teacher[] {
    const normalized = name.trim().toLowerCase();
    if (!normalized) return [];
    return mockTeachers.filter((t) => t.fullName.trim().toLowerCase() === normalized);
  }

  function login(teacherId: string) {
    const expiresAt = Date.now() + SESSION_DURATION_MS;
    setCookie(SESSION_COOKIE, JSON.stringify({ teacherId, expiresAt }), SESSION_DURATION_MS / 1000);
    scheduleExpiry(SESSION_DURATION_MS);
    setCurrentUserId(teacherId);
  }

  function logout() {
    clearExpiryTimer();
    deleteCookie(SESSION_COOKIE);
    setCurrentUserId(null);
  }

  return (
    <MockAuthContext.Provider value={{ currentUser, findMatches, login, logout }}>
      {children}
    </MockAuthContext.Provider>
  );
}

export function useMockAuth() {
  const ctx = useContext(MockAuthContext);
  if (!ctx) throw new Error("useMockAuth must be used within MockAuthProvider");
  return ctx;
}
