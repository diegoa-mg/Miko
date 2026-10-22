
import api from "./axios";

export const obtenerVentas = async (sucursalId = null) => {
  const limite = 100;
  let offset = 0;
  let todasLasVentas = [];
  let hayMasVentas = true;

  while (hayMasVentas) {
    const params = {
      limit: limite,
      offset,
    };

    if (sucursalId != null) {
      params.sucursal_id = sucursalId;
    }

    const { data } = await api.get("/ventas", { params });

    const ventasPagina = Array.isArray(data) ? data : [];

    todasLasVentas = [...todasLasVentas, ...ventasPagina];

    hayMasVentas = ventasPagina.length === limite;
    offset += limite;
  }

  return todasLasVentas;
};
