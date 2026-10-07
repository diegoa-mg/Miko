import { useMemo, useState } from "react";

// Datos de prueba.
// Cuando el backend esté listo, estos datos se reemplazarán
// por la información obtenida desde la API.
const ventasIniciales = [
  {
    id: 1,
    sucursal_id: 1,
    sucursal_nombre: "Sucursal Centro",
    sucursal_activa: true,
    fecha: "2026-10-05T09:30:00",
    total: 350.0,
  },
  {
    id: 2,
    sucursal_id: 1,
    sucursal_nombre: "Sucursal Centro",
    sucursal_activa: true,
    fecha: "2026-10-05T11:15:00",
    total: 520.0,
  },
  {
    id: 3,
    sucursal_id: 2,
    sucursal_nombre: "Sucursal Norte",
    sucursal_activa: false,
    fecha: "2026-10-05T10:45:00",
    total: 285.0,
  },
  {
    id: 4,
    sucursal_id: 2,
    sucursal_nombre: "Sucursal Norte",
    sucursal_activa: false,
    fecha: "2026-10-05T13:20:00",
    total: 640.0,
  },
  {
    id: 5,
    sucursal_id: 3,
    sucursal_nombre: "Sucursal Sur",
    sucursal_activa: true,
    fecha: "2026-10-05T12:10:00",
    total: 425.0,
  },
  {
    id: 6,
    sucursal_id: 3,
    sucursal_nombre: "Sucursal Sur",
    sucursal_activa: true,
    fecha: "2026-10-05T15:40:00",
    total: 315.0,
  },
];

