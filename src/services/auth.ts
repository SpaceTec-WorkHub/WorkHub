import { apiRequest } from './api';

export type AuthUser = Record<string, unknown>;

export type AuthSession = {
  user: AuthUser;
  rememberMe: boolean;
};

const AUTH_STORAGE_KEY = 'workhub-auth-session';

function getStorage(rememberMe: boolean) {
  return rememberMe ? localStorage : sessionStorage;
}

export function getStoredSession(): AuthSession | null {
  const rawSession = localStorage.getItem(AUTH_STORAGE_KEY) ?? sessionStorage.getItem(AUTH_STORAGE_KEY);

  if (!rawSession) {
    return null;
  }

  try {
    return JSON.parse(rawSession) as AuthSession;
  } catch {
    clearSession();
    return null;
  }
}

export function isAuthenticated() {
  return getStoredSession() !== null;
}

export function saveSession(user: AuthUser, rememberMe: boolean) {
  const storage = getStorage(rememberMe);
  const session: AuthSession = { user, rememberMe };

  localStorage.removeItem(AUTH_STORAGE_KEY);
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
  storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
}

export async function login(email: string, password: string) {
  return apiRequest<{ message: string; user: AuthUser }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function getCurrentUserId() {
  const session = getStoredSession();
  const user = session?.user as { user_id?: number } | undefined;

  return user?.user_id ?? null;
}

export function isAdminUser() {
  const session = getStoredSession();
  const user = session?.user as { role?: { name?: string } } | undefined;

  return user?.role?.name?.toLowerCase() === 'admin';
}