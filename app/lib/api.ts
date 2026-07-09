import type { UserResponse } from "./auth";

const API_BASE = typeof window !== "undefined"
  ? (window as any).__API_BASE__ || "http://localhost:8080"
  : "http://localhost:8080";

const API_BASE_GOD = typeof window !== "undefined"
  ? (window as any).__GOD_API_BASE__ || "http://localhost:8087"
  : "http://localhost:8087";

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

export async function fetchSessions(filter: SessionsFilter): Promise<ListSessionsResponse> {
  const params = new URLSearchParams();
  if (filter.status) params.set("status", filter.status);
  if (filter.service) params.set("service", filter.service);
  if (filter.user_id) params.set("user_id", filter.user_id);
  if (filter.ip) params.set("ip", filter.ip);
  if (filter.from) params.set("from", filter.from);
  if (filter.to) params.set("to", filter.to);
  if (filter.page) params.set("page", String(filter.page));
  if (filter.limit) params.set("limit", String(filter.limit));

  const res = await fetch(`${API_BASE_GOD}/api/sessions?${params}`);
  if (!res.ok) throw new Error(`Failed to fetch sessions: ${res.statusText}`);
  return res.json();
}

export async function fetchSession(id: string): Promise<Session> {
  const res = await fetch(`${API_BASE_GOD}/api/sessions/${id}`);
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
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export async function fetchEvents(filter: EventsFilter): Promise<ListEventsResponse> {
  const params = new URLSearchParams();
  if (filter.event_type) params.set("event_type", filter.event_type);
  if (filter.session_id) params.set("session_id", filter.session_id);
  if (filter.user_id) params.set("user_id", filter.user_id);
  if (filter.from) params.set("from", filter.from);
  if (filter.to) params.set("to", filter.to);
  if (filter.page) params.set("page", String(filter.page));
  if (filter.limit) params.set("limit", String(filter.limit));

  const res = await fetch(`${API_BASE_GOD}/api/events?${params}`);
  if (!res.ok) throw new Error(`Failed to fetch events: ${res.statusText}`);
  return res.json();
}

export async function fetchEvent(id: string): Promise<Event> {
  const res = await fetch(`${API_BASE_GOD}/api/events/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch event: ${res.statusText}`);
  return res.json();
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
