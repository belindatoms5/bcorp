import { createServerSupabaseClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, CalendarDays, MapPin, CheckCircle2, XCircle, Minus } from "lucide-react";

export default async function PortalMeetingsPage({
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

  const meetings = await prisma.meeting.findMany({
    where: { schemeId },
    include: {
      motions: {
        orderBy: { orderIndex: "asc" },
      },
    },
    orderBy: { scheduledAt: "desc" },
  });

  const upcoming = meetings.filter((m) => new Date(m.scheduledAt) >= new Date());
  const past = meetings.filter((m) => new Date(m.scheduledAt) < new Date());

  const outcomeIcon = (outcome: string | null) => {
    if (outcome === "PASSED") return <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />;
    if (outcome === "FAILED") return <XCircle className="w-3.5 h-3.5 text-red-500" />;
    return <Minus className="w-3.5 h-3.5 text-gray-400" />;
  };

  const MeetingCard = ({ meeting }: { meeting: typeof meetings[0] }) => {
    const isPast = new Date(meeting.scheduledAt) < new Date();
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isPast ? "bg-gray-100" : "bg-purple-50"}`}>
              {isPast
                ? <Users className="w-5 h-5 text-gray-500" />
                : <CalendarDays className="w-5 h-5 text-purple-600" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">{meeting.meetingType}</CardTitle>
                {!isPast && <Badge variant="secondary">Upcoming</Badge>}
                {meeting.status === "MINUTES_APPROVED" && <Badge variant="success">Minutes approved</Badge>}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                <span>
                  {new Date(meeting.scheduledAt).toLocaleDateString("en-AU", {
                    weekday: "short", day: "numeric", month: "long", year: "numeric",
                  })}
                  {" at "}
                  {new Date(meeting.scheduledAt).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}
                </span>
                {meeting.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {meeting.location}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        {meeting.motions.length > 0 && (
          <CardContent className="pt-0">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              {isPast ? "Motions" : "Agenda items"}
            </p>
            <div className="flex flex-col gap-1.5">
              {meeting.motions.map((motion, i) => (
                <div key={motion.id} className="flex items-start gap-2">
                  <span className="text-xs text-gray-400 w-4 shrink-0 mt-0.5">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800">{motion.title}</p>
                    {motion.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{motion.description}</p>
                    )}
                  </div>
                  {isPast && (
                    <div className="flex items-center gap-1 shrink-0">
                      {outcomeIcon(motion.outcome)}
                      {motion.outcome && (
                        <span className="text-xs text-gray-500">{motion.outcome.toLowerCase()}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {isPast && meeting.minutesUrl && (
              <a
                href={meeting.minutesUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-3"
              >
                View approved minutes →
              </a>
            )}
          </CardContent>
        )}
      </Card>
    );
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Meetings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Upcoming notices and past minutes</p>
      </div>

      {meetings.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-4" />
            <p className="font-medium text-gray-900">No meetings scheduled</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Upcoming</p>
              <div className="flex flex-col gap-3">
                {upcoming.map((m) => <MeetingCard key={m.id} meeting={m} />)}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Past meetings</p>
              <div className="flex flex-col gap-3">
                {past.map((m) => <MeetingCard key={m.id} meeting={m} />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
