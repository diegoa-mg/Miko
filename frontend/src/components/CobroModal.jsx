import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Banknote, CreditCard, Landmark, Wallet, X } from "lucide-react";

// Trabaja en centavos para evitar errores de redondeo con decimales
const aCentavos = (valor) => {
  const n = Number(String(valor).replace(",", "."));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
};

// Solo dígitos y un separador decimal
const limpiarMonto = (valor) => {
  const soloValidos = valor.replace(/[^\d.,]/g, "");
  const i = soloValidos.search(/[.,]/);
  if (i === -1) return soloValidos;
  return soloValidos.slice(0, i + 1) + soloValidos.slice(i + 1).replace(/[.,]/g, "");
};

const ICONOS = { efectivo: Banknote, tarjeta: CreditCard, transferencia: Landmark };

export default function CobroModal({ open, total, money, metodos, onClose, onConfirm }) {
  const { t } = useTranslation();
  const [metodoId, setMetodoId] = useState(null);
  const [recibido, setRecibido] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const recibidoRef = useRef(null);

  // Al abrir: limpiar y dejar "efectivo" seleccionado si existe
  useEffect(() => {
    if (!open) return;
    const porDefecto = metodos.find((m) => m.nombre === "efectivo") ?? metodos[0];
    setMetodoId(porDefecto?.id ?? null);
    setRecibido("");
    setError("");
    setEnviando(false);
  }, [open, metodos]);

  // Esc cierra (si no se está enviando)
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape" && !enviando) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, enviando, onClose]);

  const metodo = metodos.find((m) => m.id === metodoId) ?? null;
  const esEfectivo = metodo?.nombre === "efectivo";

  // Al elegir efectivo, enfocar el campo del monto recibido
  useEffect(() => {
    if (open && esEfectivo) setTimeout(() => recibidoRef.current?.focus(), 50);
  }, [open, esEfectivo]);

  const calc = useMemo(() => {
    const totalC = Math.round(total * 100);
    const recibidoC = aCentavos(recibido);
    return {
      totalC,
      recibidoC,
      faltaC: Math.max(0, totalC - recibidoC),
      cambioC: Math.max(0, recibidoC - totalC),
    };
  }, [total, recibido]);

  if (!open) return null;

  const puedeCobrar =
    calc.totalC > 0 &&
    metodo !== null &&
    (!esEfectivo || calc.recibidoC >= calc.totalC) &&
    !enviando;

  const confirmar = async (e) => {
    e.preventDefault();
    if (!puedeCobrar) return;
    setEnviando(true);
    setError("");
    try {
      await onConfirm({
        metodoPagoId: metodo.id,
        efectivoRecibido: esEfectivo ? calc.recibidoC / 100 : null,
      });
    } catch (err) {
      const detalle = err?.response?.data?.detail;
      setError(typeof detalle === "string" ? detalle : t("pos.errorCobro"));
      setEnviando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !enviando) onClose();
      }}
    >
      <form
        onSubmit={confirmar}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cobro-titulo"
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 id="cobro-titulo" className="font-sans text-xl font-bold text-[#875d69]">
              {t("pos.cobroTitulo")}
            </h2>
            <p className="text-sm text-gray-500">{t("pos.cobroDescripcion")}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={enviando}
            aria-label={t("pos.cancelar")}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-40"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mb-4 flex items-baseline justify-between rounded-lg bg-[#fdf6e3] px-4 py-3">
          <span className="text-sm text-gray-600">{t("pos.totalACobrar")}</span>
          <span className="text-2xl font-bold text-gray-800">{money.format(total)}</span>
        </div>

        {/* Método de pago: uno solo por venta */}
        {metodos.length === 0 ? (
          <p className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">
            {t("pos.errorMetodosPago")}
          </p>
        ) : (
          <fieldset className="mb-4">
            <legend className="mb-2 text-sm font-medium text-gray-700">
              {t("pos.metodoPago")}
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {metodos.map((m) => {
                const Icono = ICONOS[m.nombre] ?? Wallet;
                const activo = m.id === metodoId;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMetodoId(m.id)}
                    aria-pressed={activo}
                    disabled={enviando}
                    className={`flex items-center justify-center gap-2 rounded-lg border-2 py-2 text-sm font-medium transition-colors ${
                      activo
                        ? "border-[#875d69] bg-[#f4d0d0] text-[#5c3a42]"
                        : "border-[#e6bdc7] text-[#875d69] hover:bg-[#fdf6e3]"
                    }`}
                  >
                    <Icono size={18} />
                    {t(`ventas.metodosPago.${m.nombre}`, m.nombre)}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        {/* Solo efectivo pide monto y calcula cambio */}
        {esEfectivo && (
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor="pago-efectivo" className="text-sm font-medium text-gray-700">
                {t("pos.pagoEfectivo")}
              </label>
              <button
                type="button"
                onClick={() => setRecibido((calc.totalC / 100).toFixed(2))}
                className="rounded-full border-2 border-[#e6bdc7] px-3 py-0.5 text-xs font-medium text-[#875d69] hover:bg-[#f4d0d0]"
              >
                {t("pos.efectivoExacto")}
              </button>
            </div>
            <div className="relative">
              <Banknote size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#cda4b4]" />
              <input
                id="pago-efectivo"
                ref={recibidoRef}
                type="text"
                inputMode="decimal"
                value={recibido}
                onChange={(e) => setRecibido(limpiarMonto(e.target.value))}
                placeholder="0.00"
                autoComplete="off"
                className="w-full rounded-full bg-[#f9eeb4] border-2 border-[#e6bdc7] text-[#8c6773] pl-10 pr-4 py-2 text-lg focus:outline-none focus:border-[#875d69]"
              />
            </div>

            {/* Falta / Cambio: solo aparece lo que aplica */}
            {calc.recibidoC > 0 && calc.faltaC > 0 && (
              <div className="mt-4 flex justify-between rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-700">
                <span>{t("pos.falta")}</span>
                <span>{money.format(calc.faltaC / 100)}</span>
              </div>
            )}
            {calc.cambioC > 0 && (
              <div className="mt-4 flex justify-between rounded-lg bg-green-50 px-4 py-3 text-lg font-bold text-green-700">
                <span>{t("pos.cambio")}</span>
                <span>{money.format(calc.cambioC / 100)}</span>
              </div>
            )}
          </div>
        )}

        {error && (
          <p role="alert" className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={enviando}
            className="flex-1 rounded-lg border-2 border-[#e6bdc7] py-2 font-medium text-[#875d69] hover:bg-[#f4d0d0] disabled:opacity-50"
          >
            {t("pos.cancelar")}
          </button>
          <button
            type="submit"
            disabled={!puedeCobrar}
            className="flex-1 rounded-lg bg-rose-800 py-2 font-medium text-white transition-colors hover:bg-rose-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {enviando ? t("pos.cobrando") : t("pos.confirmarCobro")}
          </button>
        </div>
      </form>
    </div>
  );
}