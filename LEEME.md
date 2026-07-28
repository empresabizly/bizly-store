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
