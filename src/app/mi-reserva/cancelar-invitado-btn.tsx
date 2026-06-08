"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { X } from "lucide-react";
import { cancelarInvitado, type CancelarInvitadoState } from "@/app/reservar/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const initial: CancelarInvitadoState = { error: null };

export function CancelarInvitadoBtn({ invitadoId }: { invitadoId: string }) {
  const router = useRouter();

  const action = async (_prev: CancelarInvitadoState, fd: FormData) => {
    const r = await cancelarInvitado(_prev, fd);
    if (r.success) {
      toast.success("Invitado removido.");
      router.refresh();
    } else if (r.error) {
      toast.error(r.error);
    }
    return r;
  };

  const [, formAction] = useActionState(action, initial);

  return (
    <form action={formAction}>
      <input type="hidden" name="invitadoId" value={invitadoId} />
      <CancelSubmitBtn />
    </form>
  );
}

function CancelSubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label="Cancelar este invitado"
      className="text-signal-rust hover:text-red-400 text-xs flex items-center gap-1 p-2 min-h-[44px] min-w-[44px] disabled:opacity-50"
    >
      <X className="h-4 w-4" />
      {pending ? "..." : "Quitar"}
    </button>
  );
}
