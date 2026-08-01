import { useState } from 'react';

interface ShareStoreCardProps {
  storeSlug: string;
  businessName: string;
}

export default function ShareStoreCard({ storeSlug, businessName }: ShareStoreCardProps) {
  const [copied, setCopied] = useState(false);

  const storeUrl = `${window.location.origin}/tienda/${storeSlug}`;
  const shareMessage = `Mira la tienda online de ${businessName}: ${storeUrl}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(storeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Si el navegador bloquea el portapapeles, al menos seleccionamos el texto visualmente.
    }
  }

  function shareToWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`, '_blank');
  }

  function shareToFacebook() {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(storeUrl)}`,
      '_blank',
      'width=600,height=500'
    );
  }

  async function shareNative() {
    if (navigator.share) {
      try {
        await navigator.share({ title: businessName, text: shareMessage, url: storeUrl });
      } catch {
        // El usuario canceló el diálogo de compartir — no hay nada que hacer.
      }
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-5 mb-8">
      <h3 className="font-heading text-sm font-semibold mb-1">🔗 Comparte tu tienda</h3>
      <p className="text-xs text-black/40 mb-4">
        Este es el enlace directo a tu tienda pública — compártelo con tus clientes.
      </p>

      <div className="flex items-center gap-2 bg-black/[0.03] rounded-lg px-3 py-2.5 mb-4">
        <span className="flex-1 text-sm truncate text-black/70">{storeUrl}</span>
        <button
          onClick={handleCopy}
          className="shrink-0 text-xs font-semibold text-bizly-green px-2 py-1"
        >
          {copied ? '✓ Copiado' : 'Copiar'}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={shareToWhatsApp}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#25D366] text-white text-sm font-medium"
        >
          💬 WhatsApp
        </button>
        <button
          onClick={shareToFacebook}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#1877F2] text-white text-sm font-medium"
        >
          📘 Facebook
        </button>
        {typeof navigator !== 'undefined' && !!navigator.share && (
          <button
            onClick={shareNative}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-bizly-dark text-white text-sm font-medium"
          >
            📤 Más opciones
          </button>
        )}
        <a
          href={storeUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-full border border-black/10 text-black/60 text-sm font-medium"
        >
          👁️ Ver mi tienda
        </a>
      </div>
    </div>
  );
}
