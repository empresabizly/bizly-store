import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { BUSINESS_CATEGORIES } from '../types';
import LogoUploader from '../components/LogoUploader';
import CoverUploader from '../components/CoverUploader';
import LockedFeature from '../components/LockedFeature';
import DashboardNav from '../components/DashboardNav';
import { getPlanFeatures, PLAN_FEATURES, PLAN_ORDER } from '../config/plans';
import { extractDominantColor } from '../utils/extractDominantColor';
import { ALL_ENGINES, EngineKey, SECTION_DEFS, DEFAULT_SECTION_ORDER, getSectionOrder } from '../config/storeTemplates';

type SubTab = 'identidad' | 'informacion' | 'diseno' | 'distribucion' | 'plan';

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: 'identidad', label: '🏪 Identidad' },
  { key: 'informacion', label: '📋 Información' },
  { key: 'diseno', label: '🎨 Diseño' },
  { key: 'distribucion', label: '🧩 Distribución' },
  { key: 'plan', label: '💳 Plan' },
];

export default function Settings() {
  const { business, refreshBusiness } = useAuth();
  const [subTab, setSubTab] = useState<SubTab>('identidad');

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [tagline, setTagline] = useState('');
  const [aboutText, setAboutText] = useState('');
  const [deliveryInfo, setDeliveryInfo] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [location, setLocation] = useState('');
  const [schedule, setSchedule] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#2E8B00');
  const [templateEngine, setTemplateEngine] = useState<EngineKey | ''>('');
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [extractingColor, setExtractingColor] = useState(false);
  const [colorError, setColorError] = useState('');
  const [sectionOrderState, setSectionOrderState] = useState<string[]>(DEFAULT_SECTION_ORDER);
  const [hiddenSectionsState, setHiddenSectionsState] = useState<string[]>([]);
  const [savingSections, setSavingSections] = useState(false);
  const [sectionsSaved, setSectionsSaved] = useState(false);

  async function suggestColorFromLogo() {
    if (!business?.logoUrl) return;
    setExtractingColor(true);
    setColorError('');
    try {
      const color = await extractDominantColor(business.logoUrl);
      setPrimaryColor(color);
    } catch {
      setColorError('No se pudo leer el color del logo. Elige uno manualmente.');
    } finally {
      setExtractingColor(false);
    }
  }

  useEffect(() => {
    if (!business) return;
    setName(business.name);
    setCategory(business.category);
    setDescription(business.description);
    setTagline(business.tagline || '');
    setAboutText(business.aboutText || '');
    setDeliveryInfo(business.deliveryInfo || '');
    setWhatsapp(business.whatsapp);
    setLocation(business.location || '');
    setSchedule(business.schedule || '');
    setPrimaryColor(business.primaryColor || '#2E8B00');
    setTemplateEngine(business.templateEngine || '');
    setInstagram(business.socialLinks?.instagram || '');
    setFacebook(business.socialLinks?.facebook || '');
    setSectionOrderState(getSectionOrder(business));
    setHiddenSectionsState(business.hiddenSections || []);
  }, [business]);

  function moveSection(index: number, direction: -1 | 1) {
    setSectionOrderState((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function toggleSectionHidden(key: string) {
    setHiddenSectionsState((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  async function saveDistribution() {
    if (!business) return;
    setSavingSections(true);
    await updateDoc(doc(db, 'businesses', business.id), {
      sectionOrder: sectionOrderState,
      hiddenSections: hiddenSectionsState,
    });
    await refreshBusiness();
    setSavingSections(false);
    setSectionsSaved(true);
    setTimeout(() => setSectionsSaved(false), 3000);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!business) return;
    setSaving(true);
    setSaved(false);
    await updateDoc(doc(db, 'businesses', business.id), {
      name,
      category,
      description,
      tagline,
      aboutText,
      deliveryInfo,
      whatsapp,
      location,
      schedule,
      primaryColor,
      templateEngine: templateEngine || null,
      socialLinks: { instagram, facebook },
    });
    await refreshBusiness();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (!business) {
    return <div className="min-h-screen flex items-center justify-center text-black/40">Cargando...</div>;
  }

  return (
    <div className="min-h-screen bg-bizly-cream">
      <header className="bg-white border-b px-6 py-4">
        <h1 className="font-heading font-bold">{business.name}</h1>
      </header>

      <DashboardNav active="configuracion" />

      <main className="max-w-2xl mx-auto px-6 py-8">
        <h2 className="font-heading text-lg font-semibold mb-1">Constructor de tu tienda</h2>
        <p className="text-xs text-black/40 mb-5">
          Ajusta la identidad, información y diseño de tu tienda pública.
        </p>

        <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
          {SUB_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setSubTab(t.key)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium ${
                subTab === t.key ? 'bg-bizly-dark text-white' : 'bg-white text-black/50 border border-black/10'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* IDENTIDAD */}
        {subTab === 'identidad' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h3 className="font-heading text-sm font-semibold mb-3">Logo</h3>
              <LogoUploader />
            </div>
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h3 className="font-heading text-sm font-semibold mb-1">Portada de tu tienda</h3>
              <p className="text-xs text-black/40 mb-3">Se muestra como banner arriba de tu catálogo público.</p>
              {getPlanFeatures(business).customCover ? (
                <CoverUploader />
              ) : (
                <LockedFeature
                  requiredPlanLabel={PLAN_FEATURES.basico.label}
                  message="Personaliza la portada de tu tienda desde el plan Básico."
                />
              )}
            </div>
          </div>
        )}

        {/* INFORMACIÓN */}
        {subTab === 'informacion' && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-5 space-y-4">
            <div>
              <label className="text-sm font-medium">Nombre del negocio</label>
              <input
                className="w-full mt-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bizly-green"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <p className="text-xs text-black/30 mt-1">
                Tu enlace sigue siendo bizly.store/{business.slug} (no cambia aunque edites el nombre).
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">Categoría</label>
              <select
                className="w-full mt-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bizly-green bg-white"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {BUSINESS_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-black/30 mt-1">
                Define qué estilo de tienda pública se usa automáticamente (menú, boutique, catálogo técnico, etc.).
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">Eslogan (opcional)</label>
              <input
                className="w-full mt-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bizly-green"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="Ej. Sabor que enamora"
                maxLength={60}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Descripción</label>
              <textarea
                className="w-full mt-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bizly-green"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Sobre nosotros (opcional)</label>
              <textarea
                className="w-full mt-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bizly-green"
                rows={4}
                value={aboutText}
                onChange={(e) => setAboutText(e.target.value)}
                placeholder="Cuenta la historia de tu negocio — se muestra en una sección aparte de tu tienda pública."
              />
            </div>

            <div>
              <label className="text-sm font-medium">Información de entrega (opcional)</label>
              <input
                className="w-full mt-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bizly-green"
                value={deliveryInfo}
                onChange={(e) => setDeliveryInfo(e.target.value)}
                placeholder="Ej. Envío a domicilio en pedidos mayores a $500"
              />
            </div>

            <div>
              <label className="text-sm font-medium">WhatsApp (con código de país)</label>
              <input
                className="w-full mt-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bizly-green"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium">Ubicación</label>
              <input
                className="w-full mt-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bizly-green"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Horario de atención (opcional)</label>
              <input
                className="w-full mt-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bizly-green"
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                placeholder="Ej. Lun-Sáb 9am-8pm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Instagram (opcional)</label>
                <input
                  className="w-full mt-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bizly-green"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="@tu_negocio"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Facebook (opcional)</label>
                <input
                  className="w-full mt-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bizly-green"
                  value={facebook}
                  onChange={(e) => setFacebook(e.target.value)}
                  placeholder="URL de tu página"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 rounded-full bg-bizly-green text-white font-semibold disabled:opacity-60"
            >
              {saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar cambios'}
            </button>
          </form>
        )}

        {/* DISEÑO */}
        {subTab === 'diseno' && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-5 space-y-5">
            <div>
              <label className="text-sm font-medium">Color de marca</label>
              <div className="flex items-center gap-3 mt-1">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-12 h-10 rounded-lg border cursor-pointer"
                />
                <span className="text-xs text-black/40">
                  Se usa en botones, precios y acentos de tu tienda pública.
                </span>
              </div>
              {business.logoUrl && (
                <button
                  type="button"
                  onClick={suggestColorFromLogo}
                  disabled={extractingColor}
                  className="mt-2 text-xs text-bizly-green font-medium disabled:opacity-60"
                >
                  {extractingColor ? 'Analizando tu logo...' : '🎨 Sugerir color a partir de mi logo'}
                </button>
              )}
              {colorError && <p className="text-xs text-red-600 mt-1">{colorError}</p>}
            </div>

            <div>
              <label className="text-sm font-medium">Plantilla de tienda</label>
              <select
                value={templateEngine}
                onChange={(e) => setTemplateEngine(e.target.value as EngineKey | '')}
                className="w-full mt-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bizly-green bg-white"
              >
                <option value="">Automático (según tu categoría)</option>
                {Object.values(ALL_ENGINES).map((e) => (
                  <option key={e.key} value={e.key}>
                    {e.engineName}
                  </option>
                ))}
              </select>
              <p className="text-xs text-black/30 mt-1">
                Por ejemplo, "Alimentos y restaurantes" usa Bizly Food (fotos grandes) por
                default, pero si tienes un restaurante con menú extenso, Bizly Restaurante
                (estilo lista, como Uber Eats) puede quedarte mejor.
              </p>
            </div>

            <div className="border rounded-xl p-4">
              <p className="text-xs text-black/40 mb-2">Vista previa</p>
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-heading font-bold"
                  style={{ backgroundColor: primaryColor }}
                >
                  {business.name.charAt(0).toUpperCase()}
                </div>
                <button
                  type="button"
                  className="px-4 py-2 rounded-full text-white text-sm font-semibold"
                  style={{ backgroundColor: primaryColor }}
                >
                  Botón de ejemplo
                </button>
              </div>
            </div>

            <div className="text-xs text-black/40 bg-black/[0.02] rounded-lg p-3">
              El diseño general de tu tienda (Menú, Boutique, Catálogo técnico, etc.) se ajusta
              automáticamente según la categoría que elegiste en la pestaña "Información".
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 rounded-full bg-bizly-green text-white font-semibold disabled:opacity-60"
            >
              {saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar cambios'}
            </button>
          </form>
        )}

        {/* DISTRIBUCIÓN */}
        {subTab === 'distribucion' && (
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="text-sm font-semibold mb-1">Orden de secciones</h3>
            <p className="text-xs text-black/40 mb-4">
              Cambia el orden en que aparecen las secciones de contenido en tu tienda pública
              (el encabezado, buscador, categorías y pie de página siempre se quedan fijos).
              Las secciones vacías (sin productos que cumplan la condición) no se muestran
              aunque estén activadas.
            </p>

            <div className="space-y-2">
              {sectionOrderState.map((key, index) => {
                const def = SECTION_DEFS.find((s) => s.key === key);
                if (!def) return null;
                const hidden = hiddenSectionsState.includes(key);
                return (
                  <div
                    key={key}
                    className={`flex items-center gap-3 border rounded-lg px-3 py-2.5 ${
                      hidden ? 'bg-black/[0.02] opacity-60' : 'bg-white'
                    }`}
                  >
                    <div className="flex flex-col">
                      <button
                        type="button"
                        onClick={() => moveSection(index, -1)}
                        disabled={index === 0}
                        className="text-black/40 disabled:opacity-20 text-xs leading-none py-0.5"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSection(index, 1)}
                        disabled={index === sectionOrderState.length - 1}
                        className="text-black/40 disabled:opacity-20 text-xs leading-none py-0.5"
                      >
                        ▼
                      </button>
                    </div>
                    <span className="flex-1 text-sm font-medium">{def.label}</span>
                    {def.canHide ? (
                      <button
                        type="button"
                        onClick={() => toggleSectionHidden(key)}
                        className="text-xs font-medium text-bizly-green shrink-0"
                      >
                        {hidden ? 'Mostrar' : 'Ocultar'}
                      </button>
                    ) : (
                      <span className="text-[10px] text-black/30 shrink-0">Siempre visible</span>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={saveDistribution}
              disabled={savingSections}
              className="w-full mt-5 py-3 rounded-full bg-bizly-green text-white font-semibold disabled:opacity-60"
            >
              {savingSections ? 'Guardando...' : sectionsSaved ? '✓ Guardado' : 'Guardar orden'}
            </button>
          </div>
        )}

        {/* PLAN */}
        {subTab === 'plan' && (
          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-semibold">{getPlanFeatures(business).label}</p>
                <p className="text-xs text-black/40">{getPlanFeatures(business).price}</p>
              </div>
              <Link to="/#planes" className="text-xs text-bizly-green font-medium">
                Ver todos los planes
              </Link>
            </div>
            <div className="space-y-2 text-sm">
              {PLAN_ORDER.map((p) => (
                <div
                  key={p}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                    p === business.plan ? 'bg-bizly-green/10 border border-bizly-green' : 'bg-black/[0.02]'
                  }`}
                >
                  <span className={p === business.plan ? 'font-semibold' : ''}>{PLAN_FEATURES[p].label}</span>
                  <span className="text-xs text-black/40">{PLAN_FEATURES[p].price}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-black/30 mt-3">
              El cobro real de planes todavía no está activo — por ahora, contáctanos para cambiar tu plan manualmente.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