function Ventas() {
  const [ventas] = useState(ventasIniciales);
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState("");

  const sucursales = useMemo(() => {
    const sucursalesUnicas = ventas.reduce((acumulado, venta) => {
      if (
        !acumulado.some(
          (sucursal) => sucursal.id === venta.sucursal_id
        )
      ) {
        acumulado.push({
          id: venta.sucursal_id,
          nombre: venta.sucursal_nombre,
        });
      }

      return acumulado;
    }, []);

    return sucursalesUnicas;
  }, [ventas]);

  const ventasFiltradas = useMemo(() => {
  // Todas las sucursales
  if (sucursalSeleccionada === "") {
    return ventas;
  }

  // Solo sucursales inactivas
  if (sucursalSeleccionada === "inactivas") {
    return ventas.filter(
      (venta) => venta.sucursal_activa === false
    );
  }

  // Una sucursal específica
  return ventas.filter(
    (venta) => venta.sucursal_id === Number(sucursalSeleccionada)
  );
}, [ventas, sucursalSeleccionada]);

  const totalVendido = useMemo(() => {
    return ventasFiltradas.reduce(
      (total, venta) => total + venta.total,
      0
    );
  }, [ventasFiltradas]);

  const formatearPrecio = (precio) => {
    return precio.toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
    });
  };

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleString("es-MX", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  return (
    <div className="min-h-screen bg-[#fdf6e9] p-6">

      {/* ENCABEZADO */}
      <div className="mb-6">
        <div className="flex items-center gap-4">

          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#fae4df]">
            <span className="material-icons text-3xl text-[#d06b7d]">
              trending_up
            </span>
          </div>

          <div>
            <h1 className="text-4xl font-bold text-[#8b5e6b]">
              Ventas
            </h1>

            <p className="mt-1 text-lg text-[#5f4a50]">
              Consulta las ventas realizadas en cada sucursal.
            </p>
          </div>

        </div>
      </div>

      {/* FILTRO POR SUCURSAL */}
      <section className="mb-6 rounded-3xl border border-[#ead8d8] bg-white/80 p-6 shadow-sm">

        <div className="mb-5 flex items-center gap-3">

          <span className="material-icons text-2xl text-[#d06b7d]">
            store
          </span>

          <div>
            <h2 className="font-bold text-[#5f3c46]">
              Filtrar por sucursal
            </h2>

            <p className="text-sm text-[#8c6773]">
              Selecciona una sucursal para consultar sus ventas.
            </p>
          </div>

        </div>

        <select
  value={sucursalSeleccionada}
  onChange={(e) =>
    setSucursalSeleccionada(e.target.value)
  }
  className="w-full max-w-lg rounded-full border-2 border-[#e6bdc7] bg-white px-5 py-3 text-[#6f5a61] outline-none transition focus:border-[#c96f80]"
>
  <option value="">
    Todas las sucursales
  </option>

  <option value="inactivas">
    Sucursales inactivas
  </option>

  {sucursales.map((sucursal) => (
    <option
      key={sucursal.id}
      value={sucursal.id}
    >
      {sucursal.nombre}
    </option>
  ))}
</select>

      </section>

      {/* RESUMEN */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">

        {/* VENTAS REGISTRADAS */}
        <div className="rounded-3xl border border-[#ead8d8] bg-white/80 p-5 shadow-sm">

          <div className="flex items-center gap-4">

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fae4df]">
              <span className="material-icons text-2xl text-[#d06b7d]">
                receipt_long
              </span>
            </div>

            <div>
              <p className="text-sm text-[#8c6773]">
                Ventas registradas
              </p>

              <p className="text-2xl font-bold text-[#5f3c46]">
                {ventasFiltradas.length}
              </p>
            </div>

          </div>

        </div>

        {/* TOTAL VENDIDO */}
        <div className="rounded-3xl border border-[#ead8d8] bg-white/80 p-5 shadow-sm">

          <div className="flex items-center gap-4">

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f9eeb4]">
              <span className="material-icons text-2xl text-[#a78b42]">
                payments
              </span>
            </div>

            <div>
              <p className="text-sm text-[#8c6773]">
                Total vendido
              </p>

              <p className="text-2xl font-bold text-[#5f3c46]">
                {formatearPrecio(totalVendido)}
              </p>
            </div>

          </div>

        </div>

      </div>

      {/* TABLA DE VENTAS */}
      <section className="overflow-hidden rounded-3xl border border-[#ead8d8] bg-white/80 shadow-sm">

        {/* ENCABEZADO DE LA TABLA */}
        <div className="flex items-center gap-3 border-b border-[#ead8d8] p-5">

          <span className="material-icons text-2xl text-[#d06b7d]">
            receipt_long
          </span>

          <div>
            <h2 className="font-bold text-[#5f3c46]">
              Registro de ventas
            </h2>

            <p className="text-sm text-[#8c6773]">
              Ventas realizadas por sucursal.
            </p>
          </div>

        </div>

        {ventasFiltradas.length > 0 ? (

          <div className="overflow-x-auto">

            <table className="w-full">

              <thead>
                <tr className="border-b border-[#ead8d8] bg-[#fffaf8]">

                  <th className="p-4 text-left text-sm font-semibold text-[#5f3c46]">
                    Venta
                  </th>

                  <th className="p-4 text-left text-sm font-semibold text-[#5f3c46]">
                    Sucursal
                  </th>

                  <th className="p-4 text-left text-sm font-semibold text-[#5f3c46]">
                    Fecha
                  </th>

                  <th className="p-4 text-right text-sm font-semibold text-[#5f3c46]">
                    Total
                  </th>

                </tr>
              </thead>

              <tbody>

                {ventasFiltradas.map((venta) => (

                  <tr
                    key={venta.id}
                    className="border-b border-[#f0e3e3] last:border-b-0 transition-colors hover:bg-[#fff5f6]"
                  >

                    {/* ID DE VENTA */}
                    <td className="p-4">

                      <span className="inline-flex items-center gap-2 rounded-full bg-[#fae4df] px-3 py-1 text-sm font-semibold text-[#8b5e6b]">

                        <span className="material-icons text-base text-[#d06b7d]">
                          receipt
                        </span>

                        #{venta.id}

                      </span>

                    </td>

                    {/* SUCURSAL */}
                    <td className="p-4 font-medium text-[#5f3c46]">
                      {venta.sucursal_nombre}
                    </td>

                    {/* FECHA */}
                    <td className="p-4 text-[#8c6773]">
                      {formatearFecha(venta.fecha)}
                    </td>

                    {/* TOTAL */}
                    <td className="p-4 text-right">

                      <span className="font-bold text-[#c94f68]">
                        {formatearPrecio(venta.total)}
                      </span>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        ) : (

          /* SIN VENTAS */
          <div className="px-6 py-14 text-center">

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#fae4df]">

              <span className="material-icons text-3xl text-[#d394a1]">
                receipt_long
              </span>

            </div>

            <p className="mt-4 font-semibold text-[#70565e]">
              No hay ventas registradas
            </p>

            <p className="mt-1 text-sm text-[#9b7b84]">
              No se encontraron ventas para la sucursal seleccionada.
            </p>

          </div>

        )}

      </section>

    </div>
  );
}

export default Ventas;