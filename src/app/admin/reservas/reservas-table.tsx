"use client";

import { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import Link from "next/link";
import { EstadoReserva, EstadoInvitado } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Users,
  Check,
  Clock,
  Search,
} from "lucide-react";
import {
  EditarReservaButton,
  EliminarReservaButton,
  type ReservaEditable,
} from "./reserva-crud";

type ReservaRow = {
  id: string;
  nombreCompleto: string;
  telefono: string;
  codigos: number;
  ingresados: number;
  totalInvitados: number;
  valorTotal: number;
  estado: EstadoReserva;
  editable: ReservaEditable;
};

interface ReservasTableProps {
  reservas: Array<{
    id: string;
    estado: EstadoReserva;
    valorTotal: number;
    user: {
      nombreCompleto: string;
      email: string;
      telefono: string;
    };
    invitados: Array<{
      id: string;
      numero: number;
      nombreCompleto: string;
      telefono: string;
      estado: EstadoInvitado;
      codigo: string | null;
    }>;
  }>;
}

const estadoVariant: Record<EstadoReserva, BadgeVariant> = {
  PAGO_PENDIENTE: "pending",
  PARCIAL: "paid",
  ASISTIO: "success",
  CANCELADO: "cancelled",
};

const estadoLabel: Record<EstadoReserva, string> = {
  PAGO_PENDIENTE: "Aporte pendiente",
  PARCIAL: "Aporte parcial",
  ASISTIO: "Asistió",
  CANCELADO: "Cancelado",
};

function formatCOP(value: number) {
  return `$ ${value.toLocaleString("es-CO")}`;
}

function formatLocal(telefono: string): string {
  const digits = (telefono ?? "").replace(/\D/g, "");
  if (digits.length < 10) return telefono;
  const d = digits.slice(-10);
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}

const columnHelper = createColumnHelper<ReservaRow>();

const columns = [
  columnHelper.accessor("codigos", {
    id: "codigos",
    header: "Códigos",
    cell: (info) => {
      const v = info.getValue();
      return v > 0 ? (
        <span className="font-mono text-ember-bright text-base">
          {v} código{v === 1 ? "" : "s"}
        </span>
      ) : (
        <span className="text-ash">Sin códigos</span>
      );
    },
    sortingFn: "basic",
  }),
  columnHelper.accessor("nombreCompleto", {
    id: "nombreCompleto",
    header: "Nombre",
    cell: (info) => <span className="text-bone">{info.getValue()}</span>,
    sortingFn: "alphanumeric",
    filterFn: "includesString",
  }),
  columnHelper.accessor("telefono", {
    id: "telefono",
    header: "Tel",
    cell: (info) => (
      <span className="text-ash text-base">{formatLocal(info.getValue())}</span>
    ),
    sortingFn: "alphanumeric",
  }),
  columnHelper.accessor("ingresados", {
    id: "ingresados",
    header: "Ingr.",
    cell: (info) => {
      const row = info.row.original;
      return (
        <span className="text-bone">
          {info.getValue()}/{row.totalInvitados}
        </span>
      );
    },
    sortingFn: "basic",
  }),
  columnHelper.accessor("valorTotal", {
    id: "valorTotal",
    header: "Valor",
    cell: (info) => (
      <span className="text-bone">{formatCOP(info.getValue())}</span>
    ),
    sortingFn: "basic",
  }),
  columnHelper.accessor("estado", {
    id: "estado",
    header: "Estado",
    cell: (info) => (
      <Badge variant={estadoVariant[info.getValue()]}>
        {estadoLabel[info.getValue()]}
      </Badge>
    ),
    sortingFn: "alphanumeric",
  }),
  columnHelper.display({
    id: "acciones",
    header: "",
    cell: (info) => {
      const row = info.row.original;
      return (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link
            href={`/admin/reservas/${row.id}`}
            className="inline-flex h-9 items-center gap-1 rounded-md border border-taller-iron px-3 font-subhead text-xs uppercase tracking-wider text-ember-bright hover:border-ember-bright"
          >
            Ver <ArrowRight className="h-4 w-4" />
          </Link>
          <EditarReservaButton reserva={row.editable} />
          <EliminarReservaButton reservaId={row.id} nombre={row.nombreCompleto} />
        </div>
      );
    },
  }),
];

