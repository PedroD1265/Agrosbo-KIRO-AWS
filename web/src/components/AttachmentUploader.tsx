import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Paperclip, Trash2, FileText, Image as ImageIcon } from "lucide-react";
import { useAttachments, queueUploadAttachment, queueDeleteAttachment } from "@/hooks/data";
import { toast } from "sonner";
import type { AttachmentEntityType } from "@shared/schema";

interface Props {
  entityType: AttachmentEntityType;
  entityId: string;
  readOnly?: boolean;
}

export function AttachmentUploader({ entityType, entityId, readOnly }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: items = [], isLoading } = useAttachments(entityType, entityId);
  const [uploading, setUploading] = useState(false);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const f of Array.from(files)) {
        await queueUploadAttachment({ entityType, entityId, file: f });
      }
      toast.success("Adjunto en cola", { description: "Se subirá cuando haya conexión." });
    } catch (err) {
      toast.error("No se pudo adjuntar", {
        description: err instanceof Error ? err.message : "Error desconocido",
      });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onDelete(id: string) {
    await queueDeleteAttachment(id);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">
          Adjuntos ({items.length})
        </p>
        {!readOnly && (
          <>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
              className="hidden"
              onChange={onPick}
              data-testid="input-attachment-file"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              data-testid="button-attach"
            >
              {uploading ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Paperclip className="mr-1 h-3.5 w-3.5" />}
              Adjuntar
            </Button>
          </>
        )}
      </div>
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Cargando…</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sin adjuntos</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {items.map((a) => {
            const isImg = a.mimeType.startsWith("image/");
            return (
              <Card key={a.id} className="overflow-hidden" data-testid={`card-attachment-${a.id}`}>
                {isImg && a.remoteUrl ? (
                  <a href={a.remoteUrl} target="_blank" rel="noreferrer" className="block">
                    <img
                      src={a.remoteUrl}
                      alt={a.fileName}
                      loading="lazy"
                      className="h-24 w-full object-cover"
                    />
                  </a>
                ) : (
                  <a
                    href={a.remoteUrl ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-24 w-full items-center justify-center bg-muted"
                  >
                    {a.mimeType === "application/pdf" ? (
                      <FileText className="h-10 w-10 text-muted-foreground" />
                    ) : (
                      <ImageIcon className="h-10 w-10 text-muted-foreground" />
                    )}
                  </a>
                )}
                <div className="flex items-center justify-between gap-1 px-2 py-1">
                  <p className="truncate text-[10px] text-muted-foreground" title={a.fileName}>
                    {a.fileName}
                  </p>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => onDelete(a.id)}
                      className="text-muted-foreground hover:text-destructive"
                      data-testid={`button-delete-attachment-${a.id}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
