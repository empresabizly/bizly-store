interface LockedFeatureProps {
  requiredPlanLabel: string;
  message?: string;
}

/**
 * Se muestra en lugar de una función cuando el plan actual del negocio
 * no la incluye todavía. No hay cobro real implementado — esto es un
 * aviso informativo que indica qué plan la desbloquearía.
 */
export default function LockedFeature({ requiredPlanLabel, message }: LockedFeatureProps) {
  return (
    <div className="border border-dashed border-black/20 rounded-lg p-4 text-center bg-black/[0.02]">
      <p className="text-sm text-black/50">
        🔒 {message || 'Esta función no está incluida en tu plan actual.'}
      </p>
      <p className="text-xs text-black/40 mt-1">
        Disponible desde el plan <span className="font-semibold">{requiredPlanLabel}</span>.
      </p>
    </div>
  );
}
