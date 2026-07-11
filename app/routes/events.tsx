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
import type { Route } from "./+types/events";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import { Sidebar } from "~/components/sidebar";
import {
  fetchEvents,
  formatTimeShort,
  truncateID,
  type Event,
  type EventsFilter,
  type ListEventsResponse,
} from "~/lib/api";
import { useAuth } from "~/lib/auth";
import { cn } from "~/lib/utils";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Events | God Console" },
    { name: "description", content: "Monitor user events across all services" },
  ];
}

const EVENT_TYPES = ["page-visit", "click"];

export default function EventsPage() {
  const { user, accessToken, isLoading: authLoading } = useAuth();

  const [data, setData] = useState<ListEventsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 });

  const filtersRef = useRef(columnFilters);
  filtersRef.current = columnFilters;

  const loadEvents = useCallback(async (pageNum?: number) => {
    setLoading(true);
    setError(null);
    try {
      const filter: EventsFilter = { page: pageNum ?? 1, limit: 25 };
      const currentFilters = filtersRef.current;
      const typeFilter = currentFilters.find((f) => f.id === "event_type");
      if (typeFilter) filter.event_type = String(typeFilter.value);
      const sidFilter = currentFilters.find((f) => f.id === "session_id");
      if (sidFilter) filter.session_id = String(sidFilter.value);

      const result = await fetchEvents(filter, accessToken ?? undefined);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load events");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
    } else {
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }
    loadEvents(1);
  }, [columnFilters, loadEvents]);

  const currentPage = pagination.pageIndex + 1;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  const handlePageChange = useCallback((page: number) => {
    setPagination((prev) => ({ ...prev, pageIndex: page - 1 }));
    loadEvents(page);
  }, [loadEvents]);

  if (authLoading) return null;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto pl-60">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Events</h1>
              <p className="text-sm text-muted-foreground mt-1">
                User events and interactions across all services
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => loadEvents(currentPage)} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>

          <EventsFilter
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
              {data.total} event{data.total !== 1 ? "s" : ""} found
              {data.page > 1 && ` (page ${data.page})`}
            </p>
          )}

          <EventsTable
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

function EventsFilter({
  columnFilters,
  setColumnFilters,
}: {
  columnFilters: ColumnFiltersState;
  setColumnFilters: React.Dispatch<React.SetStateAction<ColumnFiltersState>>;
}) {
  const upsertFilter = (id: string, value: string) => {
    setColumnFilters((prev) => {
      const filtered = prev.filter((f) => f.id !== id);
      if (value) return [...filtered, { id, value }];
      return filtered;
    });
  };

  const getFilter = (id: string) => (columnFilters.find((f) => f.id === id)?.value as string) || "";

  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Event Type</label>
            <Select
              value={getFilter("event_type")}
              onValueChange={(v) => upsertFilter("event_type", v === "all" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {EVENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Session ID</label>
            <Input
              placeholder="Filter by session ID..."
              value={getFilter("session_id")}
              onChange={(e) => upsertFilter("session_id", e.target.value)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Events Table ────────────────────────────────────────────────────────────

function EventsTable({
  data,
  loading,
  currentPage,
  totalPages,
  onPageChange,
}: {
  data: ListEventsResponse | null;
  loading: boolean;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const columns = useMemo<ColumnDef<Event>[]>(
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
        accessorKey: "event_type",
        header: "Type",
        cell: ({ row }) => (
          <Badge variant={row.original.event_type === "click" ? "secondary" : "default"} className="text-xs font-mono">
            {row.original.event_type}
          </Badge>
        ),
      },
      {
        accessorKey: "session_id",
        header: "Session",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.session_id ? truncateID(row.original.session_id) : "-"}
          </span>
        ),
      },
      {
        accessorKey: "path",
        header: "Path",
        cell: ({ row }) => (
          <div className="text-xs truncate max-w-[200px]" title={row.original.path}>
            {row.original.event_type === "page-visit" ? (row.original.path || "-") : "-"}
          </div>
        ),
      },
      {
        accessorKey: "element",
        header: "Element",
        cell: ({ row }) => (
          <div className="text-xs truncate max-w-[160px]" title={row.original.element}>
            {row.original.event_type === "click" && row.original.element ? (
              <Badge variant="outline" className="text-xs font-mono">{row.original.element}</Badge>
            ) : "-"}
          </div>
        ),
      },
      {
        accessorKey: "ip_address",
        header: "IP",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">{row.original.ip_address || "-"}</span>
        ),
      },
      {
        accessorKey: "created_at",
        header: "Time",
        cell: ({ row }) => (
          <span className="text-xs whitespace-nowrap text-muted-foreground">
            {formatTimeShort(row.original.created_at)}
          </span>
        ),
      },
    ],
    [],
  );

  const paginationState = { pageIndex: currentPage - 1, pageSize: 25 };

  const table = useReactTable({
    data: data?.events ?? [],
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
                    Loading events...
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
                  No events found
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
  columns: ColumnDef<Event>[];
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
            <ExpandedContent event={row.original} />
          </td>
        </tr>
      )}
    </>
  );
}

function ExpandedContent({ event }: { event: Event }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
      <div>
        <h4 className="font-semibold mb-2">Event Details</h4>
        <dl className="space-y-1">
          <Detail term="Event ID" desc={event.id} />
          <Detail term="Type" desc={event.event_type} />
          <Detail term="Request ID" desc={event.request_id || "-"} />
          {event.metadata && (
            <Detail term="Metadata" desc={JSON.stringify(event.metadata)} />
          )}
        </dl>
      </div>
      <div>
        <h4 className="font-semibold mb-2">Context</h4>
        <dl className="space-y-1">
          <Detail term="Session ID" desc={event.session_id ? truncateID(event.session_id) : "anonymous"} />
          <Detail term="User ID" desc={event.user_id ? truncateID(event.user_id) : "anonymous"} />
          <Detail term="Path" desc={event.path || "-"} />
          <Detail term="Element" desc={event.element || "-"} />
        </dl>
      </div>
      <div>
        <h4 className="font-semibold mb-2">Client</h4>
        <dl className="space-y-1">
          <Detail term="IP Address" desc={event.ip_address || "-"} />
          <Detail term="User Agent" desc={event.user_agent || "-"} />
          <Detail term="Timestamp" desc={formatTimeShort(event.created_at)} />
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
