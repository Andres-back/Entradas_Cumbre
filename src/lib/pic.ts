export const ROL_PIC_OPTIONS = [
  "LIDER_ALIANZA_MENTOR",
  "COORDINADOR_IGLESIA_LOCAL",
  "LIDER_CASA_PAZ_GRUPO_CONEXION",
  "LIDER_ORACION",
  "PASTOR_ALIADO_PIC",
  "INVITADO",
] as const;

export type RolPicValue = (typeof ROL_PIC_OPTIONS)[number];

export const ROL_PIC_LABELS: Record<RolPicValue, string> = {
  LIDER_ALIANZA_MENTOR: "Lider de alianza (Mentor)",
  COORDINADOR_IGLESIA_LOCAL: "Coordinador de iglesia local",
  LIDER_CASA_PAZ_GRUPO_CONEXION: "Lider de casa de paz o grupo conexion",
  LIDER_ORACION: "Lider de oracion",
  PASTOR_ALIADO_PIC: "Pastor aliado a PIC",
  INVITADO: "Invitado",
};

export type TallerOption = {
  id: string;
  nombre: string;
  descripcion?: string | null;
  cupo: number | null;
  inscritos?: number;
};

export function rolPicLabel(value: string | null | undefined): string {
  if (!value) return "Sin rol";
  if (value in ROL_PIC_LABELS) return ROL_PIC_LABELS[value as RolPicValue];
  const legacy: Record<string, string> = {
    PASTOR: "Pastor",
    LIDER: "Lider",
    SERVIDOR: "Servidor",
    JOVEN: "Joven",
    ADULTO: "Adulto",
    OTRO: "Otro",
  };
  return legacy[value] ?? value;
}
