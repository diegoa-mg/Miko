// Utilidades de formato compartidas por la pantalla de venta y Mis ventas

export const esIngles = (idioma) => idioma?.startsWith("en");

export const crearFormatoMoneda = (idioma) =>
  new Intl.NumberFormat(esIngles(idioma) ? "en-US" : "es-MX", {
    style: "currency",
    currency: "MXN",
  });

// Las fechas llegan en UTC; se muestran en la zona horaria del negocio
// (la que manda el backend), no en la del navegador.
// Si el backend manda la fecha sin zona ("2026-11-09T23:32:00"), JavaScript la
// tomaría como hora local del navegador. Aquí se trata como UTC, que es como
// se guarda en la base de datos.
const aFecha = (iso) => {
  if (iso instanceof Date) return iso;
  const texto = String(iso);
  const tieneZona = /(Z|[+-]\d{2}:?\d{2})$/i.test(texto);
  const soloFecha = /^\d{4}-\d{2}-\d{2}$/.test(texto);
  return new Date(tieneZona || soloFecha ? texto : `${texto}Z`);
};

export const formatearFechaNegocio = (iso, idioma, zonaHoraria) => {
  if (!iso) return "";
  return new Intl.DateTimeFormat(esIngles(idioma) ? "en-US" : "es-MX", {
    dateStyle: "short",
    timeStyle: "short",
    ...(zonaHoraria ? { timeZone: zonaHoraria } : {}),
  }).format(aFecha(iso));
};

// "YYYY-MM-DD" de hoy en la zona horaria del negocio
export const fechaHoy = (zonaHoraria) =>
  new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...(zonaHoraria ? { timeZone: zonaHoraria } : {}),
  }).format(new Date());

// Resta días a una fecha "YYYY-MM-DD"
export const restarDias = (fechaIso, dias) => {
  const [y, m, d] = fechaIso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - dias)).toISOString().slice(0, 10);
};