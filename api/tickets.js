const { getDb } = require('../lib/db');

// Lista pública: solo número y estado. NUNCA se expone nombre/teléfono aquí.
module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  try {
    const db = getDb();
    const { data, error } = await db
      .from('tickets')
      .select('number, status')
      .order('number', { ascending: true });

    if (error) throw error;

    res.status(200).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo cargar la lista de boletos' });
  }
};
