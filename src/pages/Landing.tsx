import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="min-h-screen bg-bizly-cream">
      {/* Hero */}
      <header className="bg-bizly-dark text-white">
        <nav className="max-w-6xl mx-auto flex items-center justify-between px-6 py-5">
          <img src="/logo.png" alt="Bizly Store" className="h-10 w-auto" />
          <div className="flex gap-3">
            <Link to="/login" className="px-4 py-2 text-sm rounded-full border border-white/30 hover:bg-white/10 transition">
              Iniciar sesión
            </Link>
            <Link to="/registro" className="px-4 py-2 text-sm rounded-full bg-bizly-green hover:opacity-90 transition font-medium">
              Crear mi tienda gratis
            </Link>
          </div>
        </nav>
        <div className="max-w-3xl mx-auto text-center px-6 py-20">
          <h1 className="font-heading text-4xl md:text-5xl font-bold leading-tight">
            Tu tienda online profesional lista en minutos.
          </h1>
          <p className="mt-5 text-white/70 text-lg">
            Crea tu catálogo, personaliza tu diseño y recibe pedidos por WhatsApp. Sin conocimientos técnicos.
          </p>
          <Link
            to="/registro"
            className="inline-block mt-8 px-8 py-3 rounded-full bg-bizly-green font-semibold hover:opacity-90 transition"
          >
            Crear mi tienda gratis
          </Link>
        </div>
      </header>

      {/* Cómo funciona */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-center font-heading text-2xl font-semibold mb-10">Cómo funciona</h2>
        <div className="grid md:grid-cols-3 gap-8 text-center">
          {[
            { step: '1', title: 'Crea tu negocio', desc: 'Nombre, categoría, logo y WhatsApp en un solo paso.' },
            { step: '2', title: 'Elige tu diseño', desc: 'Un tema profesional listo para usar, sin diseñador.' },
            { step: '3', title: 'Comparte y vende', desc: 'Sube tus productos y comparte tu enlace con tus clientes.' },
          ].map((s) => (
            <div key={s.step} className="p-6 rounded-2xl bg-white shadow-sm">
              <div className="w-10 h-10 mx-auto rounded-full bg-bizly-green text-white flex items-center justify-center font-bold">
                {s.step}
              </div>
              <h3 className="mt-4 font-heading font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-black/60">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Planes */}
      <section className="bg-white py-16">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-center font-heading text-2xl font-semibold mb-10">Planes</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { name: 'Gratis', price: '$0', items: ['Tienda básica', 'Hasta 10 productos', 'Marca Bizly'] },
              { name: 'Básico', price: '$49/mes', items: ['Hasta 50 productos', 'Personalización básica', 'WhatsApp'] },
              { name: 'Emprendedor', price: '$129/mes', items: ['Productos ilimitados', 'Más temas', 'Sin marca Bizly'] },
              { name: 'Negocio', price: '$299/mes', items: ['Dominio propio', 'Inventario', 'Soporte prioritario'] },
            ].map((p) => (
              <div key={p.name} className="border rounded-2xl p-6">
                <h3 className="font-heading font-semibold">{p.name}</h3>
                <p className="text-2xl font-bold mt-2">{p.price}</p>
                <ul className="mt-4 space-y-2 text-sm text-black/60">
                  {p.items.map((i) => (
                    <li key={i}>• {i}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="text-center py-8 text-sm text-black/50">
        © {new Date().getFullYear()} Bizly Store — un producto de Bizlystudio
      </footer>
    </div>
  );
}
