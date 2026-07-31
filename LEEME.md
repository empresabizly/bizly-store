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

## Evolución a plataforma SaaS profesional

- **Dashboard con Resumen**: nueva pantalla de entrada (`/dashboard`) con métricas
  (pedidos nuevos, ventas completadas, productos activos, sin stock), accesos
  rápidos y pedidos recientes. La lista de productos se movió a `/dashboard/productos`.
- **Productos más profesional**: filtros por estado (disponible/agotado) y
  categoría, cambio rápido de disponibilidad sin abrir el formulario, campo de
  inventario opcional.
- **Configuración como constructor visual**: ahora tiene sub-pestañas —
  Identidad (logo/portada), Información (datos del negocio), Diseño (color de
  marca con vista previa), y Plan.
- **Tienda pública**: categorías ahora se ven como tarjetas visuales con conteo
  de productos, no solo pestañas de texto.

## Hero de la tienda como tarjeta flotante

El encabezado de la tienda pública ahora es una tarjeta blanca con sombra que
flota sobre la portada (como en Shopify), en vez de texto suelto sobre el
fondo. También se unificó el ancho de toda la página para que se sienta
diseñada, no descuadrada.

**Importante sobre la portada:** la portada es una foto que el dueño del
negocio sube en Configuración → Identidad. Si un negocio sube el logo de
Bizly Store (la plataforma) como su portada por error, la tienda se va a ver
como un anuncio de Bizly en vez de su propio negocio — hay que subir ahí una
foto real del negocio/productos.

## Los 3 motores de diseño: Bizly Fashion / Bizly Food / Bizly Business

Cada categoría de negocio se mapea automáticamente a uno de 3 "motores" con
tarjetas de producto **visualmente distintas** (no solo texto distinto):

- **Bizly Food** (alimentos): tarjeta cuadrada con la foto de fondo completa,
  degradado oscuro, precio y botón "+" superpuestos — estilo menú apetitoso.
- **Bizly Fashion** (moda, belleza, regalos, artesanías): tarjeta vertical
  editorial, minimalista, texto en mayúsculas pequeñas, sin botón sólido —
  estilo boutique.
- **Bizly Business** (tecnología, servicios, hogar, educación, otros):
  tarjeta clásica con marca/modelo cuando aplica — estilo catálogo corporativo.

La configuración vive en `src/config/storeTemplates.ts` — agregar una
categoría nueva es mapearla a uno de los 3 motores existentes.

Además se agregó:
- **Eslogan** del negocio (bajo el nombre, en el color de marca)
- **Sección "Sobre nosotros"** (si se llena en Configuración)
- **Sección "Nuevos lanzamientos"** con scroll horizontal de los últimos productos agregados
- **Sugerencia automática de color de marca** a partir del logo (botón "🎨 Sugerir color a partir de mi logo" en Configuración → Diseño)
- **Forma de botones** (redondos o rectos) según el motor de diseño

## Qué quedó pendiente de este pedido (siendo honestos)

- **Variantes de producto reales** (talla/color seleccionables con su propio
  precio o stock) — el modelo de datos de producto no las soporta todavía;
  es una funcionalidad nueva completa, no solo diseño.
- **Editor visual de distribución** (mover/reordenar secciones arrastrando) —
  hoy el orden de secciones es fijo por motor, no personalizable por el
  usuario sin tocar código.

## Favoritos e información de entrega (nuevo)

- **Favoritos reales**: los clientes pueden marcar ❤️ productos en tu tienda
  pública, guardado en su propio navegador (sin necesidad de cuenta). Desde
  el nav inferior en móvil pueden filtrar para ver solo sus favoritos.
