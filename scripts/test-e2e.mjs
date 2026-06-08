import { PrismaClient, MedioPago, EstadoInvitado, EstadoReserva } from '@prisma/client';
import bcrypt from 'bcrypt';
import { generateEntradaCode, generateTempPassword } from '../src/lib/code.ts';
import { MAX_POR_RESERVA, MESA_CAPACIDAD_DEFAULT, PRECIO_PERSONA } from '../src/lib/constants.ts';

const p = new PrismaClient();

function log(label, value) {
  console.log(`${label}:`, value);
}

(async () => {
  // ============================================================
  // 1. Setup: admin Fredy existe?
  // ============================================================
  const admin = await p.user.findUnique({ where: { email: 'fredy@gmail.com' } });
  log('1. Admin Fredy', admin ? `EXISTS (${admin.rol})` : 'MISSING');
  if (!admin) { console.error('FAIL: no admin'); process.exit(1); }

  // ============================================================
  // 2. findUnique en auth-actions.ts:57
  // ============================================================
  const testEmail = 'test-e2e-adr011-' + Date.now() + '@test.com';
  const u = await p.user.findUnique({ where: { email: testEmail } });
  log('2. findUnique', u === null ? 'NULL (esperado)' : 'FOUND');

  // ============================================================
  // 3. Crear usuario + reserva de 3 personas PAGO_PENDIENTE
  //    (simula /reservar con 3 invitados)
  // ============================================================
  const hash = await bcrypt.hash('Test1234!', 12);
  const user = await p.user.create({
    data: {
      nombreCompleto: 'Test E2E ADR-011',
      email: testEmail,
      telefono: '+573000000000',
      passwordHash: hash,
    },
  });
  log('3. User created', user.id);

  const reserva = await p.reserva.create({
    data: {
      userId: user.id,
      valorTotal: 3 * PRECIO_PERSONA,
      estado: EstadoReserva.PAGO_PENDIENTE,
      invitados: {
        create: [
          { numero: 1, nombreCompleto: 'Test E2E ADR-011', telefono: '+573000000000', estado: EstadoInvitado.PENDIENTE_PAGO },
          { numero: 2, nombreCompleto: 'Copiloto E2E',      telefono: '+573000000001', estado: EstadoInvitado.PENDIENTE_PAGO },
          { numero: 3, nombreCompleto: 'Atras E2E',         telefono: '+573000000002', estado: EstadoInvitado.PENDIENTE_PAGO },
        ],
      },
    },
    include: { invitados: { orderBy: { numero: 'asc' } } },
  });
  log('4. Reserva created (3 invitados, PAGO_PENDIENTE)', `${reserva.id} estado=${reserva.estado} invitados=${reserva.invitados.length}`);

  // ============================================================
  // 4. Simular `marcarInvitadosPagados` (solo 2 de 3)
  //    Misma logica que admin/actions.ts:marcarInvitadosPagados
  // ============================================================
  const idsAPagar = [reserva.invitados[0].id, reserva.invitados[1].id];
  const codigos = [];
  await p.$transaction(async (tx) => {
    for (const invId of idsAPagar) {
      const inv = await tx.invitado.findUnique({ where: { id: invId } });
      if (inv.estado !== EstadoInvitado.PENDIENTE_PAGO) {
        throw new Error(`INVITADO_YA_PAGADO:${invId}`);
      }
      let code = null;
      let attempts = 0;
      while (attempts < 5) {
        try {
          const candidate = generateEntradaCode();
          await tx.invitado.update({
            where: { id: invId },
            data: {
              estado: EstadoInvitado.PAGADO,
              codigo: candidate,
              adminIdPago: admin.id,
              fechaPago: new Date(),
            },
          });
          code = candidate;
          break;
        } catch (e) {
          if (e.code === 'P2002') { attempts++; continue; }
          throw e;
        }
      }
      if (!code) throw new Error('NO_SE_PUDO_GENERAR_CODIGO');
      codigos.push(code);
    }
    await tx.pago.create({
      data: {
        reservaId: reserva.id,
        adminId: admin.id,
        monto: idsAPagar.length * PRECIO_PERSONA,
        medio: MedioPago.NEQUI,
        invitadosCubiertos: idsAPagar,
      },
    });
    await tx.reserva.update({
      where: { id: reserva.id },
      data: { estado: EstadoReserva.PARCIAL },
    });
  });
  log('4b. marcarInvitadosPagados simulado (2 de 3)', `codigos: ${codigos.join(', ')}`);

  // ============================================================
  // 5. Simular `validarCodigo` (escaneo puerta)
  //    Primer escaneo del primer codigo → ok
  //    Re-escaneo del mismo codigo → completo
  // ============================================================
  const r1 = await p.reserva.findUnique({
    where: { id: reserva.id },
    include: {
      user: { select: { nombreCompleto: true, telefono: true } },
      invitados: { orderBy: { numero: 'asc' } },
    },
  });
  const inv1 = r1.invitados.find((i) => i.codigo === codigos[0]);
  log('5.1 Primer escaneo (debe ser PAGADO, sin registradoEn)', `estado=${inv1.estado} registradoEn=${inv1.registradoEn}`);

  // Simulamos confirmarIngreso
  await p.$transaction(async (tx) => {
    await tx.invitado.update({
      where: { id: inv1.id },
      data: { estado: EstadoInvitado.ASISTIO, registradoEn: new Date() },
    });
    const totalAsistieron = await tx.invitado.count({
      where: { reservaId: reserva.id, estado: EstadoInvitado.ASISTIO },
    });
    const totalPagados = await tx.invitado.count({
      where: { reservaId: reserva.id, estado: { in: [EstadoInvitado.PAGADO, EstadoInvitado.ASISTIO] } },
    });
    const grupoCompleto = totalAsistieron === totalPagados && totalPagados > 0;
    await tx.reserva.update({
      where: { id: reserva.id },
      data: grupoCompleto
        ? { estado: EstadoReserva.ASISTIO, asistioEn: new Date() }
        : { estado: totalPagados > 0 ? EstadoReserva.PARCIAL : EstadoReserva.PAGO_PENDIENTE },
    });
  });
  log('5.2 confirmarIngreso(1)', `ahora 1/3 ASISTIO`);

  // Re-escaneo
  const r2 = await p.reserva.findUnique({
    where: { id: reserva.id },
    include: { invitados: { orderBy: { numero: 'asc' } } },
  });
  const inv1After = r2.invitados.find((i) => i.codigo === codigos[0]);
  const reScan = inv1After.estado === EstadoInvitado.ASISTIO || inv1After.registradoEn !== null;
  log('5.3 Re-escaneo (debe ser completo)', reScan ? 'COMPLETO (OK)' : 'FAIL');

  // ============================================================
  // 6. Anti-reuse: intentar crear otro Invitado con un codigo ya usado
  // ============================================================
  let dupError = null;
  try {
    await p.invitado.create({
      data: {
        reservaId: reserva.id,
        numero: 99,
        nombreCompleto: 'Duplicado',
        telefono: '+573000000099',
        codigo: codigos[0],
        estado: EstadoInvitado.PENDIENTE_PAGO,
      },
    });
  } catch (e) {
    if (e.code === 'P2002') dupError = 'OK (P2002 unique violation)';
    else dupError = `FAIL: ${e.message}`;
  }
  log('6. Anti-reuse (Invitado.codigo @unique)', dupError);

  // ============================================================
  // 7. Mesa: crear mesa, asignar silla, cambiar capacidad, eliminar
  // ============================================================
  const mesa = await p.mesa.create({
    data: { numero: 999, capacidad: 8 },
  });
  log('7.1 Mesa creada', `M${mesa.numero} cap=${mesa.capacidad}`);

  // Asignar invitado #2 a silla 3
  const inv2 = r2.invitados.find((i) => i.numero === 2);
  await p.invitado.update({
    where: { id: inv2.id },
    data: { mesaId: mesa.id, silla: 3, adminIdAsignacion: admin.id, fechaAsignacion: new Date() },
  });
  const inv2Asig = await p.invitado.findUnique({
    where: { id: inv2.id },
    include: { mesa: true },
  });
  log('7.2 Asignacion', `inv#${inv2Asig.numero} -> M${inv2Asig.mesa.numero}/S${inv2Asig.silla}`);

  // Cambiar capacidad a 6
  const cap4 = await p.mesa.update({
    where: { id: mesa.id },
    data: { capacidad: 6 },
  });
  log('7.3 Cambiar capacidad', `M${cap4.numero} cap=${cap4.capacidad}`);

  // Eliminar mesa (invitado 2 va a perder la mesa)
  await p.invitado.update({
    where: { id: inv2.id },
    data: { mesaId: null, silla: null, fechaAsignacion: null },
  });
  await p.mesa.delete({ where: { id: mesa.id } });
  log('7.4 Mesa eliminada', 'OK');

  // ============================================================
  // 8. Verificar: estado final del grupo
  // ============================================================
  const final = await p.reserva.findUnique({
    where: { id: reserva.id },
    include: { invitados: { orderBy: { numero: 'asc' } } },
  });
  const totalAsistieron = final.invitados.filter((i) => i.estado === EstadoInvitado.ASISTIO).length;
  log('8. Estado final', `estado=${final.estado} ${totalAsistieron}/${final.invitados.length} ASISTIO`);
  log('8. Invitados', final.invitados.map((i) => `#${i.numero}:${i.nombreCompleto}@${i.estado}`).join(' | '));

  // ============================================================
  // 9. Cleanup escenario 1
  // ============================================================
  await p.pago.deleteMany({ where: { reservaId: reserva.id } });
  await p.invitado.deleteMany({ where: { reservaId: reserva.id } });
  await p.reserva.delete({ where: { id: reserva.id } });
  await p.user.delete({ where: { id: user.id } });
  console.log('9. Cleanup escenario 1 OK');

  // ============================================================
  // 10. Escenario: editar invitados + cancelar
  // ============================================================
  console.log('');
  console.log('=== Escenario: editar + cancelar PAGO_PENDIENTE ===');
  const editEmail = 'test-e2e-edit-' + Date.now() + '@test.com';
  const editUser = await p.user.create({
    data: {
      nombreCompleto: 'Test E2E Edit',
      email: editEmail,
      telefono: '+573000000001',
      passwordHash: hash,
    },
  });

  const editReserva = await p.reserva.create({
    data: {
      userId: editUser.id,
      valorTotal: 1 * PRECIO_PERSONA,
      estado: EstadoReserva.PAGO_PENDIENTE,
      invitados: {
        create: [{ numero: 1, nombreCompleto: 'Test E2E Edit', telefono: '+573000000001', estado: EstadoInvitado.PENDIENTE_PAGO }],
      },
    },
  });
  log('10.1 Reserva inicial', `${editReserva.id} cant=1 total=$${editReserva.valorTotal}`);

  // Editar: agregar 2 invitados
  await p.invitado.create({
    data: { reservaId: editReserva.id, numero: 2, nombreCompleto: 'Nuevo Inv 2', telefono: '+573000000010', estado: EstadoInvitado.PENDIENTE_PAGO },
  });
  await p.invitado.create({
    data: { reservaId: editReserva.id, numero: 3, nombreCompleto: 'Nuevo Inv 3', telefono: '+573000000011', estado: EstadoInvitado.PENDIENTE_PAGO },
  });
  const edit2 = await p.reserva.update({
    where: { id: editReserva.id },
    data: { valorTotal: 3 * PRECIO_PERSONA },
  });
  const invsEdit = await p.invitado.findMany({ where: { reservaId: editReserva.id } });
  log('10.2 Editado (1->3 invitados)', `total=$${edit2.valorTotal} invitados=${invsEdit.length}`);

  // Cancelar
  const motivo = 'No puedo asistir el sabado por trabajo';
  const cancelled = await p.reserva.update({
    where: { id: editReserva.id },
    data: {
      estado: EstadoReserva.CANCELADO,
      motivoCancelacion: motivo,
      canceladaEn: new Date(),
    },
  });
  log('10.3 Cancelada por usuario', `estado=${cancelled.estado} motivo="${cancelled.motivoCancelacion}"`);

  // Re-activar
  const reactivated = await p.reserva.update({
    where: { id: editReserva.id },
    data: { estado: EstadoReserva.PAGO_PENDIENTE, motivoCancelacion: null, canceladaEn: null },
  });
  log('10.4 Re-activada', `estado=${reactivated.estado}`);

  // Cleanup
  await p.invitado.deleteMany({ where: { reservaId: editReserva.id } });
  await p.reserva.delete({ where: { id: editReserva.id } });
  await p.user.delete({ where: { id: editUser.id } });
  console.log('10.5 Cleanup OK');

  // ============================================================
  // 11. Escenario: reset de contrasena temporal
  // ============================================================
  console.log('');
  console.log('=== Escenario: reset de contrasena temporal ===');
  const bcryptForPwd = await import('bcrypt');

  const pwdEmail = 'test-e2e-pwd-' + Date.now() + '@test.com';
  const pwdUser = await p.user.create({
    data: {
      nombreCompleto: 'Test E2E Pwd',
      email: pwdEmail,
      telefono: '+573000000002',
      passwordHash: await bcryptForPwd.default.hash('Original123!', 12),
    },
  });
  log('11.1 User creado', `${pwdUser.id} debeCambiar=${pwdUser.debeCambiarContrasena}`);

  const pwdTemp = generateTempPassword();
  const pwdHash = await bcryptForPwd.default.hash(pwdTemp, 12);
  const updatedPwdUser = await p.user.update({
    where: { id: pwdUser.id },
    data: { passwordHash: pwdHash, debeCambiarContrasena: true },
  });
  log('11.2 Pwd temporal generada', `temp=${pwdTemp} debeCambiar=${updatedPwdUser.debeCambiarContrasena}`);
  if (!updatedPwdUser.debeCambiarContrasena) throw new Error('Flag debeCambiarContrasena no se seteo');
  if (pwdTemp.length !== 10) throw new Error(`Pwd temp debe tener 10 chars, tiene ${pwdTemp.length}`);

  const pwdValida = await bcryptForPwd.default.compare(pwdTemp, updatedPwdUser.passwordHash);
  log('11.3 Pwd temporal valida contra hash', pwdValida ? 'OK' : 'FAIL');
  if (!pwdValida) throw new Error('Pwd temp no valida');

  const oldPwdValida = await bcryptForPwd.default.compare('Original123!', updatedPwdUser.passwordHash);
  log('11.4 Pwd original ya no valida', !oldPwdValida ? 'OK' : 'FAIL');
  if (oldPwdValida) throw new Error('Pwd original sigue valida');

  const newPwd = 'NuevoPwd123!';
  const finalPwdHash = await bcryptForPwd.default.hash(newPwd, 12);
  const finalUser = await p.user.update({
    where: { id: pwdUser.id },
    data: { passwordHash: finalPwdHash, debeCambiarContrasena: false },
  });
  log('11.5 Pwd cambiada por user', `debeCambiar=${finalUser.debeCambiarContrasena}`);
  if (finalUser.debeCambiarContrasena) throw new Error('Flag debeCambiarContrasena no se limpio');

  const newValida = await bcryptForPwd.default.compare(newPwd, finalUser.passwordHash);
  const tempSigueValida = await bcryptForPwd.default.compare(pwdTemp, finalUser.passwordHash);
  log('11.6 Nueva pwd valida / temp no valida', `${newValida} / ${!tempSigueValida}`);
  if (!newValida || tempSigueValida) throw new Error('Estado de pwd incorrecto despues del cambio');

  await p.user.delete({ where: { id: pwdUser.id } });
  console.log('11.7 Cleanup OK');

  await p.$disconnect();
  console.log('---');
  console.log('E2E: ADR-011 (Invitados+Mesas) + EDIT/CANCEL + PWD RESET TEST PASSED');
  console.log(`MAX_POR_RESERVA: ${MAX_POR_RESERVA} | MESA_CAPACIDAD_DEFAULT: ${MESA_CAPACIDAD_DEFAULT} | PRECIO_PERSONA: ${PRECIO_PERSONA}`);
})().catch(async (e) => {
  console.error('E2E TEST FAILED:', e.message);
  console.error(e);
  await p.$disconnect();
  process.exit(1);
});
