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
  const reserveFormFields = document.getElementById('reserveFormFields');
  const modalCloseActions = document.getElementById('modalCloseActions');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const paymentBeneficiaryEl = document.getElementById('paymentBeneficiary');
  const paymentBankEl = document.getElementById('paymentBank');
  const paymentClabeEl = document.getElementById('paymentClabe');
  const paymentNoteEl = document.getElementById('paymentNote');
  const copyClabeBtn = document.getElementById('copyClabeBtn');

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
    reserveFormFields.classList.remove('hidden');
    modalCloseActions.classList.add('hidden');
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

  function wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let line = '';
    words.forEach((word) => {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    });
    if (line) lines.push(line);
    return lines;
  }

  // Dibuja un comprobante tipo "boleto" en un <canvas> con los datos de la
  // compra, para que la persona lo descargue o lo mande por WhatsApp.
  function buildReceiptCanvas({ name, numbers, total }) {
    const scale = 2;
    const baseWidth = 720;
    const margin = 40;
    const usableWidth = baseWidth - margin * 2;
    const FONT = '-apple-system, "Segoe UI", Roboto, Arial, sans-serif';

    const measure = document.createElement('canvas').getContext('2d');
    measure.font = `600 15px ${FONT}`;
    const rulesLines = config.drawRules ? wrapText(measure, config.drawRules, usableWidth) : [];

    const paymentSummaryLines = [];
    if (config.paymentBeneficiary) paymentSummaryLines.push(`Beneficiario: ${config.paymentBeneficiary}`);
    if (config.paymentBank) paymentSummaryLines.push(`Banco: ${config.paymentBank}`);
    if (config.paymentClabe) paymentSummaryLines.push(`CLABE: ${config.paymentClabe}`);
    let paymentLines = [];
    if (paymentSummaryLines.length) {
      measure.font = `600 13px ${FONT}`;
      paymentSummaryLines.forEach((line) => {
        paymentLines.push(...wrapText(measure, line, usableWidth - 24));
      });
      if (config.paymentNote) {
        measure.font = `400 12px ${FONT}`;
        paymentLines.push(...wrapText(measure, config.paymentNote, usableWidth - 24));
      }
    }

    const pillW = 78;
    const pillH = 40;
    const gap = 10;
    const cols = Math.max(1, Math.floor((usableWidth + gap) / (pillW + gap)));
    const rows = Math.ceil(numbers.length / cols);

    const headerH = 190;
    let y = headerH + 56 + 34 + 30; // nombre + total
    y += 28; // etiqueta "numeros apartados"
    y += rows * (pillH + gap);
    if (config.drawDate) y += 24;
    if (rulesLines.length) y += rulesLines.length * 20 + 10;
    if (paymentLines.length) y += 30 + paymentLines.length * 18 + 20;
    y += 80; // aviso + folio

    const baseHeight = Math.max(560, y + margin);

    const canvas = document.createElement('canvas');
    canvas.width = baseWidth * scale;
    canvas.height = baseHeight * scale;
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, baseWidth, baseHeight);

    const grad = ctx.createLinearGradient(0, 0, baseWidth, 0);
    grad.addColorStop(0, '#0a3d24');
    grad.addColorStop(1, '#0b6b3a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, baseWidth, headerH);
    ctx.fillStyle = '#d4af37';
    ctx.fillRect(0, headerH - 4, baseWidth, 4);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 25px ${FONT}`;
    const titleLines = wrapText(ctx, `🎄 ${config.title || 'Rifa'} 🎄`, usableWidth);
    let ty = 54;
    titleLines.forEach((line) => {
      ctx.fillText(line, baseWidth / 2, ty);
      ty += 30;
    });
    ctx.font = `600 15px ${FONT}`;
    ctx.fillStyle = '#e7f3ea';
    ctx.fillText('Comprobante de apartado', baseWidth / 2, ty + 16);

    let cy = headerH + 46;
    ctx.textAlign = 'left';
    ctx.font = `700 17px ${FONT}`;
    ctx.fillStyle = '#16281f';
    ctx.fillText(`Nombre: ${name}`, margin, cy);
    cy += 34;

    ctx.font = `700 19px ${FONT}`;
    ctx.fillStyle = '#b3122b';
    ctx.fillText(`Total a pagar: ${money(total)}`, margin, cy);
    cy += 30;

    ctx.font = `600 14px ${FONT}`;
    ctx.fillStyle = '#5b6b63';
    ctx.fillText('Números apartados:', margin, cy);
    cy += 16;

    let px = margin;
    let py = cy;
    numbers.forEach((n, i) => {
      if (i > 0 && i % cols === 0) {
        px = margin;
        py += pillH + gap;
      }
      ctx.fillStyle = '#e3f6ea';
      ctx.strokeStyle = '#0b6b3a';
      ctx.lineWidth = 1;
      roundRect(ctx, px, py, pillW, pillH, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#0b6b3a';
      ctx.font = `700 16px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(String(n).padStart(3, '0'), px + pillW / 2, py + pillH / 2 + 6);
      ctx.textAlign = 'left';
      px += pillW + gap;
    });
    cy = py + pillH + 22;

    if (config.drawDate) {
      ctx.font = `600 14px ${FONT}`;
      ctx.fillStyle = '#16281f';
      ctx.fillText(`Sorteo: ${config.drawDate}`, margin, cy);
      cy += 24;
    }
    if (rulesLines.length) {
      ctx.font = `italic 400 13px ${FONT}`;
      ctx.fillStyle = '#8a6d1f';
      rulesLines.forEach((line) => {
        ctx.fillText(line, margin, cy);
        cy += 20;
      });
      cy += 6;
    }

    if (paymentLines.length) {
      const boxH = paymentLines.length * 18 + 22;
      ctx.fillStyle = '#e3f6ea';
      roundRect(ctx, margin, cy, usableWidth, boxH, 8);
      ctx.fill();
      ctx.font = `600 13px ${FONT}`;
      ctx.fillStyle = '#0b6b3a';
      let li = cy + 24;
      paymentLines.forEach((line) => {
        ctx.fillText(line, margin + 12, li);
        li += 18;
      });
      cy += boxH + 20;
    }

    ctx.font = `400 11.5px ${FONT}`;
    ctx.fillStyle = '#5b6b63';
    wrapText(ctx, 'Este comprobante confirma tu apartado, no tu pago. El administrador debe confirmar tu pago para completar la compra.', usableWidth).forEach((line) => {
      ctx.fillText(line, margin, cy);
      cy += 16;
    });
    cy += 6;
    ctx.fillText(`Generado: ${new Date().toLocaleString('es-MX')}`, margin, cy);

    return canvas;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function addActionLink({ href, download, label, cls }) {
    const link = document.createElement('a');
    if (href) link.href = href;
    if (download) link.download = download;
    if (href && href.startsWith('http')) {
      link.target = '_blank';
      link.rel = 'noopener';
    }
    link.className = `action-btn ${cls}`;
    link.textContent = label;
    modalAlert.appendChild(link);
    return link;
  }

  function showReceipt(name, numbers, total) {
    try {
      const canvas = buildReceiptCanvas({ name, numbers, total });
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        addActionLink({
          href: url,
          download: `comprobante-boleto-${numbers[0]}.png`,
          label: '🖼️ Descargar comprobante',
          cls: 'download',
        });

        const file = new File([blob], 'comprobante.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          const shareBtn = document.createElement('button');
          shareBtn.type = 'button';
          shareBtn.className = 'action-btn share';
          shareBtn.textContent = '📲 Compartir comprobante';
          shareBtn.addEventListener('click', async () => {
            try {
              await navigator.share({
                files: [file],
                title: config.title,
                text: `Aparté los boletos ${numbers.map((n) => String(n).padStart(3, '0')).join(', ')} de ${config.title}.`,
              });
            } catch {
              /* el usuario canceló el share, no hay nada que hacer */
            }
          });
          modalAlert.appendChild(shareBtn);
        }
      }, 'image/png');
    } catch (err) {
      console.error('No se pudo generar el comprobante', err);
    }
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

      const reservedNumbers = [...selected].sort((a, b) => a - b);
      const reservedTotal = reservedNumbers.length * (config.price || 0);

      let msg = `<div class="alert success">¡Listo! Apartaste ${selected.size} boleto(s). `;
      if (config.contactWhatsapp && !config.contactWhatsappLink) {
        msg += `Envía tu comprobante de pago al WhatsApp ${config.contactWhatsapp}. `;
      }
      msg += 'El administrador confirmará tu pago.</div>';
      modalAlert.innerHTML = msg;

      reserveFormFields.classList.add('hidden');
      modalCloseActions.classList.remove('hidden');

      if (config.paymentBeneficiary || config.paymentClabe) {
        paymentBeneficiaryEl.textContent = config.paymentBeneficiary || '—';
        paymentBankEl.textContent = config.paymentBank || '—';
        paymentClabeEl.textContent = config.paymentClabe || '—';
        paymentNoteEl.textContent = config.paymentNote || '';
        paymentInfoBox.classList.remove('hidden');
      }

      showReceipt(name, reservedNumbers, reservedTotal);

      if (config.contactWhatsappLink) {
        addActionLink({
          href: config.contactWhatsappLink,
          label: '💬 Abrir chat de WhatsApp',
          cls: 'whatsapp',
        });
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

  async function copyClabe() {
    const clabe = config.paymentClabe || '';
    if (!clabe) return;
    const original = copyClabeBtn.textContent;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(clabe);
      } else {
        const temp = document.createElement('textarea');
        temp.value = clabe;
        temp.style.position = 'fixed';
        temp.style.opacity = '0';
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
      }
      copyClabeBtn.textContent = '✅ Copiado';
    } catch {
      copyClabeBtn.textContent = '⚠️ No se pudo copiar';
    }
    setTimeout(() => { copyClabeBtn.textContent = original; }, 2000);
  }

  openModalBtn.addEventListener('click', openModal);
  cancelModalBtn.addEventListener('click', closeModal);
  closeModalBtn.addEventListener('click', closeModal);
  confirmReserveBtn.addEventListener('click', confirmReserve);
  copyClabeBtn.addEventListener('click', copyClabe);

  (async function init() {
    await loadConfig();
    await loadTickets();
    setInterval(loadTickets, 15000); // refresca disponibilidad cada 15s
  })();
})();
