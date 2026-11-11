import { useTranslation } from "react-i18next";
import { Banknote, Loader2, Printer } from "lucide-react";

/**
 * Pantalla de espera que se muestra al confirmar un cobro.
 * fase: null (oculta) | "registrando" (guardando la venta) | "ticket" (generando el ticket)
 */
export default function ProcesandoCobro({ fase }) {
  const { t } = useTranslation();
  if (!fase) return null;

  const esTicket = fase === "ticket";
  const Icono = esTicket ? Printer : Banknote;

  return (
    <div
      role="status"
      aria-live="assertive"
      aria-busy="true"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
    >
      <div className="flex w-full max-w-xs flex-col items-center rounded-xl bg-white dark:bg-[var(--dark-surface)] dark:border dark:border-[var(--dark-border)] px-6 py-8 text-center shadow-xl">
        <div className="relative mb-4 flex h-16 w-16 items-center justify-center">
          <Loader2
            size={64}
            strokeWidth={1.5}
            className="absolute animate-spin text-[#875d69] dark:text-rose-300"
          />
          <Icono size={24} className="text-[#875d69] dark:text-rose-300" />
        </div>
        <p className="font-sans text-lg font-bold text-[#875d69] dark:text-rose-300">
          {esTicket ? t("pos.generandoTicket") : t("pos.registrandoVenta")}
        </p>
        <p className="mt-1 text-sm text-gray-500 dark:text-[var(--dark-muted)]">{t("pos.esperaUnMomento")}</p>
      </div>
    </div>
  );
}