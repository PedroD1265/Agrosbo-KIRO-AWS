import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/shared/ui/PageHeader";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { MetricCard } from "@/shared/ui/MetricCard";
import { FilterBar } from "@/shared/ui/FilterBar";
import { QuickCaptureDrawer } from "@/shared/ui/QuickCaptureDrawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { DetailSidePanel } from "@/shared/ui/DetailSidePanel";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { ListChecks, Plus, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { SegmentedChips } from "@/shared/ui/SegmentedChips";
import { MobileActionBar } from "@/shared/ui/MobileActionBar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBlocks, useGreenhouses, useInventory, useTasks } from "@/hooks/data";
import { queueAdjustInventory, queueUpdateTaskStatus, queueDeleteTask } from "@/hooks/data/mutations";
import type { Task, TaskStatus } from "@shared/schema";
import { QuickTaskForm, EditTaskForm } from "@/features/tasks/TaskForms";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { TaskTable } from "@/features/tasks/TaskTable";
import { TaskMobileList } from "@/features/tasks/TaskMobileList";
import {
  PRIORITY_LABEL, PRIORITY_RANK, STATUS_LABEL, STATUS_RANK,
  isOverdue, nextStatus, statusActionLabel, type TaskSortKey,
} from "@/features/tasks/taskUtils";

const consumeSchema = z.object({
  inventoryItemId: z.string().min(1, "Selecciona un insumo"),
  amount: z.coerce.number().positive("Mayor a 0"),
  unitCost: z.coerce.number().nonnegative("≥ 0").optional(),
  note: z.string().optional(),
});
type ConsumeValues = z.infer<typeof consumeSchema>;

