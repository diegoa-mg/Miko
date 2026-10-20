import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { useTranslation } from "react-i18next";

const cargarImagen = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

// Recorta la zona elegida y devuelve un File listo para subir
async function recortarImagen(src, area) {
  const img = await cargarImagen(src);
  const size = Math.min(Math.round(area.width), 800);

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  // Fondo blanco por si la imagen original tiene transparencia (PNG/WEBP)
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, size, size);

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.92)
  );
  return new File([blob], "foto-perfil.jpg", { type: "image/jpeg" });
}

export default function CropFotoModal({ imageSrc, onCancel, onConfirm }) {
  const { t } = useTranslation();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaPixeles, setAreaPixeles] = useState(null);
  const [procesando, setProcesando] = useState(false);

  const onCropComplete = useCallback((_, pixeles) => {
    setAreaPixeles(pixeles);
  }, []);

  const handleConfirmar = async () => {
    if (!areaPixeles) return;
    setProcesando(true);
    try {
      const file = await recortarImagen(imageSrc, areaPixeles);
      onConfirm(file);
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-6">
        <h3 className="font-sans text-lg font-semibold text-[#875d69]">
          {t("perfil.recortarTitulo")}
        </h3>
        <p className="font-sans text-xs text-gray-500 mb-4">
          {t("perfil.recortarDescripcion")}
        </p>

        <div className="relative w-full h-72 rounded-2xl overflow-hidden bg-gray-900">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="flex items-center gap-3 mt-4">
          <span className="material-icons text-gray-400 text-base">remove</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-[#875d69]"
          />
          <span className="material-icons text-gray-400 text-base">add</span>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={procesando}
            className="flex-1 py-2.5 border border-[#ead8d8] text-[#875d69] text-xs font-semibold rounded-xl hover:border-[#cda4b4] transition-colors disabled:opacity-50"
          >
            {t("perfil.cancelar")}
          </button>
          <button
            type="button"
            onClick={handleConfirmar}
            disabled={procesando}
            className="flex-1 py-2.5 bg-[#875d69] hover:bg-[#724d58] text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
          >
            {procesando ? t("perfil.procesando") : t("perfil.guardarFoto")}
          </button>
        </div>
      </div>
    </div>
  );
}