const { getDb } = require('../lib/db');

const MAX_PER_REQUEST = 20;
const TOTAL_TICKETS = Number(process.env.TOTAL_TICKETS || 300);

function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try {
    return JSON.parse(req.body || '{}');
  } catch {
    return {};
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  const body = readBody(req);
  const name = String(body.name || '').trim();
  const phone = String(body.phone || '').trim();
  const numbers = Array.isArray(body.numbers)
    ? [...new Set(body.numbers.map((n) => Number(n)))]
    : [];

  if (!name || name.length > 120) {
    res.status(400).json({ error: 'Falta tu nombre completo.' });
    return;
  }
  if (!phone || phone.length > 40) {
    res.status(400).json({ error: 'Falta tu teléfono de contacto.' });
    return;
  }
  if (numbers.length === 0) {
    res.status(400).json({ error: 'Selecciona al menos un número.' });
    return;
  }
  if (numbers.length > MAX_PER_REQUEST) {
    res.status(400).json({ error: `Puedes apartar hasta ${MAX_PER_REQUEST} números por solicitud.` });
    return;
  }
  if (numbers.some((n) => !Number.isInteger(n) || n < 1 || n > TOTAL_TICKETS)) {
    res.status(400).json({ error: `Hay números fuera de rango (1 a ${TOTAL_TICKETS}).` });
    return;
  }

  try {
    const db = getDb();
    const { data, error } = await db.rpc('reserve_tickets', {
      p_numbers: numbers,
      p_name: name,
      p_phone: phone,
    });

    if (error) throw error;

    const result = Array.isArray(data) ? data[0] : data;

    if (!result || !result.success) {
      res.status(409).json({
        error: 'Algunos números ya no están disponibles.',
        unavailable: result ? result.unavailable : numbers,
      });
      return;
    }

    res.status(200).json({ ok: true, numbers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo apartar el boleto, intenta de nuevo.' });
  }
};
