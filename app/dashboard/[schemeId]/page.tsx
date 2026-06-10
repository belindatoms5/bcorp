import { createServerSupabaseClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Receipt, Users, Wrench, AlertTriangle, TrendingUp,
  Home, Plus, ArrowRight, Bell, CheckCircle2, Calendar,
  DollarSign, ClipboardList,
} from "lucide-react";

function StatCard({
  label, value, icon: Icon, href, iconBg, iconColor, badge, sub,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  href: string;
  iconBg: string;
  iconColor: string;
  badge?: { text: string; variant: "destructive" | "warning" } | null;
  sub?: string;
}) {
  return (
    <Link href={href}>
      <Card className="hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer h-full group">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div className={`w-9 h-9 ${iconBg} rounded-lg flex items-center justify-center`}>
              <Icon className={`w-4.5 h-4.5 ${iconColor}`} />
            </div>
            {badge && (
              <Badge variant={badge.variant} className="text-xs">{badge.text}</Badge>
            )}
          </div>
          <p className="text-2xl font-semibold text-gray-900 tabular-nums">{value}</p>
          <div className="flex items-center justify-between mt-1">
            <p className="text-sm text-gray-500">{label}</p>
            {sub && <p className="text-xs text-gray-400">{sub}</p>}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default async function SchemeDashboard({
  params,
}: {
  params: Promise<{ schemeId: string }>;
}) {
  const { schemeId } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({ where: { email: user.email! } });
  if (!dbUser) redirect("/dashboard");

  const scheme = await prisma.scheme.findFirst({
    where: { id: schemeId, roles: { some: { userId: dbUser.id, termEnd: null } } },
    include: {
      _count: { select: { lots: true, meetings: true, maintenanceReqs: true } },
      roles: { where: { userId: dbUser.id, termEnd: null } },
    },
  });
  if (!scheme) notFound();

  const [
    levySummary,
    overdueCount,
    openMaintenance,
    urgentMaintenance,
    upcomingMeeting,
    recentAnnouncements,
    collectedThisYear,
    openBreaches,
  ] = await Promise.all([
    prisma.levyNotice.aggregate({
      where: { lot: { schemeId }, status: { in: ["ISSUED", "OVERDUE", "DEBT_RECOVERY"] } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.levyNotice.count({
      where: { lot: { schemeId }, status: { in: ["OVERDUE", "DEBT_RECOVERY"] } },
    }),
    prisma.maintenanceRequest.count({
      where: { schemeId, status: { in: ["OPEN", "CLASSIFIED", "QUOTE_REQUESTED", "WORK_ORDERED"] } },
    }),
    prisma.maintenanceRequest.count({
      where: { schemeId, priority: { in: ["HIGH", "URGENT"] }, status: { notIn: ["COMPLETED", "CLOSED"] } },
    }),
    prisma.meeting.findFirst({
      where: { schemeId, scheduledAt: { gte: new Date() } },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.announcement.findMany({
      where: { schemeId },
      include: { author: true },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      take: 3,
    }),
    prisma.payment.aggregate({
      where: {
        levyNotice: { lot: { schemeId } },
        paidDate: { gte: new Date(new Date().getFullYear(), 0, 1) },
      },
      _sum: { amount: true },
    }),
    prisma.breachNotice.count({
      where: { schemeId, status: { notIn: ["RESOLVED"] } },
    }),
  ]);

  const isCommittee = ["CHAIRPERSON", "SECRETARY", "TREASURER", "COMMITTEE_MEMBER"].includes(
    scheme.roles[0]?.role
  );

  const myRole = scheme.roles[0]?.role ?? "";
  const needsSetup = scheme._count.lots === 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const aud = (n: any) =>
    `$${Number(n ?? 0).toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const daysUntil = upcomingMeeting
    ? Math.ceil((new Date(upcomingMeeting.scheduledAt).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-semibold text-gray-900">{scheme.name}</h1>
            {isCommittee && (
              <Badge variant="secondary" className="capitalize text-xs">
                {myRole.toLowerCase().replace(/_/g, " ")}
              </Badge>
            )}
          </div>
          <p className="text-sm text-gray-500">CTS {scheme.ctsNumber} · {scheme.address}</p>
        </div>
        {isCommittee && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/${schemeId}/settings`}>
              Manage scheme
            </Link>
          </Button>
        )}
      </div>

      {/* Setup banner */}
      {needsSetup && isCommittee && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardContent className="flex items-center gap-4 py-4">
            <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-amber-700" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900">Finish setting up your scheme</p>
              <p className="text-xs text-amber-700 mt-0.5">Add lots and owners to start managing levies, meetings, and maintenance.</p>
            </div>
            <Button asChild size="sm" className="bg-amber-700 hover:bg-amber-800 text-white border-0 shrink-0">
              <Link href={`/dashboard/${schemeId}/lots`}>
                Add lots <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Lots registered"
          value={scheme._count.lots}
          icon={Home}
          href={`/dashboard/${schemeId}/lots`}
          iconBg="bg-gray-100"
          iconColor="text-gray-600"
          sub={`of ${scheme.lotCount}`}
        />
        <StatCard
          label="Levies outstanding"
          value={aud(levySummary._sum.amount)}
          icon={Receipt}
          href={`/dashboard/${schemeId}/levies`}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          badge={overdueCount > 0 ? { text: `${overdueCount} overdue`, variant: "destructive" } : null}
          sub={`${levySummary._count} notices`}
        />
        <StatCard
          label="Open maintenance"
          value={openMaintenance}
          icon={Wrench}
          href={`/dashboard/${schemeId}/maintenance`}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          badge={urgentMaintenance > 0 ? { text: `${urgentMaintenance} urgent`, variant: "warning" } : null}
        />
        <StatCard
          label="Meetings held"
          value={scheme._count.meetings}
          icon={Users}
          href={`/dashboard/${schemeId}/meetings`}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
          sub={upcomingMeeting ? `next in ${daysUntil}d` : "none scheduled"}
        />
      </div>

      {/* Secondary row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">

        {/* Next meeting */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-700">Next meeting</CardTitle>
              <Button asChild variant="ghost" size="sm" className="text-xs h-7">
                <Link href={`/dashboard/${schemeId}/meetings`}>View all</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {upcomingMeeting ? (
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-50 rounded-xl flex flex-col items-center justify-center shrink-0 border border-purple-100">
                  <span className="text-xs font-medium text-purple-600 leading-none">
                    {new Date(upcomingMeeting.scheduledAt).toLocaleString("en-AU", { month: "short" }).toUpperCase()}
                  </span>
                  <span className="text-lg font-semibold text-purple-700 leading-tight">
                    {new Date(upcomingMeeting.scheduledAt).getDate()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{upcomingMeeting.meetingType}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(upcomingMeeting.scheduledAt).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}
                    {upcomingMeeting.location ? ` · ${upcomingMeeting.location}` : ""}
                  </p>
                  <p className="text-xs text-purple-600 mt-1">In {daysUntil} day{daysUntil !== 1 ? "s" : ""}</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-4 text-center">
                <Calendar className="w-7 h-7 text-gray-200 mb-2" />
                <p className="text-sm text-gray-400">No meetings scheduled</p>
                {isCommittee && (
                  <Button asChild variant="ghost" size="sm" className="text-xs mt-2">
                    <Link href={`/dashboard/${schemeId}/meetings`}>Schedule one</Link>
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Levy collection */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-700">Levy collection</CardTitle>
              <Button asChild variant="ghost" size="sm" className="text-xs h-7">
                <Link href={`/dashboard/${schemeId}/levies`}>View all</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center shrink-0">
                <DollarSign className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{aud(collectedThisYear._sum.amount)} collected</p>
                <p className="text-xs text-gray-500">this financial year</p>
              </div>
            </div>
            {overdueCount > 0 && (
              <div className="flex items-center gap-2 bg-red-50 rounded-lg px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                <p className="text-xs text-red-700">
                  {overdueCount} overdue notice{overdueCount !== 1 ? "s" : ""} — {aud(levySummary._sum.amount)} outstanding
                </p>
              </div>
            )}
            {overdueCount === 0 && levySummary._count > 0 && (
              <div className="flex items-center gap-2 bg-green-50 rounded-lg px-3 py-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
                <p className="text-xs text-green-700">All notices current — no overdue payments</p>
              </div>
            )}
            {levySummary._count === 0 && (
              <p className="text-xs text-gray-400 text-center py-2">No levy notices issued yet</p>
            )}
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-700">Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 flex flex-col gap-1.5">
            {[
              { label: "Log maintenance request", icon: Wrench, href: `/dashboard/${schemeId}/maintenance` },
              { label: "Post announcement", icon: Bell, href: `/dashboard/${schemeId}/announcements` },
              { label: "Record a payment", icon: Receipt, href: `/dashboard/${schemeId}/levies` },
              { label: "Schedule a meeting", icon: Calendar, href: `/dashboard/${schemeId}/meetings` },
            ].map(({ label, icon: Icon, href }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors group"
              >
                <Icon className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 shrink-0" />
                {label}
                <ArrowRight className="w-3 h-3 text-gray-300 ml-auto group-hover:text-gray-400 transition-colors" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Bottom row: announcements + compliance flags */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Announcements */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-700">Announcements</CardTitle>
              <Button asChild variant="ghost" size="sm" className="text-xs h-7">
                <Link href={`/dashboard/${schemeId}/announcements`}>
                  <Plus className="w-3 h-3 mr-1" /> New
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {recentAnnouncements.length === 0 ? (
              <div className="text-center py-4">
                <Bell className="w-7 h-7 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No announcements yet</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {recentAnnouncements.map((a) => (
                  <div key={a.id} className="flex items-start gap-2.5">
                    {a.isPinned && (
                      <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    )}
                    {!a.isPinned && (
                      <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-gray-200 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{a.title}</p>
                      <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{a.body}</p>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0 ml-auto">
                      {new Date(a.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Compliance snapshot */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-700">Compliance snapshot</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 flex flex-col gap-2">
            {[
              {
                label: "Overdue levies",
                ok: overdueCount === 0,
                value: overdueCount > 0 ? `${overdueCount} notice${overdueCount !== 1 ? "s" : ""}` : "All clear",
                href: `/dashboard/${schemeId}/levies`,
              },
              {
                label: "Open breach notices",
                ok: openBreaches === 0,
                value: openBreaches > 0 ? `${openBreaches} active` : "None",
                href: `/dashboard/${schemeId}/notices`,
              },
              {
                label: "Urgent maintenance",
                ok: urgentMaintenance === 0,
                value: urgentMaintenance > 0 ? `${urgentMaintenance} request${urgentMaintenance !== 1 ? "s" : ""}` : "None",
                href: `/dashboard/${schemeId}/maintenance`,
              },
              {
                label: "Next meeting scheduled",
                ok: !!upcomingMeeting,
                value: upcomingMeeting ? `In ${daysUntil} day${daysUntil !== 1 ? "s" : ""}` : "Not scheduled",
                href: `/dashboard/${schemeId}/meetings`,
              },
            ].map(({ label, ok, value, href }) => (
              <Link key={label} href={href} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${ok ? "bg-green-100" : "bg-red-100"}`}>
                  {ok
                    ? <CheckCircle2 className="w-3 h-3 text-green-600" />
                    : <AlertTriangle className="w-3 h-3 text-red-600" />}
                </div>
                <span className="text-sm text-gray-700 flex-1">{label}</span>
                <span className={`text-xs font-medium ${ok ? "text-green-600" : "text-red-600"}`}>{value}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
