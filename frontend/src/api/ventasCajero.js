
import api from "./axios";

// Obtener los métodos de pago disponibles
export const obtenerMetodosPago = async () => {
  const { data } = await api.get("/ventas/metodos-pago");
  return data;
};

// Registrar una venta
export const registrarVenta = async (venta) => {
  const { data } = await api.post("/ventas", venta);
  return data;
};
