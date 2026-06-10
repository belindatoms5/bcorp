import { createServerSupabaseClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, Pin } from "lucide-react";

export default async function PortalAnnouncementsPage({
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

  const announcements = await prisma.announcement.findMany({
    where: { schemeId },
    include: { author: true },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Announcements</h1>
        <p className="text-sm text-gray-500 mt-0.5">{announcements.length} post{announcements.length !== 1 ? "s" : ""}</p>
      </div>

      {announcements.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Bell className="w-10 h-10 text-gray-300 mx-auto mb-4" />
            <p className="font-medium text-gray-900">No announcements yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {announcements.map((a) => (
            <Card key={a.id} className={a.isPinned ? "border-amber-200 bg-amber-50/40" : ""}>
              <CardContent className="py-4">
                <div className="flex items-center gap-2 mb-2">
                  {a.isPinned
                    ? <Pin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    : <Bell className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                  <p className="text-sm font-semibold text-gray-900">{a.title}</p>
                  {a.isPinned && <Badge variant="warning">Pinned</Badge>}
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{a.body}</p>
                <p className="text-xs text-gray-400 mt-3">
                  {a.author.fullName} · {new Date(a.createdAt).toLocaleDateString("en-AU", {
                    day: "numeric", month: "long", year: "numeric",
                  })}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
