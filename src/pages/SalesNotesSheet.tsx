import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ROWS = Array.from({ length: 28 });

export default function SalesNotesSheet() {
  const { business, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-black/50">Cargando...</div>;
  }
  if (!business) {
    navigate('/onboarding');
    return null;
  }

  return (
    <div className="min-h-screen bg-black/5 print:bg-white">
      {/* Barra de acciones — no se imprime */}
      <div className="print:hidden bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => navigate('/dashboard')} className="text-sm text-black/40">
          ← Volver
        </button>
        <button
          onClick={() => window.print()}
          className="px-5 py-2 rounded-full bg-bizly-green text-white text-sm font-semibold"
        >
          🖨️ Imprimir / Guardar como PDF
        </button>
      </div>

      {/* Hoja imprimible */}
      <div className="max-w-3xl mx-auto bg-white shadow-sm print:shadow-none my-6 print:my-0 p-8 print:p-6">
        <div className="flex items-center justify-between border-b-2 border-black pb-4 mb-4">
          <div className="flex items-center gap-3">
            {business.logoUrl ? (
              <img src={business.logoUrl} alt={business.name} className="w-14 h-14 rounded-full object-cover" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-bizly-dark text-white flex items-center justify-center font-heading font-bold text-xl">
                {business.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-heading text-xl font-bold">{business.name}</p>
              <p className="text-xs text-black/50">Hoja de registro de ventas</p>
            </div>
          </div>
          <div className="text-right text-xs text-black/50">
            <p>Fecha: ______________________</p>
            <p className="mt-1">Vendedor: ______________________</p>
          </div>
        </div>

        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="text-left py-2 pr-2 font-semibold">#</th>
              <th className="text-left py-2 pr-2 font-semibold">Cliente</th>
              <th className="text-left py-2 pr-2 font-semibold">Producto</th>
              <th className="text-center py-2 pr-2 font-semibold">Cant.</th>
              <th className="text-right py-2 pr-2 font-semibold">Precio</th>
              <th className="text-right py-2 pr-2 font-semibold">Total</th>
              <th className="text-center py-2 font-semibold">Vendedor</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((_, i) => (
              <tr key={i} className="border-b border-black/15">
                <td className="py-2.5 pr-2 text-black/30">{i + 1}</td>
                <td className="py-2.5 pr-2">&nbsp;</td>
                <td className="py-2.5 pr-2">&nbsp;</td>
                <td className="py-2.5 pr-2">&nbsp;</td>
                <td className="py-2.5 pr-2">&nbsp;</td>
                <td className="py-2.5 pr-2">&nbsp;</td>
                <td className="py-2.5">&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end mt-6 pt-4 border-t-2 border-black">
          <div className="text-sm">
            <p className="flex justify-between gap-8">
              <span className="text-black/50">Total del día:</span>
              <span className="font-bold">$_______________</span>
            </p>
          </div>
        </div>

        <p className="text-center text-[10px] text-black/30 mt-8">
          {business.name} — Generado con Bizly Store
        </p>
      </div>
    </div>
  );
}
