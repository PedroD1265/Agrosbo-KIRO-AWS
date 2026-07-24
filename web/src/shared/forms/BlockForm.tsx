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
import { queueCreateBlock, queueUpdateBlock } from '@/hooks/data/mutations';
import { cropStageSchema, operationalStatusSchema, type Block } from '@shared/schema';

const formSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  farm: z.string().min(2, 'Requerido'),
  crop: z.string().min(2, 'Requerido'),
  variety: z.string().optional(),
  areaHa: z.coerce.number().positive('Mayor a 0'),
  stage: cropStageSchema,
  status: operationalStatusSchema,
  lastIrrigation: z.string().min(1, 'Requerido'),
  alerts: z.coerce.number().int().nonnegative().default(0),
});

type FormValues = z.infer<typeof formSchema>;

interface Props {
  block?: Block;
  onDone: () => void;
}

export function BlockForm({ block, onDone }: Props) {
  const isEdit = Boolean(block);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: block
      ? {
          name: block.name,
          farm: block.farm,
          crop: block.crop,
          variety: block.variety ?? '',
          areaHa: block.areaHa,
          stage: block.stage,
          status: block.status,
          lastIrrigation: block.lastIrrigation,
          alerts: block.alerts,
        }
      : {
          name: '',
          farm: '',
          crop: '',
          variety: '',
          areaHa: 1,
          stage: 'veg',
          status: 'ok',
          lastIrrigation: new Date().toISOString().slice(0, 10),
          alerts: 0,
        },
  });

  const submit = form.handleSubmit(async (values) => {
    const payload = {
      ...values,
      variety: values.variety?.trim() ? values.variety.trim() : undefined,
    };
    try {
      if (isEdit && block) {
        await queueUpdateBlock(block.id, payload);
        toast.success('Bloque actualizado');
      } else {
        await queueCreateBlock(payload as unknown as Parameters<typeof queueCreateBlock>[0]);
        toast.success('Bloque creado', {
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
                <FormLabel>Nombre del bloque</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ej: Bloque A1"
                    autoFocus
                    {...field}
                    data-testid="input-block-name"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="farm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Predio</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: Predio Norte"
                      {...field}
                      data-testid="input-block-farm"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="areaHa"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Superficie (ha)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      {...field}
                      data-testid="input-block-area"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </FormSection>

        <FormSection title="Cultivo" description="Qué se está produciendo">
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="crop"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cultivo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Soya" {...field} data-testid="input-block-crop" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="variety"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Variedad <span className="text-muted-foreground">(opcional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Munasqa" {...field} data-testid="input-block-variety" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="stage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Etapa</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger data-testid="select-block-stage">
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
                      <SelectTrigger data-testid="select-block-status">
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

        <FormSection title="Riego" description="Última actualización conocida">
          <FormField
            control={form.control}
            name="lastIrrigation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Último riego</FormLabel>
                <FormControl>
                  <Input type="date" {...field} data-testid="input-block-irrigation" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </FormSection>

        <FormFooter offlineAware={!isEdit}>
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={submitting}
            data-testid="button-submit-block"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? 'Guardar cambios' : 'Crear bloque'}
          </Button>
        </FormFooter>
      </form>
    </Form>
  );
}
