"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DashboardChartsProps {
  estadoDistribucion: { estado: string; count: number }[];
  reservasPorDia: { dia: string; count: number }[];
}

const ESTADO_COLORS: Record<string, string> = {
  "Pago pendiente": "#7A8A9E",
  "Pago parcial": "#E87036",
  Asistió: "#22C55E",
  Cancelado: "#C75128",
};

const BAR_COLOR = "#E87036";

interface TooltipPayload {
  name: string;
  value: number;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayload[]; label?: string }) {
  if (active && payload && payload.length) {
    const name = label ?? payload[0].name;
    const value = payload[0].value;
    return (
      <div className="bg-taller-steel border border-taller-iron rounded-md p-3 shadow-lg">
        <p className="text-ash text-sm">{name}</p>
        <p className="text-cream font-display text-lg">
          {value} {value === 1 ? "reserva" : "reservas"}
        </p>
      </div>
    );
  }
  return null;
}

export default function DashboardCharts({
  estadoDistribucion,
  reservasPorDia,
}: DashboardChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Distribución de estados</CardTitle>
        </CardHeader>
        <CardContent>
          {estadoDistribucion.length === 0 ? (
            <p className="text-ash text-base py-12 text-center">
              Sin datos disponibles.
            </p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={estadoDistribucion}
                    dataKey="count"
                    nameKey="estado"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                    strokeWidth={0}
                  >
                    {estadoDistribucion.map((entry) => (
                      <Cell
                        key={entry.estado}
                        fill={ESTADO_COLORS[entry.estado] ?? "#7A8A9E"}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-4 mt-2">
                {estadoDistribucion.map((e) => (
                  <div
                    key={e.estado}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{
                        backgroundColor:
                          ESTADO_COLORS[e.estado] ?? "#7A8A9E",
                      }}
                    />
                    <span className="text-ash">{e.estado}</span>
                    <span className="text-bone font-subhead">{e.count}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Reservas por día (7 días)</CardTitle>
        </CardHeader>
        <CardContent>
          {reservasPorDia.length === 0 ? (
            <p className="text-ash text-base py-12 text-center">
              Sin datos disponibles.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={reservasPorDia}
                margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#2A3A4E"
                  vertical={false}
                />
                <XAxis
                  dataKey="dia"
                  stroke="#7A8A9E"
                  tick={{ fill: "#7A8A9E", fontSize: 12 }}
                  axisLine={{ stroke: "#2A3A4E" }}
                  tickLine={false}
                />
                <YAxis
                  stroke="#7A8A9E"
                  tick={{ fill: "#7A8A9E", fontSize: 12 }}
                  axisLine={{ stroke: "#2A3A4E" }}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="count"
                  fill={BAR_COLOR}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


