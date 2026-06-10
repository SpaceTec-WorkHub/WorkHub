import { apiRequest } from './api';

export type AuthUser = Record<string, unknown>;

export type AuthSession = {
  user: AuthUser;
  rememberMe: boolean;
};

export type RegisterBasicUserInput = {
  full_name: string;
  email: string;
  password: string;
  user_type?: 'internal' | 'external';
  status?: 'active' | 'inactive';
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

export async function requestPasswordReset(email: string) {
  return apiRequest<{ message: string }>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(
  email: string,
  code: string,
  newPassword: string,
  confirmPassword: string,
) {
  return apiRequest<{ message: string }>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({
      email,
      code,
      new_password: newPassword,
      confirm_password: confirmPassword,
    }),
  });
}

export async function registerBasicUser(input: RegisterBasicUserInput) {
  return apiRequest<AuthUser>('/users', {
    method: 'POST',
    body: JSON.stringify({
      ...input,
      user_type: input.user_type ?? 'internal',
      status: input.status ?? 'active',
    }),
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