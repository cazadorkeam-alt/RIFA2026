const { createClient } = require('@supabase/supabase-js');

let client = null;

// Un solo cliente de Supabase reutilizado entre llamadas (usa la llave
// "service role": solo vive en el servidor, nunca se manda al navegador).
function getDb() {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Faltan las variables de entorno SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY'
    );
  }

  client = createClient(url, key, {
    auth: { persistSession: false },
  });
  return client;
}

module.exports = { getDb };
