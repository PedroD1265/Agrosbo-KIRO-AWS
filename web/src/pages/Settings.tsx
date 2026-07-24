import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Building2, SlidersHorizontal, Database, Users, LayoutGrid, Sprout,
  CalendarRange, ListChecks, Droplets, Plug, CloudOff, Cloud, Save,
  ChevronRight, Globe, MapPin, ShieldAlert,
} from "lucide-react";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  useBlocks, useGreenhouses, useSettings, useCampaigns, useTasks, useIrrigationEvents,
} from "@/hooks/data";
import { queueUpdateSettings } from "@/hooks/data/mutations";
import { useQueueStatus } from "@/lib/sync/useQueueStatus";
import { settingsSchema, type Settings } from "@shared/schema";
import { SetupChecklist, type SetupItem } from "@/features/settings/SetupChecklist";
import { SettingsSection } from "@/features/settings/SettingsSection";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { ShieldCheck } from "lucide-react";

function AuthStatusBanner() {
  const { enforcement, user } = useAuth();
  if (enforcement === "on") {
    return (
      <div
        role="status"
        data-testid="banner-auth-status"
        className="flex items-start gap-3 rounded-xl border border-status-ok/40 bg-status-ok-soft/60 px-4 py-3 text-sm text-foreground"
      >
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-status-ok" />
        <div className="min-w-0">
          <p className="font-medium leading-tight">Autenticación activa</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Sesión: <span className="font-medium">{user?.name ?? "—"}</span> · rol{" "}
            <span className="font-medium">{user?.role ?? "—"}</span>. Las acciones del backend
            verifican usuario y rol.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div
      role="status"
      data-testid="banner-auth-status"
      className="flex items-start gap-3 rounded-xl border border-status-warn/40 bg-status-warn-soft/60 px-4 py-3 text-sm text-foreground"
    >
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-status-warn" />
      <div className="min-w-0">
        <p className="font-medium leading-tight">Autenticación desactivada (modo demo)</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          AUTH_ENFORCEMENT=off. La API está abierta y todas las acciones se atribuyen a un usuario
          demo. Para piloto real exporta AUTH_ENFORCEMENT=on antes de arrancar el servidor.
        </p>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { data: settings } = useSettings();
  const { data: blocks = [] } = useBlocks();
  const { data: greenhouses = [] } = useGreenhouses();
  const { data: campaigns = [] } = useCampaigns();
  const { data: tasks = [] } = useTasks();
  const { data: irrigation = [] } = useIrrigationEvents();
  const queue = useQueueStatus();

  const farms = useMemo(() => new Set(blocks.map((b) => b.farm)), [blocks]);
  const crops = useMemo(
    () => new Set([...blocks.map((b) => b.crop), ...greenhouses.map((g) => g.crop)]),
    [blocks, greenhouses],
  );

  const form = useForm<Settings>({
    resolver: zodResolver(settingsSchema),
    defaultValues: settings ?? {
      orgName: "",
      location: "",
      timezone: "America/La_Paz",
      preferOffline: true,
      confirmBeforeSync: false,
      criticalAlertsBanner: true,
    },
  });

  useEffect(() => {
    if (settings) form.reset(settings);
  }, [settings, form]);

  const orgConfigured = Boolean(settings?.orgName && settings?.location);
  const isDirty = form.formState.isDirty;

  const setupItems: SetupItem[] = [
    {
      id: "org",
      label: "Configurar organización",
      description: "Nombre, ubicación y zona horaria de la operación",
      done: orgConfigured,
      to: "#org-section",
      icon: Building2,
    },
    {
      id: "unit",
      label: "Crear primera unidad",
      description: "Bloque o invernadero con cultivo y etapa",
      done: blocks.length + greenhouses.length > 0,
      to: blocks.length === 0 ? "/blocks" : "/greenhouses",
      icon: LayoutGrid,
    },
    {
      id: "campaign",
      label: "Iniciar campaña activa",
      description: "Define el ciclo productivo en curso",
      done: campaigns.length > 0,
      to: "/campaigns",
      icon: CalendarRange,
    },
    {
      id: "task",
      label: "Asignar primera tarea",
      description: "Activa el flujo de trabajo del equipo",
      done: tasks.length > 0,
      to: "/tasks",
      icon: ListChecks,
    },
    {
      id: "irrigation",
      label: "Programar primer riego",
      description: "Calendario de riego visible en Today",
      done: irrigation.length > 0,
      to: "/irrigation",
      icon: Droplets,
    },
  ];

  const save = async (values: Settings) => {
    try {
      await queueUpdateSettings(values);
      toast.success("Configuración guardada", {
        description: navigator.onLine ? "Sincronizando…" : "Encolada offline.",
      });
    } catch (err) {
      toast.error("No se pudo guardar", { description: (err as Error).message });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-6">
      <PageHeader
        title="Configuración"
        subtitle="Centro de configuración del sistema · organización, datos base y preferencias"
      />

      {/* Aviso modo piloto — refleja el estado real de AUTH_ENFORCEMENT */}
      <AuthStatusBanner />

      {/* Setup checklist — siempre visible, derivado de datos reales */}
      <SetupChecklist items={setupItems} />

      {/* Layout 2 cols en lg */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(save)} className="grid gap-5 lg:grid-cols-2">
          <SettingsSection
            icon={Building2}
            title="Organización"
            description="Estos datos aparecen en reportes, exportaciones y la cabecera del workboard"
            tone="primary"
          >
            <div id="org-section" className="space-y-4">
              <FormField control={form.control} name="orgName" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium text-muted-foreground">Nombre de la organización</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ej. Agrícola San Pedro" data-testid="input-org-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="location" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium text-muted-foreground">
                    <MapPin className="mr-1 inline h-3 w-3" />
                    Ubicación principal
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ej. Toco, Cochabamba" data-testid="input-org-location" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="timezone" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium text-muted-foreground">
                    <Globe className="mr-1 inline h-3 w-3" />
                    Zona horaria
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="America/La_Paz" data-testid="input-org-tz" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          </SettingsSection>

          <SettingsSection
            icon={SlidersHorizontal}
            title="Preferencias operativas"
            description="Controlan el comportamiento offline y las notificaciones del sistema"
          >
            <div className="space-y-1 divide-y divide-border/60">
              <FormField control={form.control} name="preferOffline" render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-4 space-y-0 py-3 first:pt-0">
                  <div className="min-w-0">
                    <FormLabel className="text-sm font-medium">Modo offline preferido</FormLabel>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Capturar siempre como pendiente de sincronizar. Útil para campo con conectividad intermitente.
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-prefer-offline" />
                  </FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="confirmBeforeSync" render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-4 space-y-0 py-3">
                  <div className="min-w-0">
                    <FormLabel className="text-sm font-medium">Confirmar antes de sincronizar</FormLabel>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Pedir confirmación al subir lotes a backend, recomendado para auditoría.
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-confirm-sync" />
                  </FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="criticalAlertsBanner" render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-4 space-y-0 py-3 last:pb-0">
                  <div className="min-w-0">
                    <FormLabel className="text-sm font-medium">Banner de alertas críticas</FormLabel>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Mostrar banner persistente en Today cuando haya alertas críticas o vencidos.
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-critical-alerts" />
                  </FormControl>
                </FormItem>
              )} />
            </div>
          </SettingsSection>

          {/* Footer de guardado sticky en mobile, inline en desktop */}
          <div className="lg:col-span-2">
            <div className={cn(
              "flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-all",
              isDirty
                ? "border-primary/30 bg-primary-soft/40 shadow-card"
                : "border-border bg-muted/30",
            )}>
              <p className="text-xs text-muted-foreground">
                {isDirty
                  ? "Tienes cambios sin guardar."
                  : "Los cambios se sincronizan automáticamente al guardar."}
              </p>
              <Button
                type="submit"
                size="sm"
                disabled={!isDirty}
                data-testid="button-save-settings"
              >
                <Save className="h-4 w-4" />
                Guardar cambios
              </Button>
            </div>
          </div>
        </form>
      </Form>

      {/* Sistema y datos */}
      <div className="grid gap-5 lg:grid-cols-2">
        <SettingsSection
          icon={Database}
          title="Estructura operativa"
          description="Resumen de los datos base actualmente registrados"
          action={
            <Button variant="ghost" size="sm" asChild>
              <Link to="/blocks">Gestionar <ChevronRight className="h-4 w-4" /></Link>
            </Button>
          }
        >
          <dl className="grid grid-cols-2 gap-3">
            <StatTile icon={MapPin} label="Predios" value={farms.size} />
            <StatTile icon={LayoutGrid} label="Bloques" value={blocks.length} to="/blocks" />
            <StatTile icon={Sprout} label="Invernaderos" value={greenhouses.length} to="/greenhouses" />
            <StatTile icon={CalendarRange} label="Campañas" value={campaigns.length} to="/campaigns" />
            <StatTile icon={ListChecks} label="Tareas" value={tasks.length} to="/tasks" />
            <StatTile icon={Droplets} label="Cultivos activos" value={crops.size} />
          </dl>
        </SettingsSection>

        <SettingsSection
          icon={Plug}
          title="Sincronización e integraciones"
          description="Estado del motor offline y conexión con sistemas externos"
          action={
            <Button variant="ghost" size="sm" asChild>
              <Link to="/integrations">Integraciones <ChevronRight className="h-4 w-4" /></Link>
            </Button>
          }
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card px-3.5 py-3">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg",
                  queue.online
                    ? "bg-status-ok-soft text-status-ok"
                    : "bg-status-warn-soft text-status-warn",
                )}>
                  {queue.online ? <Cloud className="h-4 w-4" /> : <CloudOff className="h-4 w-4" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight">
                    {queue.online ? "Conectado al backend" : "Modo offline"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {queue.online
                      ? "Los cambios se envían al servidor en tiempo real."
                      : "Los cambios se guardan localmente y se sincronizan al reconectar."}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <QueueStatTile label="Pendientes" value={queue.pending} tone={queue.pending > 0 ? "warn" : "ok"} />
              <QueueStatTile label="Sincronizando" value={queue.syncing} tone={queue.syncing > 0 ? "primary" : "muted"} />
              <QueueStatTile label="Errores" value={queue.failed} tone={queue.failed > 0 ? "critical" : "ok"} />
            </div>

            {(queue.pending > 0 || queue.failed > 0) && queue.online && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => queue.triggerSync()}
                data-testid="button-trigger-sync"
              >
                Sincronizar ahora
              </Button>
            )}
          </div>
        </SettingsSection>
      </div>

      {/* Modo piloto */}
      <SettingsSection
        icon={Users}
        title="Modo piloto · Operación compartida"
        description="Cómo se gestionan usuarios y permisos en esta etapa"
        tone="muted"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Autenticación por usuario</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Disponible vía AUTH_ENFORCEMENT=on en el servidor. Cuando está activa, cada acción
              queda atribuida al usuario en sesión y rutas administrativas (gestión de usuarios,
              esta página) requieren rol <code className="rounded bg-muted px-1">admin</code>.
              Los usuarios se crean con <code className="rounded bg-muted px-1">POST /api/users</code>.
            </p>
          </div>
          <div className="rounded-lg border border-dashed border-border bg-card/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Próximamente</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              UI de gestión de usuarios y permisos por predio (multi-organización).
            </p>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}

/* ----------------- Sub-componentes locales ----------------- */

function StatTile({
  icon: Icon,
  label,
  value,
  to,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  to?: string;
}) {
  const content = (
    <div className="group flex items-center gap-3 rounded-lg border border-border/60 bg-card px-3 py-2.5 transition-colors hover:border-primary/30 hover:bg-primary-soft/30">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground group-hover:bg-primary-soft group-hover:text-primary">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-base font-semibold tabular leading-tight">{value}</p>
      </div>
    </div>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

function QueueStatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "ok" | "warn" | "critical" | "primary" | "muted";
}) {
  const cfg = {
    ok: "text-status-ok bg-status-ok-soft/50",
    warn: "text-status-warn bg-status-warn-soft/50",
    critical: "text-status-critical bg-status-critical-soft/50",
    primary: "text-primary bg-primary-soft",
    muted: "text-muted-foreground bg-muted",
  }[tone];
  return (
    <div className={cn("rounded-lg px-3 py-2 text-center", cfg)}>
      <p className="text-lg font-semibold tabular leading-none">{value}</p>
      <p className="mt-1 text-[10px] font-medium uppercase tracking-wider opacity-80">{label}</p>
    </div>
  );
}
