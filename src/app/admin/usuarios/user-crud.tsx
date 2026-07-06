"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Rol } from "@prisma/client";
import { Edit3, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AdminActionResult } from "@/lib/types";
import { crearUsuarioAdmin, editarUsuarioAdmin, eliminarUsuarioAdmin } from "../actions";

type UserEditable = {
  id: string;
  nombreCompleto: string;
  email: string;
  telefono: string;
  rol: Rol;
};

const initial: AdminActionResult = { error: null, success: true };

function phoneLocal(value: string) {
  const digits = value.replace(/\D/g, "").slice(-10);
  return digits || value;
}

export function CrearUsuarioButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Crear usuario
      </Button>
      {open && <UsuarioModal title="Crear usuario" onClose={() => setOpen(false)} />}
    </>
  );
}

export function EditarUsuarioButton({ user }: { user: UserEditable }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Edit3 className="h-3 w-3" />
        Editar
      </Button>
      {open && (
        <UsuarioModal title="Editar usuario" user={user} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

export function EliminarUsuarioButton({
  userId,
  userName,
}: {
  userId: string;
  userName: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="danger"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (!confirm(`Vas a eliminar a ${userName} y su reserva asociada, si existe. ¿Continuar?`)) return;
          setMessage(null);
          startTransition(async () => {
            const result = await eliminarUsuarioAdmin(userId);
            setMessage(result.error ?? result.message ?? "Usuario eliminado.");
            if (!result.error) router.refresh();
          });
        }}
      >
        <Trash2 className="h-3 w-3" />
        Eliminar
      </Button>
      {message && <p className="max-w-56 text-right text-xs text-ash">{message}</p>}
    </div>
  );
}

function UsuarioModal({
  title,
  user,
  onClose,
}: {
  title: string;
  user?: UserEditable;
  onClose: () => void;
}) {
  const router = useRouter();
  const [result, setResult] = useState<AdminActionResult>(initial);
  const [pending, startTransition] = useTransition();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-taller-shadow/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-lg border border-taller-iron bg-taller-night p-5 shadow-modal">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl text-cream">{title}</h2>
          <button type="button" onClick={onClose} className="text-ash hover:text-cream">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          className="space-y-3"
          action={(formData) => {
            setResult(initial);
            startTransition(async () => {
              const next = user
                ? await editarUsuarioAdmin(initial, formData)
                : await crearUsuarioAdmin(initial, formData);
              setResult(next);
              if (!next.error) {
                router.refresh();
                onClose();
              }
            });
          }}
        >
          {user && <input type="hidden" name="userId" value={user.id} />}
          <Field label="Nombre" name="nombreCompleto" defaultValue={user?.nombreCompleto} />
          <Field label="Email" name="email" type="email" defaultValue={user?.email} />
          <Field label="Celular" name="telefono" defaultValue={user ? phoneLocal(user.telefono) : ""} />
          {!user && <Field label="Contraseña" name="password" type="password" defaultValue="" />}
          <label className="block">
            <span className="mb-1 block font-subhead text-xs uppercase tracking-widest text-ash">
              Rol
            </span>
            <select
              name="rol"
              defaultValue={user?.rol ?? Rol.USUARIO}
              className="h-11 w-full rounded-md border border-taller-iron bg-taller-shadow px-3 text-bone"
            >
              <option value={Rol.USUARIO}>Usuario</option>
              <option value={Rol.ADMIN}>Admin</option>
            </select>
          </label>

          {result.error && <p className="text-sm text-signal-rust">{result.error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue = "",
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block font-subhead text-xs uppercase tracking-widest text-ash">
        {label}
      </span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required
        className="h-11 w-full rounded-md border border-taller-iron bg-taller-shadow px-3 text-bone placeholder:text-ash/50 focus:border-ember-bright focus:outline-none"
      />
    </label>
  );
}
