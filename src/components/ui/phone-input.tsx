"use client";

import { forwardRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export interface PhoneInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  /** Valor controlado: solo los 10 digitos locales (sin +57). */
  value: string;
  /** Llamado con solo los 10 digitos. Si el usuario borra todo, llega "". */
  onChange: (digits: string) => void;
  /** Si la prop name debe quedar como `+57XXXXXXXXXX` en el FormData. */
  name?: string;
}

/**
 * Input de celular colombiano.
 * - Muestra el prefijo +57 como chip (no editable, refuerza el pais).
 * - El usuario solo escribe 10 digitos.
 * - En el FormData se envia como `+57XXXXXXXXXX` (E.164) listo para WhatsApp.
 */
export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  function PhoneInput({ value, onChange, name, className, ...rest }, ref) {
    const [digits, setDigits] = useState<string>(stripToDigits(value));

    useEffect(() => {
      // Si el padre cambia el valor externamente, sincronizamos.
      const incoming = stripToDigits(value);
      if (incoming !== digits) setDigits(incoming);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const next = stripToDigits(raw).slice(0, 10);
      setDigits(next);
      onChange(next);
    };

    const e164 = digits.length > 0 ? `+57${digits}` : "";
    const finalName = name && e164 ? name : undefined;

    return (
      <div
        className={cn(
          "flex h-11 w-full items-center rounded-md border border-taller-iron bg-taller-shadow overflow-hidden focus-within:border-ember-bright",
          className
        )}
      >
        <span
          className="flex h-full items-center gap-1.5 px-3 text-bone font-mono text-sm border-r border-taller-iron bg-taller-night select-none"
          aria-hidden="true"
        >
          <span aria-hidden="true" className="text-[11px] font-subhead tracking-wider text-ash">
            CO
          </span>
          <span className="text-ember-bright font-subhead">+57</span>
        </span>
        <input
          ref={ref}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          pattern="[0-9]{0,10}"
          maxLength={10}
          value={digits}
          onChange={handleChange}
          placeholder="300 123 4567"
          {...(finalName ? { name: finalName } : {})}
          {...rest}
          className="flex-1 h-full px-3 bg-transparent text-bone font-mono text-base placeholder:text-ash/50 focus:outline-none"
        />
      </div>
    );
  }
);

/** Deja solo digitos (0-9). */
function stripToDigits(s: string): string {
  return (s ?? "").replace(/\D/g, "");
}


