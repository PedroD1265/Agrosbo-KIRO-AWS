import { useMemo, useState } from "react";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  useExpenses, useCampaigns,
  queueCreateExpense, queueCreateLabor, queueDeleteExpense,
} from "@/hooks/data";
import type { ExpenseCategory } from "@shared/schema";
import { Trash2, DollarSign, Users, Download } from "lucide-react";
import { usePermissions } from "@/lib/permissions";

const CATEGORIES: ExpenseCategory[] = [
  "insumo", "jornal", "transporte", "maquinaria", "riego", "mantenimiento", "apicultura", "otro",
];

function todayIso() { return new Date().toISOString().slice(0, 10); }

export default function ExpensesPage() {
  const { can } = usePermissions();
  const canWrite = can("expenses:write");
  const { data: campaigns = [] } = useCampaigns();
  const [campaignFilter, setCampaignFilter] = useState<string>("__all__");
  const filter = campaignFilter !== "__all__" ? { campaignId: campaignFilter } : undefined;
  const { data: expenses = [] } = useExpenses(filter);

  const totals = useMemo(() => {
    let total = 0;
    const byCat: Record<string, number> = {};
    for (const e of expenses) {
      total += e.amount;
      byCat[e.category] = (byCat[e.category] ?? 0) + e.amount;
    }
    return { total, byCat };
  }, [expenses]);

  // Expense form
  const [eCat, setECat] = useState<ExpenseCategory>("insumo");
  const [eAmount, setEAmount] = useState("");
  const [eDate, setEDate] = useState(todayIso());
  const [eCampaign, setECampaign] = useState<string>("__none__");
  const [eNote, setENote] = useState("");

  // Labor form
  const [lWorker, setLWorker] = useState("");
  const [lAmount, setLAmount] = useState("");
  const [lDate, setLDate] = useState(todayIso());
  const [lCampaign, setLCampaign] = useState<string>("__none__");
  const [lNotes, setLNotes] = useState("");

  async function submitExpense(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(eAmount);
    if (!Number.isFinite(amt) || amt < 0) {
      toast.error("Monto inválido");
      return;
    }
    await queueCreateExpense({
      category: eCat,
      amount: amt,
      date: eDate,
      campaignId: eCampaign !== "__none__" ? eCampaign : undefined,
      note: eNote || undefined,
    });
    setEAmount(""); setENote("");
    toast.success("Gasto registrado");
  }

  async function submitLabor(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(lAmount);
    if (!lWorker.trim() || !Number.isFinite(amt) || amt < 0) {
      toast.error("Datos inválidos");
      return;
    }
    await queueCreateLabor({
      workerName: lWorker.trim(),
      amount: amt,
      date: lDate,
      campaignId: lCampaign !== "__none__" ? lCampaign : undefined,
      notes: lNotes || undefined,
    });
    setLWorker(""); setLAmount(""); setLNotes("");
    toast.success("Jornal registrado");
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        eyebrow="Finanzas · Gastos agrícolas"
        title="Gastos y jornales (BOB)"
        subtitle="Costos por campaña, área o categoría"
      />

      <div className="flex flex-wrap items-center gap-2">
        <Label className="text-xs">Filtrar por campaña:</Label>
        <Select value={campaignFilter} onValueChange={setCampaignFilter}>
          <SelectTrigger className="w-[260px]" data-testid="select-filter-campaign">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todas las campañas</SelectItem>
            {campaigns.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.scopeName} · {c.crop}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <a
          href={"/api/reports/expenses.csv" + (campaignFilter !== "__all__" ? `?campaignId=${campaignFilter}` : "")}
          className="ml-auto"
          data-testid="link-export-expenses-csv"
        >
          <Button type="button" variant="outline" size="sm">
            <Download className="mr-1 h-3.5 w-3.5" /> Exportar gastos CSV
          </Button>
        </a>
        <a
          href={"/api/reports/labor.csv" + (campaignFilter !== "__all__" ? `?campaignId=${campaignFilter}` : "")}
          data-testid="link-export-labor-csv"
        >
          <Button type="button" variant="outline" size="sm">
            <Download className="mr-1 h-3.5 w-3.5" /> Exportar jornales CSV
          </Button>
        </a>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total gastos (BOB)</p>
            <p className="mt-1 text-2xl font-semibold" data-testid="text-total-expenses">
              {totals.total.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Jornales (BOB)</p>
            <p className="mt-1 text-2xl font-semibold" data-testid="text-total-labor">
              {(totals.byCat["jornal"] ?? 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Otros gastos (BOB)</p>
            <p className="mt-1 text-2xl font-semibold">
              {(totals.total - (totals.byCat["jornal"] ?? 0)).toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {!canWrite && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Solo lectura · Tu rol no permite registrar ni eliminar gastos.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-4 w-4" /> Registrar gasto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitExpense} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Categoría</Label>
                  <Select value={eCat} onValueChange={(v) => setECat(v as ExpenseCategory)}>
                    <SelectTrigger data-testid="select-expense-category"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Monto BOB</Label>
                  <Input
                    type="number" step="0.01" min="0" value={eAmount}
                    onChange={(e) => setEAmount(e.target.value)}
                    data-testid="input-expense-amount"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Fecha</Label>
                  <Input type="date" value={eDate} onChange={(e) => setEDate(e.target.value)} data-testid="input-expense-date" />
                </div>
                <div>
                  <Label className="text-xs">Campaña</Label>
                  <Select value={eCampaign} onValueChange={setECampaign}>
                    <SelectTrigger data-testid="select-expense-campaign"><SelectValue placeholder="Sin campaña" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sin campaña</SelectItem>
                      {campaigns.map((c) => <SelectItem key={c.id} value={c.id}>{c.scopeName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs">Nota</Label>
                <Textarea rows={2} value={eNote} onChange={(e) => setENote(e.target.value)} data-testid="input-expense-note" />
              </div>
              <Button type="submit" className="w-full" data-testid="button-submit-expense" disabled={!canWrite}>
                Registrar gasto
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" /> Registrar jornal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitLabor} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Trabajador</Label>
                  <Input value={lWorker} onChange={(e) => setLWorker(e.target.value)} data-testid="input-labor-worker" />
                </div>
                <div>
                  <Label className="text-xs">Monto BOB</Label>
                  <Input
                    type="number" step="0.01" min="0" value={lAmount}
                    onChange={(e) => setLAmount(e.target.value)}
                    data-testid="input-labor-amount"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Fecha</Label>
                  <Input type="date" value={lDate} onChange={(e) => setLDate(e.target.value)} data-testid="input-labor-date" />
                </div>
                <div>
                  <Label className="text-xs">Campaña</Label>
                  <Select value={lCampaign} onValueChange={setLCampaign}>
                    <SelectTrigger data-testid="select-labor-campaign"><SelectValue placeholder="Sin campaña" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sin campaña</SelectItem>
                      {campaigns.map((c) => <SelectItem key={c.id} value={c.id}>{c.scopeName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs">Notas</Label>
                <Textarea rows={2} value={lNotes} onChange={(e) => setLNotes(e.target.value)} data-testid="input-labor-notes" />
              </div>
              <Button type="submit" className="w-full" data-testid="button-submit-labor" disabled={!canWrite}>
                Registrar jornal
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Movimientos recientes</CardTitle>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin gastos registrados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-xs text-muted-foreground">
                  <tr>
                    <th className="px-2 py-2 text-left">Fecha</th>
                    <th className="px-2 py-2 text-left">Categoría</th>
                    <th className="px-2 py-2 text-right">Monto</th>
                    <th className="px-2 py-2 text-left">Nota</th>
                    <th className="px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.slice(0, 50).map((e) => (
                    <tr key={e.id} className="border-b last:border-0" data-testid={`row-expense-${e.id}`}>
                      <td className="px-2 py-2">{e.date}</td>
                      <td className="px-2 py-2 capitalize">{e.category}</td>
                      <td className="px-2 py-2 text-right font-mono">{e.amount.toFixed(2)} {e.currency}</td>
                      <td className="px-2 py-2 text-muted-foreground">{e.note ?? "—"}</td>
                      <td className="px-2 py-2 text-right">
                        {canWrite && (
                          <button
                            type="button"
                            onClick={() => queueDeleteExpense(e.id)}
                            className="text-muted-foreground hover:text-destructive"
                            data-testid={`button-delete-expense-${e.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
