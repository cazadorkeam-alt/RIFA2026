// Datos públicos de la rifa (sin información sensible).
// Se configuran como variables de entorno en Vercel, así el dueño
// de la rifa los puede cambiar sin tocar código.
module.exports = (req, res) => {
  res.status(200).json({
    title: process.env.RAFFLE_TITLE || 'Rifa',
    drawDate: process.env.RAFFLE_DATE || '',
    price: Number(process.env.TICKET_PRICE || 0),
    currency: process.env.CURRENCY || 'MXN',
    totalTickets: Number(process.env.TOTAL_TICKETS || 300),
    contactWhatsapp: process.env.CONTACT_WHATSAPP || '',
    paymentInfo: process.env.PAYMENT_INFO || '',
  });
};
