/**
 * Importador CLI de datos CSV para Cumbre Impacto Putumayo 2026.
 *
 * Modos:
 *   --dry-run              # Analiza CSV sin modificar DB
 *   --apply                # Importa personas nuevas a la DB
 *
 * Parámetros:
 *   --file <ruta>          # Ruta al archivo CSV
 *   --db-url <url>         # Opcional: URL de base de datos (default: DATABASE_URL del env)
 *   --expected-db <name>   # Validar nombre de la base de datos
 *   --expected-sha256 <h>  # SHA-256 del archivo aprobado (obligatorio en --apply)
 *   --output <ruta>        # Opcional: ruta para guardar preview de dry-run
 *
 * Uso:
 *   pnpm tsx scripts/importar-datos-cumbre.ts --file datos.csv --dry-run
 *   pnpm tsx scripts/importar-datos-cumbre.ts --file datos.csv --apply --expected-sha256 <hash>
 */
import * as fs from "fs";
import * as crypto from "crypto";
import { PrismaClient } from "@prisma/client";

// ============================================================
// CLI arguments
// ============================================================
function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag: string): string | undefined => {
    const idx = args.indexOf(flag);
    return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined;
  };
  const has = (flag: string) => args.includes(flag);
  return {
    file: get("--file"),
    dbUrl: get("--db-url"),
    expectedDb: get("--expected-db"),
    expectedSha256: get("--expected-sha256"),
    output: get("--output") || "import_preview_output.csv",
    dryRun: has("--dry-run"),
    apply: has("--apply"),
  };
}

// ============================================================
// CSV parsing
// ============================================================
function parseCSV(content: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) throw new Error("CSV debe tener al menos encabezados + 1 fila");
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map((line) => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === "," && !inQuotes) { values.push(current.trim()); current = ""; continue; }
      current += ch;
    }
    values.push(current.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] || ""; });
    return row;
  });
  return { headers, rows };
}

function getValue(row: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    if (row[k] && row[k].trim()) return row[k].trim();
  }
  return "";
}

// ============================================================
// Normalization
// ============================================================
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeDoc(doc: string): string {
  return doc.replace(/[.\s-]/g, "").trim();
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  if (digits.length === 13 && digits.startsWith("57")) return `+${digits}`;
  if (digits.length === 12 && digits.startsWith("57")) return `+${digits}`;
  if (digits.length === 10) return `+57${digits}`;
  if (digits.length > 7) return `+${digits}`;
  return phone.trim();
}

function generatePassword(input: string): string {
  return input.replace(/[.\s-]/g, "").trim();
}

// ============================================================
// Classification
// ============================================================
type Clasificacion = "NUEVA" | "YA_EXISTE" | "DUPLICADA_EN_CSV" | "AMBIGUA" | "INVALIDA" | "REQUIERE_REVISION";

type FilaAnalisis = {
  fila: number;
  nombre: string;
  email: string;
  documento: string;
  telefono: string;
  clasificacion: Clasificacion;
  camposPendientes: string[];
  conflicto: string;
  motivo: string;
  detalle: string;
};

function analizarFilas(
  rows: Record<string, string>[],
  existingEmails: Set<string>,
  existingDocs: Set<string>,
  existingPhones: Set<string>,
): FilaAnalisis[] {
  const result: FilaAnalisis[] = [];
  const seenEmails = new Map<string, number>();
  const seenDocs = new Map<string, number>();
  const seenPhones = new Map<string, number>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const fila = i + 2; // +2 por header y 0-index
    const nombre = getValue(row, "Nombre original", "nombre", "Nombre", "nombreCompleto", "NOMBRE");
    const email = normalizeEmail(getValue(row, "Correo normalizado", "Correo", "correo", "email", "Email", "EMAIL"));
    const documento = normalizeDoc(getValue(row, "Documento normalizado", "Documento", "documento", "Documento", "DOCUMENTO"));
    const telefono = normalizePhone(getValue(row, "WhatsApp normalizado", "WhatsApp", "Telefono", "telefono", "Celular", "celular", "TELEFONO"));

    const accionPrevia = getValue(row, "Accion propuesta", "accion", "ACCION");

    const pendientes: string[] = [];
    if (!email) pendientes.push("Correo");
    if (!documento && !telefono) pendientes.push("Documento/Telefono");
    if (!documento) pendientes.push("Documento");
    if (!telefono) pendientes.push("WhatsApp");

    let clasificacion: Clasificacion = "NUEVA";
    let conflicto = "";
    let motivo = "";

    if (accionPrevia === "YA_EXISTE" || accionPrevia === "DUPLICADA_EN_CSV") {
      clasificacion = accionPrevia as Clasificacion;
      conflicto = getValue(row, "Conflicto");
      motivo = getValue(row, "Motivo");
    } else {
      if (!email || !nombre) {
        clasificacion = "INVALIDA";
        motivo = !email ? "Correo requerido" : "Nombre requerido";
      } else if (!documento && !telefono) {
        clasificacion = "REQUIERE_REVISION";
        motivo = "Documento y teléfono faltantes. Se requiere revisión manual.";
      } else if (existingEmails.has(email)) {
        clasificacion = "YA_EXISTE";
        conflicto = "correo existente";
        motivo = "Persona ya registrada; se omite sin modificar.";
      } else if (existingDocs.has(documento) && documento) {
        clasificacion = "YA_EXISTE";
        conflicto = "documento existente";
        motivo = "Documento ya registrado; se omite sin modificar.";
      } else if (existingPhones.has(telefono) && telefono) {
        clasificacion = "YA_EXISTE";
        conflicto = "teléfono existente";
        motivo = "Teléfono ya registrado; se omite sin modificar.";
      } else {
        if (seenEmails.has(email)) {
          clasificacion = "DUPLICADA_EN_CSV";
          conflicto = `email repetido en fila ${seenEmails.get(email)}`;
          motivo = "La persona aparece más de una vez en el CSV; se omite esta repetición.";
        } else if (seenDocs.has(documento) && documento) {
          clasificacion = "DUPLICADA_EN_CSV";
          conflicto = `documento repetido en fila ${seenDocs.get(documento)}`;
          motivo = "Documento duplicado en CSV; se omite.";
        } else if (seenPhones.has(telefono) && telefono) {
          clasificacion = "DUPLICADA_EN_CSV";
          conflicto = `teléfono repetido en fila ${seenPhones.get(telefono)}`;
          motivo = "Teléfono duplicado en CSV; se omite.";
        }
      }
    }

    seenEmails.set(email, fila);
    if (documento) seenDocs.set(documento, fila);
    if (telefono) seenPhones.set(telefono, fila);

    const detalle = pendientes.length > 0 ? `Campos pendientes: ${pendientes.join(", ")}` : "";

    result.push({ fila, nombre, email, documento, telefono, clasificacion, camposPendientes: pendientes, conflicto, motivo, detalle });
  }

  return result;
}

