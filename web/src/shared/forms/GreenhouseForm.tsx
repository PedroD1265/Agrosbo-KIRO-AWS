import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { FormSection } from './FormSection';
import { FormFooter } from './FormFooter';
import { queueCreateGreenhouse, queueUpdateGreenhouse } from '@/hooks/data/mutations';
import { cropStageSchema, operationalStatusSchema, type Greenhouse } from '@shared/schema';

const formSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  areaM2: z.coerce.number().positive('Mayor a 0'),
  crop: z.string().min(2, 'Requerido'),
  variety: z.string().optional(),
  stage: cropStageSchema,
  status: operationalStatusSchema,
  alerts: z.coerce.number().int().nonnegative().default(0),
  tempC: z.union([z.coerce.number(), z.literal('')]).optional(),
  humidity: z.union([z.coerce.number().min(0).max(100), z.literal('')]).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface Props {
  greenhouse?: Greenhouse;
  onDone: () => void;
}

export function GreenhouseForm({ greenhouse, onDone }: Props) {
  const isEdit = Boolean(greenhouse);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: greenhouse
      ? {
          name: greenhouse.name,
          areaM2: greenhouse.areaM2,
          crop: greenhouse.crop,
          variety: greenhouse.variety ?? '',
          stage: greenhouse.stage,
          status: greenhouse.status,
          alerts: greenhouse.alerts,
          tempC: greenhouse.tempC ?? '',
          humidity: greenhouse.humidity ?? '',
        }
      : {
          name: '',
          areaM2: 100,
          crop: '',
          variety: '',
          stage: 'veg',
          status: 'ok',
          alerts: 0,
          tempC: '',
          humidity: '',
        },
  });

  const submit = form.handleSubmit(async (values) => {
    const payload = {
      name: values.name,
      areaM2: values.areaM2,
      crop: values.crop,
      variety: values.variety?.trim() ? values.variety.trim() : undefined,
      stage: values.stage,
      status: values.status,
      alerts: values.alerts,
      tempC: values.tempC === '' || values.tempC === undefined ? undefined : Number(values.tempC),
      humidity:
        values.humidity === '' || values.humidity === undefined
          ? undefined
          : Number(values.humidity),
    };
    try {
      if (isEdit && greenhouse) {
        await queueUpdateGreenhouse(greenhouse.id, payload);
        toast.success('Invernadero actualizado');
      } else {
        await queueCreateGreenhouse(
          payload as unknown as Parameters<typeof queueCreateGreenhouse>[0],
        );
        toast.success('Invernadero creado', {
          description: navigator.onLine
            ? 'Sincronizando…'
            : 'Encolado offline. Se enviará al recuperar internet.',
        });
      }
      form.reset();
      onDone();
    } catch (err) {
      toast.error(isEdit ? 'No se pudo actualizar' : 'No se pudo crear', {
        description: (err as Error).message,
      });
    }
  });

  const submitting = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form className="space-y-6" onSubmit={submit}>
        <FormSection title="Identificación" description="Cómo lo reconoces en campo">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre del invernadero</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ej: Invernadero N1"
                    autoFocus
                    {...field}
                    data-testid="input-gh-name"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="areaM2"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Superficie (m²)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="numeric"
                      step="1"
                      {...field}
                      data-testid="input-gh-area"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="crop"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cultivo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Tomate" {...field} data-testid="input-gh-crop" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="variety"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Variedad <span className="text-muted-foreground">(opcional)</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Cherry" {...field} data-testid="input-gh-variety" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </FormSection>

        <FormSection title="Estado" description="Etapa del cultivo y estado operativo">
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="stage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Etapa</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger data-testid="select-gh-stage">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="seed">Semilla</SelectItem>
                      <SelectItem value="veg">Vegetativo</SelectItem>
                      <SelectItem value="flower">Floración</SelectItem>
                      <SelectItem value="harvest">Cosecha</SelectItem>
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
                  <FormLabel>Estado operativo</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger data-testid="select-gh-status">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ok">OK · Normal</SelectItem>
                      <SelectItem value="warn">Atención</SelectItem>
                      <SelectItem value="critical">Crítico</SelectItem>
                      <SelectItem value="idle">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </FormSection>

        <FormSection title="Condiciones ambientales" description="Lecturas actuales (opcional)">
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="tempC"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Temperatura (°C)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      placeholder="—"
                      {...field}
                      data-testid="input-gh-temp"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="humidity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Humedad (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="numeric"
                      step="1"
                      placeholder="—"
                      {...field}
                      data-testid="input-gh-humidity"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </FormSection>

        <FormFooter offlineAware={!isEdit}>
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={submitting}
            data-testid="button-submit-gh"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? 'Guardar cambios' : 'Crear invernadero'}
          </Button>
        </FormFooter>
      </form>
    </Form>
  );
}