function TaskConsumeForm({ task, onDone }: { task: Task; onDone: () => void }) {
  const { data: inventory = [] } = useInventory();
  const form = useForm<ConsumeValues>({
    resolver: zodResolver(consumeSchema),
    defaultValues: { inventoryItemId: "", amount: 1, unitCost: undefined, note: "" },
  });
  const submit = form.handleSubmit(async (values) => {
    const item = inventory.find((i) => i.id === values.inventoryItemId);
    if (!item) {
      toast.error("Insumo no encontrado");
      return;
    }
    try {
      await queueAdjustInventory({
        id: item.id,
        delta: -values.amount,
        note: values.note || `Consumo · ${task.title}`,
        unitCost: values.unitCost,
        currency: item.currency,
        scopeType: task.scopeType,
        scopeId: task.scopeId,
        taskId: task.id,
      });
      toast.success("Consumo registrado", {
        description: navigator.onLine ? "Sincronizando…" : "Encolado offline.",
      });
      form.reset();
      onDone();
    } catch (err) {
      toast.error("No se pudo registrar", { description: (err as Error).message });
    }
  });
  const selectedItem = inventory.find((i) => i.id === form.watch("inventoryItemId"));
  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={submit}>
        <FormField control={form.control} name="inventoryItemId" render={({ field }) => (
          <FormItem><FormLabel>Insumo</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl><SelectTrigger data-testid="select-task-consume-item"><SelectValue placeholder="Seleccionar…" /></SelectTrigger></FormControl>
              <SelectContent>
                {inventory.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.name} · {i.stock} {i.unit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select><FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="amount" render={({ field }) => (
          <FormItem>
            <FormLabel>Cantidad usada{selectedItem ? ` (${selectedItem.unit})` : ""}</FormLabel>
            <FormControl><Input type="number" step="0.01" {...field} data-testid="input-task-consume-amount" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="unitCost" render={({ field }) => (
          <FormItem>
            <FormLabel>Costo unitario {selectedItem?.unitCost !== undefined ? `(últ. ${selectedItem.unitCost})` : "(opcional)"}</FormLabel>
            <FormControl><Input type="number" step="0.01" placeholder={selectedItem?.unitCost?.toString() ?? "0.00"} {...field} value={field.value ?? ""} data-testid="input-task-consume-cost" /></FormControl>
          </FormItem>
        )} />
        <FormField control={form.control} name="note" render={({ field }) => (
          <FormItem><FormLabel>Nota</FormLabel><FormControl><Input placeholder="Detalle del consumo…" {...field} data-testid="input-task-consume-note" /></FormControl></FormItem>
        )} />
        <Button type="submit" className="w-full" data-testid="button-submit-task-consume">
          Registrar consumo
        </Button>
      </form>
    </Form>
  );
}

export default function TasksPage() {
  const [tab, setTab] = useState("pending");
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [consumeTask, setConsumeTask] = useState<Task | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<"all" | Task["priority"]>("all");
  const [scopeFilter, setScopeFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<TaskSortKey>("due");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const isMobile = useIsMobile();
  const { data: tasks = [] } = useTasks();
  const { data: blocks = [] } = useBlocks();
  const { data: greenhouses = [] } = useGreenhouses();
  const selectedTask = useMemo(() => tasks.find((t) => t.id === selectedId) ?? null, [tasks, selectedId]);

  const scopeOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [{ value: "all", label: "Todos los destinos" }];
    blocks.forEach((b) => opts.push({ value: `block:${b.id}`, label: `B · ${b.name}` }));
    greenhouses.forEach((g) => opts.push({ value: `greenhouse:${g.id}`, label: `I · ${g.name}` }));
    return opts;
  }, [blocks, greenhouses]);

  const handleSort = (k: TaskSortKey) => {
    if (k === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("asc"); }
  };

  const counts = useMemo(() => ({
    pending: tasks.filter((t) => t.status === "pending").length,
    inProgress: tasks.filter((t) => t.status === "in_progress").length,
    done: tasks.filter((t) => t.status === "done").length,
    overdue: tasks.filter(isOverdue).length,
  }), [tasks]);

  const filteredByTab = useMemo(() => {
    if (tab === "all") return tasks;
    if (tab === "overdue") return tasks.filter(isOverdue);
    return tasks.filter((t) => t.status === tab);
  }, [tasks, tab]);

  const filtered = useMemo(() => {
    const ql = q.toLowerCase();
    const base = filteredByTab.filter((t) => {
      const matchesQ = !q ||
        [t.title, t.assignee, t.scopeName, t.notes ?? ""].join(" ").toLowerCase().includes(ql);
      const matchesPriority = priorityFilter === "all" || t.priority === priorityFilter;
      const matchesScope = scopeFilter === "all" || `${t.scopeType}:${t.scopeId}` === scopeFilter;
      return matchesQ && matchesPriority && matchesScope;
    });
    const sign = sortDir === "asc" ? 1 : -1;
    return [...base].sort((a, b) => {
      switch (sortKey) {
        case "title": return sign * a.title.localeCompare(b.title);
        case "scope": return sign * a.scopeName.localeCompare(b.scopeName);
        case "assignee": return sign * (a.assignee ?? "").localeCompare(b.assignee ?? "");
        case "due": return sign * a.dueDate.localeCompare(b.dueDate);
        case "priority": return sign * (PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
        case "status": return sign * (STATUS_RANK[a.status] - STATUS_RANK[b.status]);
        default: return 0;
      }
    });
  }, [filteredByTab, q, priorityFilter, scopeFilter, sortKey, sortDir]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await queueDeleteTask(deleteId);
      toast.success("Tarea eliminada");
    } catch (err) {
      toast.error("No se pudo eliminar", { description: (err as Error).message });
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className={`space-y-5 animate-fade-in ${isMobile ? "pb-24" : ""}`}>
      <PageHeader
        eyebrow="Operación · Labores"
        title="Tareas"
        subtitle="Labores planificadas y checklist de campo"
        actions={
          !isMobile && (
            <QuickCaptureDrawer
              open={open}
              onOpenChange={setOpen}
              trigger={<Button size="sm" data-testid="button-new-task"><Plus className="h-4 w-4" /> Nueva tarea</Button>}
              title="Nueva tarea"
            >
              <QuickTaskForm onDone={() => setOpen(false)} />
            </QuickCaptureDrawer>
          )
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard label="Pendientes" value={counts.pending} icon={Clock} tone={counts.pending > 0 ? "warn" : "default"} />
        <MetricCard label="En curso" value={counts.inProgress} icon={ListChecks} tone="primary" />
        <MetricCard label="Vencidas" value={counts.overdue} icon={AlertTriangle} tone={counts.overdue > 0 ? "critical" : "ok"} hint={counts.overdue === 0 ? "Sin vencidas" : "Atender pronto"} />
        <MetricCard label="Completadas" value={counts.done} icon={CheckCircle2} tone="ok" />
      </div>

      {isMobile ? (
        <div className="space-y-4">
          <SegmentedChips
            value={tab}
            onChange={setTab}
            ariaLabel="Filtro de tareas"
            options={[
              { value: "pending", label: "Pendientes", count: counts.pending },
              { value: "in_progress", label: "En curso", count: counts.inProgress, tone: "primary" },
              { value: "overdue", label: "Vencidas", count: counts.overdue, tone: "critical" },
              { value: "done", label: "Hechas", count: counts.done, tone: "ok" },
              { value: "all", label: "Todas", count: tasks.length },
            ]}
          />
          <FilterBar
            value={q}
            onValueChange={setQ}
            placeholder="Buscar tarea, responsable…"
            resultCount={filtered.length}
          />
          <TaskMobileList items={filtered} onDelete={setDeleteId} onEdit={setEditTask} />
          <MobileActionBar hint={counts.overdue > 0 ? `${counts.overdue} vencidas requieren atención` : undefined}>
            <Button
              size="lg"
              className="h-12 flex-1 text-[15px] font-semibold"
              onClick={() => setOpen(true)}
              data-testid="button-new-task-mobile"
            >
              <Plus className="h-5 w-5" /> Nueva tarea
            </Button>
          </MobileActionBar>
          <QuickCaptureDrawer
            open={open}
            onOpenChange={setOpen}
            trigger={<span />}
            title="Nueva tarea"
            description="Captura rápida desde campo"
          >
            <QuickTaskForm onDone={() => setOpen(false)} />
          </QuickCaptureDrawer>
        </div>
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full justify-start overflow-x-auto md:w-auto">
            <TabsTrigger value="pending">Pendientes ({counts.pending})</TabsTrigger>
            <TabsTrigger value="in_progress">En curso ({counts.inProgress})</TabsTrigger>
            <TabsTrigger value="overdue">Vencidas ({counts.overdue})</TabsTrigger>
            <TabsTrigger value="done">Completadas ({counts.done})</TabsTrigger>
            <TabsTrigger value="all">Todas ({tasks.length})</TabsTrigger>
          </TabsList>
          <div className="mt-4 space-y-4">
            <FilterBar
              value={q}
              onValueChange={setQ}
              placeholder="Buscar por título, responsable o destino…"
              resultCount={filtered.length}
              right={
                <div className="flex items-center gap-2">
                  <Select value={scopeFilter} onValueChange={setScopeFilter}>
                    <SelectTrigger className="h-9 w-44" data-testid="select-task-scope-filter">
                      <SelectValue placeholder="Destino" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {scopeOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as typeof priorityFilter)}>
                    <SelectTrigger className="h-9 w-36" data-testid="select-task-priority-filter">
                      <SelectValue placeholder="Prioridad" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toda prioridad</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="med">Media</SelectItem>
                      <SelectItem value="low">Baja</SelectItem>
                    </SelectContent>
                  </Select>
                  {(scopeFilter !== "all" || priorityFilter !== "all" || q) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 px-2 text-xs text-muted-foreground"
                      onClick={() => { setScopeFilter("all"); setPriorityFilter("all"); setQ(""); }}
                      data-testid="button-task-clear-filters"
                    >
                      Limpiar
                    </Button>
                  )}
                </div>
              }
            />
            <TabsContent value={tab} forceMount className="mt-0">
              <div className={selectedTask ? "grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]" : ""}>
                <TaskTable
                  items={filtered}
                  onDelete={setDeleteId}
                  onEdit={setEditTask}
                  onSelect={(t) => setSelectedId(t.id)}
                  selectedId={selectedId}
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={handleSort}
                />
                {selectedTask && (
                  <DetailSidePanel
                    title={selectedTask.title}
                    subtitle={`${selectedTask.scopeName} · ${selectedTask.assignee}`}
                    headerExtra={
                      <StatusBadge
                        status={selectedTask.status === "done" ? "ok" : selectedTask.status === "in_progress" ? "warn" : "idle"}
                        label={STATUS_LABEL[selectedTask.status]}
                      />
                    }
                    onClose={() => setSelectedId(null)}
                    footer={
                      <div className="flex items-center gap-2">
                        {nextStatus(selectedTask.status) && (
                          <Button
                            size="sm"
                            className="flex-1"
                            data-testid={`button-task-advance-panel-${selectedTask.id}`}
                            onClick={() => {
                              const next = nextStatus(selectedTask.status)!;
                              queueUpdateTaskStatus(selectedTask.id, next).catch((err) =>
                                toast.error("No se pudo actualizar", { description: (err as Error).message }),
                              );
                            }}
                          >
                            {statusActionLabel(selectedTask.status)}
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => setEditTask(selectedTask)} data-testid="button-task-edit-panel">
                          Editar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setConsumeTask(selectedTask)} data-testid="button-task-consume-panel">
                          Consumir insumo
                        </Button>
                      </div>
                    }
                  >
                    <dl className="grid grid-cols-2 gap-3 text-[13px]">
                      <div>
                        <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Vence</dt>
                        <dd className={`tabular ${isOverdue(selectedTask) ? "font-semibold text-status-critical" : ""}`}>
                          {selectedTask.dueDate}
                          {isOverdue(selectedTask) && <span className="ml-1 text-[10px] uppercase">vencida</span>}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Prioridad</dt>
                        <dd>
                          <StatusBadge
                            status={selectedTask.priority === "high" ? "critical" : selectedTask.priority === "med" ? "warn" : "idle"}
                            label={PRIORITY_LABEL[selectedTask.priority]}
                          />
                        </dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Destino</dt>
                        <dd>{selectedTask.scopeName} <span className="text-muted-foreground">({selectedTask.scopeType === "block" ? "Bloque" : "Invernadero"})</span></dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Responsable</dt>
                        <dd>{selectedTask.assignee}</dd>
                      </div>
                      {selectedTask.notes && (
                        <div className="col-span-2">
                          <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Notas</dt>
                          <dd className="whitespace-pre-wrap text-[13px] leading-relaxed">{selectedTask.notes}</dd>
                        </div>
                      )}
                    </dl>
                  </DetailSidePanel>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      )}

      <QuickCaptureDrawer
        open={Boolean(editTask)}
        onOpenChange={(o) => !o && setEditTask(null)}
        trigger={<span />}
        title={editTask ? `Editar · ${editTask.title}` : "Editar tarea"}
        description="Actualiza los detalles de la tarea"
      >
        {editTask && <EditTaskForm task={editTask} onDone={() => setEditTask(null)} />}
      </QuickCaptureDrawer>
      <QuickCaptureDrawer
        open={Boolean(consumeTask)}
        onOpenChange={(o) => !o && setConsumeTask(null)}
        trigger={<span />}
        title={consumeTask ? `Consumo · ${consumeTask.title}` : "Registrar consumo"}
        description="Descuenta insumo asociado a esta tarea"
      >
        {consumeTask && <TaskConsumeForm task={consumeTask} onDone={() => setConsumeTask(null)} />}
      </QuickCaptureDrawer>
      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="¿Eliminar tarea?"
        description="Esta acción no se puede deshacer."
        onConfirm={handleDelete}
        testId="delete-task"
      />
    </div>
  );
}
