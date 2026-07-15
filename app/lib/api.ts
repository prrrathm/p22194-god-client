import { authFetch } from "./auth";
import type { UserResponse } from "./auth";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const GOD_PREFIX = "/api/v1/god-svc";

export interface GeoLocation {
  city: string;
  region: string;
  country: string;
  country_code: string;
  lat: number;
  lon: number;
  isp: string;
  org: string;
}

export interface Session {
  id: string;
  user_id: string;
  token_hash: string;
  previous_token_hash: string;
  service: string;
  ip_address: string;
  user_agent: string;
  device_info: string;
  geo?: GeoLocation;
  is_active: boolean;
  expires_at: string;
  created_at: string;
  last_activity_at: string;
}

export interface ListSessionsResponse {
  sessions: Session[];
  total: number;
  page: number;
  limit: number;
}

export interface SessionsFilter {
  status?: string;
  service?: string;
  user_id?: string;
  ip?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export async function fetchSessions(filter: SessionsFilter, accessToken?: string): Promise<ListSessionsResponse> {
  const params = new URLSearchParams();
  if (filter.status) params.set("status", filter.status);
  if (filter.service) params.set("service", filter.service);
  if (filter.user_id) params.set("user_id", filter.user_id);
  if (filter.ip) params.set("ip", filter.ip);
  if (filter.from) params.set("from", filter.from);
  if (filter.to) params.set("to", filter.to);
  if (filter.page) params.set("page", String(filter.page));
  if (filter.limit) params.set("limit", String(filter.limit));

  const headers: Record<string, string> = {};
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  const res = await authFetch(`${API_BASE}${GOD_PREFIX}/api/sessions?${params}`, { headers });
  if (!res.ok) throw new Error(`Failed to fetch sessions: ${res.statusText}`);
  return res.json();
}

export async function fetchSession(id: string, accessToken?: string): Promise<Session> {
  const headers: Record<string, string> = {};
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  const res = await authFetch(`${API_BASE}${GOD_PREFIX}/api/sessions/${id}`, { headers });
  if (!res.ok) throw new Error(`Failed to fetch session: ${res.statusText}`);
  return res.json();
}

export async function loginUser(email: string, password: string): Promise<{
  access_token: string;
  refresh_token: string;
  session_token: string;
  expires_in: number;
}> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Login failed");
  }
  return res.json();
}

export async function registerUser(email: string, username: string, password: string): Promise<{
  access_token: string;
  refresh_token: string;
  session_token: string;
  expires_in: number;
}> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, username, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Registration failed");
  }
  return res.json();
}

export async function fetchMe(accessToken: string): Promise<UserResponse> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Failed to fetch user info");
  return res.json();
}

// ── Events ─────────────────────────────────────────────────────────────────

export interface Event {
  id: string;
  session_id: string;
  user_id: string;
  event_type: string;
  request_id: string;
  path: string;
  element: string;
  metadata: Record<string, unknown>;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

export interface ListEventsResponse {
  events: Event[];
  total: number;
  page: number;
  limit: number;
}

export interface EventsFilter {
  event_type?: string;
  session_id?: string;
  user_id?: string;
  service?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export async function fetchEvents(filter: EventsFilter, accessToken?: string): Promise<ListEventsResponse> {
  const params = new URLSearchParams();
  if (filter.event_type) params.set("event_type", filter.event_type);
  if (filter.session_id) params.set("session_id", filter.session_id);
  if (filter.user_id) params.set("user_id", filter.user_id);
  if (filter.service) params.set("service", filter.service);
  if (filter.from) params.set("from", filter.from);
  if (filter.to) params.set("to", filter.to);
  if (filter.page) params.set("page", String(filter.page));
  if (filter.limit) params.set("limit", String(filter.limit));

  const headers: Record<string, string> = {};
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  const res = await authFetch(`${API_BASE}${GOD_PREFIX}/api/events?${params}`, { headers });
  if (!res.ok) throw new Error(`Failed to fetch events: ${res.statusText}`);
  return res.json();
}

export async function fetchEvent(id: string, accessToken?: string): Promise<Event> {
  const headers: Record<string, string> = {};
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  const res = await authFetch(`${API_BASE}${GOD_PREFIX}/api/events/${id}`, { headers });
  if (!res.ok) throw new Error(`Failed to fetch event: ${res.statusText}`);
  return res.json();
}

// ── Services ────────────────────────────────────────────────────────────────

export async function fetchServices(accessToken?: string): Promise<string[]> {
  const headers: Record<string, string> = {};
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
  const res = await authFetch(`${API_BASE}${GOD_PREFIX}/api/services`, { headers });
  if (!res.ok) throw new Error(`Failed to fetch services: ${res.statusText}`);
  return res.json();
}

// ── Date Helpers ────────────────────────────────────────────────────────────

export function getCurrentWeekRange(): { from: string; to: string } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return {
    from: monday.toISOString(),
    to: sunday.toISOString(),
  };
}

export function formatDateForInput(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toISOString().slice(0, 10);
}

export function dateInputToISO(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00.000Z");
  return d.toISOString();
}

export function formatTimeShort(iso: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function truncateID(id: string): string {
  if (!id || id.length <= 12) return id || "-";
  return `${id.slice(0, 6)}...${id.slice(-4)}`;
}
