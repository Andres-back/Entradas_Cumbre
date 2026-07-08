# Re‑Auditoría Técnica — Cumbre Impacto Putumayo 2026

**Fecha:** 2026-07-08  
**Auditor:** Segundo agente independiente  
**Estado:** READ-ONLY — no se hicieron cambios en código ni datos.

---

## Resultados de verificación automatizada

| Herramienta   | Estado   |
|---------------|----------|
| `pnpm build`  | ✅ 0 errores, 20 rutas |
| `tsc --noEmit` | ✅ 0 errores |
| `eslint --no-cache` | ✅ 0 errores |
| `prisma validate` | ✅ 10 migraciones |
| DNS + HTTPS  | ✅ `https://cumbre.alexsters.works` resuelve y certificado válido |

---

## 1. Hallazgo crítico: discrepancia esquema‑regla de negocio

### Evidencia

- **Regla:** «1 inscripción = 1 persona». Sin acompañantes, sin grupo.
- **Prisma schema:** `Reserva` → `Invitado[]` (one‑to‑many). El modelo permite múltiples invitados por reserva.
- **Código de creación:** `crearReservaAdmin` (L1437) y `registrarUsuario` + `crearOActualizarReserva` crean exactamente 1 `Invitado` por `Reserva`.
- **Código de edición:** `editarReservaAdmin` (L1599–1603) **elimina explícitamente** los invitados sobrantes (más allá del #1) con el mensaje: `"No puedes editar esta inscripcion porque tiene personas confirmadas fuera del modelo individual."` — confirmando que la intención es 1 persona.
- **Conteo en taller:** `Math.max(_count.usuarios, _count.invitados)` (talleres/page.tsx:32) revela incertidumbre arquitectónica sobre dónde vive el conteo real.

### Impacto

Bajo la regla actual (1 persona), el sistema funciona correctamente en la práctica porque todos los flujos crean 1 `Invitado`. Pero:

- Cualquier cambio futuro que permita múltiples invitados rompería el conteo de capacidad, la exportación CSV (solo exporta `invitados[0]`), y el dashboard.
- El `Math.max` es un "olor" a diseño que sugiere que el autor no estaba seguro de cuál relación contar.

### Recomendación

Si la regla de 1 persona es definitiva:
1. Simplificar el esquema quitando la relación `Reserva → Invitado[]` y moviendo los campos de `Invitado` directamente a `Reserva` (o a `User`).
2. Reemplazar `Math.max(_count.usuarios, _count.invitados)` con `_count.usuarios` en todos los conteos de taller.
3. Actualizar `editarReservaAdmin` para que no tenga que eliminar sobrantes — que no pueda haber sobrantes.

Si se quiere mantener el modelo multinvitado para el futuro:
1. Documentar la regla de negocio actual y el comportamiento del sistema.
2. Agregar validación explícita en `crearReservaAdmin` y `registrarUsuario` que limite a 1 invitado (ya se hace, pero implícitamente).

---

## 2. Estado de pago: no existe `PAGADO` en `EstadoReserva`

### Evidencia

```prisma
enum EstadoReserva {
  PAGO_PENDIENTE
  PARCIAL
  ASISTIO
  CANCELADO
}
```

No hay `PAGADO`. El estado terminal de una reserva completamente pagada es `PARCIAL`.

- `registrarAbonoReserva` (L1733): `estado: totalDespues > 0 ? EstadoReserva.PARCIAL : EstadoReserva.PAGO_PENDIENTE`
- `crearReservaAdmin` (L1523): misma lógica.
- Dashboard (L66–67): `confirmadas = reservas.filter(r => r.estado === PARCIAL || ASISTIO)` — **mezcla pagos parciales con pagos completos** en la misma métrica.
- CSV export (L13–18): tiene su **propia** función `estadoPago` que devuelve `"PAGADO"` cuando `abonado >= total` — pero esta lógica no está reflejada ni en el dashboard ni en el panel de administración.
- El estado real de "pagado completo" solo se puede determinar calculando `sum(pagos.monto) >= valorTotal`, no por el `EstadoReserva` de la reserva.

### Impacto

- **Métrica inflada:** "Confirmadas" en el dashboard incluye reservas con pagos parciales, no solo pagos completos. Un organizador no puede distinguir rápidamente cuántas personas pagaron completo.
- **Inconsistencia:** CSV export dice "PAGADO" pero el dashboard y el panel muestran "PARCIAL" para la misma reserva.
- El estado `PAGO_PENDIENTE` realmente significa "sin pagos" (no "pago iniciado").

### Recomendación

1. Agregar `PAGADO` al enum `EstadoReserva`.
2. En `registrarAbonoReserva`, cuando `totalDespues >= valorTotal`, transicionar a `EstadoReserva.PAGADO` en lugar de mantener `PARCIAL`.
3. Reflejar el cambio en Dashboard, CSV, y filtros.
4. Migrar reservas existentes: las que tienen `sum(pagos) >= valorTotal` y estado `PARCIAL` → `PAGADO`.

---

## 3. `registrarAbonoReserva`: seguridad de transacción

### Evidencia

```typescript
await prisma.$transaction(async (tx) => {
  const reserva = await tx.reserva.findUnique({ where: { id: reservaId }, include: { pagos: ... } });
  const totalPagado = reserva.pagos.reduce(...);
  const saldo = Math.max(reserva.valorTotal - totalPagado, 0);
  if (monto > saldo) throw new Error("ABONO_SUPERA_SALDO");
  // ...
}, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
```

- ✅ `monto` y `reservaId` vienen del cliente pero se validan contra datos recalculados del servidor (`totalPagado`, `saldo`). No hay trust‑client.
- ✅ `Serializable` isolation previene race conditions entre pagos simultáneos.
- ✅ `saldo` se recalcula desde cero dentro de la transacción.
- ⚠️ **Sin confirmación:** el formulario "Marcar como pagado" (`marcar-pagado-form.tsx`) envía el monto inmediatamente al hacer clic en "Registrar abono". No hay un paso de confirmación ("¿Estás seguro de registrar este abono?").
- ⚠️ No hay auditoría visible de `adminId` en el panel — aunque se almacena en `Pago.adminId`, no hay una vista histórica de quién registró qué pago.

### Recomendación

1. Agregar un modal de confirmación antes de enviar el formulario de abono, mostrando el monto, el saldo anterior y el nuevo saldo.
2. Agregar una vista de auditoría de pagos en el detalle de la reserva que muestre `adminId` y timestamp.

---

## 4. Conteo de capacidad en talleres: triple validación

### Evidencia

El sistema tiene 3 puntos de validación de capacidad:

| Punto | Lugar | Cómo cuenta | Correcto para 1 persona |
|-------|-------|-------------|------------------------|
| 1 | `registro/page.tsx:34` | `taller._count.usuarios` | ✅ |
| 2 | `registrarUsuario` action | `tx.user.count({ where: { tallerId } })` | ✅ |
| 3 | `crearReservaAdmin` | `tx.reserva.count({ where: { user: { tallerId } } })` | ✅ (cuenta reservas = personas) |
| 4 | `editarReservaAdmin` | igual que #3, excluye la reserva actual | ✅ |

**Conclusión:** La capacidad está bien protegida. No hay riesgo de sobreventa.

Pero: si en el futuro se permiten múltiples invitados, el punto #3 y #4 subcontarían (1 reserva = 1 persona a pesar de tener N invitados). El punto #1 y #2 no se verían afectados porque cuentan `User` directamente.

---

## 5. Exportación CSV: solo el primer invitado

`export/route.ts:67`:
```typescript
const persona = reserva.invitados[0];
```

En el modelo actual de 1 persona, esto es correcto. Pero si hubiera reservas con múltiples invitados, los invitados 2+ se pierden en la exportación.

---

## 6. UI Responsive

### Buenas prácticas observadas
- `AdminShell.tsx`: sidebar fijo en desktop, tabs scrollables en mobile.
- `reservas-table.tsx`: TanStack Table en desktop, cards apiladas en mobile (media query `md:`).
- `QrScanner.tsx`: overlay full‑screen en mobile, modal centrado en desktop. Botón de cerrar más grande en mobile (h-11 vs h-9).
- `acciones-reserva.tsx`: botones apilados en mobile (`flex-col`), en fila en desktop (`sm:flex-row`).
- `nueva-inscripcion-form.tsx`: grilla de 2 columnas en desktop, 1 columna en mobile.
- `dashboard-charts.tsx`: grid 1 columna en mobile, 2 en desktop (`lg:grid-cols-2`).
- Uso consistente de `min-h-[44px]` y `min-w-[44px]` para targets táctiles.
- Tipografía responsive con `text-[10px] sm:text-xs` para elementos pequeños.

### Sin problemas detectados
No se encontraron desbordamientos horizontales, textos truncados, ni botones inaccesibles en los componentes revisados. Los `container queries` no se usan (el proyecto usa media queries de Tailwind), lo cual es aceptable dado que es una app de gestión.

---

## 7. Assets huérfanos

| Archivo | Estado |
|---------|--------|
| `src/components/brand/HeroReveal.tsx` | No importado en ningún lado — contenido legacy "Bajo el Capó" |
| `/public/hero-foto.*` | No referenciado — imagen de héroe legacy |

Seguro de eliminar. No afecta el funcionamiento.

---

## 8. UX menor: texto de botón de login

`auth-actions.ts` o el componente de login dice "Entrar al taller" en el botón de login.

Esto es engañoso porque:
- Un administrador que ve "Entrar al taller" podría pensar que es para acceder a contenido del evento.
- Debería decir "Acceder al panel" o "Iniciar sesión".

---

## 9. Dashboard: "Resumen del taller"

`admin/page.tsx:114`:
```typescript
<p className="text-bone text-lg mt-1">Resumen del taller en tiempo real.</p>
```

El dashboard es del **evento**, no de un taller específico. "Resumen del evento" sería más preciso.

---

## Resumen de hallazgos

| # | Tipo | Descripción | Archivo(s) |
|---|------|-------------|------------|
| 1 | 🔴 Crítico | Esquema permite multi‑invitado pero regla es 1 persona. `Math.max` revela incertidumbre | `schema.prisma`, `talleres/page.tsx:32` |
| 2 | 🟡 Medio | No existe `PAGADO` en `EstadoReserva`. Dashboard mezcla parciales con completos. CSV inventa su propio "PAGADO" | `schema.prisma`, `admin/page.tsx:66`, `export/route.ts:13` |
| 3 | 🟡 Medio | `registrarAbonoReserva` sin confirmación. Transacción segura (Serializable) pero UX frágil | `admin/actions.ts:1652`, `marcar-pagado-form.tsx` |
| 4 | 🟢 Bajo | `Math.max` en conteo de taller debe ser `_count.usuarios` | `talleres/page.tsx:32` |
| 5 | 🟢 Bajo | CSV export solo exporta `invitados[0]` | `export/route.ts:67` |
| 6 | 🟢 Bajo | Assets huérfanos (`HeroReveal.tsx`, `hero-foto.*`) | `HeroReveal.tsx` |
| 7 | 🟡 Medio | "Entrar al taller" en botón de login | componente de login |
| 8 | 🟢 Bajo | "Resumen del taller" → "Resumen del evento" | `admin/page.tsx:114` |
| 9 | 🟢 Bajo | Falta vista de auditoría de pagos (adminId, timestamp) | panel de pagos |

**Escala:** 🔴 Crítico = riesgo de datos incorrectos | 🟡 Medio = UX o consistencia | 🟢 Bajo = cosmético o mantenimiento

---

## Próximos pasos para el dueño

1. **Registrar stack en Komodo UI** (pendiente — no hay cli_key/cli_secret).
2. **Proveer credenciales de prueba** (el admin password se fuerza a cambiar en el primer login).
3. **Decidir sobre el modelo Invitado:** ¿1 persona definitivo o preparar para multi‑invitado?
4. **Aplicar migración de estado `PAGADO`** si se decide agregarlo al enum.
5. **Test responsive con navegador real** (Playwright no disponible en entorno de auditoría).
