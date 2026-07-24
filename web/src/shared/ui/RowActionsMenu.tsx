import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface ExtraAction {
  key: string;
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  testId?: string;
}

interface Props {
  testId: string;
  onEdit?: () => void;
  onDelete?: () => void;
  editLabel?: string;
  deleteLabel?: string;
  extraItems?: ExtraAction[];
}

export function RowActionsMenu({
  testId,
  onEdit,
  onDelete,
  editLabel = 'Editar',
  deleteLabel = 'Eliminar',
  extraItems = [],
}: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => e.stopPropagation()}
          data-testid={`button-actions-${testId}`}
          aria-label="Acciones"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        {extraItems.map((item) => {
          const Icon = item.icon;
          return (
            <DropdownMenuItem
              key={item.key}
              onClick={item.onSelect}
              data-testid={item.testId ?? `action-${item.key}-${testId}`}
            >
              {Icon && <Icon className="h-4 w-4" />} {item.label}
            </DropdownMenuItem>
          );
        })}
        {extraItems.length > 0 && (onEdit || onDelete) && <DropdownMenuSeparator />}
        {onEdit && (
          <DropdownMenuItem onClick={onEdit} data-testid={`action-edit-${testId}`}>
            <Pencil className="h-4 w-4" /> {editLabel}
          </DropdownMenuItem>
        )}
        {onEdit && onDelete && <DropdownMenuSeparator />}
        {onDelete && (
          <DropdownMenuItem
            onClick={onDelete}
            className="text-destructive focus:text-destructive"
            data-testid={`action-delete-${testId}`}
          >
            <Trash2 className="h-4 w-4" /> {deleteLabel}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
