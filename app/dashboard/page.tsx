import { createServerSupabaseClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Plus, MapPin, Home } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Find or create the user record in our DB
  let dbUser = await prisma.user.findUnique({ where: { email: user.email! } });
  if (!dbUser) {
    dbUser = await prisma.user.create({
      data: { id: user.id, email: user.email!, fullName: user.email!.split("@")[0] },
    });
  }

  const schemes = await prisma.scheme.findMany({
    where: {
      roles: { some: { userId: dbUser.id, termEnd: null } },
    },
    include: {
      _count: { select: { lots: true } },
      roles: { where: { userId: dbUser.id, termEnd: null } },
    },
    orderBy: { createdAt: "asc" },
  });

  const COMMITTEE_ROLES = ["CHAIRPERSON", "SECRETARY", "TREASURER", "COMMITTEE_MEMBER"];

  if (schemes.length === 1) {
    const role = schemes[0].roles[0]?.role;
    const isCommittee = role && COMMITTEE_ROLES.includes(role);
    redirect(isCommittee ? `/dashboard/${schemes[0].id}` : `/portal/${schemes[0].id}`);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 bg-gray-900 rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-semibold text-gray-900">bcorp</span>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Your schemes</h1>
            <p className="text-gray-500 text-sm mt-0.5">Select a scheme to manage</p>
          </div>
          <Button asChild>
            <Link href="/dashboard/new">
              <Plus className="w-4 h-4" />
              New scheme
            </Link>
          </Button>
        </div>

        {schemes.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-4" />
              <CardTitle className="text-gray-900 mb-2">No schemes yet</CardTitle>
              <CardDescription className="mb-6">
                Set up your body corporate to get started.
              </CardDescription>
              <Button asChild>
                <Link href="/dashboard/new">
                  <Plus className="w-4 h-4" />
                  Set up your scheme
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {schemes.map((scheme) => {
              const role = scheme.roles[0]?.role;
              const isCommittee = role && COMMITTEE_ROLES.includes(role);
              const href = isCommittee ? `/dashboard/${scheme.id}` : `/portal/${scheme.id}`;
              return (
              <Link key={scheme.id} href={href}>
                <Card className="hover:border-gray-400 transition-colors cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{scheme.name}</CardTitle>
                        <div className="flex items-center gap-1 mt-1">
                          <MapPin className="w-3.5 h-3.5 text-gray-400" />
                          <CardDescription className="text-xs">{scheme.address}</CardDescription>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full font-mono">
                        CTS {scheme.ctsNumber}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Home className="w-3.5 h-3.5" />
                        {scheme._count.lots} lots
                      </span>
                      <span className="capitalize text-gray-400 text-xs">
                        {scheme.roles[0]?.role.toLowerCase().replace("_", " ")}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
