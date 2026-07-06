import { PrismaClient, Rol } from "@prisma/client";
import bcrypt from "bcrypt";
import { EVENT_CONFIG } from "../src/config/event";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  const adminPass = process.env.ADMIN_PASSWORD ?? process.env.ADMIN_INITIAL_PASSWORD;
  const adminNombre = process.env.ADMIN_NAME ?? "Administrador";
  const adminTel = process.env.ADMIN_TELEFONO ?? "";

  if (!adminEmail) {
    throw new Error(
      "Define ADMIN_EMAIL antes de ejecutar prisma db seed."
    );
  }

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
    select: { id: true },
  });

  if (!existingAdmin && !adminPass) {
    throw new Error(
      "Define ADMIN_PASSWORD para crear el admin inicial."
    );
  }

  const passwordHash = adminPass ? await bcrypt.hash(adminPass, 12) : null;

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      nombreCompleto: adminNombre,
      telefono: adminTel,
      rol: Rol.ADMIN,
      debeCambiarContrasena: false,
      ...(passwordHash ? { passwordHash } : {}),
    },
    create: {
      nombreCompleto: adminNombre,
      email: adminEmail,
      telefono: adminTel,
      passwordHash: passwordHash!,
      rol: Rol.ADMIN,
      debeCambiarContrasena: false,
    },
  });

  await prisma.configuracion.upsert({
    where: { id: "singleton" },
    update: {
      organizadorNombre: adminNombre,
      organizadorEmail: adminEmail,
      organizadorTelefono: adminTel,
      organizadorWhatsapp: process.env.WHATSAPP_ADMIN_NUMBER ?? "",
    },
    create: {
      id: "singleton",
      nombre: EVENT_CONFIG.name,
      fecha: new Date(`${EVENT_CONFIG.startDate}T00:00:00-05:00`),
      puertas: "",
      lugar: EVENT_CONFIG.venue,
      barrio: EVENT_CONFIG.address,
      ciudad: EVENT_CONFIG.city,
      aforo: EVENT_CONFIG.capacity ?? 0,
      precioPorPersona: EVENT_CONFIG.registrationContribution,
      organizadorNombre: adminNombre,
      organizadorEmail: adminEmail,
      organizadorTelefono: adminTel,
      organizadorWhatsapp: process.env.WHATSAPP_ADMIN_NUMBER ?? "",
    },
  });

  console.log(`[seed] Admin "${adminNombre}" (${adminEmail}) verificado/creado.`);
  console.log(`[seed] Configuracion inicial de ${EVENT_CONFIG.name} verificada/creada.`);
}

main()
  .catch((e) => {
    console.error("[seed] Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
