import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBlocks, useGreenhouses } from '@/hooks/data';
import { queueCreateTask, queueUpdateTask } from '@/hooks/data/mutations';
import { taskPrioritySchema, taskStatusSchema, type Task, type ScopeType } from '@shared/schema';

const formSchema = z.object({
  title: z.string().min(3, 'Mínimo 3 caracteres'),
  assignee: z.string().min(1, 'Requerido'),
  dueDate: z.string().min(1, 'Requerido'),
  priority: taskPrioritySchema,
  scopeRef: z.string().min(1, 'Selecciona un destino'),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof formSchema>;

export interface QuickTaskInitial {
  title?: string;
  assignee?: string;
  dueDate?: string;
  priority?: 'low' | 'med' | 'high';
  scopeRef?: string;
  notes?: string;
  sourceObservationId?: string;
}

export function QuickTaskForm({
  onDone,
  initial,
}: {
  onDone: () => void;
  initial?: QuickTaskInitial;
}) {
  const { data: blocks = [] } = useBlocks();
  const { data: greenhouses = [] } = useGreenhouses();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: initial?.title ?? '',
      assignee: initial?.assignee ?? '',
      dueDate: initial?.dueDate ?? new Date().toISOString().slice(0, 10),
      priority: initial?.priority ?? 'med',
      scopeRef: initial?.scopeRef ?? '',
      notes: initial?.notes ?? '',
    },
  });

  const submit = form.handleSubmit(async (values) => {
    const [scopeType, scopeId] = values.scopeRef.split(':') as [ScopeType, string];
    try {
      await queueCreateTask({
        title: values.title,
        scopeType,
        scopeId,
        assignee: values.assignee,
        dueDate: values.dueDate,
        priority: values.priority,
        notes: values.notes || undefined,
        sourceObservationId: initial?.sourceObservationId,
      });
      toast.success('Tarea creada', {
        description: navigator.onLine
          ? 'Sincronizando con el servidor.'
          : 'Guardada en cola local. Se sincroniza al recuperar conexión.',
      });
      form.reset();
      onDone();
    } catch (err) {
      toast.error('No se pudo encolar', { description: (err as Error).message });
    }
  });

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={submit}>
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título</FormLabel>
              <FormControl>
                <Input
                  placeholder="Ej: Aplicar fertilización foliar"
                  {...field}
                  data-testid="input-task-title"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="scopeRef"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bloque/Invernadero</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger data-testid="select-task-scope">
                    <SelectValue placeholder="Seleccionar…" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {blocks.map((b) => (
                    <SelectItem key={b.id} value={`block:${b.id}`}>
                      {b.name}
                    </SelectItem>
                  ))}
                  {greenhouses.map((g) => (
                    <SelectItem key={g.id} value={`greenhouse:${g.id}`}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="assignee"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Responsable</FormLabel>
                <FormControl>
                  <Input placeholder="Nombre" {...field} data-testid="input-task-assignee" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vence</FormLabel>
                <FormControl>
                  <Input type="date" {...field} data-testid="input-task-due" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="priority"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Prioridad</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger data-testid="select-task-priority">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="low">Baja</SelectItem>
                  <SelectItem value="med">Media</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas</FormLabel>
              <FormControl>
                <Textarea rows={3} {...field} data-testid="input-task-notes" />
              </FormControl>
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" data-testid="button-submit-task">
          Crear tarea
        </Button>
      </form>
    </Form>
  );
}

const editSchema = z.object({
  title: z.string().min(3, 'Mínimo 3 caracteres'),
  assignee: z.string().min(1, 'Requerido'),
  dueDate: z.string().min(1, 'Requerido'),
  priority: taskPrioritySchema,
  status: taskStatusSchema,
  notes: z.string().optional(),
});
type EditValues = z.infer<typeof editSchema>;

export function EditTaskForm({ task, onDone }: { task: Task; onDone: () => void }) {
  const form = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      title: task.title,
      assignee: task.assignee,
      dueDate: task.dueDate,
      priority: task.priority,
      status: task.status,
      notes: task.notes ?? '',
    },
  });
  const submit = form.handleSubmit(async (values) => {
    try {
      await queueUpdateTask(task.id, {
        title: values.title,
        assignee: values.assignee,
        dueDate: values.dueDate,
        priority: values.priority,
        status: values.status,
        notes: values.notes || undefined,
      });
      toast.success('Tarea actualizada');
      onDone();
    } catch (err) {
      toast.error('No se pudo actualizar', { description: (err as Error).message });
    }
  });
  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={submit}>
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título</FormLabel>
              <FormControl>
                <Input {...field} data-testid="input-task-edit-title" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="assignee"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Responsable</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-task-edit-assignee" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vence</FormLabel>
                <FormControl>
                  <Input type="date" {...field} data-testid="input-task-edit-due" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prioridad</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger data-testid="select-task-edit-priority">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="low">Baja</SelectItem>
                    <SelectItem value="med">Media</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger data-testid="select-task-edit-status">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="in_progress">En curso</SelectItem>
                    <SelectItem value="done">Completada</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas</FormLabel>
              <FormControl>
                <Textarea rows={3} {...field} data-testid="input-task-edit-notes" />
              </FormControl>
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" data-testid="button-submit-task-edit">
          Guardar cambios
        </Button>
      </form>
    </Form>
  );
}
