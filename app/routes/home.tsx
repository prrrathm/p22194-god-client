import { Activity, Globe, Monitor, RefreshCw, Users } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Route } from "./+types/home";
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	Tooltip,
	ResponsiveContainer,
	CartesianGrid,
} from "recharts";
import type { DateRange } from "react-day-picker";
import { startOfWeek, endOfWeek } from "date-fns";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { DateRangePicker } from "~/components/ui/date-range-picker";
import { useAuth } from "~/lib/auth";
import { cn } from "~/lib/utils";
import { fetchSessions, fetchEvents, fetchServices } from "~/lib/api";

export function meta({}: Route.MetaArgs) {
	return [
		{ title: "God Console" },
		{ name: "description", content: "P22194 management dashboard" },
	];
}

const CHART_1 = "hsl(142, 76%, 57%)";
const CHART_2 = "hsl(217, 91%, 60%)";

function getWeekRange(): DateRange {
	const now = new Date();
	return {
		from: startOfWeek(now, { weekStartsOn: 1 }),
		to: endOfWeek(now, { weekStartsOn: 1 }),
	};
}

export default function Home() {
	const { user, accessToken, isLoading: authLoading } = useAuth();

	const [dateRange, setDateRange] = useState<DateRange | undefined>(
		getWeekRange,
	);

	const [sessionCount, setSessionCount] = useState<number | null>(null);
	const [activeCount, setActiveCount] = useState<number | null>(null);
	const [servicesCount, setServicesCount] = useState<number | null>(null);
	const [loadingCards, setLoadingCards] = useState(true);
	const [sessionsByService, setSessionsByService] = useState<
		Record<string, number>
	>({});
	const [topPaths, setTopPaths] = useState<Record<string, number>>({});
	const [loadingCharts, setLoadingCharts] = useState(true);
	const fetched = useRef(false);

	const toISO = (d: Date | undefined) => d?.toISOString() ?? "";
	const endOfDay = (d: Date | undefined) => {
		if (!d) return "";
		const end = new Date(d);
		end.setHours(23, 59, 59, 999);
		return end.toISOString();
	};

	const loadAll = useCallback(async () => {
		if (authLoading || !accessToken) return;
		setLoadingCards(true);
		setLoadingCharts(true);
		try {
			const from = toISO(dateRange?.from);
			const to = endOfDay(dateRange?.to);
			const filter = { from, to };

			const [
				totalResult,
				activeResult,
				servicesList,
				sessionsBulk,
				eventsResult,
			] = await Promise.all([
				fetchSessions({ ...filter, page: 1, limit: 1 }, accessToken),
				fetchSessions(
					{ ...filter, page: 1, limit: 1, status: "active" },
					accessToken,
				),
				fetchServices(accessToken),
				fetchSessions({ ...filter, page: 1, limit: 1000 }, accessToken),
				fetchEvents(
					{ ...filter, event_type: "page-visit", limit: 1000 },
					accessToken,
				),
			]);

			setSessionCount(totalResult.total);
			setActiveCount(activeResult.total);
			setServicesCount(servicesList.length);

			const svcMap: Record<string, number> = {};
			for (const s of sessionsBulk.sessions) {
				const svc = s.service || "users";
				svcMap[svc] = (svcMap[svc] || 0) + 1;
			}
			setSessionsByService(svcMap);

			const pathMap: Record<string, number> = {};
			for (const e of eventsResult.events) {
				const p = e.path || "/";
				pathMap[p] = (pathMap[p] || 0) + 1;
			}
			setTopPaths(pathMap);
		} catch {
			// silent
		} finally {
			setLoadingCards(false);
			setLoadingCharts(false);
		}
	}, [accessToken, authLoading, dateRange]);

	useEffect(() => {
		if (authLoading || !accessToken || fetched.current) return;
		fetched.current = true;
		loadAll();
	}, [loadAll, authLoading, accessToken]);

	useEffect(() => {
		if (!fetched.current) return;
		loadAll();
	}, [dateRange, loadAll]);

	const stats = [
		{
			title: "Total Sessions",
			value: loadingCards ? (
				<Skeleton className="h-8 w-16" />
			) : (
				(sessionCount?.toLocaleString() ?? "N/A")
			),
			icon: Activity,
		},
		{
			title: "Active Sessions",
			value: loadingCards ? (
				<Skeleton className="h-8 w-16" />
			) : (
				(activeCount?.toLocaleString() ?? "N/A")
			),
			icon: Globe,
		},
		{
			title: "Total Users",
			value: "—",
			icon: Users,
		},
		{
			title: "Services",
			value: loadingCards ? (
				<Skeleton className="h-8 w-16" />
			) : (
				(servicesCount?.toLocaleString() ?? "N/A")
			),
			icon: Monitor,
		},
	];

	return (
		<>
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
					<p className="text-sm text-muted-foreground mt-1">
						Welcome back, {user!.username}
					</p>
				</div>
				<div className="flex gap-2 p-4">
					<DateRangePicker
						date={dateRange}
						onDateChange={setDateRange}
						placeholder="Select date range"
					/>

					<Button
						variant="outline"
						size="sm"
						className="p-4.25"
						onClick={loadAll}
						disabled={loadingCards || loadingCharts}
					>
						<RefreshCw
							className={cn(
								"h-4 w-4 mr-2",
								(loadingCards || loadingCharts) && "animate-spin",
							)}
						/>
						Refresh
					</Button>
				</div>
			</div>

			{/* Stat Cards */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				{stats.map((stat) => (
					<Card key={stat.title}>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">
								{stat.title}
							</CardTitle>
							<stat.icon className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">{stat.value}</div>
						</CardContent>
					</Card>
				))}
			</div>

			{/* Charts */}
			<div className="grid gap-4 md:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle className="text-sm font-medium">
							Sessions by Service
						</CardTitle>
					</CardHeader>
					<CardContent>
						{loadingCharts ? (
							<div className="space-y-3">
								{Array.from({ length: 4 }).map((_, i) => (
									<Skeleton key={i} className="h-6 w-full" />
								))}
							</div>
						) : (
							<div className="h-75">
								<ResponsiveContainer width="100%" height="100%">
									<BarChart
										data={toChartData(sessionsByService)}
										margin={{ left: -20, right: 8 }}
									>
										<CartesianGrid
											strokeDasharray="3 3"
											vertical={false}
											stroke="hsl(0 0% 18%)"
										/>
										<XAxis
											dataKey="name"
											tick={{ fontSize: 12, fill: "hsl(0 0% 55%)" }}
											axisLine={false}
											tickLine={false}
										/>
										<YAxis
											tick={{ fontSize: 12, fill: "hsl(0 0% 55%)" }}
											axisLine={false}
											tickLine={false}
											allowDecimals={false}
										/>
										<Tooltip
											cursor={{ fill: "transparent" }}
											contentStyle={{
												background: "hsl(0 0% 5%)",
												border: "1px solid hsl(0 0% 18%)",
												borderRadius: "8px",
												fontSize: 13,
											}}
											labelStyle={{ color: "hsl(0 0% 100%)" }}
										/>
										<Bar
											dataKey="value"
											fill={CHART_1}
											radius={[4, 4, 0, 0]}
											maxBarSize={48}
										/>
									</BarChart>
								</ResponsiveContainer>
							</div>
						)}
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle className="text-sm font-medium">
							Top Page Visits
						</CardTitle>
					</CardHeader>
					<CardContent>
						{loadingCharts ? (
							<div className="space-y-3">
								{Array.from({ length: 4 }).map((_, i) => (
									<Skeleton key={i} className="h-6 w-full" />
								))}
							</div>
						) : (
							<div className="h-75">
								<ResponsiveContainer width="100%" height="100%">
									<BarChart
										data={toChartData(topPaths)}
										margin={{ left: -20, right: 8 }}
									>
										<CartesianGrid
											strokeDasharray="3 3"
											vertical={false}
											stroke="hsl(0 0% 18%)"
										/>
										<XAxis
											dataKey="name"
											tick={{ fontSize: 12, fill: "hsl(0 0% 55%)" }}
											axisLine={false}
											tickLine={false}
										/>
										<YAxis
											tick={{ fontSize: 12, fill: "hsl(0 0% 55%)" }}
											axisLine={false}
											tickLine={false}
											allowDecimals={false}
										/>
										<Tooltip
											cursor={{ fill: "transparent" }}
											contentStyle={{
												background: "hsl(0 0% 5%)",
												border: "1px solid hsl(0 0% 18%)",
												borderRadius: "8px",
												fontSize: 13,
											}}
											labelStyle={{ color: "hsl(0 0% 100%)" }}
										/>
										<Bar
											dataKey="value"
											fill={CHART_2}
											radius={[4, 4, 0, 0]}
											maxBarSize={48}
										/>
									</BarChart>
								</ResponsiveContainer>
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</>
	);
}

function toChartData(data: Record<string, number>, maxItems = 10) {
	return Object.entries(data)
		.sort(([, a], [, b]) => b - a)
		.slice(0, maxItems)
		.map(([name, value]) => ({ name, value }));
}
