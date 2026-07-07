export const ROL_PIC_OPTIONS = [
  "PASTOR",
  "LIDER",
  "SERVIDOR",
  "JOVEN",
  "ADULTO",
  "INVITADO",
  "OTRO",
] as const;

export type RolPicValue = (typeof ROL_PIC_OPTIONS)[number];

export const ROL_PIC_LABELS: Record<RolPicValue, string> = {
  PASTOR: "Pastor",
  LIDER: "Lider",
  SERVIDOR: "Servidor",
  JOVEN: "Joven",
  ADULTO: "Adulto",
  INVITADO: "Invitado",
  OTRO: "Otro",
};

export type TallerOption = {
  id: string;
  nombre: string;
  cupo: number | null;
};
