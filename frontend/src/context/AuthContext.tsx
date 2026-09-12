import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Teacher } from "../types/domain";
import { useTeachers } from "../api/hooks";
import { deleteCookie, getCookie, setCookie } from "../utils/cookies";

// Real auth, backed by the backend's teacher list. The backend's own
// POST /login only ever returns the *first* name match, which breaks the
// "which section do you belong to" disambiguation the login screen needs
// for teachers who share a name (see mocks data's Grace Peters comment,
// preserved in this app's seed data) - so matching happens here instead,
// against the full teacher list already fetched for the app. Revisit this
// once /login itself returns every match.

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

interface AuthContextValue {
  currentUser: Teacher | null;
  teachersLoading: boolean;
  teachersError: string | null;
  findMatches: (name: string) => Teacher[];
  login: (teacherId: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: teachers, loading: teachersLoading, error: teachersError } = useTeachers();
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => readSession()?.teacherId ?? null);
  const currentUser = teachers.find((t) => t.id === currentUserId) ?? null;
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
    return teachers.filter((t) => t.fullName.trim().toLowerCase() === normalized);
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
    <AuthContext.Provider value={{ currentUser, teachersLoading, teachersError, findMatches, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
