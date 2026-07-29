import { Link } from 'react-router-dom';

interface DashboardNavProps {
  active: 'resumen' | 'productos' | 'pedidos' | 'configuracion';
}

const TABS: { key: DashboardNavProps['active']; label: string; to: string }[] = [
  { key: 'resumen', label: '📊 Resumen', to: '/dashboard' },
  { key: 'productos', label: '📦 Productos', to: '/dashboard/productos' },
  { key: 'pedidos', label: '🛒 Pedidos', to: '/dashboard/pedidos' },
  { key: 'configuracion', label: '⚙️ Configuración', to: '/dashboard/configuracion' },
];

export default function DashboardNav({ active }: DashboardNavProps) {
  return (
    <div className="bg-white border-b">
      <div className="max-w-4xl mx-auto px-6 flex gap-1 overflow-x-auto no-scrollbar">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            to={tab.to}
            className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${
              active === tab.key
                ? 'border-bizly-green text-bizly-dark'
                : 'border-transparent text-black/40'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
