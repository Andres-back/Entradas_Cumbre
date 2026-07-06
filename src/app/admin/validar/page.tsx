import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ValidarForm } from "./validar-form";
import { TicketCheck } from "lucide-react";

export const metadata = {
  title: "Validar entrada | Admin",
};

export default function AdminValidarPage() {
  return (
    <main className="px-3 py-4 md:px-8 md:py-8 max-w-xl mx-auto">
      <div className="mb-4 md:mb-6 text-center">
        <p className="text-ash text-sm md:text-base uppercase tracking-widest font-subhead">
          Puerta
        </p>
        <h1 className="font-display text-2xl md:text-3xl text-cream mt-1">
          Validar entrada
        </h1>
        <p className="text-bone text-base md:text-lg mt-1.5 md:mt-2">
          Escanea entrada, reingreso, almuerzo o refrigerio.
        </p>
      </div>

      <ValidarForm />

      <Card className="mt-4 md:mt-6 hidden sm:block">
        <CardHeader>
          <CardTitle className="text-base uppercase tracking-widest text-ash flex items-center gap-2">
            <TicketCheck className="h-5 w-5" />
            Tip
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-bone text-base">
            El código funciona con o sin guion:{" "}
            <span className="font-mono text-ember-bright">CI-A7K2P9M3</span>{" "}
            o <span className="font-mono text-ember-bright">CIA7K2P9M3</span>.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}


