// Netlify Function: borra una imagen de Cloudinary de forma PERMANENTE.
//
// Esto corre en un servidor de Netlify (gratis, dentro de su plan
// gratuito), no en el navegador del cliente — por eso es el único lugar
// seguro para usar el API Secret de Cloudinary. Si esa clave se pusiera en
// el código del frontend, cualquiera podría verla y borrar archivos de tu
// cuenta de Cloudinary.
//
// Requiere 3 variables de entorno configuradas en Netlify (Site settings →
// Environment variables), NO en el código:
//   CLOUDINARY_CLOUD_NAME
//   CLOUDINARY_API_KEY
//   CLOUDINARY_API_SECRET

const crypto = require('crypto');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Método no permitido.' }) };
  }

  let publicId;
  try {
    const body = JSON.parse(event.body || '{}');
    publicId = body.publicId;
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Cuerpo inválido.' }) };
  }

  if (!publicId || typeof publicId !== 'string') {
    return { statusCode: 400, body: JSON.stringify({ error: 'Falta publicId.' }) };
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Cloudinary no está configurado en el servidor (faltan variables de entorno en Netlify).',
      }),
    };
  }

  try {
    const timestamp = Math.floor(Date.now() / 1000);
    // Cloudinary exige firmar la petición: hash SHA1 de los parámetros + tu API Secret.
    const stringToSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha1').update(stringToSign).digest('hex');

    const params = new URLSearchParams({
      public_id: publicId,
      timestamp: String(timestamp),
      api_key: apiKey,
      signature,
    });

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const data = await response.json();

    return { statusCode: 200, body: JSON.stringify(data) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: 'No se pudo borrar la imagen.' }) };
  }
};
