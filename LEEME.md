# Bizly Store — MVP

Este es el primer MVP funcional: registro, crear negocio, un tema (Minimalista),
productos, tienda pública y pedidos por WhatsApp.

## Lo que falta para que funcione (2 pasos obligatorios)

### 1. Conectar tu proyecto de Firebase

1. Ve a https://console.firebase.google.com y crea un proyecto nuevo (o usa uno existente).
2. Activa **Authentication** → método "Correo electrónico/contraseña".
3. Activa **Firestore Database** → modo producción.
4. Ve a Configuración del proyecto → Tus apps → agrega una app web.
5. Copia los valores que te da (apiKey, authDomain, etc.) y pégalos en:
   `src/firebase/config.ts` (reemplaza los valores que dicen "REEMPLAZA...").
6. En Firestore, sube las reglas de seguridad que están en `firestore.rules`
   (Firestore → Reglas → pegar el contenido → Publicar).

### 2. Desplegar en Vercel

Como este proyecto usa React + TypeScript, necesita un "build" antes de publicarse
(a diferencia de tus otros sitios en HTML plano que subes directo a Netlify).
La forma más simple sin usar la terminal:

1. Crea una cuenta gratis en https://github.com (si no tienes).
2. Sube esta carpeta completa como un repositorio nuevo (puedes arrastrar los
   archivos desde github.com/new → "uploading an existing file").
3. Ve a https://vercel.com, inicia sesión con tu cuenta de GitHub.
4. "Add New Project" → selecciona el repositorio que subiste → Deploy.
   Vercel detecta automáticamente que es un proyecto Vite/React y lo construye solo.
5. Cuando termine, te da una URL tipo `bizly-store.vercel.app`.

Si prefieres, en la siguiente sesión puedo ayudarte a dejar todo listo para que
solo tengas que arrastrar y soltar, o revisar el proyecto contigo paso a paso
cuando llegues a esta parte.

## Configurar Cloudinary (subida real de fotos)

1. Crea una cuenta gratis en https://cloudinary.com
2. En el Dashboard, copia tu **Cloud Name** (aparece arriba).
3. Ve a **Settings ⚙️ → Upload → Upload presets → Add upload preset**:
   - **Signing Mode:** Unsigned
   - **Folder:** déjalo vacío (el código ya arma la carpeta `bizly/users/{userId}/logos` o `/products` automáticamente).
   - En **Upload Manipulations / Incoming Transformation**, agrega:
     - Quality: `auto`
     - Fetch format: `auto`
     - Width: `1200`, Crop: `limit` (esto redimensiona solo si la imagen es más ancha de 1200px, sin recortar)
   - Guarda el preset y anota su **nombre**.
4. Abre `src/cloudinary/config.ts` en el proyecto y reemplaza:
   - `REEMPLAZA_CLOUD_NAME` → tu Cloud Name
   - `REEMPLAZA_UPLOAD_PRESET` → el nombre del preset que creaste

Con eso, subir logo y fotos de producto funciona directo desde el navegador, sin backend y sin activar Firebase Blaze.

**Nota sobre "Eliminar imagen":** al eliminar, la imagen deja de mostrarse en la app (se borra la referencia en Firestore), pero el archivo permanece guardado en tu cuenta de Cloudinary. Borrarlo de forma permanente ahí requiere una llamada firmada desde un servidor (con tu API Secret), que no se implementa aquí a propósito para no necesitar backend ni costos adicionales. Si más adelante quieres borrado permanente automático, es una mejora futura con una función de servidor.

## Novedades de esta versión (panel y tienda pública)

- **Página de Configuración** (`/dashboard/configuracion`): edita nombre visible, categoría, descripción, WhatsApp y ubicación después de creado el negocio (antes solo se podía definir una vez en el onboarding).
- **Portada de la tienda**: sube una imagen de portada (banner) desde Configuración, se muestra arriba del logo en tu tienda pública.
- **Tienda pública mejorada**: los productos ahora se agrupan por categoría automáticamente (si les pusiste categoría al crearlos), y hay un botón directo de "Escribir por WhatsApp" en la portada, sin necesidad de agregar productos al carrito.

## Desbloqueo temporal de todas las funciones

Mientras terminas de construir y probar Bizly Store, **todas las funciones
están desbloqueadas para todos los negocios**, sin importar su plan (gratis,
básico, etc.) — así puedes probar todo sin preocuparte por límites.

Esto se controla con una sola bandera en `src/config/plans.ts`:

```
export const ENFORCE_PLAN_LIMITS = false;
```

