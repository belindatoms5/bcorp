import { createServerSupabaseClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { Providers } from "@/app/providers";
import { PortalSidebar } from "@/components/layout/portal-sidebar";

export default async function PortalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ schemeId: string }>;
}) {
  const { schemeId } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({ where: { email: user.email! } });
  if (!dbUser) redirect("/dashboard");

  const role = await prisma.schemeRoleRecord.findFirst({
    where: { schemeId, userId: dbUser.id, termEnd: null },
    include: { scheme: true },
  });

  if (!role) notFound();

  // Committee members shouldn't use the portal
  const COMMITTEE_ROLES = ["CHAIRPERSON", "SECRETARY", "TREASURER", "COMMITTEE_MEMBER"];
  if (COMMITTEE_ROLES.includes(role.role)) {
    redirect(`/dashboard/${schemeId}`);
  }

  return (
    <Providers>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <PortalSidebar schemeId={schemeId} schemeName={role.scheme.name} userEmail={dbUser.email} userName={dbUser.fullName} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </Providers>
  );
}
