import { PrismaClient, Rol } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "fredy@gmail.com";
  const adminPass = process.env.ADMIN_INITIAL_PASSWORD ?? "Cambiar123!";
  const adminNombre = process.env.ADMIN_NAME ?? "Fredy";
  const adminTel = process.env.ADMIN_TELEFONO ?? "+573118268444";

  const passwordHash = await bcrypt.hash(adminPass, 12);

  await prisma.user.upsert({
    where: { email: adminEmail.toLowerCase() },
    update: {},
    create: {
      nombreCompleto: adminNombre,
      email: adminEmail.toLowerCase(),
      telefono: adminTel,
      passwordHash,
      rol: Rol.ADMIN,
    },
  });

  console.log(
    `[seed] Admin "${adminNombre}" (${adminEmail}) verificado/creado.`
  );
  console.log(
    `[seed] Cambia la contrasena en el primer login desde /admin.`
  );
}

main()
  .catch((e) => {
    console.error("[seed] Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
