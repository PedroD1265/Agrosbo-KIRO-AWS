import { Link, useLocation } from "react-router-dom";
import { EmptyState } from "@/shared/ui/EmptyState";
import { Button } from "@/components/ui/button";
import { Compass, ArrowLeft } from "lucide-react";

export default function NotFoundPage() {
  const location = useLocation();
  return (
    <div className="mx-auto max-w-2xl py-6">
      <EmptyState
        icon={Compass}
        title="Página no encontrada"
        description={`La ruta ${location.pathname} no existe en AgrosBO. Vuelve al panel de hoy o navega desde el menú lateral.`}
        action={
          <Button asChild size="sm">
            <Link to="/today">
              <ArrowLeft className="h-4 w-4" /> Ir a Today
            </Link>
          </Button>
        }
        secondaryAction={
          <Button asChild size="sm" variant="outline">
            <Link to="/blocks">Ver bloques</Link>
          </Button>
        }
      />
    </div>
  );
}
