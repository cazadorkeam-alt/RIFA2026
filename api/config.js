// Datos públicos de la rifa (sin información sensible).
// Se configuran como variables de entorno en Vercel, así el dueño
// de la rifa los puede cambiar sin tocar código.

// Quita un BOM (marca de orden de bytes) inicial, por si al configurar
// una variable en una terminal (ej. PowerShell) se coló ese caracter.
function clean(value) {
  return (value || '').replace(/^﻿/, '').trim();
}

module.exports = (req, res) => {
  res.status(200).json({
    title: clean(process.env.RAFFLE_TITLE) || 'Rifa',
    drawDate: clean(process.env.RAFFLE_DATE),
    drawRules: clean(process.env.RAFFLE_RULES),
    price: Number(process.env.TICKET_PRICE || 0),
    currency: clean(process.env.CURRENCY) || 'MXN',
    totalTickets: Number(process.env.TOTAL_TICKETS || 300),
    contactWhatsapp: clean(process.env.CONTACT_WHATSAPP),
    contactWhatsappLink: clean(process.env.CONTACT_WHATSAPP_LINK),
    paymentBeneficiary: clean(process.env.PAYMENT_BENEFICIARY),
    paymentBank: clean(process.env.PAYMENT_BANK),
    paymentClabe: clean(process.env.PAYMENT_CLABE),
    paymentNote: clean(process.env.PAYMENT_NOTE),
  });
};
