import api from "./axios";
import { getDashboardCajero } from "./adminDashboard";

// GET /ventas/metodos-pago -> [{ id, nombre }]  (nombre: "efectivo", "tarjeta", ...)
export async function obtenerMetodosPago() {
  const { data } = await api.get("/ventas/metodos-pago");
  return data;
}

// POST /ventas -> VentaOut. El precio y el total los calcula el backend con los
// precios de la base de datos; el frontend solo manda producto, cantidad y método.
export async function registrarVenta(carrito, metodoPagoId) {
  const { data } = await api.post("/ventas", {
    metodo_pago_id: metodoPagoId,
    detalles: carrito.map((l) => ({
      producto_id: l.producto.id,
      cantidad: Number(l.cantidad),
    })),
  });
  return data;
}

// GET /ventas/{id}/ticket -> TicketOut
export async function obtenerTicket(ventaId) {
  const { data } = await api.get(`/ventas/${ventaId}/ticket`);
  return data;
}

// GET /ventas/mis-ventas -> [VentaOut]. El backend pagina de 100 en 100;
// se piden todas las páginas del periodo para que el total sea el real.
const LIMITE = 100;
export async function obtenerMisVentas({ fecha_inicio, fecha_fin } = {}) {
  const todas = [];
  for (let offset = 0; offset < 5000; offset += LIMITE) {
    const params = { limit: LIMITE, offset };
    if (fecha_inicio) params.fecha_inicio = fecha_inicio;
    if (fecha_fin) params.fecha_fin = fecha_fin;
    const { data } = await api.get("/ventas/mis-ventas", { params });
    todas.push(...data);
    if (data.length < LIMITE) break;
  }
  return todas;
}

// Zona horaria del negocio: el dashboard del cajero ya la devuelve (zona_horaria).
// Se guarda la promesa para no repetir la consulta. Si falla, devuelve null
// y las fechas se muestran en la zona del navegador.
let zonaPromise = null;
export function obtenerZonaHoraria() {
  if (!zonaPromise) {
    zonaPromise = getDashboardCajero()
      .then((d) => {
        if (!d?.zona_horaria) {
          console.warn("[ventasCajero] El dashboard no devolvió zona_horaria:", d);
        }
        return d?.zona_horaria || null;
      })
      .catch((err) => {
        console.error("[ventasCajero] No se pudo obtener la zona horaria:", err);
        zonaPromise = null;
        return null;
      });
  }
  return zonaPromise;
}

// ---- PDF del ticket --------------------------------------------------------
// Se pide con axios (que manda el token de la sesión) y se abre como blob:
// un enlace directo no llevaría la sesión y el backend respondería 401.

async function pedirPdf(ventaId) {
  const res = await api.get(`/ventas/${ventaId}/ticket/pdf`, { responseType: "blob" });
  return new Blob([res.data], { type: "application/pdf" });
}

export async function descargarTicketPdf(ventaId) {
  const blob = await pedirPdf(ventaId);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ticket_venta_${ventaId}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

// Abre el PDF en una pestaña nueva (desde ahí se imprime con Ctrl+P).
// La pestaña se abre antes de pedir el PDF para que el navegador no la bloquee.
export async function abrirTicketPdf(ventaId) {
  const ventana = window.open("", "_blank");
  try {
    const blob = await pedirPdf(ventaId);
    const url = URL.createObjectURL(blob);
    if (ventana) {
      ventana.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } else {
      // Pestañas emergentes bloqueadas: se descarga en su lugar
      URL.revokeObjectURL(url);
      await descargarTicketPdf(ventaId);
    }
  } catch (err) {
    ventana?.close();
    throw err;
  }
}
