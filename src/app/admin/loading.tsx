import { RpmLoader } from "@/components/brand/RpmLoader";

export default function AdminLoading() {
  return (
    <div className="flex-1 flex items-center justify-center py-20">
      <RpmLoader label="Cargando panel..." />
    </div>
  );
}
