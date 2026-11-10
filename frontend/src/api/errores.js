// Utilidades para mostrar los errores que devuelve el backend

// FastAPI/Pydantic antepone "Value error, " al texto de las validaciones propias
// (por ejemplo, las de contraseña). Es ruido técnico para quien usa la pantalla.
const PREFIJO_VALIDACION = /^value error,\s*/i;

export const quitarPrefijoValidacion = (mensaje) =>
  String(mensaje ?? "").replace(PREFIJO_VALIDACION, "").trim();

// Mensajes de Pydantic en inglés que sí se traducen. `inicio` se compara en
// minúsculas contra el comienzo del mensaje; `clave` es la traducción en i18next.
const TRADUCCIONES = [
  { inicio: "value is not a valid email address", clave: "errores.correoInvalido" },
  { inicio: "field required", clave: "errores.campoRequerido" },
];

// Traduce el mensaje si coincide con alguna regla (y se recibió `t`); si no,
// solo le quita el prefijo "Value error, ".
const procesarMensaje = (mensaje, t) => {
  const limpio = quitarPrefijoValidacion(mensaje);

  if (typeof t === "function") {
    const minusculas = limpio.toLowerCase();
    const regla = TRADUCCIONES.find((r) => minusculas.startsWith(r.inicio));
    if (regla) return t(regla.clave);
  }

  return limpio;
};

// Extrae el mensaje de un error de axios, traducido y sin el prefijo
// "Value error, ". Recibe `t` (de useTranslation) para traducir los mensajes
// en inglés de Pydantic; sin `t` solo limpia el prefijo.
// "detail" llega de dos formas:
//   - texto:    { detail: "El correo ya existe" }
//   - arreglo:  { detail: [{ msg: "Value error, ..." }, ...] }  (errores 422)
// Devuelve "" si no hay un mensaje utilizable; así cada pantalla decide su
// texto de respaldo:  extraerMensajeError(err, t) || t("...")
export function extraerMensajeError(err, t) {
  const detalle = err?.response?.data?.detail;

  if (typeof detalle === "string") return procesarMensaje(detalle, t);

  if (Array.isArray(detalle)) {
    const mensajes = detalle
      .map((item) => procesarMensaje(item?.msg, t))
      .filter(Boolean);
    // Si varios campos fallan con la misma regla, el texto se repetiría
    return [...new Set(mensajes)].join(" ");
  }

  return "";
}
