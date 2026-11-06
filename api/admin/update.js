const { getDb } = require('../../lib/db');
const { isAdmin } = require('../../lib/auth');

const VALID_STATUS = ['disponible', 'apartado', 'vendido'];
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
  if (!isAdmin(req)) {
    res.status(401).json({ error: 'No autorizado. Inicia sesión.' });
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  const body = readBody(req);
  const number = Number(body.number);
  const status = String(body.status || '');
  const buyerName = body.buyer_name != null ? String(body.buyer_name).trim() : undefined;
  const buyerPhone = body.buyer_phone != null ? String(body.buyer_phone).trim() : undefined;
  const note = body.note != null ? String(body.note).trim() : undefined;

  if (!Number.isInteger(number) || number < 1 || number > TOTAL_TICKETS) {
    res.status(400).json({ error: 'Número de boleto inválido.' });
    return;
  }
  if (!VALID_STATUS.includes(status)) {
    res.status(400).json({ error: 'Estado inválido.' });
    return;
  }

  try {
    const db = getDb();

    const { data: current, error: fetchError } = await db
      .from('tickets')
      .select('*')
      .eq('number', number)
      .single();

    if (fetchError) throw fetchError;
    if (!current) {
      res.status(404).json({ error: 'Ese número no existe.' });
      return;
    }

    // Si no mandan un nombre/teléfono nuevo, se conserva el que ya había.
    const finalName = buyerName !== undefined ? buyerName : current.buyer_name;
    const finalPhone = buyerPhone !== undefined ? buyerPhone : current.buyer_phone;

    if (status === 'apartado' && !finalName) {
      res.status(400).json({ error: 'Para apartar manualmente se necesita el nombre del comprador.' });
      return;
    }

    const patch = { status };
    if (note !== undefined) patch.note = note;

    if (status === 'disponible') {
      patch.buyer_name = null;
      patch.buyer_phone = null;
      patch.reserved_at = null;
      patch.paid_at = null;
    } else if (status === 'apartado') {
      patch.buyer_name = finalName;
      patch.buyer_phone = finalPhone || null;
      // No reinicia la fecha de apartado si ya estaba apartado antes.
      patch.reserved_at = current.status === 'apartado' && current.reserved_at
        ? current.reserved_at
        : new Date().toISOString();
      patch.paid_at = null;
    } else if (status === 'vendido') {
      patch.buyer_name = finalName || null;
      patch.buyer_phone = finalPhone || null;
      patch.paid_at = current.status === 'vendido' && current.paid_at
        ? current.paid_at
        : new Date().toISOString();
    }

    const { data, error } = await db
      .from('tickets')
      .update(patch)
      .eq('number', number)
      .select()
      .single();

    if (error) throw error;

    res.status(200).json({ ok: true, ticket: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo actualizar el boleto.' });
  }
};