// ============================================================
// Main
// ============================================================
async function main() {
  const args = parseArgs();

  if (!args.file) {
    console.error("ERROR: Debes especificar --file <ruta>");
    process.exit(1);
  }
  if (!args.dryRun && !args.apply) {
    console.error("ERROR: Debes especificar --dry-run o --apply");
    process.exit(1);
  }
  if (args.dryRun && args.apply) {
    console.error("ERROR: No puedes usar --dry-run y --apply simultáneamente");
    process.exit(1);
  }

  if (!fs.existsSync(args.file)) {
    console.error(`ERROR: Archivo no encontrado: ${args.file}`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(args.file, "utf-8");
  const fileSha256 = crypto.createHash("sha256").update(fileContent).digest("hex");

  console.log(`\n========================================`);
  console.log(`  CUMBRE IMPACTO - IMPORTADOR DE DATOS`);
  console.log(`  Modo: ${args.apply ? "APPLY" : "DRY-RUN"}`);
  console.log(`========================================\n`);
  console.log(`Archivo: ${args.file}`);
  console.log(`Tamaño: ${fileContent.length} bytes`);
  console.log(`SHA-256: ${fileSha256}`);
  console.log("");

  if (args.apply && args.expectedSha256 && fileSha256 !== args.expectedSha256) {
    console.error(`ERROR: SHA-256 no coincide.`);
    console.error(`  Esperado: ${args.expectedSha256}`);
    console.error(`  Actual:   ${fileSha256}`);
    console.error("  El archivo cambió desde la aprobación. Abortando.");
    process.exit(1);
  }

  const { headers, rows } = parseCSV(fileContent);
  console.log(`Encabezados: ${headers.join(", ")}`);
  console.log(`Filas de datos: ${rows.length}`);
  console.log("");

  // Conectar DB
  let prisma: PrismaClient | null = null;
  const dbUrl = args.dbUrl || process.env.DATABASE_URL;
  if (dbUrl) {
    try {
      prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
      await prisma.$connect();

      const dbName = dbUrl.includes("cumbre_impacto") ? "cumbre_impacto" : "desconocida";
      if (args.expectedDb && dbName !== args.expectedDb) {
        console.error(`ERROR: Base de datos esperada: ${args.expectedDb}, actual: ${dbName}`);
        await prisma.$disconnect();
        process.exit(1);
      }
      console.log(`Base de datos: ${dbName}`);
    } catch (err) {
      console.warn(`No se pudo conectar a la DB. La detección de duplicados se basará solo en el CSV.`);
      console.warn(`  Error: ${(err as Error).message}`);
      prisma = null;
    }
  } else {
    console.warn("No se especificó URL de base de datos. Se usará detección local solamente.");
  }

  // Obtener datos existentes de DB
  const existingEmails = new Set<string>();
  const existingDocs = new Set<string>();
  const existingPhones = new Set<string>();

  if (prisma) {
    try {
      const users = await prisma.user.findMany({
        select: { email: true, documento: true, telefono: true },
      });
      for (const u of users) {
        existingEmails.add(u.email.toLowerCase());
        if (u.documento) existingDocs.add(normalizeDoc(u.documento));
        if (u.telefono) existingPhones.add(normalizePhone(u.telefono));
      }
      console.log(`Usuarios existentes en DB: ${users.length}`);
    } catch (err) {
      console.warn(`Error consultando usuarios: ${(err as Error).message}`);
    }
  }

  // Analizar filas
  const analisis = analizarFilas(rows, existingEmails, existingDocs, existingPhones);

  // Resumen
  const totales: Record<string, number> = {};
  for (const a of analisis) {
    totales[a.clasificacion] = (totales[a.clasificacion] || 0) + 1;
  }

  console.log(`\n--- RESUMEN ---`);
  console.log(`Total filas:        ${analisis.length}`);
  console.log(`NUEVAS:             ${totales["NUEVA"] || 0}`);
  console.log(`YA_EXISTE:          ${totales["YA_EXISTE"] || 0}`);
  console.log(`DUPLICADAS_EN_CSV:  ${totales["DUPLICADA_EN_CSV"] || 0}`);
  console.log(`AMBIGUAS:           ${totales["AMBIGUA"] || 0}`);
  console.log(`INVALIDAS:          ${totales["INVALIDA"] || 0}`);
  console.log(`REQUIERE_REVISION:  ${totales["REQUIERE_REVISION"] || 0}`);
  console.log("");

  // Campos pendientes
  const camposCount: Record<string, number> = {};
  for (const a of analisis) {
    for (const c of a.camposPendientes) {
      camposCount[c] = (camposCount[c] || 0) + 1;
    }
  }
  if (Object.keys(camposCount).length > 0) {
    console.log("--- CAMPOS PENDIENTES (filas afectadas) ---");
    for (const [campo, count] of Object.entries(camposCount).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${campo}: ${count}`);
    }
    console.log("");
  }

  // Detalle por fila
  console.log("--- DETALLE POR FILA ---");
  console.log("Fila|Nombre|Email|Clasificacion|Campos pendientes|Conflicto|Motivo");
  for (const a of analisis) {
    console.log(`${a.fila}|${a.nombre}|${a.email}|${a.clasificacion}|${a.camposPendientes.join("; ")}|${a.conflicto}|${a.motivo}`);
  }
  console.log("");

  // === APPLY ===
  if (args.apply) {
    if (!prisma) {
      console.error("ERROR: No hay conexión a base de datos. Abortando.");
      process.exit(1);
    }

    const nuevas = analisis.filter((a) => a.clasificacion === "NUEVA");
    console.log(`--- IMPORTANDO ${nuevas.length} PERSONAS NUEVAS ---`);

    let importadas = 0;
    let errores = 0;

    for (const fila of nuevas) {
      try {
        const tempPassword = generatePassword(fila.documento || fila.telefono || "");
        if (!tempPassword) {
          console.warn(`  [${fila.fila}] Saltando: sin documento ni teléfono para contraseña`);
          errores++;
          continue;
        }

        const bcrypt = await import("bcrypt");
        const hash = await bcrypt.hash(tempPassword, 12);

        await prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              nombreCompleto: fila.nombre,
              email: fila.email,
              telefono: fila.telefono,
              passwordHash: hash,
              documento: fila.documento || null,
              debeCambiarContrasena: true,
            },
          });

          const reserva = await tx.reserva.create({
            data: {
              userId: user.id,
              valorTotal: 0,
            },
          });

          await tx.invitado.create({
            data: {
              reservaId: reserva.id,
              numero: 1,
              nombreCompleto: fila.nombre,
              telefono: fila.telefono,
              emailContacto: fila.email,
              documento: fila.documento || null,
            },
          });
        });

        importadas++;
        console.log(`  ✓ [${fila.fila}] ${fila.nombre} (${fila.email})`);
      } catch (err) {
        errores++;
        console.error(`  ✗ [${fila.fila}] ${fila.nombre}: ${(err as Error).message}`);
      }
    }

    console.log(`\nImportadas: ${importadas}, Errores: ${errores}`);
  }

  // Generar preview CSV
  const previewHeaders = [
    "Numero de fila,Nombre original,Correo normalizado,Documento normalizado,WhatsApp normalizado," +
    "Taller detectado,Accion propuesta,Campos pendientes,Conflicto,Motivo"
  ];
  const previewRows = analisis.map((a) =>
    `${a.fila},"${a.nombre}","${a.email}","${a.documento}","${a.telefono}",,${a.clasificacion},"${a.camposPendientes.join("; ")}","${a.conflicto}","${a.motivo}"`
  );
  const previewContent = [...previewHeaders, ...previewRows].join("\n");

  if (args.output) {
    fs.writeFileSync(args.output, previewContent, "utf-8");
    console.log(`Preview guardado en: ${args.output}`);
  }

  console.log(`SHA-256 del archivo procesado: ${fileSha256}`);

  if (args.dryRun) {
    console.log("\n✅ DRY-RUN COMPLETADO. No se modificó la base de datos.");
  } else {
    console.log("\n✅ APPLY COMPLETADO.");
  }

  if (prisma) await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
