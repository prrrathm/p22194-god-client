import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  route("login", "routes/login.tsx"),
  layout("routes/dashboard-layout.tsx", [
    index("routes/home.tsx"),
    route("sessions", "routes/sessions.tsx"),
    route("events", "routes/events.tsx"),
  ]),
] satisfies RouteConfig;