Cuando quieras activar la separación real por plan (por ejemplo, cuando ya
esté lista para usuarios reales), cámbiala a `true` y sube ese archivo. La
configuración de qué incluye cada plan no se tocó — sigue lista tal cual la
definimos, solo esperando a que actives el interruptor.

## Sistema de planes (desbloqueo de funciones)

Toda la lógica de qué incluye cada plan vive en un solo archivo: `src/config/plans.ts`.
Ahí se define, por plan (gratis / básico / emprendedor / negocio):

- Límite de productos
- Si puede quitar la marca "Creado con Bizly Store" de su tienda
- Si puede personalizar la portada
- Si tiene acceso a más temas (cuando existan)
- Estadísticas avanzadas y dominio propio (reservado para cuando se implementen)

Cuando una función no está incluida en el plan actual, se muestra el componente
`LockedFeature` con un mensaje indicando desde qué plan se desbloquea — es solo
informativo, todavía no hay cobro real (sigue pendiente del spec original).

Para subir de plan manualmente mientras no hay cobro automático: en Firebase
Console → Firestore → colección `businesses` → el documento del negocio →
edita el campo `plan` a `basico`, `emprendedor` o `negocio`.

## Rediseño de la tienda pública

La tienda pública (`/tienda/tu-negocio`) ahora tiene: barra de navegación fija
con carrito, portada con overlay, categorías como pestañas para saltar entre
secciones, sección de productos "Destacados", tarjetas de producto con badge,
y pie de página con contacto. La marca "Creado con Bizly Store" se oculta
automáticamente para negocios en plan Emprendedor o Negocio.

## Control de pedidos (nuevo)

Antes, los pedidos solo se mandaban por WhatsApp y no quedaban guardados en
ningún lado. Ahora, cuando un cliente hace checkout en tu tienda pública:

1. Escribe su nombre (obligatorio) y teléfono (opcional).
2. El pedido se guarda en Firestore, colección `orders`, con estado inicial "Nuevo".
3. Se abre WhatsApp con el mensaje armado, igual que antes.

En tu Dashboard → pestaña **🛒 Pedidos** puedes:
- Ver todos tus pedidos, con nombre, teléfono, productos y total.
- Cambiar el estado de cada uno: Nuevo → Confirmado → Completado (o Cancelado).
- Ver estadísticas rápidas: pedidos nuevos, total de pedidos, ventas completadas.

El dashboard ahora tiene navegación por pestañas: **Productos / Pedidos / Configuración**,
disponible en las tres páginas.

## Tienda pública profesional (por categoría)

La tienda pública ahora se adapta según la categoría del negocio (Alimentos,
Moda, Tecnología, Servicios, Belleza, u otra) usando un solo sistema de
plantillas configurable en `src/config/storeTemplates.ts` — cambia textos,
etiquetas de producto (Más vendido/Nuevo/Recomendado/Promoción), qué campos
destacar (marca/modelo para tecnología, horario para comida), y el texto del
botón principal. Agregar una categoría nueva es agregar una entrada en ese
archivo, sin tocar el resto del sistema.

También incluye:
- **Carrito lateral** (desliza desde la derecha) en vez de la barra inferior simple
- **Navegación inferior estilo app** en móvil: Inicio | Catálogo | Carrito | Contacto
- **Buscador y ordenar** (relevancia, más nuevos, precio)
- **Color de marca personalizable** desde Configuración — se aplica a botones y acentos de la tienda
- **Horario de atención y redes sociales** (Instagram/Facebook) opcionales, configurables por el negocio

## Qué incluye este MVP

- Registro / login (Firebase Auth)
- Crear negocio: nombre, categoría, descripción, WhatsApp, ubicación
- Tema único "Minimalista" (los otros 4 temas del spec quedan para después)
- Dashboard con lista de productos (crear, editar, eliminar)
- Límite de 10 productos en plan gratis (los demás planes son solo visuales por ahora,
  no hay cobro real todavía)
- Tienda pública en `/tienda/tu-negocio`
- Carrito simple que arma el mensaje de WhatsApp automáticamente

## Qué NO incluye todavía (fuera del alcance del MVP)

- Subida de logo/fotos (requiere activar Firebase Storage, plan Blaze — igual que en Bizly Finanzy)
- Los otros 4 temas (Marketplace, Restaurante, Boutique, Profesional)
- Cobro real de suscripciones
- Dominio propio, estadísticas, cupones, IA para descripciones (todo esto está en
  "futuras funciones" del spec original)
