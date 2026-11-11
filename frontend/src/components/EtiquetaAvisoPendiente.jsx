import { Mail } from "lucide-react";

export default function EtiquetaAvisoPendiente({ texto }) {
  return (
    <span className="inline-flex items-center gap-1 shrink-0 whitespace-nowrap px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
      <Mail size={12} />
      {texto}
    </span>
  );
}
