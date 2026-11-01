import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext.js";
import { navigate } from "../navigation.js";
import { fetchRequesterDashboard, fetchStaffDashboard, DashboardApiError } from "../api.js";
import type { RequesterDashboardData, StaffDashboardData } from "../types.js";
export function AppLink({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
 return <a {...props} href={href} onClick={event => { props.onClick?.(event); if (!event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); navigate(href); } }}>{children}</a>;
}
export function useDashboard(staff: boolean) {
 const auth = useContext(AuthContext);
 const identity = `${auth?.user?.id}:${auth?.user?.role}:${auth?.token}`;
 const allowed = Boolean(auth?.user && (staff ? ["IT_STAFF", "ADMINISTRATOR"].includes(auth.user.role) : auth.user.role === "REQUESTER"));
 const [result, setResult] = useState<{ identity: string; data?: RequesterDashboardData | StaffDashboardData; error?: string }>({ identity: "" });
 const [retry, setRetry] = useState(0);
 useEffect(() => {
  let active = true;
  setResult({ identity });
  if (!auth?.isLoading && allowed) (staff ? fetchStaffDashboard() : fetchRequesterDashboard()).then(data => { if (active) setResult({ identity, data }); }).catch(error => {
   if (!active) return;
   const message = error instanceof DashboardApiError && error.status === 401 ? "Your session has expired. Please sign in again." : error instanceof DashboardApiError && error.status === 403 ? "You do not have permission to view this dashboard." : error instanceof Error ? error.message : "Unable to load dashboard.";
   setResult({ identity, error: message });
  });
  return () => { active = false; };
 }, [identity, auth?.isLoading, allowed, staff, retry]);
 const current = result.identity === identity ? result : { identity };
 return { data: allowed && !auth?.isLoading ? current.data : undefined, error: !auth?.isLoading && !allowed ? "Sign in with the appropriate role to view this dashboard." : current.error, loading: Boolean(auth?.isLoading || (allowed && !current.data && !current.error)), retry: () => setRetry(value => value + 1), showActions: allowed && !auth?.isLoading, user: auth?.user };
}
export function DashboardShell({ staff }: { staff: boolean }) {
 const { data, error, loading, retry, user, showActions } = useDashboard(staff);
 const requesterData = data as RequesterDashboardData | undefined, staffData = data as StaffDashboardData | undefined;
 const cards = staff ? [
  ["New", staffData?.metrics.newCount, "/staff/queue?status=NEW", staffData?.metrics.newDelta],
  ["Open", staffData?.metrics.openCount, "/staff/queue?status=OPEN", staffData?.metrics.openDelta],
  ["In Progress", staffData?.metrics.inProgressCount, "/staff/queue?status=IN_PROGRESS", staffData?.metrics.inProgressDelta],
  ["Waiting for Requester", staffData?.metrics.waitingRequesterCount, "/staff/queue?status=WAITING_FOR_REQUESTER", staffData?.metrics.waitingRequesterDelta],
  ["My Assigned", staffData?.metrics.myAssignedCount, "/staff/queue?ownerId=me", staffData?.metrics.myAssignedDelta],
 ] as const : [
  ["My Open Tickets", requesterData?.metrics.myOpenTickets, "/tickets?statusGroup=open", undefined],
  ["In Progress", requesterData?.metrics.inProgress, "/tickets?status=IN_PROGRESS", undefined],
  ["Resolved", requesterData?.metrics.resolved, "/tickets?status=RESOLVED", undefined],
  ["Closed", requesterData?.metrics.closed, "/tickets?status=CLOSED", undefined],
 ] as const;
 return <div className="dashboard" aria-busy={loading}>
  <header className="mb-4"><p className="text-success small fw-semibold mb-1">WORKSPACE OVERVIEW</p><h1 className="h3">{staff ? "Staff Dashboard" : "Requester Dashboard"}</h1><p className="text-muted mb-0">{staff ? "Your service desk at a glance." : "Your requests, progress and recent updates."}</p></header>
  {error ? <div className="alert alert-danger" role="alert"><p>{error}</p><button className="btn btn-outline-secondary" onClick={retry}>Retry dashboard</button></div> : <>
   <div className="dashboard-metrics" aria-label="Ticket metrics">{cards.map(([label, count, href, delta]) => loading ? <div key={label} className="zen-card dashboard-metric" aria-label={`${label} loading`}><span>{label}</span><span className="dashboard-skeleton" /></div> : <AppLink key={label} href={href} className="zen-card dashboard-metric" aria-label={`${label}: ${count} tickets`}><span>{label}</span><strong>{count}</strong>{staff && <small className="text-muted">{Number(delta) > 0 ? "+" : ""}{delta ?? 0} created vs yesterday</small>}</AppLink>)}</div>
   {loading ? <div className="zen-section-slide dashboard-recent mt-4" role="status">Loading dashboard…</div> : data && <section className="zen-section-slide dashboard-recent mt-4" aria-labelledby="dashboard-recent-title"><h2 id="dashboard-recent-title" className="h5 mb-3">Recent Tickets</h2>{!data.recentTickets.length ? <p className="text-muted">No recent tickets to display. <AppLink href="/tickets/new">Create a ticket</AppLink> to get started.</p> : <ul className="dashboard-recent-list">{data.recentTickets.map(ticket => <li key={ticket.id}><AppLink href={`/tickets/${ticket.id}`} className="dashboard-ticket-link"><span className="min-w-0"><small className="d-block text-muted">{ticket.ticketNumber}</small><strong className="d-block">{ticket.title}</strong></span><span className="dashboard-ticket-meta"><span className={`badge ${ticket.status === "RESOLVED" ? "badge-status-resolved" : ticket.status === "CLOSED" ? "badge-status-closed" : ticket.status === "IN_PROGRESS" ? "badge-status-in-progress" : "bg-light text-dark border"}`}>{ticket.status.replaceAll("_", " ")}</span><time dateTime={ticket.updatedAt}>{new Date(ticket.updatedAt).toLocaleString()}</time></span></AppLink></li>)}</ul>}</section>}
   {!loading && staff && user?.role === "ADMINISTRATOR" && staffData?.userMetrics && <section className="zen-section-slide mt-4" aria-label="Administrator account statistics"><h2 className="h5">User Accounts</h2><dl className="dashboard-account-counts">{Object.entries(staffData.userMetrics).map(([key, value]) => <div key={key}><dt>{({ totalUsers: "Total users", activeUsers: "Active users", inactiveUsers: "Inactive users", requesterCount: "Requesters", itStaffCount: "IT Staff", adminCount: "Administrators" } as Record<string, string>)[key]}</dt><dd>{value}</dd></div>)}</dl></section>}
  </>}
  {showActions && <section className="zen-section-slide mt-4" aria-labelledby="dashboard-actions-title"><h2 id="dashboard-actions-title" className="h5">Quick Actions</h2><div className="d-flex flex-wrap gap-2"><AppLink className="btn btn-zen" href="/tickets/new">Create Ticket</AppLink>{staff ? <><AppLink className="btn btn-outline-secondary" href="/staff/queue">Search Tickets</AppLink><AppLink className="btn btn-outline-secondary" href="/staff/queue?ownerId=me">My Queue</AppLink></> : <AppLink className="btn btn-outline-secondary" href="/tickets">View My Tickets</AppLink>}</div></section>}
 </div>;
}
