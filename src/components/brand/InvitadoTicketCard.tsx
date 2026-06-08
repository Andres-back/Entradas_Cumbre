"use client";

import { useState, useTransition } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import {
  Check,
  Download,
  Armchair,
  Hourglass,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EstadoInvitado } from "@prisma/client";

interface InvitadoTicketCardProps {
  numero: number;
  nombreCompleto: string;
  telefono: string;
  codigo: string | null;
  registradoEn: Date | null;
  mesaNumero: number | null;
  silla: number | null;
  estado: EstadoInvitado;
}

/**
 * Card de un invitado del grupo con su codigo unico (ADR-011).
 * - Muestra mesa + silla si estan asignados
 * - Boton "Descargar PNG" solo si tiene codigo
 * - PNG estilo garage vintage con QR para que Fredy lo escanee
 */
export function InvitadoTicketCard({
  numero,
  nombreCompleto,
  telefono,
  codigo,
  registradoEn,
  mesaNumero,
  silla,
  estado,
}: InvitadoTicketCardProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDownload = () => {
    if (!codigo) return;
    setError(null);
    startTransition(async () => {
      try {
        await descargarTicketPng({
          numero,
          nombreCompleto,
          telefono,
          codigo,
          mesaNumero,
          silla,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al generar PNG");
      }
    });
  };

  const isAsistio = estado === EstadoInvitado.ASISTIO || !!registradoEn;
  const isPagado = estado === EstadoInvitado.PAGADO;
  const telefonoLocal = formatLocal(telefono);

  return (
    <article
      className={cn(
        "rounded-lg border p-3 sm:p-4",
        isAsistio
          ? "border-signal-green/40 bg-signal-green/5"
          : isPagado
          ? "border-ember-bright/30 bg-ember-bright/5"
          : "border-taller-iron bg-taller-steel/50"
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "font-display text-2xl sm:text-3xl shrink-0 w-10 sm:w-12 text-center leading-none",
            isAsistio ? "text-signal-green" : "text-ember-bright"
          )}
        >
          {String(numero).padStart(2, "0")}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-subhead text-cream text-base sm:text-lg truncate">
            {nombreCompleto}
          </p>
          <p className="text-ash text-xs font-mono">{telefonoLocal}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap text-xs">
            {mesaNumero && silla ? (
              <span className="text-ember-bright font-subhead uppercase tracking-widest flex items-center gap-1">
                <Armchair className="h-3 w-3" /> Mesa {mesaNumero} · Silla{" "}
                {silla}
              </span>
            ) : (
              <span className="text-ash text-xs">Sin mesa asignada</span>
            )}
          </div>
          {codigo ? (
            <p
              className="font-mono text-base sm:text-xl text-ember-bright tracking-widest mt-2"
              style={{ fontFamily: "var(--font-special-elite), monospace" }}
            >
              {codigo}
            </p>
          ) : (
            <p className="text-ash text-xs mt-2 flex items-center gap-1">
              <Hourglass className="h-3 w-3" />               Código pendiente de pago
            </p>
          )}
          {isAsistio && (
            <p className="text-signal-green text-xs mt-2 flex items-center gap-1 font-subhead uppercase tracking-widest">
              <Check className="h-3 w-3" />               Entró a las{" "}
              {new Date(registradoEn as Date).toLocaleTimeString("es-CO", {
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>
      </div>

      {codigo && (
        <div className="mt-3 pt-3 border-t border-taller-iron/50">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={pending}
            onClick={handleDownload}
            className="w-full h-11"
          >
            <Download className="h-4 w-4" />
            {pending ? "Generando..." : "Descargar PNG"}
          </Button>
          {error && (
            <p className="text-signal-rust text-xs mt-2">{error}</p>
          )}
        </div>
      )}
    </article>
  );
}

/** Formato local colombiano 3-3-4. Devuelve el string sin cambios si no tiene 10 digitos. */
function formatLocal(telefono: string): string {
  const digits = (telefono ?? "").replace(/\D/g, "");
  if (digits.length < 10) return telefono;
  const d = digits.slice(-10);
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}

interface TicketPngParams {
  numero: number;
  nombreCompleto: string;
  telefono: string;
  codigo: string;
  mesaNumero: number | null;
  silla: number | null;
}

/**
 * Genera un PNG estilo "ticket" usando Canvas API nativa.
 * Layout: titulo evento, fecha, etiqueta, nombre, telefono, codigo,
 * mesa+silla (si estan), QR, footer.
 */
async function descargarTicketPng({
  numero,
  nombreCompleto,
  telefono,
  codigo,
  mesaNumero,
  silla,
}: TicketPngParams): Promise<void> {
  const W = 720;
  const tieneMesa = !!(mesaNumero && silla);
  const H = tieneMesa ? 1280 : 1140;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D no disponible");

  ctx.fillStyle = "#1a1410";
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "rgba(232, 168, 89, 0.04)";
  ctx.lineWidth = 1;
  for (let y = 0; y < H; y += 4) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "#3d322a";
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, W - 40, H - 40);

  ctx.fillStyle = "#1a1410";
  for (let i = 0; i < 20; i++) {
    const cy = 40 + i * ((H - 80) / 19);
    ctx.beginPath();
    ctx.arc(12, cy, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(W - 12, cy, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  // Y positions explicit. QR must end well before footer.
  // With mesa:    QR 830-1050 | footer 1140 / 1210
  // Without mesa: QR 720-940  | footer 1020 / 1090
  const QR_TOP = tieneMesa ? 830 : 720;
  const QR_SIZE = 220;
  const FOOTER_Y = tieneMesa ? 1140 : 1020;
  const SUBFOOTER_Y = tieneMesa ? 1200 : 1080;

  // Header
  ctx.textAlign = "center";
  ctx.fillStyle = "#e8a859";
  ctx.font = "bold 18px monospace";
  ctx.fillText(`INVITADO 0${numero}`, W / 2, 80);

  ctx.fillStyle = "#f3e3c2";
  ctx.font = "bold 56px Georgia, serif";
  ctx.fillText("BAJO EL CAPÓ", W / 2, 150);

  ctx.fillStyle = "#b8a690";
  ctx.font = "22px Georgia, serif";
  ctx.fillText("Sábado 20 de junio · 6:00 pm", W / 2, 195);

  ctx.strokeStyle = "#3d322a";
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(60, 230);
  ctx.lineTo(W - 60, 230);
  ctx.stroke();
  ctx.setLineDash([]);

  // Nombre
  ctx.fillStyle = "#8a7a6a";
  ctx.font = "bold 18px monospace";
  ctx.fillText("NOMBRE", W / 2, 290);

  const nombreMaxWidth = W - 120;
  let nombreFontSize = 40;
  ctx.font = `bold ${nombreFontSize}px Georgia, serif`;
  while (
    ctx.measureText(nombreCompleto).width > nombreMaxWidth &&
    nombreFontSize > 20
  ) {
    nombreFontSize -= 2;
    ctx.font = `bold ${nombreFontSize}px Georgia, serif`;
  }
  ctx.fillStyle = "#f3e3c2";
  ctx.fillText(nombreCompleto, W / 2, 340);

  // Telefono (formato local 3-3-4 para mejor lectura)
  const telefonoLocal = formatLocal(telefono);
  ctx.fillStyle = "#8a7a6a";
  ctx.font = "bold 16px monospace";
  ctx.fillText("TELÉFONO", W / 2, 400);
  ctx.fillStyle = "#b8a690";
  ctx.font = "28px 'Courier New', monospace";
  ctx.fillText(telefonoLocal, W / 2, 440);

  ctx.strokeStyle = "#3d322a";
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(60, 490);
  ctx.lineTo(W - 60, 490);
  ctx.stroke();
  ctx.setLineDash([]);

  // Mesa + silla (solo si estan asignadas)
  let codigoLabelY = 560;
  let codigoTextY = 670;
  if (tieneMesa) {
    ctx.fillStyle = "#8a7a6a";
    ctx.font = "bold 18px monospace";
    ctx.fillText("MESA Y SILLA", W / 2, 560);
    ctx.fillStyle = "#e8a859";
    ctx.font = "bold 56px Georgia, serif";
    ctx.fillText(`Mesa ${mesaNumero} · Silla ${silla}`, W / 2, 630);
    codigoLabelY = 700;
    codigoTextY = 790;
  }

  // Codigo
  ctx.fillStyle = "#8a7a6a";
  ctx.font = "bold 18px monospace";
  ctx.fillText("CÓDIGO DE ENTRADA", W / 2, codigoLabelY);

  ctx.fillStyle = "#e8a859";
  ctx.font = "bold 72px 'Courier New', monospace";
  ctx.fillText(codigo, W / 2, codigoTextY);

  // QR
  const qrDataUrl = await QRCode.toDataURL(codigo, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 320,
    color: { dark: "#1a1410", light: "#f3e3c2" },
  });
  const qrImg = await loadImage(qrDataUrl);
  ctx.drawImage(qrImg, (W - QR_SIZE) / 2, QR_TOP, QR_SIZE, QR_SIZE);

  // Footer (debajo del QR con margen >= 60px)
  ctx.fillStyle = "#b8a690";
  ctx.font = "16px Georgia, serif";
  ctx.fillText(
    "Muestra este código o escanea el QR al validar",
    W / 2,
    FOOTER_Y
  );
  ctx.fillStyle = "#8a7a6a";
  ctx.font = "14px monospace";
  ctx.fillText("Un solo uso · BajoelCapo 2026", W / 2, SUBFOOTER_Y);

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error("No se pudo generar el PNG"));
    }, "image/png");
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `bajo-el-capo-${codigo.toLowerCase()}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo cargar la imagen"));
    img.src = src;
  });
}