- **Información de entrega**: un aviso corto (ej. "Envío a domicilio en
  pedidos mayores a $500") que aparece como banner si lo llenas en Configuración.
- **Motor Food mejorado**: categorías con íconos circulares temáticos
  (🍰🧁🍪🥤), nav inferior con Inicio/Menú/Favoritos/Pedido/Contacto.

**Nota:** se consideró agregar un campo de "testimonio de cliente" pero se
descartó — un texto escrito por el propio dueño del negocio, sin forma de
verificarse, se ve idéntico a una reseña falsa para quien visita la tienda.
Mejor no incluirlo que arriesgar la credibilidad de cada negocio. Si más
adelante se construye un sistema real de reseñas de clientes (verificadas,
con calificación), ahí sí tendría sentido.

## Lo que NO se construyó (para no fabricar datos falsos)

- **Calificaciones con estrellas** en productos — requieren un sistema real
  de reseñas de clientes, que no existe. No se pusieron estrellas fijas o
  inventadas.
- **Cuentas de clientes** (login, historial de pedidos por cliente) — el nav
  inferior dice "Contacto" en vez de "Cuenta" porque esa función no existe
  todavía; sería una funcionalidad nueva completa (autenticación de clientes,
  separada de la autenticación de dueños de negocio).
- **Feed en vivo de Instagram** — se muestra el enlace a tu Instagram, pero
  no se traen fotos reales de tu cuenta (requeriría integración con la API de Meta).

## Página de detalle de producto, Promociones, y layouts distintos por motor

- **Página de detalle** (nuevo): tocar cualquier producto abre una vista
  completa con foto grande, descripción, marca/modelo si aplica, selector de
  cantidad, y botón de agregar — esto es lo que más aleja a Bizly Store de
  sentirse como un "menú" y lo acerca a un ecommerce real tipo Shopify.
- **Sección de Promociones**: los productos con la etiqueta "Promoción" ahora
  tienen su propia sección destacada con banner de color, separada de
  Destacados y del catálogo general.
- **Layouts realmente distintos por motor** (no solo tarjetas distintas):
  - Bizly Business ahora muestra su catálogo como **lista** (imagen + info +
    botón en fila), como un directorio de servicios, no como cuadrícula de productos físicos.
  - Bizly Fashion usa cuadrícula de **2 columnas fijas** (más espacio por
    producto, sensación editorial/boutique).
  - Bizly Food se mantiene en cuadrícula de fotos grandes.

## Bizly Restaurante (nuevo 4to motor) + elegir plantilla manualmente

Se agregó **Bizly Restaurante**, con menú en formato lista (como Uber Eats /
Rappi): fotos pequeñas a la derecha con el botón "+" superpuesto, precio
prominente, y los platillos agrupados por categoría con encabezados de sección.

Como "Alimentos y restaurantes" es una sola categoría que cubre tanto
panaderías (mejor con Bizly Food, fotos grandes) como restaurantes con menú
extenso (mejor con Bizly Restaurante, lista), ahora en **Configuración →
Diseño** hay un selector de **"Plantilla de tienda"**: por default es
automático según la categoría, pero cada negocio puede forzar cualquiera de
los 4 motores manualmente (Bizly Fashion, Food, Restaurante o Business),
sin importar su categoría.

## Categorías administrables (nuevo)

Ya no son solo texto libre por producto — ahora hay una sección completa
**Categorías** en el dashboard (nueva pestaña):

- Crea tus propias categorías (ej. Perfumes, Celulares, Relojes).
- Súbele un ícono/logo a cada una (usa Cloudinary, igual que fotos de producto).
- Al crear o editar un producto, eliges la categoría de una **lista**, no
  escribiendo texto libre — así se evitan duplicados por mayúsculas/minúsculas.
- En tu tienda pública, el ícono personalizado reemplaza automáticamente al
  emoji genérico que se usaba antes.

Si todavía no has creado ninguna categoría, el campo de producto sigue
aceptando texto libre (como antes) para no romper nada — en cuanto creas tu
primera categoría desde el panel, el campo se convierte en un selector.

## Correcciones de categorías y hero

- **Bug corregido:** las categorías solo se mostraban en la tienda pública si
  había 2 o más distintas en uso — con 1 sola categoría no aparecía nada. Ya
  se muestra desde 1.
- **Hero más compacto:** logo, textos y botón con menos espacio entre sí y
  padding reducido en la tarjeta blanca — ocupa notablemente menos alto.
- **Asignar productos a categorías desde la misma pantalla:** en Dashboard →
  Categorías, cada categoría tiene un botón "Gestionar productos" que abre
  una lista con checkboxes de todos tus productos — márcalos para asignarlos
  a esa categoría al instante, sin entrar a editar cada producto por separado.

## Estética de marca grande (Nike/Liverpool) y apps de comida (Uber Eats/McDonald's)

- **Tipografía más audaz** en el nombre del negocio (más grande, extra bold, tracking ajustado).
- **Barra de confianza** debajo del hero — con datos honestos de cómo
  funciona la plataforma ("Pedido directo por WhatsApp", "Trato directo sin
  intermediarios", "Catálogo siempre actualizado"). **No se agregaron
  promesas que no podemos garantizar** (nada de "compra 100% segura" o
  "envío gratis" — no hay pasarela de pago ni política de envío real todavía).
- **Encabezados de sección con acento de color** (barrita vertical junto al
  título), estilo tiendas departamentales.
- **Barra de carrito persistente** en móvil, estilo Uber Eats/McDonald's: en
  cuanto agregas algo, aparece flotando arriba del nav inferior con el total
  y "Ver pedido →", siempre visible mientras sigues navegando el catálogo.

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
