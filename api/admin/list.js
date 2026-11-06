const { getDb } = require('../../lib/db');
const { isAdmin } = require('../../lib/auth');

module.exports = async (req, res) => {
  if (!isAdmin(req)) {
    res.status(401).json({ error: 'No autorizado. Inicia sesión.' });
    return;
  }
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  try {
    const db = getDb();
    const { data, error } = await db
      .from('tickets')
      .select('number, status, buyer_name, buyer_phone, note, reserved_at, paid_at')
      .order('number', { ascending: true });

    if (error) throw error;

    const price = Number(process.env.TICKET_PRICE || 0);
    const disponibles = data.filter((t) => t.status === 'disponible').length;
    const apartados = data.filter((t) => t.status === 'apartado').length;
    const vendidos = data.filter((t) => t.status === 'vendido').length;

    res.status(200).json({
      tickets: data,
      summary: {
        disponibles,
        apartados,
        vendidos,
        totalRecaudado: vendidos * price,
        pricePerTicket: price,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo cargar la lista.' });
  }
};
