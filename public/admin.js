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
      const data = await res.json();
      currency = data.currency || 'MXN';
    } catch {
      /* no bloquea el panel si falla */
    }
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

  async function quickUpdate(number, status) {
    const body = { number, status, keepExisting: true };
    const res = await fetch('/api/admin/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) loadList();
    else {
      const data = await res.json();
      alert(data.error || 'No se pudo actualizar.');
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

  async function saveEdit() {
    const status = editStatus.value;
    const name = editName.value.trim();
    const phone = editPhone.value.trim();
    const note = editNote.value.trim();

    if (status === 'apartado' && !name) {
      editAlert.innerHTML = '<div class="alert error">Escribe el nombre del comprador.</div>';
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
        return;
      }
      closeEditModal();
      loadList();
    } catch {
      editAlert.innerHTML = '<div class="alert error">Error de conexión.</div>';
    } finally {
      editSaveBtn.disabled = false;
    }
  }

  ticketsBody.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const number = Number(btn.dataset.number);
    const action = btn.dataset.action;

    if (action === 'pagado') quickUpdate(number, 'vendido');
    else if (action === 'liberar') {
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
  editSaveBtn.addEventListener('click', saveEdit);

  checkSession();
})();
