import { createServerSupabaseClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Home, Receipt, Users, Bell, ArrowRight, AlertTriangle } from "lucide-react";

export default async function PortalOverview({
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

  const lot = await prisma.lot.findFirst({
    where: {
      schemeId,
      owners: { some: { userId: dbUser.id, ownershipTo: null } },
    },
    include: {
      scheme: true,
      owners: { where: { ownershipTo: null }, include: { user: true } },
    },
  });

  if (!lot) notFound();

  const [unpaidNotices, upcomingMeeting, latestAnnouncements] = await Promise.all([
    prisma.levyNotice.findMany({
      where: {
        lotId: lot.id,
        status: { in: ["ISSUED", "OVERDUE", "DEBT_RECOVERY"] },
      },
      include: { payments: true },
      orderBy: { dueDate: "asc" },
    }),
    prisma.meeting.findFirst({
      where: { schemeId, scheduledAt: { gte: new Date() } },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.announcement.findMany({
      where: { schemeId },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      take: 3,
      include: { author: true },
    }),
  ]);

  const totalOwing = unpaidNotices.reduce((sum, n) => {
    const paid = n.payments.reduce((s, p) => s + Number(p.amount), 0);
    return sum + Math.max(0, Number(n.amount) - paid);
  }, 0);

  const hasOverdue = unpaidNotices.some((n) => n.status === "OVERDUE" || n.status === "DEBT_RECOVERY");

  const aud = (n: number) =>
    `$${n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Welcome back</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {lot.scheme.name} · {lot.scheme.address}
        </p>
      </div>

      {/* Lot card */}
      <Card className="mb-6">
        <CardContent className="flex items-center gap-4 py-4">
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
            <Home className="w-5 h-5 text-gray-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">Lot {lot.lotNumber}</p>
            <p className="text-xs text-gray-500 mt-0.5">{lot.address}</p>
          </div>
          <div className="text-right text-xs text-gray-400">
            <p>Admin entitlement: {lot.entitlementAdmin}</p>
            <p>Sinking entitlement: {lot.entitlementSinking}</p>
          </div>
        </CardContent>
      </Card>

      {/* Overdue alert */}
      {hasOverdue && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-4 py-4">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900">You have overdue levies</p>
              <p className="text-xs text-red-700 mt-0.5">
                Please pay as soon as possible to avoid debt recovery proceedings.
              </p>
            </div>
            <Button asChild size="sm" variant="outline" className="border-red-300 text-red-800 hover:bg-red-100">
              <Link href={`/portal/${schemeId}/levies`}>
                View <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-6">
        {/* Levies summary */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">My levies</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href={`/portal/${schemeId}/levies`}>View all</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {unpaidNotices.length > 0 ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                  <Receipt className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{aud(totalOwing)} owing</p>
                  <p className="text-xs text-gray-500">
                    {unpaidNotices.length} unpaid notice{unpaidNotices.length !== 1 ? "s" : ""}
                    {hasOverdue && " · includes overdue"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-sm text-gray-400">
                <Receipt className="w-4 h-4" />
                All levies paid — great work!
              </div>
            )}
          </CardContent>
        </Card>

        {/* Next meeting */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Next meeting</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href={`/portal/${schemeId}/meetings`}>View all</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingMeeting ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {upcomingMeeting.meetingType}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(upcomingMeeting.scheduledAt).toLocaleDateString("en-AU", {
                      weekday: "short", day: "numeric", month: "long", year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Users className="w-4 h-4" /> No upcoming meetings
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Announcements */}
      {latestAnnouncements.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Announcements</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href={`/portal/${schemeId}/announcements`}>View all</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 pt-0">
            {latestAnnouncements.map((a) => (
              <div key={a.id} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                <div className="flex items-center gap-2 mb-1">
                  <Bell className="w-3.5 h-3.5 text-gray-400" />
                  <p className="text-sm font-medium text-gray-900">{a.title}</p>
                  {a.isPinned && <Badge variant="warning" className="text-xs">Pinned</Badge>}
                </div>
                <p className="text-xs text-gray-600 line-clamp-2">{a.body}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {a.author.fullName} · {new Date(a.createdAt).toLocaleDateString("en-AU")}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
