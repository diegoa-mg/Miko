import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  actualizarPerfilApi,
  cambiarPasswordApi,
  subirFotoPerfilApi,
} from "../api/cuenta";

// Extrae el mensaje de error del backend (en 422 "detail" es un arreglo, no un texto)
const getError = (err, fallback) => {
  if (!err.response) {
    return `${fallback}: sin respuesta del servidor (revisa que el backend esté corriendo)`;
  }
  const d = err.response.data?.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return `${fallback}: ${d[0]?.msg || "datos inválidos"}`;
  return `${fallback} (error ${err.response.status})`;
};

export default function Configuracion() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Estados editables de los campos
  const [nombre, setNombre] = useState("");
  const [emailActual, setEmailActual] = useState("");
  const [emailNuevo, setEmailNuevo] = useState("");
  const [passwordActual, setPasswordActual] = useState("admin123");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [previewFoto, setPreviewFoto] = useState(null);

  // Estados para ver u ocultar las contraseñas
  const [mostrarPasswordActual, setMostrarPasswordActual] = useState(false);
  const [mostrarPasswordNueva, setMostrarPasswordNueva] = useState(false);

  // Estados de carga y feedback
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [guardandoPass, setGuardandoPass] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });

  useEffect(() => {
    if (user) {
      setNombre(user.nombre || "");
      setEmailActual(user.email || "");
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Cambio y previsualización de foto
  const handleFotoChange = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setMensaje({ tipo: "error", texto: "La imagen no debe superar los 10 MB" });
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewFoto(objectUrl);

    try {
      setSubiendoFoto(true);
      setMensaje({ tipo: "", texto: "" });
      const usuarioActualizado = await subirFotoPerfilApi(file);
      updateUser(usuarioActualizado);
      setPreviewFoto(null);
      setMensaje({ tipo: "success", texto: "Foto de perfil actualizada exitosamente" });
    } catch (err) {
      setMensaje({ tipo: "error", texto: getError(err, "Error al subir la imagen") });
      setPreviewFoto(null);
    } finally {
      URL.revokeObjectURL(objectUrl);
      setSubiendoFoto(false);
    }
  };

  // Guardar datos modificados (Nombre y Correo)
  const handleUpdatePerfil = async (e) => {
    e.preventDefault();
    setMensaje({ tipo: "", texto: "" });

    const nuevoCorreoLimpio = emailNuevo.trim();

    if (nuevoCorreoLimpio && !nuevoCorreoLimpio.includes("@")) {
      setMensaje({
        tipo: "error",
        texto: "El nuevo correo electrónico debe incluir un '@' válido",
      });
      return;
    }

    try {
      setGuardandoPerfil(true);
      const payload = {
        nombre: nombre.trim(),
        email: nuevoCorreoLimpio ? nuevoCorreoLimpio : emailActual.trim(),
      };

      const usuarioActualizado = await actualizarPerfilApi(payload);
      updateUser(usuarioActualizado);
      setEmailActual(usuarioActualizado.email || payload.email);
      setEmailNuevo("");
      setMensaje({ tipo: "success", texto: "Datos personales actualizados correctamente" });
    } catch (err) {
      setMensaje({ tipo: "error", texto: getError(err, "Error al actualizar perfil") });
    } finally {
      setGuardandoPerfil(false);
    }
  };

  // Cambiar contraseña
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    try {
      setGuardandoPass(true);
      setMensaje({ tipo: "", texto: "" });
      await cambiarPasswordApi(passwordActual, passwordNueva);
      setMensaje({ tipo: "success", texto: "Contraseña cambiada con éxito" });
      setPasswordNueva("");
    } catch (err) {
      setMensaje({ tipo: "error", texto: getError(err, "Error al cambiar contraseña") });
    } finally {
      setGuardandoPass(false);
    }
  };

  const fotoSrc =
    previewFoto ||
    user?.foto_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      nombre || user?.nombre || "U"
    )}&background=875d69&color=fff&size=256&bold=true`;

  return (
    <div className="min-h-screen bg-[#fdf6e3] p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Encabezado */}
        <div className="mb-8">
          <h1 className="font-sans text-3xl font-bold text-[#875d69]">
            Configuración
          </h1>
          <p className="font-sans text-gray-600 mt-1">
            Administra tu información personal y credenciales de acceso
          </p>
        </div>

        {/* Notificaciones */}
        {mensaje.texto && (
          <div
            className={`p-4 rounded-2xl text-sm font-medium border ${
              mensaje.tipo === "error"
                ? "bg-red-50 text-red-700 border-red-200"
                : "bg-green-50 text-green-700 border-green-200"
            }`}
          >
            {mensaje.texto}
          </div>
        )}

        {/* Tarjeta Principal */}
        <div className="bg-white rounded-3xl shadow-sm border border-[#f0dfdc] p-6 md:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            
            {/* Columna Izquierda: Foto de Perfil */}
            <div className="lg:col-span-4 rounded-2xl p-6 min-h-[700px] flex flex-col items-center justify-center text-center">
              <h3 className="font-sans text-base font-semibold text-[#875d69] mb-1">
                Foto de perfil
              </h3>
              <p className="font-sans text-xs text-gray-500 mb-6">
                Haz clic en el icono o selecciona una imagen de tu equipo
              </p>

              <div className="relative mb-5 group">
                <div className="w-36 h-36 md:w-44 md:h-44 rounded-full p-1 bg-white shadow-md ring-4 ring-[#ead8d8] overflow-hidden">
                  <img
                    src={fotoSrc}
                    alt="Foto de perfil"
                    className="w-full h-full rounded-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>

                <button
                  type="button"
                  disabled={subiendoFoto}
                  onClick={() => fileInputRef.current?.click()}
                  title="Cambiar fotografía"
                  className="absolute bottom-2 right-2 w-11 h-11 rounded-full bg-[#875d69] hover:bg-[#6f4b55] text-white shadow-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95 disabled:opacity-50"
                >
                  <span className="material-icons text-xl">photo_camera</span>
                </button>

                {subiendoFoto && (
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                    Subiendo...
                  </div>
                )}
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFotoChange}
                accept="image/png, image/jpeg, image/webp"
                className="hidden"
              />

              <button
                type="button"
                disabled={subiendoFoto}
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 px-4 bg-white border border-[#ead8d8] hover:border-[#cda4b4] text-[#875d69] text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50"
              >
                {subiendoFoto ? "Cargando archivo..." : "Seleccionar imagen"}
              </button>

              <span className="text-[11px] text-gray-400 mt-3">
                Formatos: PNG, JPG o WEBP (Máx. 10 MB)
              </span>
            </div>

            {/* Columna Derecha: Formularios */}
            <div className="lg:col-span-8 space-y-8">
              
              {/* Formulario 1: Datos Personales */}
              <form onSubmit={handleUpdatePerfil} className="space-y-4">
                <div>
                  <h3 className="font-sans text-lg font-semibold text-[#875d69]">
                    Datos Personales
                  </h3>
                  <p className="font-sans text-xs text-gray-500">
                    Modifica tu nombre de usuario y correo electrónico
                  </p>
                </div>

                {/* Fila Nombre Completo */}
                <div>
                  <label className="font-sans block text-xs font-medium text-[#875d69] mb-1.5">
                    Nombre completo *
                  </label>
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    required
                    placeholder="Ej. Admin de prueba"
                    className="font-sans w-full border-2 border-[#ead8d8] rounded-xl px-4 py-2.5 text-sm bg-white text-gray-800 focus:outline-none focus:border-[#cda4b4] transition"
                  />
                </div>

                {/* Fila Correo Actual y Nuevo Correo */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="font-sans block text-xs font-medium text-[#875d69] mb-1.5">
                      Correo Electrónico Actual *
                    </label>
                    <input
                      type="email"
                      value={emailActual}
                      readOnly
                      tabIndex={-1}
                      title="Este correo no se puede modificar directamente"
                      className="font-sans w-full border-2 border-[#ead8d8] rounded-xl px-4 py-2.5 text-sm bg-white text-gray-800 focus:outline-none cursor-default select-none caret-transparent"
                    />
                  </div>

                  <div>
                    <label className="font-sans block text-xs font-medium text-[#875d69] mb-1.5">
                      Nuevo Correo Electrónico
                    </label>
                    <input
                      type="email"
                      value={emailNuevo}
                      onChange={(e) => setEmailNuevo(e.target.value)}
                      placeholder="nuevo@correo.com"
                      className="font-sans w-full border-2 border-[#ead8d8] rounded-xl px-4 py-2.5 text-sm bg-white text-gray-800 focus:outline-none focus:border-[#cda4b4] transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={guardandoPerfil}
                  className="font-sans px-5 py-2.5 bg-[#875d69] hover:bg-[#724d58] text-white rounded-xl text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
                >
                  {guardandoPerfil ? "Guardando..." : "Guardar Cambios"}
                </button>
              </form>

              <div className="border-t border-[#eee1dd]" />

              {/* Formulario 2: Seguridad y Acceso */}
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div>
                  <h3 className="font-sans text-lg font-semibold text-[#875d69]">
                    Seguridad y Acceso
                  </h3>
                  <p className="font-sans text-xs text-gray-500">
                    Actualiza tu contraseña para mantener la seguridad de tu acceso
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Contraseña Actual (Bloqueada, estilo consistente sin puntos deformes) */}
                  <div>
                    <label className="font-sans block text-xs font-medium text-[#875d69] mb-1.5">
                      Contraseña actual *
                    </label>
                    <div className="relative">
                      <input
                        type={mostrarPasswordActual ? "text" : "password"}
                        value={passwordActual}
                        readOnly
                        onKeyDown={(e) => e.preventDefault()}
                        tabIndex={-1}
                        className="font-sans w-full border-2 border-[#ead8d8] rounded-xl pl-4 pr-11 py-2.5 text-sm bg-white text-gray-800 focus:outline-none cursor-default select-none caret-transparent tracking-widest"
                      />
                      <button
                        type="button"
                        onClick={() => setMostrarPasswordActual((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#875d69] transition-colors focus:outline-none"
                        title={mostrarPasswordActual ? "Ocultar contraseña" : "Ver contraseña"}
                      >
                        <span className="material-icons text-xl">
                          {mostrarPasswordActual ? "visibility_off" : "visibility"}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Nueva Contraseña */}
                  <div>
                    <label className="font-sans block text-xs font-medium text-[#875d69] mb-1.5">
                      Nueva contraseña *
                    </label>
                    <div className="relative">
                      <input
                        type={mostrarPasswordNueva ? "text" : "password"}
                        value={passwordNueva}
                        onChange={(e) => setPasswordNueva(e.target.value)}
                        required
                        placeholder="Ingresa la nueva contraseña"
                        className="font-sans w-full border-2 border-[#ead8d8] rounded-xl pl-4 pr-11 py-2.5 text-sm bg-white text-gray-800 focus:outline-none focus:border-[#cda4b4] transition"
                      />
                      <button
                        type="button"
                        onClick={() => setMostrarPasswordNueva((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#875d69] transition-colors focus:outline-none"
                        title={mostrarPasswordNueva ? "Ocultar contraseña" : "Ver contraseña"}
                      >
                        <span className="material-icons text-xl">
                          {mostrarPasswordNueva ? "visibility_off" : "visibility"}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={guardandoPass}
                  className="font-sans px-5 py-2.5 bg-[#875d69] hover:bg-[#724d58] text-white rounded-xl text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
                >
                  {guardandoPass ? "Actualizando..." : "Actualizar Contraseña"}
                </button>
              </form>

              <div className="border-t border-[#eee1dd]" />

              {/* Botón de Cerrar Sesión */}
              <div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="font-sans w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors"
                >
                  <span className="material-icons text-base">logout</span>
                  Cerrar sesión
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}