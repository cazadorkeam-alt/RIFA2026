(function () {
  const grid = document.getElementById('grid');
  const selCount = document.getElementById('selCount');
  const selTotal = document.getElementById('selTotal');
  const openModalBtn = document.getElementById('openModalBtn');
  const modalOverlay = document.getElementById('modalOverlay');
  const modalSelectedList = document.getElementById('modalSelectedList');
  const cancelModalBtn = document.getElementById('cancelModalBtn');
  const confirmReserveBtn = document.getElementById('confirmReserveBtn');
  const nameInput = document.getElementById('nameInput');
  const phoneInput = document.getElementById('phoneInput');
  const modalAlert = document.getElementById('modalAlert');
  const paymentInfoBox = document.getElementById('paymentInfoBox');

  let config = { price: 0, currency: 'MXN' };
  let tickets = new Map(); // number -> status
  let selected = new Set();

  function money(n) {
    try {
      return new Intl.NumberFormat('es-MX', { style: 'currency', currency: config.currency }).format(n);
    } catch {
      return `$${n}`;
    }
  }

  async function loadConfig() {
    const res = await fetch('/api/config');
    config = await res.json();
    document.getElementById('raffleTitle').textContent = config.title;
    document.getElementById('raffleDate').textContent = config.drawDate
      ? `Sorteo: ${config.drawDate}`
      : '';
    document.getElementById('rafflePrice').textContent = config.price
      ? `Precio por boleto: ${money(config.price)}`
      : '';
    document.getElementById('raffleRules').textContent = config.drawRules || '';
  }

  async function loadTickets() {
    const res = await fetch('/api/tickets');
    const data = await res.json();
    tickets = new Map(data.map((t) => [t.number, t.status]));
    renderGrid();
  }

  function renderGrid() {
    grid.innerHTML = '';
    for (let n = 1; n <= (config.totalTickets || 300); n++) {
      const status = tickets.get(n) || 'disponible';
      const cell = document.createElement('div');
      cell.textContent = String(n).padStart(3, '0');
      cell.dataset.number = String(n);

      let cls = status;
      if (status === 'disponible' && selected.has(n)) cls = 'selected';
      cell.className = `ticket ${cls}`;

      if (status === 'disponible') {
        cell.addEventListener('click', () => toggleSelect(n));
      }
      grid.appendChild(cell);
    }
    updateBottomBar();
  }

  function toggleSelect(n) {
    if (selected.has(n)) selected.delete(n);
    else selected.add(n);
    renderGrid();
  }

  function updateBottomBar() {
    selCount.textContent = String(selected.size);
    selTotal.textContent = config.price && selected.size
      ? ` · Total: ${money(selected.size * config.price)}`
      : '';
    openModalBtn.disabled = selected.size === 0;
  }

  function openModal() {
    modalAlert.innerHTML = '';
    paymentInfoBox.classList.add('hidden');
    modalSelectedList.innerHTML = '';
    [...selected].sort((a, b) => a - b).forEach((n) => {
      const span = document.createElement('span');
      span.textContent = String(n).padStart(3, '0');
      modalSelectedList.appendChild(span);
    });
    modalOverlay.classList.remove('hidden');
  }

  function closeModal() {
    modalOverlay.classList.add('hidden');
  }

  async function confirmReserve() {
    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    modalAlert.innerHTML = '';

    if (!name || !phone) {
      modalAlert.innerHTML = '<div class="alert error">Escribe tu nombre y teléfono.</div>';
      return;
    }

    confirmReserveBtn.disabled = true;
    confirmReserveBtn.textContent = 'Enviando…';

    try {
      const res = await fetch('/api/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numbers: [...selected], name, phone }),
      });
      const data = await res.json();

      if (!res.ok) {
        modalAlert.innerHTML = `<div class="alert error">${data.error || 'No se pudo completar la reserva.'}</div>`;
        if (data.unavailable && data.unavailable.length) {
          data.unavailable.forEach((n) => selected.delete(n));
        }
        await loadTickets();
        return;
      }

      let msg = `<div class="alert success">¡Listo! Apartaste ${selected.size} boleto(s). `;
      if (config.contactWhatsapp && !config.contactWhatsappLink) {
        msg += `Envía tu comprobante de pago al WhatsApp ${config.contactWhatsapp}. `;
      }
      msg += 'El administrador confirmará tu pago.</div>';
      modalAlert.innerHTML = msg;

      if (config.paymentInfo) {
        paymentInfoBox.textContent = config.paymentInfo;
        paymentInfoBox.classList.remove('hidden');
      }

      if (config.contactWhatsappLink) {
        const link = document.createElement('a');
        link.href = config.contactWhatsappLink;
        link.target = '_blank';
        link.rel = 'noopener';
        link.className = 'whatsapp-btn';
        link.textContent = '💬 Enviar comprobante por WhatsApp';
        modalAlert.appendChild(link);
      }

      selected.clear();
      nameInput.value = '';
      phoneInput.value = '';
      await loadTickets();
    } catch (err) {
      modalAlert.innerHTML = '<div class="alert error">Error de conexión. Intenta de nuevo.</div>';
    } finally {
      confirmReserveBtn.disabled = false;
      confirmReserveBtn.textContent = 'Confirmar';
    }
  }

  openModalBtn.addEventListener('click', openModal);
  cancelModalBtn.addEventListener('click', closeModal);
  confirmReserveBtn.addEventListener('click', confirmReserve);

  (async function init() {
    await loadConfig();
    await loadTickets();
    setInterval(loadTickets, 15000); // refresca disponibilidad cada 15s
  })();
})();
