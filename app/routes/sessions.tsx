import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate } from "react-router";
import type { Route } from "./+types/sessions";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import { Sidebar } from "~/components/sidebar";
import {
  fetchSessions,
  formatTimeShort,
  truncateID,
  type ListSessionsResponse,
  type Session,
  type SessionsFilter,
} from "~/lib/api";
import { useAuth } from "~/lib/auth";
import { cn } from "~/lib/utils";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Sessions | God Console" },
    { name: "description", content: "Monitor and manage user sessions" },
  ];
}

const KNOWN_SERVICES = ["users", "find-my-trip", "kitchen"];

export default function SessionsPage() {
  const { user, accessToken, isLoading: authLoading } = useAuth();

  const [data, setData] = useState<ListSessionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 });

  const filtersRef = useRef(columnFilters);
  filtersRef.current = columnFilters;

  const loadSessions = useCallback(async (pageNum?: number) => {
    setLoading(true);
    setError(null);
    try {
      const filter: SessionsFilter = { page: pageNum ?? 1, limit: 25 };
      const currentFilters = filtersRef.current;
      const statusFilter = currentFilters.find((f: { id: string }) => f.id === "is_active");
      if (statusFilter) filter.status = String(statusFilter.value);
      const svcFilter = currentFilters.find((f: { id: string }) => f.id === "service");
      if (svcFilter) filter.service = String(svcFilter.value);
      const uidFilter = currentFilters.find((f: { id: string }) => f.id === "user_id");
      if (uidFilter) filter.user_id = String(uidFilter.value);
      const ipFilter = currentFilters.find((f: { id: string }) => f.id === "ip_address");
      if (ipFilter) filter.ip = String(ipFilter.value);

      const result = await fetchSessions(filter, accessToken ?? undefined);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  // initial load + re-fetch when filters change
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
    } else {
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }
    loadSessions(1);
  }, [columnFilters, loadSessions]);

  const currentPage = pagination.pageIndex + 1;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  const handlePageChange = useCallback((page: number) => {
    setPagination((prev) => ({ ...prev, pageIndex: page - 1 }));
    loadSessions(page);
  }, [loadSessions]);

  if (authLoading) return null;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto pl-60">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Sessions</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Monitor and manage user sessions across all services
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => loadSessions(currentPage)} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>

          <SessionsFilter
            columnFilters={columnFilters}
            setColumnFilters={setColumnFilters}
          />

          {error && (
            <div className="rounded-md border border-border bg-muted/50 px-4 py-3 text-sm text-foreground">
              {error}
            </div>
          )}

          {data && (
            <p className="text-sm text-muted-foreground">
              {data.total} session{data.total !== 1 ? "s" : ""} found
              {data.page > 1 && ` (page ${data.page})`}
            </p>
          )}

          <SessionsTable
            data={data}
            loading={loading}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      </main>
    </div>
  );
}

// ── Filter Bar ──────────────────────────────────────────────────────────────

