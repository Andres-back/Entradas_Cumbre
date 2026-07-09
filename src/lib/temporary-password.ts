import { generateTempPassword } from "@/lib/code";

export type TemporaryPasswordMethod = "documento" | "celular" | "aleatoria";

export type TemporaryPasswordPlan = {
  method: TemporaryPasswordMethod;
  plaintext: string;
  instruction: string;
  reportLabel: string;
  generatedAutomatically: boolean;
};

export function normalizeDocumentForTemporaryPassword(
  documento: string | null | undefined
): string {
  return String(documento ?? "").replace(/[\s.-]/g, "");
}

export function normalizePhoneForTemporaryPassword(
  telefono: string | null | undefined
): string {
  const digits = String(telefono ?? "").replace(/\D/g, "");
  if (!digits) return "";

  // Colombian mobile phones: prefer the 10 national digits and avoid duplicating 57.
  if (digits.length === 12 && digits.startsWith("57") && digits[2] === "3") {
    return digits.slice(2);
  }
  if (digits.length === 10 && digits.startsWith("3")) {
    return digits;
  }

  return digits.length >= 7 && digits.length <= 15 ? digits : "";
}

export function buildTemporaryPasswordPlan(input: {
  documento?: string | null;
  telefono?: string | null;
}): TemporaryPasswordPlan {
  const documento = normalizeDocumentForTemporaryPassword(input.documento);
  if (documento) {
    return {
      method: "documento",
      plaintext: String(documento),
      instruction: "Tu contrasena temporal es tu numero de documento sin puntos, guiones ni espacios.",
      reportLabel: "Contrasena temporal basada en documento.",
      generatedAutomatically: false,
    };
  }

  const telefono = normalizePhoneForTemporaryPassword(input.telefono);
  if (telefono) {
    return {
      method: "celular",
      plaintext: String(telefono),
      instruction: telefono.length === 10
        ? "Tu contrasena temporal es tu numero de celular de 10 digitos."
        : "Tu contrasena temporal es tu numero de celular sin espacios, guiones, parentesis ni signo mas.",
      reportLabel: "Contrasena temporal basada en celular.",
      generatedAutomatically: false,
    };
  }

  return {
    method: "aleatoria",
    plaintext: generateTempPassword(),
    instruction: "Contrasena temporal generada automaticamente. Debe copiarse ahora; no podra recuperarse despues.",
    reportLabel: "Contrasena temporal generada automaticamente.",
    generatedAutomatically: true,
  };
}

export function isPasswordBasedOnPersonalData(input: {
  password: string;
  documento?: string | null;
  telefono?: string | null;
}): boolean {
  const password = String(input.password);
  const documento = normalizeDocumentForTemporaryPassword(input.documento);
  const telefono = normalizePhoneForTemporaryPassword(input.telefono);

  return (!!documento && password === documento) || (!!telefono && password === telefono);
}