export default function ReservasTable({ reservas }: ReservasTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const data: ReservaRow[] = useMemo(
    () =>
      reservas.map((r) => ({
        id: r.id,
        nombreCompleto: r.user.nombreCompleto,
        telefono: r.user.telefono,
        codigos: r.invitados.filter((i) => i.codigo !== null).length,
        ingresados: r.invitados.filter(
          (i) => i.estado === EstadoInvitado.ASISTIO
        ).length,
        totalInvitados: r.invitados.length,
        valorTotal: r.valorTotal,
        estado: r.estado,
        editable: {
          id: r.id,
          user: r.user,
          invitados: r.invitados.map((i) => ({
            numero: i.numero,
            nombreCompleto: i.nombreCompleto,
            telefono: i.telefono,
            estado: i.estado,
          })),
        },
      })),
    [reservas]
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 10 },
    },
  });

  const searchValue =
    (table.getColumn("nombreCompleto")?.getFilterValue() as string) ?? "";

  const filteredRows = table.getFilteredRowModel().rows;
  const paginatedRows = table.getRowModel().rows;
  const totalFiltered = filteredRows.length;
  const { pageIndex, pageSize } = table.getState().pagination;
  const start = totalFiltered === 0 ? 0 : pageIndex * pageSize + 1;
  const end = Math.min((pageIndex + 1) * pageSize, totalFiltered);

  return (
    <>
      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ash" />
        <Input
          placeholder="Buscar por nombre..."
          value={searchValue}
          onChange={(e) =>
            table.getColumn("nombreCompleto")?.setFilterValue(e.target.value)
          }
          className="pl-10"
        />
      </div>

      <Card className="hidden md:block">
        <CardContent className="p-0">
          <table className="w-full text-lg">
            <thead className="border-b border-taller-iron text-ash text-base uppercase tracking-widest font-subhead">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className={`py-3 px-4 ${
                        header.column.getCanSort()
                          ? "cursor-pointer select-none hover:text-bone transition-colors"
                          : ""
                      } ${
                        header.column.id === "ingresados"
                          ? "text-center"
                          : header.column.id === "valorTotal" ||
                            header.column.id === "acciones"
                          ? "text-right"
                          : "text-left"
                      }`}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <span className="inline-flex items-center gap-1">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {{
                          asc: <ArrowUp className="h-3 w-3 text-ember-bright" />,
                          desc: <ArrowDown className="h-3 w-3 text-ember-bright" />,
                        }[header.column.getIsSorted() as string] ?? null}
                      </span>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-taller-iron">
              {paginatedRows.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="text-center py-12 text-ash">
                    Sin reservas en este filtro.
                  </td>
                </tr>
              )}
              {paginatedRows.map((row) => (
                <tr key={row.id} className="hover:bg-taller-steel/30">
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={`py-3 px-4 ${
                        cell.column.id === "ingresados"
                          ? "text-center"
                          : cell.column.id === "valorTotal" ||
                            cell.column.id === "acciones"
                          ? "text-right"
                          : ""
                      }`}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="hidden md:flex items-center justify-between pt-4 px-1">
        <p className="text-ash text-base">
          Mostrando {start}-{end} de {totalFiltered} reservas
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="bg-taller-steel text-bone border border-taller-iron hover:border-ember-rust px-4 py-2 rounded-md text-sm font-subhead uppercase tracking-wider disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            Anterior
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="bg-taller-steel text-bone border border-taller-iron hover:border-ember-rust px-4 py-2 rounded-md text-sm font-subhead uppercase tracking-wider disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            Siguiente
          </button>
        </div>
      </div>

      <ul className="md:hidden space-y-2.5 stagger-children">
        {filteredRows.length === 0 && (
          <li className="text-center py-12 text-ash text-lg">
            Sin reservas en este filtro.
          </li>
        )}
        {filteredRows.map((row) => {
          const r = row.original;
          return (
            <li key={r.id}>
              <Card className="hover-lift active:scale-[0.99]">
                <CardContent className="p-3 space-y-3">
                  <Link href={`/admin/reservas/${r.id}`} className="block">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-bone font-subhead text-lg truncate">
                          {r.nombreCompleto}
                        </p>
                        <p className="text-ash text-sm font-mono">
                          {formatLocal(r.telefono)}
                        </p>
                      </div>
                      <Badge variant={estadoVariant[r.estado]} className="shrink-0">
                        {estadoLabel[r.estado]}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm gap-2 flex-wrap pt-2">
                      <span className="font-mono text-ember-bright inline-flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {r.totalInvitados} asis.
                      </span>
                      <span className="text-bone inline-flex items-center gap-1">
                        <Check className="h-4 w-4" />
                        {r.ingresados}/{r.totalInvitados}
                      </span>
                      <span className="text-bone inline-flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {r.codigos > 0
                          ? `${r.codigos} código${r.codigos === 1 ? "" : "s"}`
                          : "sin códigos"}
                      </span>
                      <span className="text-bone ml-auto font-subhead">
                        {formatCOP(r.valorTotal)}
                      </span>
                    </div>
                  </Link>
                  <div className="flex flex-wrap gap-2 border-t border-taller-iron pt-3">
                    <EditarReservaButton reserva={r.editable} />
                    <EliminarReservaButton reservaId={r.id} nombre={r.nombreCompleto} />
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>
    </>
  );
}
