import { createServerSupabaseClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Receipt, CheckCircle2, Clock, AlertTriangle } from "lucide-react";

const statusVariant: Record<string, "success" | "warning" | "destructive" | "secondary" | "outline"> = {
  DRAFT: "secondary", ISSUED: "outline", PAID: "success", OVERDUE: "destructive", DEBT_RECOVERY: "destructive",
};
const statusLabel: Record<string, string> = {
  DRAFT: "Draft", ISSUED: "Issued", PAID: "Paid", OVERDUE: "Overdue", DEBT_RECOVERY: "Debt recovery",
};

export default async function PortalLeviesPage({
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
    where: { schemeId, owners: { some: { userId: dbUser.id, ownershipTo: null } } },
  });
  if (!lot) notFound();

  const notices = await prisma.levyNotice.findMany({
    where: { lotId: lot.id },
    include: { payments: true, budget: true },
    orderBy: { dueDate: "desc" },
  });

  const totalOwing = notices.reduce((sum, n) => {
    if (n.status === "PAID") return sum;
    const paid = n.payments.reduce((s, p) => s + Number(p.amount), 0);
    return sum + Math.max(0, Number(n.amount) - paid);
  }, 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const aud = (n: any) =>
    `$${Number(n ?? 0).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">My levies</h1>
        <p className="text-sm text-gray-500 mt-0.5">Lot {lot.lotNumber}</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Receipt className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-gray-500 uppercase tracking-wide">Total notices</span>
            </div>
            <p className="text-xl font-semibold text-gray-900">{notices.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-xs text-gray-500 uppercase tracking-wide">Total owing</span>
            </div>
            <p className={`text-xl font-semibold ${totalOwing > 0 ? "text-red-600" : "text-gray-900"}`}>
              {aud(totalOwing)}
            </p>
          </CardContent>
        </Card>
      </div>

      {notices.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-4" />
            <p className="font-medium text-gray-900">No levy notices yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {notices.map((notice) => {
            const paid = notice.payments.reduce((s, p) => s + Number(p.amount), 0);
            const owing = Math.max(0, Number(notice.amount) - paid);
            const isOverdue = notice.status === "OVERDUE" || notice.status === "DEBT_RECOVERY";
            const isPaid = notice.status === "PAID";

            return (
              <Card key={notice.id} className={isOverdue ? "border-red-200" : ""}>
                <CardContent className="flex items-center gap-4 py-4">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    isPaid ? "bg-green-50" : isOverdue ? "bg-red-50" : "bg-blue-50"
                  }`}>
                    {isPaid
                      ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                      : isOverdue
                        ? <AlertTriangle className="w-4 h-4 text-red-600" />
                        : <Clock className="w-4 h-4 text-blue-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={statusVariant[notice.status] ?? "secondary"}>
                        {statusLabel[notice.status] ?? notice.status}
                      </Badge>
                      <Badge variant="outline">{notice.fundType === "ADMIN" ? "Admin" : "Sinking"}</Badge>
                      <span className="text-xs text-gray-400">FY {notice.budget.financialYear}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Due {new Date(notice.dueDate).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}
                      · Issued {new Date(notice.issuedDate).toLocaleDateString("en-AU")}
                    </p>
                    {notice.payments.length > 0 && (
                      <div className="mt-1.5 flex flex-col gap-0.5">
                        {notice.payments.map((p) => (
                          <p key={p.id} className="text-xs text-green-700">
                            Payment {aud(p.amount)} received {new Date(p.paidDate).toLocaleDateString("en-AU")}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-gray-900">{aud(notice.amount)}</p>
                    {owing > 0 && owing < Number(notice.amount) && (
                      <p className="text-xs text-amber-600">{aud(owing)} owing</p>
                    )}
                    {owing > 0 && owing === Number(notice.amount) && (
                      <p className="text-xs text-gray-500">unpaid</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
