"use client";

import { useTransition } from "react";
import Link from "next/link";
import { reactivarReserva } from "../../actions";
import type { AdminActionResult } from "@/lib/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { ScanLine, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Link al validador (codigo de barras / escaneo).
 * Es la via preferida para registrar entradas individuales.
 */
export function IrAlValidadorButton() {
  return (
    <Link
      href="/admin/validar"
      className={cn(
        buttonVariants({ variant: "secondary", size: "md" }),
        "min-h-[44px] sm:min-h-0"
      )}
    >
      <ScanLine className="h-5 w-5" />
      Ir al validador
    </Link>
  );
}

export function ReactivarButton({ reservaId }: { reservaId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="secondary"
      disabled={pending}
      className="min-h-[44px] md:min-h-0 w-full sm:w-auto"
      onClick={() => {
        if (!confirm("¿Reactivar esta reserva como pendiente de pago?"))
          return;
        startTransition(async () => {
          const res: AdminActionResult = await reactivarReserva(reservaId);
          if (res.error) alert(res.error);
        });
      }}
    >
      <RotateCcw className="h-5 w-5" />
      {pending ? "Reactivando..." : "Reactivar reserva"}
    </Button>
  );
}
