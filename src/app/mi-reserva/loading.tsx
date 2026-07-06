import { RpmLoader } from "@/components/brand/RpmLoader";

export default function MiReservaLoading() {
  return (
    <div className="flex-1 flex items-center justify-center py-20 px-4">
      <RpmLoader label="Cargando tu reserva..." />
    </div>
  );
}


