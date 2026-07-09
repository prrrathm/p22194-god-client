import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("sessions", "routes/sessions.tsx"),
  route("events", "routes/events.tsx"),
  route("login", "routes/login.tsx"),
] satisfies RouteConfig;
