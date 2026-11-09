(function () {
  const loginView = document.getElementById('loginView');
  const dashView = document.getElementById('dashView');
  const passwordInput = document.getElementById('passwordInput');
  const loginBtn = document.getElementById('loginBtn');
  const loginAlert = document.getElementById('loginAlert');
  const logoutBtn = document.getElementById('logoutBtn');

  const ticketsBody = document.getElementById('ticketsBody');
  const searchInput = document.getElementById('searchInput');
  const refreshBtn = document.getElementById('refreshBtn');
  const filterBtns = [...document.querySelectorAll('.filter-btn')];

  const editModalOverlay = document.getElementById('editModalOverlay');
  const editModalTitle = document.getElementById('editModalTitle');
  const editStatus = document.getElementById('editStatus');
  const editName = document.getElementById('editName');
  const editPhone = document.getElementById('editPhone');
  const editNote = document.getElementById('editNote');
  const editAlert = document.getElementById('editAlert');
  const editCancelBtn = document.getElementById('editCancelBtn');
  const editSaveBtn = document.getElementById('editSaveBtn');

  let allTickets = [];
  let currentFilter = 'todos';
  let currentNumber = null;
  let currency = 'MXN';
  let raffleConfig = {};

  function money(n) {
    try {
      return new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(n);
    } catch {
      return `$${n}`;
    }
  }

  function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
  }

  async function checkSession() {
    const res = await fetch('/api/admin/me');
    const data = await res.json();
    if (data.authenticated) {
      showDashboard();
    } else {
      loginView.classList.remove('hidden');
      dashView.classList.add('hidden');
    }
  }

  async function login() {
    loginAlert.innerHTML = '';
    const password = passwordInput.value;
    if (!password) return;
    loginBtn.disabled = true;
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        loginAlert.innerHTML = `<div class="alert error">${data.error || 'Error al entrar'}</div>`;
        return;
      }
      passwordInput.value = '';
      showDashboard();
    } catch {
      loginAlert.innerHTML = '<div class="alert error">Error de conexión.</div>';
    } finally {
      loginBtn.disabled = false;
    }
  }

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    loginView.classList.remove('hidden');
    dashView.classList.add('hidden');
  }

  function showDashboard() {
    loginView.classList.add('hidden');
    dashView.classList.remove('hidden');
    loadConfig();
    loadList();
  }

  async function loadConfig() {
    try {
      const res = await fetch('/api/config');
      raffleConfig = await res.json();
      currency = raffleConfig.currency || 'MXN';
    } catch {
      /* no bloquea el panel si falla */
    }
  }

  function waNumberFromPhone(phone) {
    const digits = (phone || '').replace(/\D/g, '');
    if (!digits) return '';
    return digits.length === 10 ? `52${digits}` : digits;
  }

  function buildPaymentConfirmationUrl(ticket) {
    const waNumber = waNumberFromPhone(ticket.buyer_phone);
    if (!waNumber) return null;

    const paidForBuyer = allTickets
      .filter((t) => t.status === 'vendido' && t.buyer_phone === ticket.buyer_phone)
      .map((t) => t.number)
      .sort((a, b) => a - b);
    const numbers = paidForBuyer.length ? paidForBuyer : [ticket.number];
    const numbersText = numbers.map((n) => String(n).padStart(3, '0')).join(', ');
    const total = numbers.length * Number(raffleConfig.price || 0);

    const lines = [
      `¡Hola ${ticket.buyer_name || ''}! 🎄 Confirmamos tu pago de "${raffleConfig.title || 'la rifa'}".`,
      `Boleto(s): ${numbersText}`,
      `Total pagado: ${money(total)}`,
    ];
    if (raffleConfig.drawDate) lines.push(`Sorteo: ${raffleConfig.drawDate}`);
    if (raffleConfig.drawRules) lines.push(raffleConfig.drawRules);
    lines.push('¡Ya estás participando! Mucha suerte 🍀');

    const text = encodeURIComponent(lines.join('\n'));
    return `https://wa.me/${waNumber}?text=${text}`;
  }

  function showWaBanner(name, waUrl) {
    const banner = document.getElementById('waBanner');
    if (!banner) return;
    banner.innerHTML = `✅ Pago confirmado. Si no se abrió solo, <a href="${waUrl}" target="_blank" rel="noopener">haz clic aquí para enviarle el mensaje a ${name || 'el comprador'}</a>.`;
    banner.classList.remove('hidden');
  }

  function sendPaymentConfirmation(ticket, waWindow) {
    const waUrl = buildPaymentConfirmationUrl(ticket);
    if (!waUrl) {
      if (waWindow && !waWindow.closed) waWindow.close();
      return;
    }
    if (waWindow && !waWindow.closed) {
      waWindow.location.href = waUrl;
    } else {
      window.open(waUrl, '_blank');
    }
    showWaBanner(ticket.buyer_name, waUrl);
  }

  async function loadList() {
    const res = await fetch('/api/admin/list');
    if (res.status === 401) {
      loginView.classList.remove('hidden');
      dashView.classList.add('hidden');
      return;
    }
    const data = await res.json();
    allTickets = data.tickets;

    document.getElementById('sumDisponibles').textContent = data.summary.disponibles;
    document.getElementById('sumApartados').textContent = data.summary.apartados;
    document.getElementById('sumVendidos').textContent = data.summary.vendidos;
    document.getElementById('sumTotal').textContent = money(data.summary.totalRecaudado);

    renderTable();
  }

  function renderTable() {
    const search = searchInput.value.trim().toLowerCase();

    const rows = allTickets.filter((t) => {
      if (currentFilter !== 'todos' && t.status !== currentFilter) return false;
      if (!search) return true;
      const haystack = `${t.number} ${t.buyer_name || ''} ${t.buyer_phone || ''}`.toLowerCase();
      return haystack.includes(search);
    });

    ticketsBody.innerHTML = '';
    rows.forEach((t) => {
      const tr = document.createElement('tr');

      const actions = [];
      if (t.status === 'apartado') {
        actions.push(`<button class="row-btn success" data-action="pagado" data-number="${t.number}">Marcar pagado</button>`);
        actions.push(`<button class="row-btn danger" data-action="liberar" data-number="${t.number}">Liberar</button>`);
      } else if (t.status === 'vendido') {
        actions.push(`<button class="row-btn danger" data-action="liberar" data-number="${t.number}">Liberar</button>`);
      } else {
        actions.push(`<button class="row-btn" data-action="apartar" data-number="${t.number}">Apartar</button>`);
      }
      actions.push(`<button class="row-btn" data-action="editar" data-number="${t.number}">Editar</button>`);

      tr.innerHTML = `
        <td>${String(t.number).padStart(3, '0')}</td>
        <td class="status-${t.status}">${t.status}</td>
        <td>${t.buyer_name || '—'}</td>
        <td>${t.buyer_phone || '—'}</td>
        <td>${fmtDate(t.reserved_at)}</td>
        <td>${fmtDate(t.paid_at)}</td>
        <td>${t.note || ''}</td>
        <td>${actions.join('')}</td>
      `;
      ticketsBody.appendChild(tr);
    });
  }

  async function quickUpdate(number, status, waWindow) {
    const body = { number, status, keepExisting: true };
    const res = await fetch('/api/admin/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      if (waWindow && !waWindow.closed) waWindow.close();
      alert(data.error || 'No se pudo actualizar.');
      return;
    }
    await loadList();
    if (status === 'vendido' && data.ticket) {
      sendPaymentConfirmation(data.ticket, waWindow);
    } else if (waWindow && !waWindow.closed) {
      waWindow.close();
    }
  }

  function openEditModal(number) {
    currentNumber = number;
    const t = allTickets.find((x) => x.number === number);
    editModalTitle.textContent = `Editar boleto #${String(number).padStart(3, '0')}`;
    editStatus.value = t.status;
    editName.value = t.buyer_name || '';
    editPhone.value = t.buyer_phone || '';
    editNote.value = t.note || '';
    editAlert.innerHTML = '';
    editModalOverlay.classList.remove('hidden');
  }

  function closeEditModal() {
    editModalOverlay.classList.add('hidden');
    currentNumber = null;
  }

  async function saveEdit(waWindow) {
    const status = editStatus.value;
    const name = editName.value.trim();
    const phone = editPhone.value.trim();
    const note = editNote.value.trim();

    if (status === 'apartado' && !name) {
      editAlert.innerHTML = '<div class="alert error">Escribe el nombre del comprador.</div>';
      if (waWindow && !waWindow.closed) waWindow.close();
      return;
    }

    editSaveBtn.disabled = true;
    try {
      const res = await fetch('/api/admin/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: currentNumber,
          status,
          buyer_name: name || undefined,
          buyer_phone: phone || undefined,
          note,
          keepExisting: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        editAlert.innerHTML = `<div class="alert error">${data.error}</div>`;
        if (waWindow && !waWindow.closed) waWindow.close();
        return;
      }
      closeEditModal();
      await loadList();
      if (status === 'vendido' && data.ticket) {
        sendPaymentConfirmation(data.ticket, waWindow);
      } else if (waWindow && !waWindow.closed) {
        waWindow.close();
      }
    } catch {
      editAlert.innerHTML = '<div class="alert error">Error de conexión.</div>';
      if (waWindow && !waWindow.closed) waWindow.close();
    } finally {
      editSaveBtn.disabled = false;
    }
  }

  ticketsBody.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const number = Number(btn.dataset.number);
    const action = btn.dataset.action;

    if (action === 'pagado') {
      const waWindow = window.open('', '_blank');
      quickUpdate(number, 'vendido', waWindow);
    } else if (action === 'liberar') {
      if (confirm(`¿Liberar el boleto #${number} y volverlo disponible?`)) quickUpdate(number, 'disponible');
    } else if (action === 'apartar' || action === 'editar') openEditModal(number);
  });

  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderTable();
    });
  });

  searchInput.addEventListener('input', renderTable);
  refreshBtn.addEventListener('click', loadList);
  loginBtn.addEventListener('click', login);
  passwordInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') login(); });
  logoutBtn.addEventListener('click', logout);
  editCancelBtn.addEventListener('click', closeEditModal);
  editSaveBtn.addEventListener('click', () => {
    const waWindow = editStatus.value === 'vendido' ? window.open('', '_blank') : null;
    saveEdit(waWindow);
  });

  checkSession();
})();
