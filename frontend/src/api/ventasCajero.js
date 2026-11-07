import api from "./axios";

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