function SessionsFilter({
  columnFilters,
  setColumnFilters,
}: {
  columnFilters: ColumnFiltersState;
  setColumnFilters: React.Dispatch<React.SetStateAction<ColumnFiltersState>>;
}) {
  const upsertFilter = (id: string, value: string) => {
    setColumnFilters((prev: ColumnFiltersState) => {
      const filtered = prev.filter((f: { id: string }) => f.id !== id);
      if (value) return [...filtered, { id, value }];
      return filtered;
    });
  };

  const getFilter = (id: string) => (columnFilters.find((f) => f.id === id)?.value as string) || "";

  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Status</label>
            <Select
              value={getFilter("is_active")}
              onValueChange={(v) => upsertFilter("is_active", v === "all" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Service</label>
            <Select
              value={getFilter("service")}
              onValueChange={(v) => upsertFilter("service", v === "all" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Services" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Services</SelectItem>
                {KNOWN_SERVICES.map((svc) => (
                  <SelectItem key={svc} value={svc}>{svc}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">User ID</label>
            <Input
              placeholder="Filter by user ID..."
              value={getFilter("user_id")}
              onChange={(e) => upsertFilter("user_id", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">IP Address</label>
            <Input
              placeholder="Filter by IP..."
              value={getFilter("ip_address")}
              onChange={(e) => upsertFilter("ip_address", e.target.value)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Sessions Table ──────────────────────────────────────────────────────────

function SessionsTable({
  data,
  loading,
  currentPage,
  totalPages,
  onPageChange,
}: {
  data: ListSessionsResponse | null;
  loading: boolean;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const columns = useMemo<ColumnDef<Session>[]>(
    () => [
      {
        id: "expander",
        size: 40,
        cell: ({ row }) =>
          row.getCanExpand() ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => { e.stopPropagation(); row.toggleExpanded(); }}
            >
              {row.getIsExpanded() ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          ) : null,
      },
      {
        accessorKey: "id",
        header: "ID",
        cell: ({ row }) => (
          <span className="font-mono text-xs">{truncateID(row.original.id)}</span>
        ),
      },
      {
        accessorKey: "user_id",
        header: "User",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">{truncateID(row.original.user_id)}</span>
        ),
      },
      {
        accessorKey: "service",
        header: "Service",
        cell: ({ row }) => (
          <Badge variant="secondary" className="text-xs font-mono">
            {row.original.service || "users"}
          </Badge>
        ),
      },
      {
        accessorKey: "ip_address",
        header: "IP / Geo",
        cell: ({ row }) => {
          const s = row.original;
          const geoText = s.geo
            ? [s.geo.city, s.geo.country].filter(Boolean).join(", ") || s.geo.country_code
            : null;
          return (
            <div>
              <div className="text-xs">{s.ip_address || "-"}</div>
              {geoText && <div className="text-xs text-muted-foreground mt-0.5">{geoText}</div>}
            </div>
          );
        },
      },
      {
        accessorKey: "user_agent",
        header: "Device",
        cell: ({ row }) => {
          const ua = row.original.user_agent;
          return (
            <div className="text-xs truncate max-w-[160px]" title={ua}>
              {ua ? ua.split("/")[0] || ua.slice(0, 30) : "-"}
            </div>
          );
        },
      },
      {
        accessorKey: "created_at",
        header: "Created",
        cell: ({ row }) => (
          <span className="text-xs whitespace-nowrap text-muted-foreground">
            {formatTimeShort(row.original.created_at)}
          </span>
        ),
      },
      {
        accessorKey: "expires_at",
        header: "Expires",
        cell: ({ row }) => (
          <span className="text-xs whitespace-nowrap text-muted-foreground">
            {formatTimeShort(row.original.expires_at)}
          </span>
        ),
      },
      {
        accessorKey: "is_active",
        header: "Status",
        cell: ({ row }) => (
          <div className="flex justify-center">
            <Badge variant={row.original.is_active ? "default" : "secondary"} className="text-xs">
              {row.original.is_active ? "Active" : "Ended"}
            </Badge>
          </div>
        ),
      },
    ],
    [],
  );

  const paginationState = { pageIndex: currentPage - 1, pageSize: 25 };

  const table = useReactTable({
    data: data?.sessions ?? [],
    columns,
    pageCount: totalPages,
    state: { pagination: paginationState },
    onPaginationChange: (updater) => {
      const next = typeof updater === "function"
        ? updater(paginationState)
        : updater;
      onPageChange(next.pageIndex + 1);
    },
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => true,
    manualPagination: true,
  });

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b bg-muted/50">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-3 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider"
                    style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-12 text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
                    Loading sessions...
                  </div>
                </td>
              </tr>
            ) : table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <RowWithExpanded key={row.id} row={row} columns={columns} />
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-3 py-12 text-center text-muted-foreground">
                  No sessions found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Separator />
      <div className="flex items-center justify-between px-4 py-3">
        <div className="text-sm text-muted-foreground">
          {data
            ? `Showing ${(currentPage - 1) * 25 + 1}–${Math.min(currentPage * 25, data.total)} of ${data.total}`
            : ""}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            Next
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ── Expandable Row ──────────────────────────────────────────────────────────

function RowWithExpanded({
  row,
  columns,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  row: any;
  columns: ColumnDef<Session>[];
}) {
  return (
    <>
      <tr className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => row.toggleExpanded()}>
        {row.getVisibleCells().map((cell: any) => (
          <td key={cell.id} className="px-3 py-3">
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </td>
        ))}
      </tr>
      {row.getIsExpanded() && (
        <tr className="bg-muted/30">
          <td colSpan={columns.length} className="px-6 py-4">
            <ExpandedContent session={row.original} />
          </td>
        </tr>
      )}
    </>
  );
}

function ExpandedContent({ session }: { session: Session }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
      <div>
        <h4 className="font-semibold mb-2">Session Details</h4>
        <dl className="space-y-1">
          <Detail term="Session ID" desc={session.id} />
          <Detail term="User ID" desc={session.user_id} />
          <Detail term="Service" desc={session.service || "users"} />
          <Detail term="Token Hash" desc={truncateID(session.token_hash)} />
          {session.previous_token_hash && (
            <Detail term="Prev Token" desc={truncateID(session.previous_token_hash)} />
          )}
        </dl>
      </div>
      <div>
        <h4 className="font-semibold mb-2">Client Info</h4>
        <dl className="space-y-1">
          <Detail term="IP Address" desc={session.ip_address || "-"} />
          <Detail term="User Agent" desc={session.user_agent || "-"} />
          <Detail term="Device" desc={session.device_info || "-"} />
        </dl>
      </div>
      <div>
        <h4 className="font-semibold mb-2">Geolocation</h4>
        {session.geo ? (
          <dl className="space-y-1">
            <Detail term="City" desc={session.geo.city} />
            <Detail term="Region" desc={session.geo.region} />
            <Detail term="Country" desc={`${session.geo.country} (${session.geo.country_code})`} />
            <Detail term="Coordinates" desc={`${session.geo.lat.toFixed(4)}, ${session.geo.lon.toFixed(4)}`} />
            <Detail term="ISP" desc={session.geo.isp || "-"} />
            <Detail term="Org" desc={session.geo.org || "-"} />
          </dl>
        ) : (
          <p className="text-muted-foreground">Not available</p>
        )}
        <h4 className="font-semibold mt-3 mb-2">Timestamps</h4>
        <dl className="space-y-1">
          <Detail term="Created" desc={formatTimeShort(session.created_at)} />
          <Detail term="Expires" desc={formatTimeShort(session.expires_at)} />
          <Detail term="Last Activity" desc={session.last_activity_at ? formatTimeShort(session.last_activity_at) : "-"} />
        </dl>
      </div>
    </div>
  );
}

function Detail({ term, desc }: { term: string; desc: string }) {
  return (
    <div className="flex gap-2">
      <dt className="text-muted-foreground min-w-[80px]">{term}:</dt>
      <dd className="font-mono break-all">{desc}</dd>
    </div>
  );
}
