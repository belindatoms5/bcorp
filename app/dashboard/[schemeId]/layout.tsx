import { createServerSupabaseClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Providers } from "@/app/providers";

export default async function SchemeLayout({
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

  const scheme = await prisma.scheme.findFirst({
    where: {
      id: schemeId,
      roles: { some: { userId: dbUser.id, termEnd: null } },
    },
  });

  if (!scheme) notFound();

  return (
    <Providers>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <Sidebar schemeId={schemeId} schemeName={scheme.name} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </Providers>
  );
}
