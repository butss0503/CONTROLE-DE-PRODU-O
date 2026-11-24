Chart.register(ChartDataLabels);
Chart.defaults.font.family = "'Archivo', system-ui, sans-serif";
Chart.defaults.color = '#4A5560';

const DEFAULT_CLOUD_URL = "https://script.google.com/macros/s/AKfycbxEgRmd7Z4TXB2sIvFTmmh3-Sx0tXQhlmYxSCvL28ZhZ1NIher81lydZC0eAlb4RUpD_w/exec";
const CUSTOM_URL_KEY = "GRANDE_ACO_CUSTOM_GAS_URL_V9";

[
  "GRANDE_ACO_CLOUD_URL",
  "GRANDE_ACO_CUSTOM_GAS_URL",
  "GRANDE_ACO_CUSTOM_GAS_URL_V2",
  "GRANDE_ACO_CUSTOM_GAS_URL_V3",
  "GRANDE_ACO_CUSTOM_GAS_URL_V4",
  "GRANDE_ACO_CUSTOM_GAS_URL_V5",
  "GRANDE_ACO_CUSTOM_GAS_URL_V6",
  "GRANDE_ACO_CUSTOM_GAS_URL_V7",
  "GRANDE_ACO_CUSTOM_GAS_URL_V8"
].forEach(k => localStorage.removeItem(k));

function getActiveCloudUrl() {
  return localStorage.getItem(CUSTOM_URL_KEY) || DEFAULT_CLOUD_URL;
}

async function changeCloudUrlPrompt() {
  if (!isAdmin()) {
    // Se a nuvem atual não responde, não há como conferir o login: permite trocar
    // (só afeta este PC), mas avisa. Se responde, exige administrador.
    let reachable = false;
    try { reachable = !!(await cloudGet({ action: 'session', token: 'x' })); } catch (e) { reachable = false; }
    if (reachable) {
      if (!(await requireAdminAuth())) return;
    } else if (!(await uiConfirm(
      'A nuvem configurada não está respondendo, então não dá para conferir seu login.\n\nAlterar a URL mesmo assim? (A mudança vale só para este computador.)',
      { title: 'URL da Nuvem', okText: 'Alterar URL' }
    ))) return;
  }
  const current = getActiveCloudUrl();
  const next = await uiPrompt('Cole abaixo a URL do App da Web do seu Google Apps Script (terminada em /exec):', {
    title: 'URL da Nuvem',
    defaultValue: current
  });
  if (next === null) return;
  if (!next.trim().startsWith('https://script.google.com/')) {
    return uiAlert('URL inválida. Ela deve começar com https://script.google.com/');
  }
  localStorage.setItem(CUSTOM_URL_KEY, next.trim());
  syncFromCloud(true);
}

const MONTH_NAMES = [
  'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
  'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
];

const WEEK_LABELS = ['SEMANA 1', 'SEMANA 2', 'SEMANA 3', 'SEMANA 4', 'SEMANA 5'];

const ALL_GAUGES = [
  '4,20 mm', '5,00 mm', '6,30 mm', '8,00 mm', '10,00 mm',
  '12,50 mm', '16,00 mm', '20,00 mm', '25,00 mm', '32,00 mm'
];

const MACHINE_CATALOG = {
  'ES02':  'Estribadeira',
  'EB10':  'Estribadeira',
  'EB12':  'Estribadeira',
  '20B':   'Estribadeira',
  'PT 32': 'Dobradeira Manual'
};

// ======================= CONFIGURAÇÕES DA FÁBRICA =======================
// Para cadastrar uma máquina nova: adicione em MACHINE_CATALOG acima.
// Para uma bitola nova: adicione em ALL_GAUGES. As listas da tela se atualizam sozinhas.

// Dias da semana com produção (0 = domingo, 1 = segunda ... 6 = sábado).
const WORK_WEEKDAYS = [1, 2, 3, 4, 5];
// Horas programadas por máquina em cada dia útil.
const WORK_HOURS_PER_DAY = 8;

// Limites de conferência (item 14): acima disso o sistema pede confirmação.
const PROD_WEIGHT_WARN_KG = 20000;    // um único apontamento de produção
const SCRAP_WEIGHT_WARN_KG = 20000;   // um único lote de sucata
const SCRAP_PRICE_WARN_BRL = 10;      // preço por quilo de sucata
const DOWNTIME_MAX_HOURS = 24;        // horas paradas num único apontamento

// Opções extras que só existem na sucata.
const SCRAP_EXTRA_ORIGINS = [{ value: 'GERAL / PÁTIO', label: 'GERAL / PÁTIO (Caçamba)' }];
const SCRAP_EXTRA_MATERIALS = [{ value: 'Mista (CA-60/CA-50)', label: 'Sucata Mista (CA-60 / CA-50)' }];

// Conta dias úteis do mês (de fromDay até toDay, inclusive).
function countWorkdays(year, monthIndex, fromDay = 1, toDay = null) {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const end = Math.min(toDay || lastDay, lastDay);
  let count = 0;
  for (let d = Math.max(1, fromDay); d <= end; d++) {
    if (WORK_WEEKDAYS.includes(new Date(year, monthIndex, d).getDay())) count++;
  }
  return count;
}

// Preenche os <select data-options="..."> a partir dos cadastros acima.
function populateCatalogSelects() {
  const machineOpts = Object.keys(MACHINE_CATALOG).map(m => ({ value: m, label: `${m} (${MACHINE_CATALOG[m]})` }));
  const gaugeOpts = ALL_GAUGES.map(g => ({ value: g, label: `Bitola ${g}` }));
  const sources = {
    'months': MONTH_NAMES.map((name, idx) => ({ value: String(idx), label: name })),
    'machines': machineOpts,
    'scrap-machines': [...SCRAP_EXTRA_ORIGINS, ...machineOpts],
    'gauges': gaugeOpts,
    'scrap-gauges': [...SCRAP_EXTRA_MATERIALS, ...gaugeOpts]
  };
  document.querySelectorAll('select[data-options]').forEach(sel => {
    const list = sources[sel.dataset.options] || [];
    sel.innerHTML = '';
    list.forEach(o => {
      const opt = document.createElement('option');
      opt.value = o.value;
      opt.textContent = o.label;
      sel.appendChild(opt);
    });
  });
}

// ========== JANELAS DE AVISO / CONFIRMAÇÃO / DIGITAÇÃO (item 12) ==========
// Substituem alert/confirm/prompt do navegador (que travam a página e o Modo Telão).
let dialogChain = Promise.resolve();

function uiDialog({ title = 'Aviso', message = '', okText = 'OK', cancelText = null, danger = false, input = null }) {
  const run = () => new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'ui-modal-overlay';
    overlay.innerHTML = `
      <div class="ui-modal" role="dialog" aria-modal="true">
        <div class="ui-modal-title"></div>
        <div class="ui-modal-message"></div>
        <input class="ui-modal-input" hidden />
        <div class="ui-modal-actions">
          <button type="button" class="btn-outline ui-modal-cancel"></button>
          <button type="button" class="btn-action ui-modal-ok"></button>
        </div>
      </div>`;
    const titleEl = overlay.querySelector('.ui-modal-title');
    const msgEl = overlay.querySelector('.ui-modal-message');
    const inputEl = overlay.querySelector('.ui-modal-input');
    const okBtn = overlay.querySelector('.ui-modal-ok');
    const cancelBtn = overlay.querySelector('.ui-modal-cancel');

    titleEl.textContent = title;
    msgEl.textContent = message;
    okBtn.textContent = okText;
    if (danger) okBtn.classList.add('btn-danger-solid');
    if (cancelText) cancelBtn.textContent = cancelText; else cancelBtn.hidden = true;
    if (input) {
      inputEl.hidden = false;
      inputEl.type = input.type || 'text';
      inputEl.value = input.value || '';
      inputEl.placeholder = input.placeholder || '';
      inputEl.autocomplete = 'off';
    }

    function close(ok) {
      document.removeEventListener('keydown', onKey, true);
      overlay.remove();
      resolve({ ok, value: inputEl.value });
    }
    function onKey(ev) {
      if (ev.key === 'Enter') { ev.preventDefault(); close(true); }
      else if (ev.key === 'Escape') { ev.preventDefault(); close(!cancelText); }
    }
    okBtn.addEventListener('click', () => close(true));
    cancelBtn.addEventListener('click', () => close(false));
    document.addEventListener('keydown', onKey, true);
    document.body.appendChild(overlay);
    (input ? inputEl : okBtn).focus();
  });
  const p = dialogChain.then(run);
  dialogChain = p.catch(() => {});
  return p;
}

async function uiAlert(message, title = 'Aviso') {
  await uiDialog({ title, message, okText: 'OK' });
}

async function uiConfirm(message, { title = 'Confirmação', okText = 'Confirmar', cancelText = 'Cancelar', danger = false } = {}) {
  const r = await uiDialog({ title, message, okText, cancelText, danger });
  return r.ok;
}

async function uiPrompt(message, { title = 'Digite', okText = 'OK', cancelText = 'Cancelar', inputType = 'text', defaultValue = '', placeholder = '' } = {}) {
  const r = await uiDialog({ title, message, okText, cancelText, input: { type: inputType, value: defaultValue, placeholder } });
  return r.ok ? r.value : null;
}

const BASE_ITEMS_TEMPLATE = [
  { id: 'ES02_4,20 mm', machine: 'ES02', category: 'Estribadeira', gauge: '4,20 mm', kg: 0 },
  { id: 'ES02_5,00 mm', machine: 'ES02', category: 'Estribadeira', gauge: '5,00 mm', kg: 0 },
  { id: 'EB10_6,30 mm', machine: 'EB10', category: 'Estribadeira', gauge: '6,30 mm', kg: 0 },
  { id: 'EB10_8,00 mm', machine: 'EB10', category: 'Estribadeira', gauge: '8,00 mm', kg: 0 },
  { id: 'EB12_10,00 mm', machine: 'EB12', category: 'Estribadeira', gauge: '10,00 mm', kg: 0 },
  { id: 'EB12_12,50 mm', machine: 'EB12', category: 'Estribadeira', gauge: '12,50 mm', kg: 0 },
  { id: '20B_16,00 mm', machine: '20B', category: 'Estribadeira', gauge: '16,00 mm', kg: 0 },
  { id: 'PT 32_20,00 mm', machine: 'PT 32', category: 'Dobradeira Manual', gauge: '20,00 mm', kg: 0 },
  { id: 'PT 32_25,00 mm', machine: 'PT 32', category: 'Dobradeira Manual', gauge: '25,00 mm', kg: 0 },
  { id: 'PT 32_32,00 mm', machine: 'PT 32', category: 'Dobradeira Manual', gauge: '32,00 mm', kg: 0 }
];

const DEFAULT_OCT_BACKLOG = {
  '4,20 mm': 0,
  '5,00 mm': 3500,
  '6,30 mm': 6000,
  '8,00 mm': 4500,
  '10,00 mm': 4500,
  '12,50 mm': 8000,
  '16,00 mm': 6500,
  '20,00 mm': 3500,
  '25,00 mm': 2000,
  '32,00 mm': 1500
};

const DEFAULT_2026_WEEKS = {
  5: [2069.25, 2069.25, 2069.25, 2069.25, 0],
  6: [4657, 588, 1971, 0, 0],
  7: [6059, 3428, 1869, 8890, 0],
  8: [1941, 3996, 11251, 13791, 0],
  9: [16587, 11439, 7189, 3530.622, 0]
};

const STORAGE_KEY = 'GRANDE_ACO_PCP_DB_V19';
const PENDING_SYNC_KEY = 'GRANDE_ACO_PENDING_OFFLINE_SYNC';

let tvModeInterval = null;

let lastCelebratedKey = '';
let lastLocalSaveTime = 0;

function triggerGoalConfettiOnce(periodKey) {
  if (lastCelebratedKey === periodKey) return;
  lastCelebratedKey = periodKey;
  if (typeof confetti === 'function') {
    confetti({ particleCount: 70, spread: 65, origin: { y: 0.6 } });
  }
}

function toggleTvMode() {
  const btn = document.getElementById('btnTvMode');
  if (tvModeInterval) {
    clearInterval(tvModeInterval);
    tvModeInterval = null;
    btn.textContent = 'Modo Telão: OFF';
    btn.classList.remove('active-toggle');
  } else {
    const tabsCycle = ['visao-geral', 'maquinas-bitolas', 'producao-semanal', 'controle-sucata'];
    let currentIdx = 0;
    btn.textContent = 'Modo Telão: ON (25s)';
    btn.classList.add('active-toggle');
    tvModeInterval = setInterval(() => {
      currentIdx = (currentIdx + 1) % tabsCycle.length;
      const targetId = tabsCycle[currentIdx];
      const targetBtn = document.querySelector(`.tab-btn[data-tab="${targetId}"]`);
      if (targetBtn) switchTab(targetId, targetBtn);
    }, 25000);
  }
}

// ============================ USUÁRIOS E LOGIN ============================
// Ver o dashboard é livre. Para lançar/editar é preciso entrar com usuário e
// senha próprios. Perfis: admin (tudo + usuários), pcp (lança e edita) e
// viewer (só consulta). A senha é conferida pelo Apps Script; o navegador só
// guarda um token de sessão aleatório (expira após 6 h sem uso).
const SESSION_KEY = 'GRANDE_ACO_SESSION_V1';
const ROLE_LABELS = { admin: 'Administrador', pcp: 'PCP', viewer: 'Visualizador' };
const ROLE_DESCRIPTIONS = {
  admin: 'Faz tudo e gerencia usuários',
  pcp: 'Lança, edita e exclui produção e sucata',
  viewer: 'Só consulta'
};
const MIN_PASSWORD_LENGTH = 6;

let currentSession = loadSession();

function loadSession() {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    if (s && s.token && s.user && s.user.username) return s;
  } catch (e) {}
  return null;
}

function setSession(s) {
  currentSession = s;
  if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  else localStorage.removeItem(SESSION_KEY);
  updateAuthUI();
}

function currentUser() {
  return currentSession ? currentSession.user : null;
}

function sessionToken() {
  return currentSession ? currentSession.token : null;
}

function canEdit() {
  const u = currentUser();
  return !!u && !u.mustChange && (u.role === 'admin' || u.role === 'pcp');
}

function isAdmin() {
  const u = currentUser();
  return !!u && !u.mustChange && u.role === 'admin';
}

function randomHex(bytes) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

function generateTempPassword() {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  const arr = new Uint8Array(8);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => alphabet[b % alphabet.length]).join('');
}

function userInitials(name) {
  const parts = String(name || '?').trim().split(/\s+/).filter(Boolean);
  const first = parts[0] ? parts[0][0] : '?';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Envia uma ação de conta por POST e lê o resultado por GET (o POST é no-cors).
async function cloudAction(payload) {
  if (!navigator.onLine) {
    return { status: 'error', code: 'offline', message: 'Sem internet. Conecte-se para continuar.' };
  }
  const opId = 'acc_' + randomHex(12);
  try {
    await fetch(getActiveCloudUrl(), {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ ...payload, opId })
    });
  } catch (e) { /* a leitura abaixo decide */ }

  for (let i = 0; i < 7; i++) {
    try {
      const r = await cloudGet({ action: 'result', opId });
      if (r && r.years) {
        return { status: 'error', code: 'outdated', message: 'O Apps Script ainda está na versão antiga (com PIN). Publique o novo Code.gs para usar usuários e senhas.' };
      }
      if (r && !r.pending) return r;
    } catch (e) {}
    await sleep(500 + i * 350);
  }
  return { status: 'error', code: 'noresponse', message: 'A nuvem não respondeu. Confira a internet e tente de novo.' };
}

// ---------- Janela de formulário (login, senha, usuários) ----------
// onSubmit(values, setError) → true fecha a janela; qualquer outra coisa a mantém aberta.
function uiForm({ title, message = '', fields = [], okText = 'Salvar', cancelText = 'Cancelar', variant = '', onSubmit = null }) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'ui-modal-overlay';
    const form = document.createElement('form');
    form.className = 'ui-modal ui-form ' + variant;
    form.setAttribute('role', 'dialog');
    form.setAttribute('aria-modal', 'true');
    form.noValidate = true;

    if (variant.includes('auth-modal')) {
      const mark = document.createElement('div');
      mark.className = 'auth-mark';
      mark.innerHTML = '<div class="brand-logo">GA</div>';
      form.appendChild(mark);
    }
    const titleEl = document.createElement('div');
    titleEl.className = 'ui-modal-title';
    titleEl.textContent = title;
    form.appendChild(titleEl);
    if (message) {
      const msgEl = document.createElement('div');
      msgEl.className = 'ui-modal-message';
      msgEl.textContent = message;
      form.appendChild(msgEl);
    }

    const inputs = {};
    fields.forEach(f => {
      const row = document.createElement('div');
      row.className = 'form-row';
      const label = document.createElement('label');
      label.textContent = f.label;
      const id = 'f_' + randomHex(4);
      label.htmlFor = id;
      row.appendChild(label);

      let input;
      if (f.type === 'select') {
        input = document.createElement('select');
        (f.options || []).forEach(o => {
          const opt = document.createElement('option');
          opt.value = o.value;
          opt.textContent = o.label;
          input.appendChild(opt);
        });
        input.value = f.value || (f.options && f.options[0] ? f.options[0].value : '');
        row.appendChild(input);
      } else {
        input = document.createElement('input');
        input.type = f.type || 'text';
        input.value = f.value || '';
        input.placeholder = f.placeholder || '';
        input.autocomplete = f.autocomplete || 'off';
        input.spellcheck = false;
        if (f.type === 'password') {
          const wrap = document.createElement('div');
          wrap.className = 'password-wrap';
          const eye = document.createElement('button');
          eye.type = 'button';
          eye.className = 'password-toggle';
          eye.textContent = 'Mostrar';
          eye.addEventListener('click', () => {
            const show = input.type === 'password';
            input.type = show ? 'text' : 'password';
            eye.textContent = show ? 'Ocultar' : 'Mostrar';
            input.focus();
          });
          wrap.appendChild(input);
          wrap.appendChild(eye);
          row.appendChild(wrap);
        } else {
          row.appendChild(input);
        }
      }
      input.id = id;
      input.name = f.name;
      if (f.hint) {
        const hint = document.createElement('small');
        hint.className = 'form-hint';
        hint.textContent = f.hint;
        row.appendChild(hint);
      }
      inputs[f.name] = input;
      form.appendChild(row);
    });

    const errorEl = document.createElement('div');
    errorEl.className = 'form-error';
    errorEl.setAttribute('role', 'alert');
    errorEl.hidden = true;
    form.appendChild(errorEl);

    const actions = document.createElement('div');
    actions.className = 'ui-modal-actions';
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn-outline';
    cancelBtn.textContent = cancelText || 'Cancelar';
    if (!cancelText) cancelBtn.hidden = true;
    const okBtn = document.createElement('button');
    okBtn.type = 'submit';
    okBtn.className = 'btn-action btn-cobalt';
    okBtn.textContent = okText;
    actions.appendChild(cancelBtn);
    actions.appendChild(okBtn);
    form.appendChild(actions);

    let busy = false;
    function setError(msg) {
      errorEl.textContent = msg || '';
      errorEl.hidden = !msg;
    }
    function close(result) {
      document.removeEventListener('keydown', onKey, true);
      overlay.remove();
      resolve(result);
    }
    function isTopmost() {
      const all = document.querySelectorAll('.ui-modal-overlay');
      return all[all.length - 1] === overlay;
    }
    function onKey(ev) {
      if (ev.key === 'Escape' && cancelText && !busy && isTopmost()) {
        ev.preventDefault();
        ev.stopPropagation();
        close(null);
      }
    }

    form.addEventListener('submit', async ev => {
      ev.preventDefault();
      if (busy) return;
      const values = {};
      Object.keys(inputs).forEach(k => { values[k] = inputs[k].value; });
      if (!onSubmit) return close(values);
      setError('');
      busy = true;
      okBtn.disabled = true;
      cancelBtn.disabled = true;
      const prevText = okBtn.textContent;
      okBtn.textContent = 'Aguarde...';
      let done = false;
      try {
        done = await onSubmit(values, setError);
      } catch (e) {
        setError('Erro inesperado: ' + e.message);
      }
      busy = false;
      okBtn.disabled = false;
      cancelBtn.disabled = false;
      okBtn.textContent = prevText;
      if (done === true) close(values);
    });
    cancelBtn.addEventListener('click', () => { if (!busy) close(null); });
    document.addEventListener('keydown', onKey, true);

    overlay.appendChild(form);
    document.body.appendChild(overlay);
    const firstEmpty = Object.values(inputs).find(i => !i.value) || Object.values(inputs)[0];
    (firstEmpty || okBtn).focus();
  });
}

// ---------- Login / logout / troca de senha ----------
async function openLoginDialog(reason = '') {
  let typedPassword = '';
  const result = await uiForm({
    title: 'Entrar no PCP',
    message: reason || 'Use seu usuário e senha para lançar e editar dados.',
    variant: 'auth-modal',
    okText: 'Entrar',
    fields: [
      { name: 'username', label: 'Usuário', autocomplete: 'username', placeholder: 'ex.: flavio' },
      { name: 'password', label: 'Senha', type: 'password', autocomplete: 'current-password' }
    ],
    onSubmit: async (v, setError) => {
      const username = v.username.trim().toLowerCase();
      if (!username || !v.password) { setError('Preencha usuário e senha.'); return false; }
      const token = randomHex(32);
      const r = await cloudAction({ action: 'login', username, password: v.password, token });
      if (r.status !== 'ok') { setError(r.message || 'Não foi possível entrar.'); return false; }
      typedPassword = v.password;
      setSession({ token, user: r.user });
      return true;
    }
  });
  if (!result) return false;

  const u = currentUser();
  if (u && u.mustChange) {
    const changed = await openChangePasswordDialog({ forced: true, currentPassword: typedPassword });
    if (!changed) return false;
  }
  if (hasPendingChanges() && canEdit()) flushPendingChanges();
  return true;
}

async function openChangePasswordDialog({ forced = false, currentPassword = '' } = {}) {
  if (!currentSession) return false;
  const fields = [];
  if (!currentPassword) {
    fields.push({ name: 'current', label: forced ? 'Senha provisória' : 'Senha atual', type: 'password', autocomplete: 'current-password' });
  }
  fields.push(
    { name: 'next', label: 'Nova senha', type: 'password', autocomplete: 'new-password', hint: `Mínimo de ${MIN_PASSWORD_LENGTH} caracteres. Só você vai saber.` },
    { name: 'again', label: 'Repita a nova senha', type: 'password', autocomplete: 'new-password' }
  );

  const result = await uiForm({
    title: forced ? 'Crie sua senha' : 'Trocar minha senha',
    message: forced
      ? `Olá, ${currentUser().name}! Você entrou com uma senha provisória. Para continuar, crie uma senha só sua.`
      : '',
    variant: 'auth-modal',
    okText: 'Salvar senha',
    cancelText: forced ? 'Agora não' : 'Cancelar',
    fields,
    onSubmit: async (v, setError) => {
      const current = currentPassword || v.current;
      if (!current) { setError('Informe a senha atual.'); return false; }
      if (v.next.length < MIN_PASSWORD_LENGTH) { setError(`A nova senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`); return false; }
      if (v.next !== v.again) { setError('As duas senhas digitadas são diferentes.'); return false; }
      if (v.next === current) { setError('A nova senha precisa ser diferente da atual.'); return false; }
      const r = await cloudAction({ action: 'changePassword', token: sessionToken(), currentPassword: current, newPassword: v.next });
      if (r.status !== 'ok') {
        if (r.code === 'auth') { setSession(null); setError('Sua sessão expirou. Feche e entre de novo.'); return false; }
        setError(r.message || 'Não foi possível trocar a senha.');
        return false;
      }
      setSession({ token: sessionToken(), user: r.user });
      return true;
    }
  });

  if (result) {
    showToast('Senha alterada com sucesso.');
    return true;
  }
  return false;
}

async function logout() {
  const token = sessionToken();
  setSession(null);
  if (token && navigator.onLine) {
    fetch(getActiveCloudUrl(), {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'logout', token })
    }).catch(() => {});
  }
  showToast('Você saiu. O dashboard continua disponível para consulta.');
}

// Garante que o usuário pode editar (abre o login se precisar).
async function requireEditAuth() {
  return requireRole(['admin', 'pcp']);
}

async function requireAdminAuth() {
  return requireRole(['admin']);
}

async function requireRole(roles) {
  let u = currentUser();
  if (u && u.mustChange) {
    await openChangePasswordDialog({ forced: true });
    u = currentUser();
    if (!u || u.mustChange) return false;
  }
  if (!u) {
    if (!navigator.onLine) {
      await uiAlert('Sem internet: não é possível entrar agora. Conecte-se e tente de novo.', 'Sem conexão');
      return false;
    }
    const msg = roles.length === 1 && roles[0] === 'admin'
      ? 'Esta ação é exclusiva de administradores. Entre com um usuário administrador.'
      : 'Entre com seu usuário para lançar e editar dados.';
    if (!(await openLoginDialog(msg))) return false;
    u = currentUser();
    if (!u) return false;
  }
  if (!roles.includes(u.role)) {
    const needed = roles.map(r => ROLE_LABELS[r]).join(' ou ');
    await uiAlert(`Seu perfil (${ROLE_LABELS[u.role] || u.role}) não permite esta ação. Ela é liberada para: ${needed}.\n\nSe precisar, peça a um administrador para mudar seu perfil.`, 'Sem permissão');
    return false;
  }
  return true;
}

// Chamado quando a nuvem informa que a sessão não vale mais.
function handleSessionLost(reason = 'auth') {
  if (!currentSession) return;
  setSession(null);
  const msg = reason === 'forbidden'
    ? 'Seu perfil não permite gravar. Alterações deste PC ficaram guardadas.'
    : 'Sua sessão terminou (expirou ou o usuário foi alterado). Entre de novo para continuar lançando.';
  showToast(msg, 'warn');
}

// Atualiza o usuário com o que a nuvem informou (perfil trocado, desativado...).
function applyCloudSession(info) {
  if (!currentSession || typeof info === 'undefined') return;
  if (info === null) return handleSessionLost('auth');
  const prev = currentSession.user;
  if (prev.role !== info.role || prev.name !== info.name || prev.mustChange !== info.mustChange) {
    setSession({ token: currentSession.token, user: info });
  }
}

async function verifyStoredSession() {
  if (!currentSession || !navigator.onLine) return;
  try {
    const r = await cloudGet({ action: 'session', token: currentSession.token });
    if (r && r.ok === false) handleSessionLost('auth');
    else if (r && r.ok === true && r.user) applyCloudSession(r.user);
  } catch (e) { /* sem conexão: mantém a sessão local */ }
}

// ---------- Interface: área do usuário, menus, avisos ----------
function updateAuthUI() {
  const u = currentUser();
  const body = document.body;
  if (!body) return;
  body.classList.remove('auth-none', 'auth-admin', 'auth-pcp', 'auth-viewer', 'can-edit');
  body.classList.add(u ? 'auth-' + u.role : 'auth-none');
  if (canEdit()) body.classList.add('can-edit');

  const area = document.getElementById('userArea');
  if (area) {
    if (!u) {
      area.innerHTML = `<button class="btn-login" onclick="openLoginDialog()">Entrar</button>`;
    } else {
      area.innerHTML = `
        <div class="menu-wrap">
          <button class="user-chip" onclick="toggleMenu(this)" aria-haspopup="true" aria-expanded="false">
            <span class="user-avatar role-${escapeHtml(u.role)}">${escapeHtml(userInitials(u.name))}</span>
            <span class="user-chip-text">
              <strong>${escapeHtml(u.name)}</strong>
              <small>${escapeHtml(ROLE_LABELS[u.role] || u.role)}</small>
            </span>
            <svg class="chev-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 6 8 10.5 12.5 6"/></svg>
          </button>
          <div class="menu-panel menu-right" role="menu">
            <div class="menu-head">
              <strong>${escapeHtml(u.name)}</strong>
              <small>@${escapeHtml(u.username)} · ${escapeHtml(ROLE_DESCRIPTIONS[u.role] || '')}</small>
            </div>
            <button role="menuitem" onclick="closeMenus(); openChangePasswordDialog()">Trocar minha senha</button>
            ${u.role === 'admin' ? `<button role="menuitem" onclick="closeMenus(); openUsersManager()">Gerenciar usuários</button>` : ''}
            <div class="menu-sep"></div>
            <button role="menuitem" class="menu-danger" onclick="closeMenus(); logout()">Sair</button>
          </div>
        </div>`;
    }
  }

  document.querySelectorAll('[data-auth-gate]').forEach(el => {
    let text;
    if (!u) text = 'Modo consulta. Entre com seu usuário para lançar e editar.';
    else if (u.mustChange) text = 'Crie sua senha definitiva para liberar os lançamentos.';
    else if (!canEdit()) text = `Seu perfil é ${ROLE_LABELS[u.role]}: apenas consulta.`;
    else text = '';
    el.hidden = !text;
    const span = el.querySelector('.auth-gate-text');
    if (span) span.textContent = text;
    const btn = el.querySelector('button');
    if (btn) {
      btn.hidden = !!u && !u.mustChange;
      btn.textContent = u && u.mustChange ? 'Criar senha' : 'Entrar';
    }
  });

  const opInput = document.getElementById('inputOperatorName');
  if (opInput) {
    if (u && (!opInput.value || opInput.dataset.auto === '1')) {
      opInput.value = u.name;
      opInput.dataset.auto = '1';
    } else if (!u && opInput.dataset.auto === '1') {
      opInput.value = '';
    }
  }
}

function onAuthGateClick() {
  const u = currentUser();
  if (u && u.mustChange) openChangePasswordDialog({ forced: true });
  else openLoginDialog();
}

function closeMenus(except = null) {
  document.querySelectorAll('.menu-wrap.open').forEach(w => {
    if (w === except) return;
    w.classList.remove('open');
    const b = w.querySelector('[aria-expanded]');
    if (b) b.setAttribute('aria-expanded', 'false');
  });
}

function toggleMenu(btn) {
  const wrap = btn.closest('.menu-wrap');
  const willOpen = !wrap.classList.contains('open');
  closeMenus(wrap);
  wrap.classList.toggle('open', willOpen);
  btn.setAttribute('aria-expanded', String(willOpen));
}

document.addEventListener('click', ev => {
  if (!ev.target.closest('.menu-wrap')) closeMenus();
});
document.addEventListener('keydown', ev => {
  if (ev.key === 'Escape') closeMenus();
});

function showToast(message, kind = 'ok') {
  let host = document.getElementById('toastHost');
  if (!host) {
    host = document.createElement('div');
    host.id = 'toastHost';
    host.className = 'toast-host';
    document.body.appendChild(host);
  }
  const t = document.createElement('div');
  t.className = 'toast toast-' + kind;
  t.setAttribute('role', 'status');
  t.textContent = message;
  host.appendChild(t);
  setTimeout(() => t.classList.add('leaving'), 4200);
  setTimeout(() => t.remove(), 4600);
}

// ---------- Gerenciar usuários (admin) ----------
function formatDateTimeShort(ms) {
  if (!ms) return '—';
  return new Date(ms).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

const ROLE_OPTIONS = ['pcp', 'viewer', 'admin'].map(r => ({ value: r, label: `${ROLE_LABELS[r]} — ${ROLE_DESCRIPTIONS[r]}` }));

async function openUsersManager() {
  if (!(await requireAdminAuth())) return;

  const overlay = document.createElement('div');
  overlay.className = 'ui-modal-overlay';
  overlay.innerHTML = `
    <div class="ui-modal users-modal" role="dialog" aria-modal="true" aria-label="Gerenciar usuários">
      <div class="users-modal-head">
        <div>
          <div class="ui-modal-title">Usuários</div>
          <div class="users-modal-sub">Quem pode entrar no PCP e o que cada um pode fazer.</div>
        </div>
        <div class="users-modal-tools">
          <button type="button" class="btn-outline" data-act="close">Fechar</button>
          <button type="button" class="btn-action btn-cobalt" data-act="new">+ Novo usuário</button>
        </div>
      </div>
      <div class="users-list" aria-live="polite"><div class="users-empty">Carregando usuários...</div></div>
    </div>`;
  document.body.appendChild(overlay);
  const listEl = overlay.querySelector('.users-list');
  let users = [];

  function close() {
    document.removeEventListener('keydown', onKey, true);
    overlay.remove();
  }
  function onKey(ev) {
    const all = document.querySelectorAll('.ui-modal-overlay');
    if (ev.key === 'Escape' && all[all.length - 1] === overlay) { ev.preventDefault(); close(); }
  }
  document.addEventListener('keydown', onKey, true);

  async function load() {
    let r;
    try { r = await cloudGet({ action: 'users', token: sessionToken() }); } catch (e) { r = null; }
    if (!r || r.status !== 'ok') {
      if (r && r.years) {
        listEl.innerHTML = `<div class="users-empty">O Apps Script ainda está na versão antiga. Publique o novo Code.gs.</div>`;
      } else {
        listEl.innerHTML = `<div class="users-empty">${escapeHtml((r && r.message) || 'Não foi possível carregar a lista (sem conexão?).')}</div>`;
      }
      return;
    }
    users = r.users;
    render();
  }

  function render() {
    const me = currentUser();
    listEl.innerHTML = users.map(u => {
      const isMe = me && me.username === u.username;
      const status = !u.active
        ? '<span class="user-status off">Desativado</span>'
        : (u.mustChange ? '<span class="user-status pending">Aguardando 1º acesso</span>' : '<span class="user-status on">Ativo</span>');
      return `
        <div class="user-row ${u.active ? '' : 'inactive'}" data-user="${escapeHtml(u.username)}">
          <span class="user-avatar role-${escapeHtml(u.role)}">${escapeHtml(userInitials(u.name))}</span>
          <div class="user-row-main">
            <strong>${escapeHtml(u.name)}${isMe ? ' <em>(você)</em>' : ''}</strong>
            <small>@${escapeHtml(u.username)} · último acesso: ${escapeHtml(formatDateTimeShort(u.lastLogin))}</small>
          </div>
          <span class="role-tag role-${escapeHtml(u.role)}">${escapeHtml(ROLE_LABELS[u.role] || u.role)}</span>
          ${status}
          <div class="menu-wrap">
            <button type="button" class="btn-outline" onclick="toggleMenu(this)" aria-haspopup="true" aria-expanded="false">Ações ▾</button>
            <div class="menu-panel menu-right" role="menu">
              <button role="menuitem" data-act="edit">Editar nome e perfil</button>
              <button role="menuitem" data-act="reset">Gerar senha provisória</button>
              ${isMe ? '' : `<button role="menuitem" data-act="toggle">${u.active ? 'Desativar acesso' : 'Reativar acesso'}</button>`}
              ${isMe ? '' : `<div class="menu-sep"></div><button role="menuitem" class="menu-danger" data-act="delete">Excluir usuário</button>`}
            </div>
          </div>
        </div>`;
    }).join('') || '<div class="users-empty">Nenhum usuário.</div>';
  }

  async function run(payload) {
    const r = await cloudAction({ ...payload, token: sessionToken() });
    if (r.code === 'auth') handleSessionLost('auth');
    return r;
  }

  function showCredentials(name, username, temp) {
    return uiAlert(
      `Passe estes dados para ${name}:\n\nUsuário: ${username}\nSenha provisória: ${temp}\n\nNo primeiro acesso o sistema pede para criar uma senha própria.`,
      'Acesso pronto'
    );
  }

  overlay.addEventListener('click', async ev => {
    const btn = ev.target.closest('[data-act]');
    if (!btn) return;
    const act = btn.dataset.act;
    closeMenus();
    if (act === 'close') return close();

    if (act === 'new') {
      const temp = generateTempPassword();
      let created = null;
      await uiForm({
        title: 'Novo usuário',
        okText: 'Criar usuário',
        fields: [
          { name: 'name', label: 'Nome da pessoa', placeholder: 'ex.: Flávio Souza' },
          { name: 'username', label: 'Usuário (para entrar)', placeholder: 'ex.: flavio', hint: '3 a 30 caracteres: letras minúsculas, números, ponto ou hífen. Sem espaço.' },
          { name: 'role', label: 'Perfil', type: 'select', options: ROLE_OPTIONS, value: 'pcp' },
          { name: 'temp', label: 'Senha provisória', value: temp, hint: 'A pessoa troca no primeiro acesso.' }
        ],
        onSubmit: async (v, setError) => {
          const username = v.username.trim().toLowerCase();
          if (!v.name.trim()) { setError('Informe o nome da pessoa.'); return false; }
          if (!/^[a-z0-9._-]{3,30}$/.test(username)) { setError('Usuário inválido: use 3 a 30 letras minúsculas, números, ponto, hífen ou sublinhado.'); return false; }
          if (v.temp.length < MIN_PASSWORD_LENGTH) { setError(`A senha provisória precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`); return false; }
          const r = await run({ action: 'createUser', name: v.name.trim(), username, role: v.role, tempPassword: v.temp });
          if (r.status !== 'ok') { setError(r.message); return false; }
          created = { name: v.name.trim(), username, temp: v.temp };
          return true;
        }
      });
      if (created) {
        await load();
        await showCredentials(created.name, created.username, created.temp);
      }
      return;
    }

    const row = btn.closest('[data-user]');
    const u = row && users.find(x => x.username === row.dataset.user);
    if (!u) return;

    if (act === 'edit') {
      const ok = await uiForm({
        title: `Editar ${u.name}`,
        okText: 'Salvar',
        fields: [
          { name: 'name', label: 'Nome da pessoa', value: u.name },
          { name: 'role', label: 'Perfil', type: 'select', options: ROLE_OPTIONS, value: u.role }
        ],
        onSubmit: async (v, setError) => {
          if (!v.name.trim()) { setError('Informe o nome.'); return false; }
          const r = await run({ action: 'updateUser', username: u.username, name: v.name.trim(), role: v.role });
          if (r.status !== 'ok') { setError(r.message); return false; }
          if (currentUser() && currentUser().username === u.username) setSession({ token: sessionToken(), user: r.user });
          return true;
        }
      });
      if (ok) await load();
    } else if (act === 'reset') {
      const temp = generateTempPassword();
      let done = false;
      await uiForm({
        title: `Nova senha provisória para ${u.name}`,
        message: 'A senha atual deixa de valer. No próximo acesso a pessoa cria uma senha própria.',
        okText: 'Gerar senha',
        fields: [{ name: 'temp', label: 'Senha provisória', value: temp }],
        onSubmit: async (v, setError) => {
          if (v.temp.length < MIN_PASSWORD_LENGTH) { setError(`Mínimo de ${MIN_PASSWORD_LENGTH} caracteres.`); return false; }
          const r = await run({ action: 'resetPassword', username: u.username, tempPassword: v.temp });
          if (r.status !== 'ok') { setError(r.message); return false; }
          done = v.temp;
          return true;
        }
      });
      if (done) {
        await load();
        await showCredentials(u.name, u.username, done);
      }
    } else if (act === 'toggle') {
      const activate = !u.active;
      if (!(await uiConfirm(
        activate ? `Reativar o acesso de ${u.name}?` : `Desativar o acesso de ${u.name}? A pessoa sai na hora e não consegue mais entrar (os lançamentos dela continuam).`,
        { title: activate ? 'Reativar usuário' : 'Desativar usuário', okText: activate ? 'Reativar' : 'Desativar', danger: !activate }
      ))) return;
      const r = await run({ action: 'updateUser', username: u.username, active: activate });
      if (r.status !== 'ok') return uiAlert(r.message, 'Não foi possível');
      await load();
    } else if (act === 'delete') {
      if (!(await uiConfirm(
        `Excluir o usuário ${u.name} (@${u.username})? Isso não pode ser desfeito. Os lançamentos feitos por ele continuam no histórico.\n\nDica: se for só temporário, prefira "Desativar acesso".`,
        { title: 'Excluir usuário', okText: 'Excluir', danger: true }
      ))) return;
      const r = await run({ action: 'deleteUser', username: u.username });
      if (r.status !== 'ok') return uiAlert(r.message, 'Não foi possível');
      await load();
    }
  });

  load();
}

function formatCurrencyBRL(val) {
  return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Impede que textos digitados (operador, observação etc.) virem HTML/código na página.
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ===================== BACKUP (BAIXAR / IMPORTAR) =====================

function downloadJsonFile(jsonText, fileName) {
  try {
    const blob = new Blob([jsonText], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 5000);
  } catch (e) {
    console.warn('Falha ao gerar arquivo de backup:', e);
  }
}

function backupFileStamp() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}h${p(d.getMinutes())}`;
}

function downloadBackup(prefix = 'Backup_PCP_Grande_Aco') {
  const backupObj = { ...state, backupCreatedAt: new Date().toISOString() };
  delete backupObj.pcpPin;
  downloadJsonFile(JSON.stringify(backupObj, null, 2), `${prefix}_${backupFileStamp()}.json`);
}

// Abre o seletor de arquivo direto (o navegador só permite isso no clique);
// o PIN é pedido depois que o arquivo é escolhido.
function openImportBackupDialog() {
  const input = document.getElementById('backupFileInput');
  input.value = '';
  input.click();
}

function handleImportBackupFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    let parsed;
    try {
      parsed = JSON.parse(reader.result);
    } catch (e) {
      return uiAlert('Arquivo inválido: não é um backup JSON do sistema.');
    }
    if (!parsed || typeof parsed !== 'object' || !parsed.years || typeof parsed.years !== 'object') {
      return uiAlert('Arquivo inválido: não contém os dados de produção (campo "years").');
    }

    if (!(await requireAdminAuth())) return;

    const yearsList = Object.keys(parsed.years).join(', ');
    const createdLabel = parsed.backupCreatedAt
      ? new Date(parsed.backupCreatedAt).toLocaleString('pt-BR')
      : 'data desconhecida';
    const ok = await uiConfirm(
      `Importar o backup de ${createdLabel} (anos: ${yearsList})?\n\nISSO SUBSTITUI os dados atuais em TODOS os PCs.\nAntes de importar, um backup dos dados atuais será baixado automaticamente.`,
      { title: 'Importar backup', okText: 'Importar', danger: true }
    );
    if (!ok) return;

    downloadBackup('Backup_Antes_de_Importar');

    const saved = await commitChange(() => {
      const imported = upgradeDatabaseStructure(JSON.parse(JSON.stringify(parsed)), null);
      delete imported.backupCreatedAt;
      imported.appliedOpIds = state.appliedOpIds;   // mantém o controle de operações
      Object.keys(state).forEach(k => delete state[k]);
      Object.assign(state, imported);
    });

    uiAlert(saved
      ? 'Backup importado e confirmado na nuvem!'
      : 'Backup importado neste PC, mas AINDA NÃO confirmado na nuvem. Será enviado automaticamente.');
  };
  reader.readAsText(file);
}

function getGaugeNumericValue(gaugeStr) {
  return parseFloat(String(gaugeStr || '0').replace(',', '.')) || 0;
}

// true se a data ISO (aaaa-mm-dd) for depois de hoje.
function isFutureDate(isoDate) {
  return !!isoDate && isoDate > getTodayFilterState().selectedDate;
}

// Soma `delta` kg na semana `wIdx`. Se ficar negativo, tira o restante das
// outras semanas (da última para a primeira). Usado nos meses com fechamento manual.
function applyWeekDelta(mObj, wIdx, delta) {
  if (!Array.isArray(mObj.weeks)) mObj.weeks = [0, 0, 0, 0, 0];
  while (mObj.weeks.length < 5) mObj.weeks.push(0);
  const idx = Math.min(4, Math.max(0, Number(wIdx) || 0));
  const next = +(Number(mObj.weeks[idx] || 0) + Number(delta || 0)).toFixed(3);
  if (next >= 0) {
    mObj.weeks[idx] = next;
    return;
  }
  mObj.weeks[idx] = 0;
  let remaining = -next;
  for (let i = 4; i >= 0 && remaining > 0.0005; i--) {
    const take = Math.min(mObj.weeks[i], remaining);
    mObj.weeks[i] = +(mObj.weeks[i] - take).toFixed(3);
    remaining = +(remaining - take).toFixed(3);
  }
}

// Mantém semanas e máquinas coerentes.
// Meses com fechamento manual (`weeksManual`) mantêm as semanas digitadas,
// e o total do mês passa a ser a soma das semanas — a menos que `force` seja true.
function reconcileMonthConsistency(mObj, preferredWeekIdx = null, force = false) {
  if (!mObj) return;
  if (!Array.isArray(mObj.items)) mObj.items = cloneItemsWithTotal(0);
  if (!Array.isArray(mObj.weeks)) mObj.weeks = [0, 0, 0, 0, 0];
  while (mObj.weeks.length < 5) mObj.weeks.push(0);

  mObj.items.sort((a, b) => getGaugeNumericValue(a.gauge) - getGaugeNumericValue(b.gauge));

  const sumItems = +mObj.items.reduce((acc, cur) => acc + Number(cur.kg || 0), 0).toFixed(3);
  const sumWeeks = +mObj.weeks.reduce((acc, cur) => acc + Number(cur || 0), 0).toFixed(3);

  if (mObj.weeksManual && !force) {
    mObj.producedKg = sumWeeks;
    return;
  }
  const diff = +(sumItems - sumWeeks).toFixed(3);

  if (Math.abs(diff) > 0.005) {
    if (sumItems === 0) {
      mObj.weeks = [0, 0, 0, 0, 0];
    } else {
      let targetIdx = (preferredWeekIdx !== null && preferredWeekIdx >= 0 && preferredWeekIdx < 5) ? preferredWeekIdx : -1;
      if (targetIdx === -1) {
        for (let i = 4; i >= 0; i--) {
          if (mObj.weeks[i] > 0) { targetIdx = i; break; }
        }
      }
      if (targetIdx === -1) targetIdx = getWeekIndexFromDateStr(viewFilter.selectedDate);

      let remainingDelta = diff;
      const nextVal = +(mObj.weeks[targetIdx] + remainingDelta).toFixed(3);
      if (nextVal >= 0) {
        mObj.weeks[targetIdx] = nextVal;
      } else {
        remainingDelta = nextVal;
        mObj.weeks[targetIdx] = 0;
        for (let i = 4; i >= 0 && remainingDelta < -0.001; i--) {
          if (mObj.weeks[i] > 0) {
            const take = Math.min(mObj.weeks[i], Math.abs(remainingDelta));
            mObj.weeks[i] = +(mObj.weeks[i] - take).toFixed(3);
            remainingDelta = +(remainingDelta + take).toFixed(3);
          }
        }
      }
    }
  }

  mObj.producedKg = sumItems;
}

function getMonthScrapList(yr, mIdx) {
  ensureYearExists(yr);
  const mObj = state.years[yr][mIdx];
  if (!Array.isArray(mObj.scrapLogs)) mObj.scrapLogs = [];
  return mObj.scrapLogs;
}

function getYearScrapList(yr) {
  ensureYearExists(yr);
  const list = [];
  state.years[yr].forEach((mObj, mIdx) => {
    if (Array.isArray(mObj.scrapLogs)) {
      mObj.scrapLogs.forEach(s => list.push({ ...s, year: Number(yr), monthIndex: mIdx }));
    }
  });
  return list;
}

function getAllScrapLogsFlat() {
  const list = [];
  Object.keys(state.years || {}).forEach(yr => {
    state.years[yr].forEach((mObj, mIdx) => {
      if (Array.isArray(mObj.scrapLogs)) {
        mObj.scrapLogs.forEach(s => list.push({ ...s, year: Number(yr), monthIndex: mIdx }));
      }
    });
  });
  return list;
}

function exportActiveMonthCSV() {
  const m = getActiveMonthObj();
  const rows = [
    ['RELATORIO DE PRODUCAO MES/PCP - GRANDE ACO'],
    ['Periodo', `${m.name} / ${viewFilter.activeYear}`],
    ['Produzido Total (kg)', m.producedKg],
    ['Meta Prevista (kg)', m.goalKg],
    [],
    ['MAQUINA', 'CATEGORIA', 'BITOLA', 'PESO PRODUZIDO (KG)', 'CARTEIRA RESTANTE A PRODUZIR (KG)'],
    ...m.items.map(i => [
      i.machine,
      i.category,
      i.gauge,
      String(i.kg).replace('.', ','),
      String((m.backlog && m.backlog[i.gauge]) || 0).replace('.', ',')
    ]),
    [],
    ['FECHAMENTO SEMANAL', 'PESO (KG)'],
    ...(m.weeks || [0, 0, 0, 0, 0]).map((w, idx) => [`Semana ${idx + 1}`, String(w).replace('.', ',')])
  ];

  const csvContent = '\uFEFF' + rows.map(r => r.join(';')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `PCP_Grande_Aco_${m.name}_${viewFilter.activeYear}.csv`;
  link.click();
}

function exportScrapCSV() {
  const logs = getAllScrapLogsFlat();
  const rows = [
    ['RELATORIO DE CONTROLE DE SUCATA - GRANDE ACO'],
    ['DATA', 'HORA', 'MES/ANO', 'TIPO', 'MAQUINA/ORIGEM', 'BITOLA', 'PESO (KG)', 'PRECO UNITARIO (R$/KG)', 'VALOR TOTAL (R$)', 'OBSERVACAO'],
    ...logs.map(s => [
      formatDateBR(s.date),
      s.time || '',
      `${MONTH_NAMES[s.monthIndex]} / ${s.year}`,
      s.type,
      s.machine,
      s.gauge,
      String(s.weightKg).replace('.', ','),
      String(s.unitPriceBrl).replace('.', ','),
      String(s.totalValueBrl).replace('.', ','),
      s.notes || ''
    ])
  ];
  const csvContent = '\uFEFF' + rows.map(r => r.join(';')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `Relatorio_Sucata_Grande_Aco_${viewFilter.activeYear}.csv`;
  link.click();
}

function getTodayFilterState() {
  const now = new Date();
  const yr = now.getFullYear();
  const moIdx = now.getMonth();
  const mm = String(moIdx + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return {
    unit: 'kg',
    selectedDate: `${yr}-${mm}-${dd}`,
    activeYear: yr,
    activeMonthIndex: moIdx
  };
}

let viewFilter = getTodayFilterState();
let isSavingToCloud = false;
let monthlyChart, overviewWeeklyChart, machineChart, gaugeOnlyChart, weeklyMultiMonthChart, gaugeMonth, gaugeYear;
let scrapMachineChart, scrapTrendChart;

function setTodayDate() {
  const today = getTodayFilterState();
  viewFilter.selectedDate = today.selectedDate;
  viewFilter.activeYear = today.activeYear;
  viewFilter.activeMonthIndex = today.activeMonthIndex;
  ensureYearExists(viewFilter.activeYear);
  syncFilterInputs();
  renderAll();
}

function getWeekIndexFromDateStr(isoDate) {
  if (!isoDate) return 0;
  const day = parseInt(isoDate.split('-')[2], 10) || 1;
  if (day <= 7) return 0;
  if (day <= 14) return 1;
  if (day <= 21) return 2;
  if (day <= 28) return 3;
  return 4;
}

function cloneItemsWithTotal(totalKg) {
  const octWeights = [0, 3467.856, 5977.857, 4401.101, 4069.508, 7552.335, 6482.599, 3080.413, 1730.603, 0];
  const octSum = 36762.272;
  return BASE_ITEMS_TEMPLATE.map((item, idx) => ({
    ...item,
    kg: totalKg > 0 ? +((octWeights[idx] / octSum) * totalKg).toFixed(3) : 0
  }));
}

function createEmptyBacklogMap(defaultVal = 0) {
  const map = {};
  ALL_GAUGES.forEach(g => { map[g] = defaultVal; });
  return map;
}

function createEmptyDowntimeMap() {
  const map = {};
  Object.keys(MACHINE_CATALOG).forEach(m => { map[m] = 0; });
  return map;
}

function createEmptyYearData() {
  return MONTH_NAMES.map(name => ({
    name,
    producedKg: 0,
    goalKg: 0,
    weeks: [0, 0, 0, 0, 0],
    backlog: createEmptyBacklogMap(0),
    downtimeHours: createEmptyDowntimeMap(),
    scrapLogs: [],
    deletedScrapIds: [],
    items: cloneItemsWithTotal(0)
  }));
}

function createDefaultDatabase() {
  const todayIso = getTodayFilterState().selectedDate;
  const year2026 = createEmptyYearData();
  year2026[5] = { name: 'JUNHO', producedKg: 8277, goalKg: 8000, weeks: [...DEFAULT_2026_WEEKS[5]], backlog: createEmptyBacklogMap(0), downtimeHours: createEmptyDowntimeMap(), scrapLogs: [], deletedScrapIds: [], items: cloneItemsWithTotal(8277) };
  year2026[6] = { name: 'JULHO', producedKg: 7216, goalKg: 8000, weeks: [...DEFAULT_2026_WEEKS[6]], backlog: createEmptyBacklogMap(0), downtimeHours: createEmptyDowntimeMap(), scrapLogs: [], deletedScrapIds: [], items: cloneItemsWithTotal(7216) };
  year2026[7] = { name: 'AGOSTO', producedKg: 20246, goalKg: 10000, weeks: [...DEFAULT_2026_WEEKS[7]], backlog: createEmptyBacklogMap(0), downtimeHours: createEmptyDowntimeMap(), scrapLogs: [], deletedScrapIds: [], items: cloneItemsWithTotal(20246) };
  year2026[8] = { name: 'SETEMBRO', producedKg: 30980, goalKg: 30000, weeks: [...DEFAULT_2026_WEEKS[8]], backlog: createEmptyBacklogMap(0), downtimeHours: createEmptyDowntimeMap(), scrapLogs: [], deletedScrapIds: [], items: cloneItemsWithTotal(30980) };
  year2026[9] = {
    name: 'OUTUBRO',
    producedKg: 38745.622,
    goalKg: 40000,
    weeks: [...DEFAULT_2026_WEEKS[9]],
    backlog: { ...DEFAULT_OCT_BACKLOG },
    downtimeHours: { 'ES02': 1.5, 'EB10': 2.0, 'EB12': 1.0, '20B': 0.5, 'PT 32': 0.0 },
    scrapLogs: [],
    deletedScrapIds: [],
    items: [
      { id: 'ES02_4,20 mm', machine: 'ES02', category: 'Estribadeira', gauge: '4,20 mm', kg: 0.000 },
      { id: 'ES02_5,00 mm', machine: 'ES02', category: 'Estribadeira', gauge: '5,00 mm', kg: 3467.856 },
      { id: 'EB10_6,30 mm', machine: 'EB10', category: 'Estribadeira', gauge: '6,30 mm', kg: 5977.857 },
      { id: 'EB10_8,00 mm', machine: 'EB10', category: 'Estribadeira', gauge: '8,00 mm', kg: 4401.101 },
      { id: 'EB12_10,00 mm', machine: 'EB12', category: 'Estribadeira', gauge: '10,00 mm', kg: 4069.508 },
      { id: 'EB12_12,50 mm', machine: 'EB12', category: 'Estribadeira', gauge: '12,50 mm', kg: 7552.335 },
      { id: '20B_16,00 mm', machine: '20B', category: 'Estribadeira', gauge: '16,00 mm', kg: 6482.599 },
      { id: 'PT 32_20,00 mm', machine: 'PT 32', category: 'Dobradeira Manual', gauge: '20,00 mm', kg: 3080.413 },
      { id: 'PT 32_25,00 mm', machine: 'PT 32', category: 'Dobradeira Manual', gauge: '25,00 mm', kg: 1730.603 },
      { id: 'PT 32_32,00 mm', machine: 'PT 32', category: 'Dobradeira Manual', gauge: '32,00 mm', kg: 0.000 }
    ]
  };
  year2026[10] = { name: 'NOVEMBRO', producedKg: 0, goalKg: 30000, weeks: [0, 0, 0, 0, 0], backlog: createEmptyBacklogMap(0), downtimeHours: createEmptyDowntimeMap(), scrapLogs: [], deletedScrapIds: [], items: cloneItemsWithTotal(0) };
  year2026[11] = { name: 'DEZEMBRO', producedKg: 0, goalKg: 20000, weeks: [0, 0, 0, 0, 0], backlog: createEmptyBacklogMap(0), downtimeHours: createEmptyDowntimeMap(), scrapLogs: [], deletedScrapIds: [], items: cloneItemsWithTotal(0) };

  return {
    updatedAt: Date.now(),
    years: { 2026: year2026 },
    dailyLogs: [
      {
        id: 'log_init_1',
        date: todayIso,
        time: '08:00:00',
        operator: 'Flávio PCP',
        shift: '1º Turno (Manhã)',
        year: 2026,
        monthIndex: 9,
        weekIndex: getWeekIndexFromDateStr(todayIso),
        machine: 'EB12',
        category: 'Estribadeira',
        gauge: '12,50 mm',
        mode: 'Saldo Consolidado',
        rawMode: 'init',
        kg: 7552.335,
        prevKg: 7552.335,
        deductedBacklogKg: 0,
        downtimeHours: 0,
        downtimeReason: 'Sem Parada'
      }
    ]
  };
}

function upgradeDatabaseStructure(db, currentLocalState = null) {
  if (!db || !db.years) return createDefaultDatabase();
  delete db.pcpPin; // o PIN antigo fica só no Apps Script (nunca nos dados do navegador)
  delete db.session;   // informações de sessão/recusa vêm junto da leitura, não são dados
  delete db.rejection;

  Object.keys(db.years).forEach(yr => {
    db.years[yr].forEach((mObj, idx) => {
      if (!Array.isArray(mObj.weeks)) {
        mObj.weeks = (Number(yr) === 2026 && DEFAULT_2026_WEEKS[idx]) ? [...DEFAULT_2026_WEEKS[idx]] : [0, 0, 0, 0, 0];
      }
      while (mObj.weeks.length < 5) mObj.weeks.push(0);
      const sumW = mObj.weeks.reduce((a, b) => a + b, 0);
      if (Number(yr) === 2026 && sumW === 0 && DEFAULT_2026_WEEKS[idx]) {
        mObj.weeks = [...DEFAULT_2026_WEEKS[idx]];
      }
      if (!mObj.backlog) {
        mObj.backlog = (Number(yr) === 2026 && idx === 9) ? { ...DEFAULT_OCT_BACKLOG } : createEmptyBacklogMap(0);
      }
      ALL_GAUGES.forEach(g => {
        if (typeof mObj.backlog[g] === 'undefined') mObj.backlog[g] = 0;
      });

      if (!Array.isArray(mObj.items)) {
        mObj.items = cloneItemsWithTotal(0);
      } else if (!mObj.items.some(i => i.gauge === '4,20 mm')) {
        mObj.items.unshift({
          id: 'ES02_4,20 mm',
          machine: 'ES02',
          category: 'Estribadeira',
          gauge: '4,20 mm',
          kg: 0
        });
      }

      if (!mObj.downtimeHours) {
        mObj.downtimeHours = (Number(yr) === 2026 && idx === 9)
          ? { 'ES02': 1.5, 'EB10': 2.0, 'EB12': 1.0, '20B': 0.5, 'PT 32': 0.0 }
          : createEmptyDowntimeMap();
      }
      if (!Array.isArray(mObj.scrapLogs)) mObj.scrapLogs = [];
      if (!Array.isArray(mObj.deletedScrapIds)) mObj.deletedScrapIds = [];

      reconcileMonthConsistency(mObj, null);
    });
  });

  if (Array.isArray(db.scrapLogs) && db.scrapLogs.length > 0) {
    db.scrapLogs.forEach(s => {
      const yr = Number(s.year || 2026);
      const mIdx = Number(s.monthIndex ?? 9);
      if (!db.years[yr]) db.years[yr] = createEmptyYearData();
      const mObj = db.years[yr][mIdx];
      if (mObj && !mObj.deletedScrapIds.includes(s.id) && !mObj.scrapLogs.some(x => x.id === s.id)) {
        mObj.scrapLogs.push(s);
      }
    });
  }

  if (currentLocalState && currentLocalState.years) {
    Object.keys(currentLocalState.years).forEach(yr => {
      if (!db.years[yr]) db.years[yr] = createEmptyYearData();
      currentLocalState.years[yr].forEach((localMonth, mIdx) => {
        const targetMonth = db.years[yr][mIdx];
        if (!targetMonth) return;

        const deletedSet = new Set([
          ...(targetMonth.deletedScrapIds || []),
          ...(localMonth.deletedScrapIds || [])
        ]);
        targetMonth.deletedScrapIds = Array.from(deletedSet);

        const mapById = new Map();
        (targetMonth.scrapLogs || []).forEach(s => {
          if (!deletedSet.has(s.id)) mapById.set(s.id, s);
        });
        (localMonth.scrapLogs || []).forEach(s => {
          if (!deletedSet.has(s.id)) mapById.set(s.id, s);
        });
        targetMonth.scrapLogs = Array.from(mapById.values());
      });
    });
  }

  if (Array.isArray(db.dailyLogs)) {
    db.dailyLogs.forEach((l, i) => {
      if (!l.id) l.id = 'log_legacy_' + i + '_' + (l.date || '');
      if (!l.time) l.time = '08:00:00';
      if (!l.operator) l.operator = 'PCP Padrão';
      if (!l.shift) l.shift = 'Turno Comercial';
      if (typeof l.downtimeHours !== 'number') l.downtimeHours = 0;
      if (!l.downtimeReason) l.downtimeReason = 'Sem Parada';
    });
  }
  return db;
}

let state = upgradeDatabaseStructure(loadLocalCache());

function updateCloudBadge(statusText, isOnline) {
  const badge = document.getElementById('cloudStatusBadge');
  badge.textContent = statusText;
  badge.className = 'badge-pill ' + (isOnline ? 'online' : 'local');
}

function loadLocalCache() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('GRANDE_ACO_PCP_DB_V18');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.years) return parsed;
    }
  } catch (e) {
    console.warn('Falha ao ler cache local:', e);
  }
  return createDefaultDatabase();
}

function saveLocalCache() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Falha ao salvar cache local:', e);
  }
}

function fetchCloudJSONP(url) {
  return new Promise((resolve, reject) => {
    const cbName = 'ga_jsonp_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
    const script = document.createElement('script');
    let timer = setTimeout(() => {
      cleanup();
      reject(new Error('Timeout JSONP'));
    }, 7000);

    function cleanup() {
      clearTimeout(timer);
      delete window[cbName];
      if (script.parentNode) script.parentNode.removeChild(script);
    }

    window[cbName] = (data) => {
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error('Falha ao carregar script JSONP'));
    };

    const sep = url.includes('?') ? '&' : '?';
    script.src = `${url}${sep}callback=${cbName}&t=${Date.now()}`;
    document.body.appendChild(script);
  });
}

// ========================================================================
// SINCRONIZAÇÃO COM A NUVEM (com detecção de conflito e confirmação)
//
// Cada alteração vira uma "operação" (função que altera o `state`).
// 1. A operação é aplicada localmente e entra na fila `pendingOps`.
// 2. O estado é enviado junto com `baseUpdatedAt` (versão da nuvem em que
//    este PC se baseou). O Apps Script RECUSA a gravação se a nuvem já
//    estiver em outra versão (outro PC salvou no meio-tempo).
// 3. Como o POST é no-cors (resposta ilegível), o PC lê a nuvem de volta:
//    - se a nuvem está com o nosso `updatedAt` → salvo e confirmado;
//    - senão → baixa a versão nova, re-aplica as operações pendentes por
//      cima dela e tenta de novo (até 3 vezes).
// `appliedOpIds` impede que uma operação seja aplicada duas vezes.
// ========================================================================

const CLOUD_BASE_KEY = 'GRANDE_ACO_CLOUD_BASE_UPDATED_AT';
const CONFLICT_BACKUP_KEY = 'GRANDE_ACO_CONFLICT_BACKUP';
const MAX_APPLIED_OP_IDS = 300;

let pendingOps = [];
let flushRequested = false;
let cloudBaseUpdatedAt = Number(localStorage.getItem(CLOUD_BASE_KEY)) || null;

function setCloudBase(updatedAt) {
  cloudBaseUpdatedAt = Number(updatedAt) || null;
  if (cloudBaseUpdatedAt) localStorage.setItem(CLOUD_BASE_KEY, String(cloudBaseUpdatedAt));
  else localStorage.removeItem(CLOUD_BASE_KEY);
}

function hasPendingChanges() {
  return pendingOps.length > 0 || localStorage.getItem(PENDING_SYNC_KEY) === 'true';
}

function nowTimeLabel() {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function setSaveButtonsDisabled(disabled) {
  ['btnLaunchProd', 'btnSaveGoal', 'btnSaveWeeks', 'btnSaveScrap'].forEach(id => {
    const b = document.getElementById(id);
    if (b) b.disabled = disabled;
  });
}

// Aplica a operação no `state` global (uma única vez por estado).
function runOp(op) {
  if (!Array.isArray(state.appliedOpIds)) state.appliedOpIds = [];
  if (state.appliedOpIds.includes(op.id)) return;
  const result = op.apply();
  if (result) op.lastLog = result;
  state.appliedOpIds.push(op.id);
  if (state.appliedOpIds.length > MAX_APPLIED_OP_IDS) {
    state.appliedOpIds = state.appliedOpIds.slice(-MAX_APPLIED_OP_IDS);
  }
}

// Ponto único de gravação: todos os lançamentos/exclusões passam por aqui.
// `apply` deve alterar o `state` global e pode devolver um log para a planilha.
async function commitChange(apply) {
  const op = {
    id: 'op_' + Date.now() + '_' + Math.floor(Math.random() * 100000),
    apply,
    lastLog: null
  };
  runOp(op);
  pendingOps.push(op);
  localStorage.setItem(PENDING_SYNC_KEY, 'true');
  lastLocalSaveTime = Date.now();
  saveLocalCache();
  syncFilterInputs();
  renderAll();
  await flushPendingChanges();
  return !hasPendingChanges();
}

// GET no Apps Script com parâmetros extras (JSONP, e fetch como reserva).
async function cloudGet(params = {}) {
  const base = getActiveCloudUrl();
  const query = Object.keys(params)
    .filter(k => params[k] !== undefined && params[k] !== null)
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join('&');
  const url = query ? `${base}${base.includes('?') ? '&' : '?'}${query}` : base;
  try {
    return await fetchCloudJSONP(url);
  } catch (errJsonp) {
    const sep = url.includes('?') ? '&' : '?';
    const res = await fetch(`${url}${sep}t=${Date.now()}`, {
      method: 'GET',
      redirect: 'follow',
      cache: 'no-store'
    });
    return await res.json();
  }
}

// Lê o banco da nuvem. Com `saveId`, a nuvem também informa se recusou essa gravação.
// Com sessão ativa, envia o token para a nuvem dizer se a sessão ainda vale.
async function readCloudData(saveId = null) {
  const params = {};
  if (saveId) params.saveId = saveId;
  if (sessionToken()) params.token = sessionToken();
  const data = await cloudGet(params);
  if (data && data.years && sessionToken()) applyCloudSession(data.session);
  return data;
}

const REJECTION_MESSAGES = {
  auth: 'Sua sessão terminou (expirou, a senha foi redefinida ou o usuário foi desativado).',
  mustChange: 'Você precisa criar sua senha definitiva antes de lançar.',
  forbidden: 'Seu perfil não permite gravar dados.',
  pin: 'O Apps Script na nuvem ainda é a versão antiga (com PIN).',
  locked: 'O Apps Script na nuvem ainda é a versão antiga (com PIN).'
};

async function flushPendingChanges() {
  if (isSavingToCloud) {
    flushRequested = true;
    return;
  }
  if (!hasPendingChanges()) return;

  if (!navigator.onLine) {
    updateCloudBadge('Salvo só neste PC (aguardando internet)', false);
    return;
  }

  if (!canEdit()) {
    updateCloudBadge('Alterações pendentes neste PC — clique em "Entrar" para enviar', false);
    return;
  }

  isSavingToCloud = true;
  setSaveButtonsDisabled(true);
  try {
    let result = 'retry';
    for (let attempt = 1; attempt <= 3 && result === 'retry'; attempt++) {
      updateCloudBadge(
        attempt === 1 ? 'Gravando para todos os PCs...' : `Outro PC salvou junto — reaplicando (${attempt}/3)...`,
        true
      );
      result = await tryPushOnce();
    }
    if (result === 'retry') {
      updateCloudBadge('NÃO salvo na nuvem — nova tentativa automática em instantes', false);
    } else if (result && result.rejected) {
      const why = REJECTION_MESSAGES[result.rejected] || 'A nuvem recusou a gravação.';
      if (result.rejected === 'auth' || result.rejected === 'forbidden') setSession(null);
      updateCloudBadge('NÃO salvo na nuvem — entre de novo para enviar', false);
      uiAlert(`${why}\n\nSeus lançamentos estão guardados neste PC. Entre com seu usuário e eles serão enviados.`, 'Gravação recusada');
    }
  } finally {
    isSavingToCloud = false;
    setSaveButtonsDisabled(false);
  }

  if (flushRequested) {
    flushRequested = false;
    await flushPendingChanges();
  }
}

// Retorna 'ok' (confirmado), 'retry' (tentar de novo), { rejected: motivo }
// (login recusado) ou 'done' (nada mais a enviar).
async function tryPushOnce() {
  const sentOps = pendingOps.slice();
  const newUpdatedAt = Math.max(Date.now(), (cloudBaseUpdatedAt || 0) + 1);
  const saveId = 'save_' + newUpdatedAt + '_' + Math.random().toString(36).slice(2, 10);
  state.updatedAt = newUpdatedAt;
  state.saveId = saveId;
  lastLocalSaveTime = Date.now();
  saveLocalCache();

  const payloadStr = JSON.stringify({
    state,
    token: sessionToken(),
    baseUpdatedAt: cloudBaseUpdatedAt,
    lastLogs: sentOps.map(o => o.lastLog).filter(Boolean)
  });

  try {
    await fetch(getActiveCloudUrl(), {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: payloadStr
    });
  } catch (err) {
    // Falha de rede: a leitura abaixo decide o que fazer.
  }

  let cloud;
  try {
    cloud = await readCloudData(saveId);
  } catch (err) {
    return 'retry';
  }
  if (!cloud || cloud.status === 'error') return 'retry';
  if (cloud.rejection) return { rejected: cloud.rejection };

  if (Number(cloud.updatedAt) === newUpdatedAt && cloud.saveId === saveId) {
    setCloudBase(newUpdatedAt);
    pendingOps = pendingOps.filter(o => !sentOps.includes(o));
    if (pendingOps.length === 0) localStorage.removeItem(PENDING_SYNC_KEY);
    updateCloudBadge(`Salvo e confirmado na nuvem (${nowTimeLabel()})`, true);
    return 'ok';
  }

  if (!cloud.years) return 'retry';

  // A nuvem está numa versão diferente: outro PC salvou ou nossa gravação falhou.
  return rebaseOntoCloud(cloud);
}

function rebaseOntoCloud(cloud) {
  const ops = pendingOps.slice();

  if (ops.length === 0) {
    // Alterações offline de uma sessão anterior (página recarregada):
    // não dá para reaplicar com segurança. Guarda backup e adota a nuvem.
    const backup = JSON.stringify(state);
    try { localStorage.setItem(CONFLICT_BACKUP_KEY, backup); } catch (e) {}
    downloadJsonFile(backup, `Backup_Conflito_Grande_Aco_${Date.now()}.json`);
    state = upgradeDatabaseStructure(cloud, null);
    setCloudBase(cloud.updatedAt);
    localStorage.removeItem(PENDING_SYNC_KEY);
    saveLocalCache();
    syncFilterInputs();
    renderAll();
    updateCloudBadge('Conflito: dados da nuvem carregados (backup baixado)', false);
    uiAlert('Este PC tinha alterações feitas sem internet, mas outro PC salvou dados mais novos na nuvem.\n\nPara não apagar o trabalho do outro PC, foram carregados os dados da nuvem.\nAs alterações deste PC foram salvas em um arquivo de backup (pasta Downloads). Confira e relance o que faltar.');
    return 'done';
  }

  state = upgradeDatabaseStructure(cloud, null);
  setCloudBase(cloud.updatedAt);
  ops.forEach(runOp);
  saveLocalCache();
  syncFilterInputs();
  renderAll();
  return 'retry';
}

async function syncFromCloud(forceRender = false) {
  if (isSavingToCloud) return;

  if (!forceRender && (Date.now() - lastLocalSaveTime < 6000)) {
    return;
  }

  if (!navigator.onLine) {
    updateCloudBadge('Modo Offline Ativo (Cache Local)', false);
    return;
  }

  if (hasPendingChanges()) {
    await flushPendingChanges();
    // Ainda há alterações não confirmadas: não sobrescreve o estado local.
    if (hasPendingChanges()) return;
  }

  if (forceRender) updateCloudBadge('Sincronizando com a nuvem...', true);

  let cloudData = null;
  try {
    cloudData = await readCloudData();
  } catch (err) {
    updateCloudBadge('Verifique a conexão ou o Apps Script', false);
    return;
  }

  // Um lançamento pode ter começado enquanto a leitura acontecia.
  if (isSavingToCloud || hasPendingChanges()) return;

  if (cloudData && cloudData.status === 'error') {
    updateCloudBadge('Erro no Apps Script: ' + (cloudData.message || ''), false);
    return;
  }

  if (cloudData && cloudData.years) {
    const hasChanged = forceRender || (cloudData.updatedAt !== state.updatedAt);
    state = upgradeDatabaseStructure(cloudData, state);
    setCloudBase(cloudData.updatedAt);
    saveLocalCache();

    if (hasChanged) {
      syncFilterInputs();
      renderAll();
    }

    updateCloudBadge(`Nuvem Sincronizada (${nowTimeLabel()})`, true);
  } else if (cloudData && cloudData.empty) {
    setCloudBase(null);
    localStorage.setItem(PENDING_SYNC_KEY, 'true');
    await flushPendingChanges();
  }
}

function ensureYearExists(year) {
  if (!state.years[year]) {
    state.years[year] = createEmptyYearData();
  }
}

function getActiveYearMonths() {
  ensureYearExists(viewFilter.activeYear);
  return state.years[viewFilter.activeYear];
}

function getActiveMonthObj() {
  return getActiveYearMonths()[viewFilter.activeMonthIndex];
}

function formatValue(valKg, decimals = 0) {
  if (viewFilter.unit === 't') {
    return (valKg / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' t';
  }
  return valKg.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + ' kg';
}

function formatDateBR(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

function onGlobalDateChange(val) {
  if (!val) return;
  const [y, m] = val.split('-').map(Number);
  viewFilter.selectedDate = val;
  viewFilter.activeYear = y;
  viewFilter.activeMonthIndex = m - 1;
  ensureYearExists(y);
  syncFilterInputs();
  renderAll();
}

function syncDateFromLaunch(val) {
  if (!val) return;
  document.getElementById('inputWeekSelect').value = getWeekIndexFromDateStr(val);
  onGlobalDateChange(val);
}

function changeActiveMonth(mIdx) {
  viewFilter.activeMonthIndex = parseInt(mIdx, 10);
  const day = viewFilter.selectedDate ? viewFilter.selectedDate.split('-')[2] : '01';
  const mm = String(viewFilter.activeMonthIndex + 1).padStart(2, '0');
  viewFilter.selectedDate = `${viewFilter.activeYear}-${mm}-${day}`;
  syncFilterInputs();
  renderAll();
}

function changeActiveYear(yVal) {
  const yr = parseInt(yVal, 10) || new Date().getFullYear();
  viewFilter.activeYear = yr;
  ensureYearExists(yr);
  const day = viewFilter.selectedDate ? viewFilter.selectedDate.split('-')[2] : '01';
  const mm = String(viewFilter.activeMonthIndex + 1).padStart(2, '0');
  viewFilter.selectedDate = `${viewFilter.activeYear}-${mm}-${day}`;
  syncFilterInputs();
  renderAll();
}

function stepYear(delta) {
  changeActiveYear(viewFilter.activeYear + delta);
}

function onGoalPeriodSelectChange() {
  const yr = parseInt(document.getElementById('goalYearInput').value, 10) || viewFilter.activeYear;
  const mIdx = parseInt(document.getElementById('goalMonthSelect').value, 10);
  ensureYearExists(yr);
  document.getElementById('inputGoalKg').value = state.years[yr][mIdx].goalKg;
  onBacklogGaugeSelectChange();
}

function onBacklogGaugeSelectChange() {
  const yr = parseInt(document.getElementById('goalYearInput').value, 10) || viewFilter.activeYear;
  const mIdx = parseInt(document.getElementById('goalMonthSelect').value, 10);
  const g = document.getElementById('backlogGaugeSelect').value;
  ensureYearExists(yr);
  const mObj = state.years[yr][mIdx];
  if (!mObj.backlog) mObj.backlog = createEmptyBacklogMap(0);
  const currentVal = Number(mObj.backlog[g] || 0);
  document.getElementById('currentBacklogGaugeLabel').textContent = g;
  document.getElementById('currentBacklogValueDisplay').textContent = formatValue(currentVal, 2);
}

function onDirectWeekPeriodChange() {
  const yr = parseInt(document.getElementById('directWeekYearInput').value, 10) || viewFilter.activeYear;
  const mIdx = parseInt(document.getElementById('directWeekMonthSelect').value, 10);
  ensureYearExists(yr);
  const wks = state.years[yr][mIdx].weeks || [0, 0, 0, 0, 0];
  document.getElementById('w1Input').value = wks[0] || 0;
  document.getElementById('w2Input').value = wks[1] || 0;
  document.getElementById('w3Input').value = wks[2] || 0;
  document.getElementById('w4Input').value = wks[3] || 0;
  document.getElementById('w5Input').value = wks[4] || 0;
}

function syncFilterInputs() {
  document.getElementById('globalDatePicker').value = viewFilter.selectedDate;
  document.getElementById('launchDateInput').value = viewFilter.selectedDate;
  document.getElementById('scrapDateInput').value = viewFilter.selectedDate;
  document.getElementById('inputWeekSelect').value = getWeekIndexFromDateStr(viewFilter.selectedDate);
  document.getElementById('monthSelect').value = viewFilter.activeMonthIndex;
  document.getElementById('goalMonthSelect').value = viewFilter.activeMonthIndex;
  document.getElementById('directWeekMonthSelect').value = viewFilter.activeMonthIndex;
  document.getElementById('yearInput').value = viewFilter.activeYear;
  document.getElementById('goalYearInput').value = viewFilter.activeYear;
  document.getElementById('directWeekYearInput').value = viewFilter.activeYear;

  const mObj = getActiveMonthObj();
  document.getElementById('inputGoalKg').value = mObj.goalKg;
  onDirectWeekPeriodChange();
  onBacklogGaugeSelectChange();
}

function switchTab(tabId, btn) {
  document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  btn.classList.add('active');
}

function toggleUnit(u) {
  viewFilter.unit = u;
  renderAll();
}

function onScrapCalcModeChange() {
  const mode = document.getElementById('scrapCalcModeSelect').value;
  const unitRow = document.getElementById('scrapUnitPriceRow');
  const totalRow = document.getElementById('scrapTotalValueRow');
  if (mode === 'unit') {
    unitRow.style.display = 'flex';
    totalRow.style.display = 'none';
  } else {
    unitRow.style.display = 'none';
    totalRow.style.display = 'flex';
  }
  updateScrapLiveCalculation();
}

function getCalculatedScrapValues() {
  const mode = document.getElementById('scrapCalcModeSelect').value;
  const weightKg = parseFloat(document.getElementById('scrapWeightKgInput').value) || 0;
  let unitPriceBrl = parseFloat(document.getElementById('scrapUnitPriceBrlInput').value) || 0;
  let totalValueBrl = parseFloat(document.getElementById('scrapTotalValueBrlInput').value) || 0;

  if (mode === 'unit') {
    totalValueBrl = +(weightKg * unitPriceBrl).toFixed(2);
  } else {
    unitPriceBrl = weightKg > 0 ? +(totalValueBrl / weightKg).toFixed(4) : 0;
  }

  return { weightKg, unitPriceBrl, totalValueBrl };
}

function updateScrapLiveCalculation() {
  const { weightKg, unitPriceBrl, totalValueBrl } = getCalculatedScrapValues();
  document.getElementById('previewScrapKg').textContent = weightKg.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 3 }) + ' kg';
  document.getElementById('previewScrapUnitBrl').textContent = formatCurrencyBRL(unitPriceBrl) + ' /kg';
  document.getElementById('previewScrapTotalBrl').textContent = formatCurrencyBRL(totalValueBrl);
}

async function handleLaunchScrap() {
  if (!(await requireEditAuth())) return;

  const scrapDate = document.getElementById('scrapDateInput').value || viewFilter.selectedDate;
  const [yr, mo] = scrapDate.split('-').map(Number);
  const mIdx = mo - 1;

  const type = document.getElementById('scrapTypeSelect').value;
  const machine = document.getElementById('scrapMachineSelect').value;
  const gauge = document.getElementById('scrapGaugeSelect').value;
  const notes = (document.getElementById('scrapNotesInput').value || '').trim();

  const { weightKg, unitPriceBrl, totalValueBrl } = getCalculatedScrapValues();

  if (weightKg <= 0) return uiAlert('Informe um peso de sucata maior que zero (em kg).');
  if (totalValueBrl < 0 || unitPriceBrl < 0) return uiAlert('Informe um valor financeiro válido (R$).');

  // ---- Conferências (item 14) ----
  if (isFutureDate(scrapDate)) {
    return uiAlert(`A data da pesagem (${formatDateBR(scrapDate)}) está no futuro. Confira a data.`, 'Data inválida');
  }
  const warnings = [];
  if (weightKg > SCRAP_WEIGHT_WARN_KG) warnings.push(`• Peso de ${formatValue(weightKg, 2)} (acima de ${formatValue(SCRAP_WEIGHT_WARN_KG, 0)})`);
  if (unitPriceBrl > SCRAP_PRICE_WARN_BRL) warnings.push(`• Preço de ${formatCurrencyBRL(unitPriceBrl)}/kg (acima de ${formatCurrencyBRL(SCRAP_PRICE_WARN_BRL)}/kg)`);
  if (warnings.length > 0) {
    const okScrap = await uiConfirm(
      `Valores fora do normal neste lote de sucata:\n\n${warnings.join('\n')}\n\nConfira se não houve erro de digitação.`,
      { title: 'Confira os valores', okText: 'Os valores estão certos', cancelText: 'Corrigir' }
    );
    if (!okScrap) return;
  }

  viewFilter.activeYear = yr;
  viewFilter.activeMonthIndex = mIdx;
  viewFilter.selectedDate = scrapDate;

  const newScrap = {
    id: 'scrap_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
    date: scrapDate,
    time: nowTimeLabel(),
    year: yr,
    monthIndex: mIdx,
    type,
    machine,
    gauge,
    weightKg: +weightKg.toFixed(3),
    unitPriceBrl: +unitPriceBrl.toFixed(4),
    totalValueBrl: +totalValueBrl.toFixed(2),
    notes,
    user: currentUser() ? currentUser().username : '',
    userName: currentUser() ? currentUser().name : ''
  };

  document.getElementById('scrapWeightKgInput').value = '';
  document.getElementById('scrapTotalValueBrlInput').value = '';
  document.getElementById('scrapNotesInput').value = '';
  updateScrapLiveCalculation();

  await commitChange(() => {
    ensureYearExists(yr);
    const monthObj = state.years[yr][mIdx];
    if (!Array.isArray(monthObj.scrapLogs)) monthObj.scrapLogs = [];
    if (!monthObj.scrapLogs.some(s => s.id === newScrap.id)) {
      monthObj.scrapLogs.push({ ...newScrap });
    }
    return {
      id: newScrap.id,
      date: newScrap.date,
      year: yr,
      monthIndex: mIdx,
      monthName: MONTH_NAMES[mIdx],
      machine: newScrap.machine,
      category: 'Sucata (' + newScrap.type + ')',
      gauge: newScrap.gauge,
      mode: '+ Sucata (' + formatCurrencyBRL(newScrap.totalValueBrl) + ')',
      kg: newScrap.weightKg
    };
  });
}

async function deleteScrapLogById(yr, mIdx, scrapId) {
  if (!(await requireEditAuth())) return;
  yr = Number(yr);
  mIdx = Number(mIdx);
  ensureYearExists(yr);
  const monthObj = state.years[yr][mIdx];
  if (!monthObj || !Array.isArray(monthObj.scrapLogs)) return;

  const target = monthObj.scrapLogs.find(s => s.id === scrapId);
  if (!target) return;

  if (!(await uiConfirm(
    `Deseja excluir o lançamento de sucata de ${formatValue(target.weightKg, 2)} (${formatCurrencyBRL(target.totalValueBrl)})?`,
    { title: 'Excluir sucata', okText: 'Excluir', danger: true }
  ))) {
    return;
  }

  await commitChange(() => {
    ensureYearExists(yr);
    const mObj = state.years[yr][mIdx];
    if (!Array.isArray(mObj.deletedScrapIds)) mObj.deletedScrapIds = [];
    if (!mObj.deletedScrapIds.includes(scrapId)) mObj.deletedScrapIds.push(scrapId);
    mObj.scrapLogs = (mObj.scrapLogs || []).filter(s => s.id !== scrapId);
  });
}

async function clearAllScrapLogs() {
  if (!(await requireAdminAuth())) return;
  const yr = viewFilter.activeYear;
  const mIdx = viewFilter.activeMonthIndex;
  const m = getActiveMonthObj();
  if (!(await uiConfirm(
    `Deseja limpar TODOS os lançamentos de sucata de ${m.name}/${yr}?`,
    { title: 'Limpar sucata do mês', okText: 'Limpar tudo', danger: true }
  ))) return;

  await commitChange(() => {
    ensureYearExists(yr);
    const mObj = state.years[yr][mIdx];
    if (!Array.isArray(mObj.deletedScrapIds)) mObj.deletedScrapIds = [];
    (mObj.scrapLogs || []).forEach(s => {
      if (!mObj.deletedScrapIds.includes(s.id)) mObj.deletedScrapIds.push(s.id);
    });
    mObj.scrapLogs = [];
  });
}

function renderKPIsAndStatus() {
  const months = getActiveYearMonths();
  const m = getActiveMonthObj();
  const pctMonth = m.goalKg > 0 ? (m.producedKg / m.goalKg) * 100 : 0;

  const oeeCard = document.getElementById('kpiCardOee');
  if (pctMonth >= 100 && m.goalKg > 0) {
    oeeCard.classList.add('goal-achieved');
    triggerGoalConfettiOnce(`${viewFilter.activeYear}_${viewFilter.activeMonthIndex}`);
  } else {
    oeeCard.classList.remove('goal-achieved');
  }

  const totalProd = months.reduce((acc, cur) => acc + cur.producedKg, 0);
  const totalGoal = months.reduce((acc, cur) => acc + cur.goalKg, 0);
  const pctYear = totalGoal > 0 ? (totalProd / totalGoal) * 100 : 0;

  // Projeção e ritmo em DIAS ÚTEIS (ver WORK_WEEKDAYS / WORK_HOURS_PER_DAY).
  const now = new Date();
  const isCurrentMonthAndYear = (now.getFullYear() === viewFilter.activeYear && now.getMonth() === viewFilter.activeMonthIndex);
  const isPastMonth = (viewFilter.activeYear < now.getFullYear()) || (viewFilter.activeYear === now.getFullYear() && viewFilter.activeMonthIndex < now.getMonth());
  const workdaysInMonth = Math.max(1, countWorkdays(viewFilter.activeYear, viewFilter.activeMonthIndex));
  // Dias úteis já trabalhados (inclui hoje, se hoje for dia útil).
  const elapsedWorkdays = isCurrentMonthAndYear
    ? Math.max(1, countWorkdays(viewFilter.activeYear, viewFilter.activeMonthIndex, 1, now.getDate()))
    : workdaysInMonth;
  const dailyRateKg = m.producedKg / elapsedWorkdays;
  const projectedMonthKg = isCurrentMonthAndYear ? (dailyRateKg * workdaysInMonth) : m.producedKg;
  const remainingWorkdays = Math.max(1, workdaysInMonth - elapsedWorkdays);
  const neededPerDayKg = Math.max(0, (m.goalKg - m.producedKg) / remainingWorkdays);

  if (!m.downtimeHours) m.downtimeHours = createEmptyDowntimeMap();
  const totalDownHours = Object.values(m.downtimeHours).reduce((a, b) => a + Number(b || 0), 0);
  // Horas programadas por máquina: no mês atual, só os dias úteis já decorridos.
  const plannedHoursPerMachine = elapsedWorkdays * WORK_HOURS_PER_DAY;
  const machineCount = Math.max(1, Object.keys(MACHINE_CATALOG).length);
  const plannedPoolHours = machineCount * plannedHoursPerMachine;
  const uptimePct = Math.max(0, Math.min(100, ((plannedPoolHours - totalDownHours) / plannedPoolHours) * 100));

  const weeks = m.weeks || [0, 0, 0, 0, 0];
  let bestWIdx = 0;
  weeks.forEach((val, idx) => {
    if (val > weeks[bestWIdx]) bestWIdx = idx;
  });

  document.getElementById('bannerPeriodText').textContent = `${m.name} / ${viewFilter.activeYear}`;
  document.getElementById('bannerDateText').textContent = `(Data: ${formatDateBR(viewFilter.selectedDate)})`;

  document.getElementById('kpiAttainment').textContent = pctMonth.toFixed(1).replace('.', ',') + '%';
  document.getElementById('kpiMonthSub').textContent = `${m.name} / ${viewFilter.activeYear}`;
  document.getElementById('kpiMonthProd').textContent = formatValue(m.producedKg, 0);
  document.getElementById('kpiMonthGoal').textContent = m.goalKg > 0 ? `da meta de ${formatValue(m.goalKg, 0)}` : 'sem meta definida';
  document.getElementById('bitolaBoardPeriod').textContent = `${m.name}/${viewFilter.activeYear}`;

  // Régua da meta: realizado + marca do "esperado até hoje" (só no mês corrente).
  const expectedPct = isCurrentMonthAndYear ? Math.min(100, (elapsedWorkdays / workdaysInMonth) * 100) : null;
  document.getElementById('kpiGoalFill').style.width = Math.min(100, pctMonth) + '%';
  const markEl = document.getElementById('kpiGoalMark');
  markEl.hidden = expectedPct === null || m.goalKg <= 0;
  if (expectedPct !== null) markEl.style.left = expectedPct + '%';
  document.getElementById('kpiGoalRule').setAttribute('aria-label',
    `Realizado ${pctMonth.toFixed(1).replace('.', ',')}% da meta` + (expectedPct !== null ? `; esperado até hoje ${expectedPct.toFixed(1).replace('.', ',')}%` : ''));
  const legendEl = document.getElementById('kpiGoalLegend');
  if (expectedPct !== null && m.goalKg > 0) {
    const behind = pctMonth < expectedPct;
    legendEl.innerHTML = `<span class="legend-mark"></span> Esperado até hoje: ${expectedPct.toFixed(1).replace('.', ',')}% ` +
      `<span class="${behind ? 'legend-warn' : 'legend-ok'}">${behind ? '· abaixo do ritmo' : '· no ritmo'}</span>`;
  } else {
    legendEl.textContent = isPastMonth ? 'Mês encerrado' : '';
  }
  renderGaugeTags(m);

  document.getElementById('kpiForecastVal').textContent = formatValue(projectedMonthKg, 0);
  if (isCurrentMonthAndYear) {
    document.getElementById('kpiForecastSub').textContent = m.producedKg < m.goalKg
      ? `Ritmo: ${formatValue(dailyRateKg, 0)}/dia útil • Falta ${formatValue(neededPerDayKg, 0)}/dia (${remainingWorkdays} dias úteis)`
      : `Ritmo: ${formatValue(dailyRateKg, 0)}/dia útil • Meta Atingida`;
  } else if (isPastMonth) {
    document.getElementById('kpiForecastSub').textContent = `Fechamento Final • Média: ${formatValue(dailyRateKg, 0)}/dia útil (${workdaysInMonth} dias úteis)`;
  } else {
    document.getElementById('kpiForecastSub').textContent = `Período Futuro • Meta: ${formatValue(m.goalKg, 0)}`;
  }

  document.getElementById('kpiUptimeVal').textContent = uptimePct.toFixed(1).replace('.', ',') + '%';
  document.getElementById('kpiDowntimeSub').textContent = `${totalDownHours.toFixed(1).replace('.', ',')} h paradas de ${plannedPoolHours.toLocaleString('pt-BR')} h programadas`;

  document.getElementById('kpiYearLabel').textContent = viewFilter.activeYear;
  document.getElementById('kpiTotalProd').textContent = formatValue(totalProd, 0);
  document.getElementById('kpiTotalGoal').textContent = `${pctYear.toFixed(1).replace('.', ',')}% da previsão anual de ${formatValue(totalGoal, 0)}`;

  document.getElementById('chartYearTitle').textContent = viewFilter.activeYear;
  document.getElementById('overviewWeekTitle').textContent = `${m.name}/${viewFilter.activeYear}`;
  document.getElementById('statusMonthTitle').textContent = `${m.name}/${viewFilter.activeYear}`;
  document.getElementById('machChartPeriod').textContent = `${m.name}/${viewFilter.activeYear}`;
  document.getElementById('gaugeOnlyChartPeriod').textContent = `${m.name}/${viewFilter.activeYear}`;
  document.getElementById('weeklyCompareYearTitle').textContent = viewFilter.activeYear;
  document.getElementById('scrapChartMonthTitle').textContent = `${m.name}/${viewFilter.activeYear}`;
  document.getElementById('scrapChartYearTitle').textContent = viewFilter.activeYear;


  const monthScrap = getMonthScrapList(viewFilter.activeYear, viewFilter.activeMonthIndex);
  const yearScrap = getYearScrapList(viewFilter.activeYear);

  const monthScrapKg = monthScrap.reduce((a, b) => a + Number(b.weightKg || 0), 0);
  const monthScrapBrl = monthScrap.reduce((a, b) => a + Number(b.totalValueBrl || 0), 0);
  const yearScrapKg = yearScrap.reduce((a, b) => a + Number(b.weightKg || 0), 0);
  const yearScrapBrl = yearScrap.reduce((a, b) => a + Number(b.totalValueBrl || 0), 0);

  const avgPriceKg = monthScrapKg > 0 ? (monthScrapBrl / monthScrapKg) : (yearScrapKg > 0 ? yearScrapBrl / yearScrapKg : 0);
  const scrapRatePct = m.producedKg > 0 ? (monthScrapKg / m.producedKg) * 100 : 0;

  document.getElementById('kpiScrapMonthKg').textContent = formatValue(monthScrapKg, 2);
  document.getElementById('kpiScrapMonthSub').textContent = `Referência: ${m.name} / ${viewFilter.activeYear} (${monthScrap.length} lotes)`;
  document.getElementById('kpiScrapMonthBrl').textContent = formatCurrencyBRL(monthScrapBrl);
  document.getElementById('kpiScrapYearBrlSub').textContent = `Acumulado no Ano (${viewFilter.activeYear}): ${formatCurrencyBRL(yearScrapBrl)}`;
  document.getElementById('kpiScrapAvgPrice').textContent = `${formatCurrencyBRL(avgPriceKg)} /kg`;
  document.getElementById('kpiScrapYearKgSub').textContent = `Peso Acumulado no Ano: ${formatValue(yearScrapKg, 2)}`;
  document.getElementById('kpiScrapRatePct').textContent = scrapRatePct.toFixed(2).replace('.', ',') + '%';

  const sumWeeks = weeks.reduce((a, b) => a + b, 0);
  const visibleWeeks = weeks[4] > 0 ? weeks : weeks.slice(0, 4);
  const weeklyCardsEl = document.getElementById('weeklyKpiCards');
  weeklyCardsEl.innerHTML = visibleWeeks.map((wVal, idx) => {
    const sharePct = sumWeeks > 0 ? ((wVal / sumWeeks) * 100).toFixed(1).replace('.', ',') : '0,0';
    const isBest = idx === bestWIdx && wVal > 0;
    return `
      <div class="kpi-card ${isBest ? 'featured' : ''}">
        <div class="kpi-label">SEMANA ${idx + 1} (${m.name})</div>
        <div class="kpi-value">${formatValue(wVal, 2)}</div>
        <div class="kpi-sub">Participação no mês: ${sharePct}%</div>
      </div>
    `;
  }).join('');

  const machinesOrder = Object.keys(MACHINE_CATALOG).map(name => ({ name, type: MACHINE_CATALOG[name] }));

  const maxMachTotal = Math.max(...machinesOrder.map(mo =>
    m.items.filter(i => i.machine === mo.name).reduce((a, b) => a + b.kg, 0)
  ), 1);

  const listEl = document.getElementById('machineStatusList');
  listEl.innerHTML = machinesOrder.map(mo => {
    const sumKg = m.items.filter(i => i.machine === mo.name).reduce((a, b) => a + b.kg, 0);
    const widthPct = Math.min(100, (sumKg / maxMachTotal) * 100);
    const downH = Number((m.downtimeHours && m.downtimeHours[mo.name]) || 0);
    const machUptime = Math.max(0, Math.min(100, ((plannedHoursPerMachine - downH) / plannedHoursPerMachine) * 100)).toFixed(1).replace('.', ',');
    const tagClass = downH > WORK_HOURS_PER_DAY ? 'uptime-warn' : 'uptime-ok';

    return `
      <div class="status-item">
        <div class="status-name">
          ${mo.name}
          <small>${mo.type}</small>
          <span class="uptime-tag ${tagClass}">Disponível ${machUptime}% · ${downH.toFixed(1).replace('.', ',')} h</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width: ${widthPct}%"></div>
        </div>
        <div class="status-val">${formatValue(sumKg, 0)}</div>
      </div>
    `;
  }).join('');
}

// Etiquetas por bitola (Visão Geral): produzido no mês e quanto da carteira já foi atendido.
function renderGaugeTags(m) {
  const grid = document.getElementById('gaugeTagGrid');
  if (!grid) return;
  const backlog = m.backlog || {};
  grid.innerHTML = ALL_GAUGES.map(g => {
    const items = (m.items || []).filter(i => i.gauge === g);
    const produced = items.reduce((a, b) => a + Number(b.kg || 0), 0);
    const machines = [...new Set(items.map(i => i.machine))].join(' / ') || '—';
    const remaining = Math.max(0, Number(backlog[g] || 0));
    const total = produced + remaining;
    const servedPct = total > 0 ? Math.round((produced / total) * 100) : 0;
    let state = 'idle', stateText = 'Sem pedido';
    if (remaining > 0 && produced === 0) { state = 'warn'; stateText = 'Não iniciada'; }
    else if (remaining > 0) { state = 'pend'; stateText = `${servedPct}% atendido`; }
    else if (produced > 0) { state = 'ok'; stateText = 'Carteira zerada'; }
    const label = `${g}: produzido ${formatValue(produced, 0)}, carteira restante ${formatValue(remaining, 0)}`;
    return `
      <article class="bitola-tag is-${state}" aria-label="${escapeHtml(label)}">
        <header class="bitola-band"><span>${escapeHtml(g)}</span><span>${escapeHtml(machines)}</span></header>
        <div class="bitola-body">
          <div class="bitola-kg">${formatValue(produced, 0)}</div>
          <div class="bitola-sub">produzido no mês</div>
          <div class="bitola-cart"><span>Carteira</span><strong>${formatValue(remaining, 0)}</strong></div>
          <div class="bitola-meter" aria-hidden="true"><i style="width:${total > 0 ? servedPct : 0}%"></i></div>
          <div class="bitola-state">${stateText}</div>
        </div>
      </article>`;
  }).join('');
}

function renderTables() {
  const months = getActiveYearMonths();
  const m = getActiveMonthObj();
  if (!m.backlog) m.backlog = createEmptyBacklogMap(0);
  const tbody = document.getElementById('machinesTableBody');
  const isBaseTemplateItem = (item) => BASE_ITEMS_TEMPLATE.some(b => b.machine === item.machine && b.gauge === item.gauge);

  const sumMachItems = m.items.reduce((a, b) => a + b.kg, 0);
  const sumWeeks = (m.weeks || []).reduce((a, b) => a + b, 0);
  const diffReconcile = Math.abs(sumWeeks - sumMachItems);
  const recBanner = document.getElementById('reconcileBanner');
  if (m.weeksManual && diffReconcile > 0.05) {
    recBanner.innerHTML = `Fechamento semanal MANUAL: Semanas <strong>${formatValue(sumWeeks, 2)}</strong> (total oficial) vs Máquinas <strong>${formatValue(sumMachItems, 2)}</strong> <button class="btn-outline" style="margin-left:8px;" onclick="forceSyncWeeksWithMachines()" title="Descarta o fechamento manual e usa o total apontado por máquina">Usar total das máquinas</button>`;
  } else if (diffReconcile > 0.05) {
    recBanner.innerHTML = `Diferença detectada: Máquinas <strong>${formatValue(sumMachItems, 2)}</strong> vs Semanas <strong>${formatValue(sumWeeks, 2)}</strong> <button class="btn-outline" style="margin-left:8px;" onclick="forceSyncWeeksWithMachines()">Sincronizar Agora</button>`;
  } else {
    recBanner.innerHTML = `100% Conciliado: Máquinas, Semanas e Total = <strong>${formatValue(sumMachItems, 2)}</strong>`;
  }

  tbody.innerHTML = m.items.map((item, idx) => {
    const machineTotal = m.items
      .filter(i => i.machine === item.machine)
      .reduce((acc, cur) => acc + cur.kg, 0);
    const gaugeTotal = m.items
      .filter(i => i.gauge === item.gauge)
      .reduce((acc, cur) => acc + cur.kg, 0);

    const remainingCarteiraKg = Number(m.backlog[item.gauge] || 0);
    const backlogHtml = (remainingCarteiraKg <= 0 && gaugeTotal === 0)
      ? `<span style="color: var(--stone);">Sem Carteira</span>`
      : (remainingCarteiraKg <= 0
          ? `<span class="badge-backlog-ok">Carteira Concluída</span>`
          : `<span class="badge-backlog-pend">Falta ${formatValue(remainingCarteiraKg, 2)}</span>`);

    const isZero = item.kg === 0 && remainingCarteiraKg === 0;
    const badgeClass = item.category === 'Estribadeira' ? 'badge-estrib' : 'badge-dobra';
    const isExtraRow = !isBaseTemplateItem(item);

    return `
      <tr class="${isZero ? 'zero-row' : ''}">
        <td><strong>${escapeHtml(item.machine)}</strong></td>
        <td><span class="badge-type ${badgeClass}">${escapeHtml(item.category)}</span></td>
        <td><strong>${escapeHtml(item.gauge)}</strong></td>
        <td>${formatValue(item.kg, 3)}</td>
        <td style="color: var(--stone);">${formatValue(machineTotal, 2)}</td>
        <td style="font-weight: 600;">${formatValue(gaugeTotal, 3)}</td>
        <td style="font-weight: 600;">${formatValue(remainingCarteiraKg, 2)}</td>
        <td>${backlogHtml}</td>
        <td>
          <button class="btn-delete" onclick="removeOrZeroMachineRow(${idx})" title="${isExtraRow ? 'Excluir linha' : 'Zerar peso'}">
            ${isExtraRow ? 'Excluir' : 'Zerar'}
          </button>
        </td>
      </tr>
    `;
  }).join('');

  const weeklyBody = document.getElementById('weeklySummaryTableBody');
  weeklyBody.innerHTML = months.map((mItem, mIdx) => {
    const wks = mItem.weeks || [0, 0, 0, 0, 0];
    const sumW = wks.reduce((a, b) => a + b, 0);
    const displayTotal = sumW > 0 ? sumW : mItem.producedKg;
    const pct = mItem.goalKg > 0 ? ((displayTotal / mItem.goalKg) * 100).toFixed(1).replace('.', ',') + '%' : '-';
    const isActive = mIdx === viewFilter.activeMonthIndex;

    return `
      <tr class="${isActive ? 'total-highlight' : (displayTotal === 0 ? 'zero-row' : '')}">
        <td><strong>${mItem.name}</strong></td>
        <td>${formatValue(wks[0] || 0, 2)}</td>
        <td>${formatValue(wks[1] || 0, 2)}</td>
        <td>${formatValue(wks[2] || 0, 2)}</td>
        <td>${formatValue(wks[3] || 0, 2)}</td>
        <td>${formatValue(wks[4] || 0, 2)}</td>
        <td><strong>${formatValue(displayTotal, 2)}</strong></td>
        <td>${formatValue(mItem.goalKg, 0)}</td>
        <td><strong>${pct}</strong></td>
      </tr>
    `;
  }).join('');

  const logsBody = document.getElementById('dailyLogsTableBody');
  if (!state.dailyLogs || state.dailyLogs.length === 0) {
    logsBody.innerHTML = `<tr><td colspan="9" style="color: var(--stone);">Nenhum apontamento diário registrado ainda.</td></tr>`;
  } else {
    logsBody.innerHTML = state.dailyLogs
      .slice()
      .reverse()
      .map((log) => {
        const wLabel = typeof log.weekIndex === 'number' ? `Semana ${log.weekIndex + 1}` : 'Semana 4';
        const downStr = log.downtimeHours > 0
          ? `<span class="badge-backlog-pend">${escapeHtml(log.downtimeHours)}h (${escapeHtml(log.downtimeReason || 'Parada')})</span>`
          : `<span style="color: var(--stone);">Normal (0h)</span>`;

        return `
          <tr>
            <td><strong>${escapeHtml(formatDateBR(log.date))}</strong> <small style="color: var(--stone);">${escapeHtml(log.time || '')}</small></td>
            <td>${wLabel} • ${escapeHtml(MONTH_NAMES[log.monthIndex])} / ${escapeHtml(log.year)}</td>
            <td><strong>${escapeHtml(log.operator || 'PCP')}</strong><br/><small style="color: var(--stone);">${escapeHtml(log.shift || '')}</small>${log.user ? `<br/><small class="by-user">lançado por @${escapeHtml(log.user)}</small>` : ''}</td>
            <td><strong>${escapeHtml(log.machine)}</strong></td>
            <td>${escapeHtml(log.gauge)}</td>
            <td>${escapeHtml(log.mode)}</td>
            <td style="font-weight: 600;">${formatValue(Number(log.kg) || 0, 3)}</td>
            <td>${downStr}</td>
            <td>
              <button class="btn-delete" data-log-id="${escapeHtml(log.id)}" onclick="deleteHistoryLogById(this.dataset.logId)">Excluir</button>
            </td>
          </tr>
        `;
      }).join('');
  }

  const scrapBody = document.getElementById('scrapLogsTableBody');
  const scrapList = getYearScrapList(viewFilter.activeYear);
  if (scrapList.length === 0) {
    scrapBody.innerHTML = `<tr><td colspan="10" style="color: var(--stone);">Nenhum lançamento de sucata registrado em ${viewFilter.activeYear}.</td></tr>`;
  } else {
    const totalKgAll = scrapList.reduce((a, b) => a + Number(b.weightKg || 0), 0);
    const totalBrlAll = scrapList.reduce((a, b) => a + Number(b.totalValueBrl || 0), 0);
    const avgUnitAll = totalKgAll > 0 ? totalBrlAll / totalKgAll : 0;

    const rowsHtml = scrapList
      .slice()
      .reverse()
      .map(s => {
        const isSale = s.type === 'Venda de Sucata';
        const badgeHtml = isSale
          ? `<span class="badge-backlog-ok">Venda</span>`
          : `<span class="badge-backlog-pend">Perda</span>`;
        return `
          <tr>
            <td><strong>${escapeHtml(formatDateBR(s.date))}</strong> <small style="color: var(--stone);">${escapeHtml(s.time || '')}</small></td>
            <td>${escapeHtml(MONTH_NAMES[s.monthIndex])} / ${escapeHtml(s.year)}</td>
            <td>${badgeHtml}</td>
            <td><strong>${escapeHtml(s.machine)}</strong></td>
            <td>${escapeHtml(s.gauge)}</td>
            <td style="font-weight: 600;">${formatValue(Number(s.weightKg) || 0, 2)}</td>
            <td>${formatCurrencyBRL(s.unitPriceBrl)} /kg</td>
            <td style="color: var(--ok); font-weight: 600;">${formatCurrencyBRL(s.totalValueBrl)}</td>
            <td style="color: var(--stone);">${escapeHtml(s.notes || '-')}${s.user ? `<br/><small class="by-user">por @${escapeHtml(s.user)}</small>` : ''}</td>
            <td>
              <button class="btn-delete" data-year="${escapeHtml(s.year)}" data-month="${escapeHtml(s.monthIndex)}" data-scrap-id="${escapeHtml(s.id)}" onclick="deleteScrapLogById(this.dataset.year, this.dataset.month, this.dataset.scrapId)">Excluir</button>
            </td>
          </tr>
        `;
      }).join('');

    const footerRow = `
      <tr class="total-highlight">
        <td colspan="5"><strong>TOTAL ACUMULADO (${scrapList.length} LANÇAMENTOS NO ANO)</strong></td>
        <td><strong>${formatValue(totalKgAll, 2)}</strong></td>
        <td><strong>Média: ${formatCurrencyBRL(avgUnitAll)} /kg</strong></td>
        <td><strong>${formatCurrencyBRL(totalBrlAll)}</strong></td>
        <td colspan="2"></td>
      </tr>
    `;

    scrapBody.innerHTML = rowsHtml + footerRow;
  }
}

function renderCharts() {
  const factor = viewFilter.unit === 't' ? 0.001 : 1;
  const months = getActiveYearMonths();
  const m = getActiveMonthObj();
  if (!m.backlog) m.backlog = createEmptyBacklogMap(0);
  const weeksAll = m.weeks || [0, 0, 0, 0, 0];
  const hasWeek5 = weeksAll[4] > 0;
  const activeWeekLabels = hasWeek5 ? WEEK_LABELS : WEEK_LABELS.slice(0, 4);
  const activeWeeksData = hasWeek5 ? weeksAll : weeksAll.slice(0, 4);

  const gridColor = 'rgba(26,33,41,0.08)';
  const tickColor = '#4A5560';

  // 1. Evolução Mensal vs. Previsão (grafite = realizado, azul = meta)
  const ctxMonth = document.getElementById('monthlyStepChart').getContext('2d');
  if (monthlyChart) monthlyChart.destroy();

  const prodSeries = months.map(item => +(item.producedKg * factor).toFixed(1));
  const goalSeries = months.map(item => +(item.goalKg * factor).toFixed(1));
  const maxValMonthly = Math.max(...prodSeries, ...goalSeries, 10);

  monthlyChart = new Chart(ctxMonth, {
    type: 'line',
    data: {
      labels: months.map(item => item.name.slice(0, 3)),
      datasets: [
        {
          label: `Produzido (${viewFilter.unit})`,
          data: prodSeries,
          borderColor: '#1A2129',
          backgroundColor: 'rgba(26, 33, 41, 0.07)',
          fill: true,
          stepped: 'middle',
          borderWidth: 2.5,
          pointRadius: 4,
          pointBackgroundColor: '#1A2129',
          datalabels: {
            color: '#1A2129',
            backgroundColor: '#F7F7F4',
            borderColor: '#1A2129',
            borderWidth: 1,
            borderRadius: 6,
            padding: { top: 2, bottom: 2, left: 5, right: 5 },
            font: { weight: '600', size: 9.5 },
            align: (ctx) => prodSeries[ctx.dataIndex] >= goalSeries[ctx.dataIndex] ? 'top' : 'bottom',
            offset: 6,
            display: (ctx) => ctx.chart.canvas.id === 'monthlyStepChart' ? (ctx.dataIndex === viewFilter.activeMonthIndex && Number(ctx.dataset.data[ctx.dataIndex]) > 0) : Number(ctx.dataset.data[ctx.dataIndex]) > 0,
            formatter: (val) => val > 0 ? Math.round(val).toLocaleString('pt-BR') : ''
          }
        },
        {
          label: `Previsão / Meta (${viewFilter.unit})`,
          data: goalSeries,
          borderColor: '#3DAEE9',
          borderDash: [6, 4],
          fill: false,
          tension: 0.25,
          borderWidth: 2,
          pointRadius: 4,
          pointBackgroundColor: '#3DAEE9',
          datalabels: {
            color: '#1A2129',
            backgroundColor: '#F7F7F4',
            borderColor: '#3DAEE9',
            borderWidth: 1,
            borderRadius: 6,
            padding: { top: 2, bottom: 2, left: 5, right: 5 },
            font: { weight: '600', size: 9.5 },
            align: (ctx) => prodSeries[ctx.dataIndex] >= goalSeries[ctx.dataIndex] ? 'bottom' : 'top',
            offset: 6,
            display: (ctx) => ctx.chart.canvas.id === 'monthlyStepChart' ? (ctx.dataIndex === viewFilter.activeMonthIndex && Number(ctx.dataset.data[ctx.dataIndex]) > 0) : Number(ctx.dataset.data[ctx.dataIndex]) > 0,
            formatter: (val) => val > 0 ? Math.round(val).toLocaleString('pt-BR') : ''
          }
        }
      ]
    },
    options: {
      animation: false,
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 26, bottom: 22 } },
      plugins: { legend: { labels: { color: tickColor } } },
      scales: {
        x: { ticks: { color: tickColor }, grid: { color: gridColor } },
        y: { ticks: { color: tickColor }, grid: { color: gridColor }, beginAtZero: true, suggestedMax: maxValMonthly * 1.25 }
      }
    }
  });

  // 2. Gráfico Semanal no Telão
  const ctxOverWeek = document.getElementById('overviewWeeklyChart').getContext('2d');
  if (overviewWeeklyChart) overviewWeeklyChart.destroy();

  const weekPlotData = activeWeeksData.map(w => +(w * factor).toFixed(2));
  const maxOverWeek = Math.max(...weekPlotData, 10);

  overviewWeeklyChart = new Chart(ctxOverWeek, {
    type: 'bar',
    data: {
      labels: activeWeekLabels,
      datasets: [{
        label: `Produção Semanal (${viewFilter.unit})`,
        data: weekPlotData,
        backgroundColor: ['#A9D8F2', '#6EC1EE', '#3DAEE9', '#0E6FA8', '#1A2129'],
        borderRadius: 2
      }]
    },
    options: {
      animation: false,
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 24 } },
      plugins: {
        legend: { display: false },
        datalabels: {
          color: '#1A2129',
          anchor: 'end',
          align: 'top',
          font: { family: "'JetBrains Mono', monospace", weight: '700', size: 11 },
          formatter: (val) => Math.round(val).toLocaleString('pt-BR')
        }
      },
      scales: {
        x: { ticks: { color: tickColor, font: { weight: '600' } }, grid: { display: false } },
        y: { ticks: { color: tickColor }, grid: { color: gridColor }, beginAtZero: true, suggestedMax: maxOverWeek * 1.24 }
      }
    }
  });

  // 3. Velocímetros OEE
  const pctMonth = Math.min(100, m.goalKg > 0 ? (m.producedKg / m.goalKg) * 100 : 0);
  const totalProd = months.reduce((a, b) => a + b.producedKg, 0);
  const totalGoal = months.reduce((a, b) => a + b.goalKg, 0);
  const pctYear = Math.min(100, totalGoal > 0 ? (totalProd / totalGoal) * 100 : 0);

  if (gaugeMonth) gaugeMonth.destroy();
  // Medidores retirados do layout: o resumo do mês já mostra o atingimento.
  if (document.getElementById('gaugeMonthChart')) gaugeMonth = createGauge(document.getElementById('gaugeMonthChart'), pctMonth, '#3DAEE9');

  if (gaugeYear) gaugeYear.destroy();
  if (document.getElementById('gaugeYearChart')) gaugeYear = createGauge(document.getElementById('gaugeYearChart'), pctYear, '#1A2129');

  // 4. Gráfico por Máquina + Bitola (Aba 2)
  const ctxMach = document.getElementById('machineBarChart').getContext('2d');
  if (machineChart) machineChart.destroy();

  const machPlotData = m.items.map(i => +(i.kg * factor).toFixed(3));
  const maxMachVal = Math.max(...machPlotData, 10);

  machineChart = new Chart(ctxMach, {
    type: 'bar',
    data: {
      labels: m.items.map(i => `${i.machine} (${i.gauge})`),
      datasets: [{
        label: `Peso Produzido (${viewFilter.unit})`,
        data: machPlotData,
        backgroundColor: m.items.map(i => i.category === 'Estribadeira' ? '#1A2129' : '#0E6FA8'),
        borderRadius: 6
      }]
    },
    options: {
      animation: false,
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 24 } },
      plugins: {
        legend: { display: false },
        datalabels: {
          color: '#1A2129',
          anchor: 'end',
          align: 'top',
          font: { weight: '600', size: 10 },
          formatter: (val) => val.toLocaleString('pt-BR')
        }
      },
      scales: {
        x: { ticks: { color: tickColor, font: { size: 10 } }, grid: { display: false } },
        y: { ticks: { color: tickColor }, grid: { color: gridColor }, beginAtZero: true, suggestedMax: maxMachVal * 1.24 }
      }
    }
  });

  // 5. Gráfico Consolidado por Bitola vs. Carteira de Pedidos
  const ctxGaugeOnly = document.getElementById('gaugeOnlyBarChart').getContext('2d');
  if (gaugeOnlyChart) gaugeOnlyChart.destroy();

  const gaugeTotals = ALL_GAUGES.map(gName => {
    const sumKg = m.items.filter(i => i.gauge === gName).reduce((acc, cur) => acc + cur.kg, 0);
    return +(sumKg * factor).toFixed(2);
  });

  const gaugeDemands = ALL_GAUGES.map(gName => +(((m.backlog && m.backlog[gName]) || 0) * factor).toFixed(2));
  const maxGaugeOrBacklog = Math.max(...gaugeTotals, ...gaugeDemands, 10);

  gaugeOnlyChart = new Chart(ctxGaugeOnly, {
    type: 'bar',
    data: {
      labels: ALL_GAUGES,
      datasets: [
        {
          label: `Produzido (${viewFilter.unit})`,
          data: gaugeTotals,
          backgroundColor: '#1A2129',
          borderRadius: 6,
          datalabels: {
            color: '#1A2129',
            backgroundColor: '#F7F7F4',
            borderRadius: 6,
            padding: { top: 2, bottom: 2, left: 4, right: 4 },
            anchor: 'end',
            align: 'top',
            offset: 3,
            font: { weight: '600', size: 9.5 },
            formatter: (val) => val > 0 ? val.toLocaleString('pt-BR') : ''
          }
        },
        {
          label: `Carteira / Pedido (${viewFilter.unit})`,
          data: gaugeDemands,
          backgroundColor: '#3DAEE9',
          borderRadius: 6,
          datalabels: {
            color: '#1A2129',
            backgroundColor: '#F7F7F4',
            borderRadius: 6,
            padding: { top: 2, bottom: 2, left: 4, right: 4 },
            anchor: 'end',
            align: 'top',
            offset: 3,
            font: { weight: '600', size: 9.5 },
            formatter: (val) => val > 0 ? val.toLocaleString('pt-BR') : ''
          }
        }
      ]
    },
    options: {
      animation: false,
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 10 } },
      plugins: {
        legend: { position: 'top', labels: { color: tickColor, padding: 16, font: { weight: '600' } } }
      },
      scales: {
        x: { ticks: { color: tickColor, font: { size: 10 } }, grid: { display: false } },
        y: { ticks: { color: tickColor }, grid: { color: gridColor }, beginAtZero: true, suggestedMax: maxGaugeOrBacklog * 1.26 }
      }
    }
  });

  // 6. Comparativo Semanal Entre os Meses (Aba 3)
  const ctxWeekMulti = document.getElementById('weeklyMultiMonthChart').getContext('2d');
  if (weeklyMultiMonthChart) weeklyMultiMonthChart.destroy();

  const activeMonthsForWeeks = months.filter((mItem, idx) =>
    idx >= 5 && idx <= 11 && (mItem.producedKg > 0 || (mItem.weeks && mItem.weeks.some(w => w > 0)))
  );
  const listToPlot = activeMonthsForWeeks.length > 0 ? activeMonthsForWeeks : months.slice(5, 10);
  const anyMonthHasW5 = listToPlot.some(item => item.weeks && item.weeks[4] > 0);
  const multiWeekLabels = anyMonthHasW5 ? WEEK_LABELS : WEEK_LABELS.slice(0, 4);
  const weekColors = ['#A9D8F2', '#6EC1EE', '#3DAEE9', '#0E6FA8', '#1A2129'];

  const allMultiValues = [];
  listToPlot.forEach(item => {
    (item.weeks || []).forEach(w => allMultiValues.push(+(w * factor).toFixed(1)));
  });
  const maxMultiWeekVal = Math.max(...allMultiValues, 10);

  weeklyMultiMonthChart = new Chart(ctxWeekMulti, {
    type: 'bar',
    data: {
      labels: listToPlot.map(item => item.name),
      datasets: multiWeekLabels.map((wLabel, wIdx) => ({
        label: wLabel,
        data: listToPlot.map(item => +(((item.weeks && item.weeks[wIdx]) || 0) * factor).toFixed(1)),
        backgroundColor: weekColors[wIdx],
        borderRadius: 6,
        barPercentage: 0.85,
        categoryPercentage: 0.78
      }))
    },
    options: {
      animation: false,
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 20 } },
      plugins: {
        legend: { labels: { color: tickColor, padding: 14, font: { size: 12, weight: '600' } } },
        datalabels: {
          color: '#1A2129',
          anchor: 'end',
          align: 'top',
          offset: 2,
          font: { weight: '600', size: 10.5 },
          display: (ctx) => ctx.chart.canvas.id === 'monthlyStepChart' ? (ctx.dataIndex === viewFilter.activeMonthIndex && Number(ctx.dataset.data[ctx.dataIndex]) > 0) : Number(ctx.dataset.data[ctx.dataIndex]) > 0,
          formatter: (val) => val > 0 ? Math.round(val).toLocaleString('pt-BR') : ''
        }
      },
      scales: {
        x: { ticks: { color: '#1A2129', font: { size: 12, weight: '600' } }, grid: { display: false } },
        y: { ticks: { color: tickColor }, grid: { color: gridColor }, beginAtZero: true, suggestedMax: maxMultiWeekVal * 1.24 }
      }
    }
  });

  // 7. Gráficos da Aba 5 (Controle de Sucata)
  const scrapOrigins = ['GERAL / PÁTIO', 'ES02', 'EB10', 'EB12', '20B', 'PT 32'];
  const monthScrapList = getMonthScrapList(viewFilter.activeYear, viewFilter.activeMonthIndex);

  const scrapByOriginKg = scrapOrigins.map(orig => {
    const sumKg = monthScrapList.filter(s => s.machine === orig).reduce((a, b) => a + Number(b.weightKg || 0), 0);
    return +(sumKg * factor).toFixed(2);
  });
  const maxScrapOriginVal = Math.max(...scrapByOriginKg, 10);

  const ctxScrapMach = document.getElementById('scrapByMachineChart').getContext('2d');
  if (scrapMachineChart) scrapMachineChart.destroy();

  scrapMachineChart = new Chart(ctxScrapMach, {
    type: 'bar',
    data: {
      labels: scrapOrigins,
      datasets: [{
        label: `Peso de Sucata (${viewFilter.unit})`,
        data: scrapByOriginKg,
        backgroundColor: '#0E6FA8',
        borderRadius: 6
      }]
    },
    options: {
      animation: false,
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 24 } },
      plugins: {
        legend: { display: false },
        datalabels: {
          color: '#1A2129',
          anchor: 'end',
          align: 'top',
          font: { weight: '600', size: 10 },
          formatter: (val) => val > 0 ? val.toLocaleString('pt-BR') : ''
        }
      },
      scales: {
        x: { ticks: { color: tickColor, font: { size: 10 } }, grid: { display: false } },
        y: { ticks: { color: tickColor }, grid: { color: gridColor }, beginAtZero: true, suggestedMax: maxScrapOriginVal * 1.24 }
      }
    }
  });

  const monthlyScrapBrlSeries = months.map((mObj) => {
    const list = mObj.scrapLogs || [];
    return +list.reduce((a, b) => a + Number(b.totalValueBrl || 0), 0).toFixed(2);
  });
  const maxScrapBrlVal = Math.max(...monthlyScrapBrlSeries, 10);

  const ctxScrapTrend = document.getElementById('scrapMonthlyTrendChart').getContext('2d');
  if (scrapTrendChart) scrapTrendChart.destroy();

  scrapTrendChart = new Chart(ctxScrapTrend, {
    type: 'bar',
    data: {
      labels: MONTH_NAMES.map(n => n.slice(0, 3)),
      datasets: [{
        label: 'Valor Acumulado em Sucata (R$)',
        data: monthlyScrapBrlSeries,
        backgroundColor: '#3DAEE9',
        borderRadius: 6
      }]
    },
    options: {
      animation: false,
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 22 } },
      plugins: {
        legend: { labels: { color: tickColor, padding: 14 } },
        datalabels: {
          color: '#1A2129',
          anchor: 'end',
          align: 'top',
          font: { weight: '600', size: 9.5 },
          formatter: (val) => val > 0 ? 'R$ ' + Math.round(val).toLocaleString('pt-BR') : ''
        }
      },
      scales: {
        x: { ticks: { color: tickColor, font: { size: 10 } }, grid: { display: false } },
        y: { ticks: { color: tickColor }, grid: { color: gridColor }, beginAtZero: true, suggestedMax: maxScrapBrlVal * 1.25 }
      }
    }
  });
}

function createGauge(canvasEl, pct, colorHex) {
  return new Chart(canvasEl, {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [pct, 100 - pct],
        backgroundColor: [colorHex, '#E1E6EA'],
        borderWidth: 0
      }]
    },
    options: {
      animation: false,
      responsive: true,
      maintainAspectRatio: false,
      rotation: -90,
      circumference: 180,
      cutout: '78%',
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
        datalabels: { display: false }
      }
    }
  });
}

async function forceSyncWeeksWithMachines() {
  if (!(await requireEditAuth())) return;
  const yr = viewFilter.activeYear;
  const mIdx = viewFilter.activeMonthIndex;
  await commitChange(() => {
    ensureYearExists(yr);
    const mObj = state.years[yr][mIdx];
    delete mObj.weeksManual; // volta a usar o total das máquinas
    reconcileMonthConsistency(mObj, null, true);
  });
}

async function handleLaunchProduction() {
  if (!(await requireEditAuth())) return;

  const launchDate = document.getElementById('launchDateInput').value || viewFilter.selectedDate;
  const [yr, mo] = launchDate.split('-').map(Number);
  const mIdx = mo - 1;
  const wIdx = parseInt(document.getElementById('inputWeekSelect').value, 10) || 0;

  const selectedMachine = document.getElementById('inputMachineSelect').value;
  const selectedGauge = document.getElementById('inputGaugeSelect').value;
  const operatorName = (document.getElementById('inputOperatorName').value || 'Operador PCP').trim();
  const shiftName = document.getElementById('inputShiftSelect').value;
  const mode = document.getElementById('inputMode').value;

  const rawWeight = document.getElementById('inputWeightKg').value;
  const val = rawWeight === '' ? 0 : parseFloat(rawWeight);
  const downHours = parseFloat(document.getElementById('inputDowntimeHours').value) || 0;
  const downReason = document.getElementById('inputDowntimeReason').value;

  if ((isNaN(val) || val < 0) || (val === 0 && downHours <= 0)) {
    return uiAlert('Informe um peso produzido válido (em kg) ou registre o tempo de parada.');
  }

  // ---- Conferências (item 14) ----
  if (isFutureDate(launchDate)) {
    return uiAlert(`A data do apontamento (${formatDateBR(launchDate)}) está no futuro. Confira a data.`, 'Data inválida');
  }
  if (downHours < 0 || downHours > DOWNTIME_MAX_HOURS) {
    return uiAlert(`Horas paradas devem ficar entre 0 e ${DOWNTIME_MAX_HOURS} h por apontamento.`, 'Horas inválidas');
  }
  if (val > PROD_WEIGHT_WARN_KG) {
    const okBig = await uiConfirm(
      `O peso digitado é ${formatValue(val, 3)} — bem acima do normal para um apontamento.\n\nConfira se não houve erro de digitação (ex.: 125000 em vez de 1250,00).`,
      { title: 'Peso muito alto', okText: 'O peso está certo', cancelText: 'Corrigir' }
    );
    if (!okBig) return;
  }

  viewFilter.activeYear = yr;
  viewFilter.activeMonthIndex = mIdx;
  viewFilter.selectedDate = launchDate;

  const logId = 'log_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
  const nowTimeStr = nowTimeLabel();

  document.getElementById('inputWeightKg').value = '';
  document.getElementById('inputDowntimeHours').value = '';
  document.getElementById('inputDowntimeReason').value = 'Sem Parada';

  // Tudo abaixo roda dentro da operação: se outro PC salvar junto,
  // o lançamento é recalculado em cima dos dados mais novos da nuvem.
  await commitChange(() => {
  ensureYearExists(yr);
  const monthObj = state.years[yr][mIdx];
  if (!Array.isArray(monthObj.weeks) || monthObj.weeks.length < 5) {
    monthObj.weeks = [0, 0, 0, 0, 0];
  }
  if (!monthObj.downtimeHours) {
    monthObj.downtimeHours = createEmptyDowntimeMap();
  }
  if (!monthObj.backlog) {
    monthObj.backlog = createEmptyBacklogMap(0);
  }

  let item = monthObj.items.find(i => i.machine === selectedMachine && i.gauge === selectedGauge);
  let wasCreatedNow = false;

  if (!item) {
    const cat = MACHINE_CATALOG[selectedMachine] || 'Estribadeira';
    item = {
      id: `${selectedMachine}_${selectedGauge}`,
      machine: selectedMachine,
      category: cat,
      gauge: selectedGauge,
      kg: 0
    };
    monthObj.items.push(item);
    wasCreatedNow = true;
  }

  const prevKg = item.kg;
  const prevWeekKg = monthObj.weeks[wIdx] || 0;
  const prevBacklogKg = Number(monthObj.backlog[selectedGauge] || 0);
  let deductedBacklogKg = 0;

  if (val > 0 || mode === 'set') {
    if (mode === 'add') {
      item.kg = +(item.kg + val).toFixed(3);
      const newBacklog = Math.max(0, +(prevBacklogKg - val).toFixed(3));
      deductedBacklogKg = +(prevBacklogKg - newBacklog).toFixed(3);
      monthObj.backlog[selectedGauge] = newBacklog;
    } else {
      const diff = val - prevKg;
      item.kg = +val.toFixed(3);
      const newBacklog = Math.max(0, +(prevBacklogKg - diff).toFixed(3));
      deductedBacklogKg = +(prevBacklogKg - newBacklog).toFixed(3);
      monthObj.backlog[selectedGauge] = newBacklog;
    }
  }

  if (downHours > 0) {
    monthObj.downtimeHours[selectedMachine] = +((monthObj.downtimeHours[selectedMachine] || 0) + downHours).toFixed(2);
  }

  // Mês com fechamento semanal manual: soma só a diferença na semana escolhida.
  if (monthObj.weeksManual) applyWeekDelta(monthObj, wIdx, item.kg - prevKg);
  reconcileMonthConsistency(monthObj, wIdx);

  const newLog = {
    id: logId,
    date: launchDate,
    time: nowTimeStr,
    operator: operatorName,
    user: currentUser() ? currentUser().username : '',
    userName: currentUser() ? currentUser().name : '',
    shift: shiftName,
    year: yr,
    monthIndex: mIdx,
    weekIndex: wIdx,
    monthName: MONTH_NAMES[mIdx],
    machine: item.machine,
    category: item.category,
    gauge: item.gauge,
    mode: val === 0 && downHours > 0 ? 'Registro de Parada' : (mode === 'add' ? '+ Lote Somado (Abateu Carteira)' : '= Total Substituído'),
    rawMode: mode,
    kg: val,
    prevKg: prevKg,
    prevWeekKg: prevWeekKg,
    deductedBacklogKg: deductedBacklogKg,
    downtimeHours: downHours,
    downtimeReason: downHours > 0 ? downReason : 'Sem Parada',
    wasCreatedNow: wasCreatedNow
  };

  if (!Array.isArray(state.dailyLogs)) state.dailyLogs = [];
  state.dailyLogs.push(newLog);
  return newLog;
  });
}

async function handleUpdateBacklogDemand() {
  if (!(await requireEditAuth())) return;

  const yr = parseInt(document.getElementById('goalYearInput').value, 10) || viewFilter.activeYear;
  const mIdx = parseInt(document.getElementById('goalMonthSelect').value, 10);
  const gauge = document.getElementById('backlogGaugeSelect').value;
  const mode = document.getElementById('backlogModeSelect').value;
  const demandVal = parseFloat(document.getElementById('backlogDemandInput').value);

  if (isNaN(demandVal) || demandVal < 0) {
    return uiAlert('Informe um peso válido (em kg) para a Carteira de Pedidos.');
  }

  viewFilter.activeYear = yr;
  viewFilter.activeMonthIndex = mIdx;
  document.getElementById('backlogDemandInput').value = '';

  await commitChange(() => {
    ensureYearExists(yr);
    const mObj = state.years[yr][mIdx];
    if (!mObj.backlog) mObj.backlog = createEmptyBacklogMap(0);

    const currentVal = Number(mObj.backlog[gauge] || 0);
    if (mode === 'add') {
      mObj.backlog[gauge] = +(currentVal + demandVal).toFixed(3);
    } else {
      mObj.backlog[gauge] = +demandVal.toFixed(3);
    }
  });
}

async function handleUpdateWeeksDirect() {
  if (!(await requireEditAuth())) return;

  const yr = parseInt(document.getElementById('directWeekYearInput').value, 10) || viewFilter.activeYear;
  const mIdx = parseInt(document.getElementById('directWeekMonthSelect').value, 10);

  const w1 = parseFloat(document.getElementById('w1Input').value) || 0;
  const w2 = parseFloat(document.getElementById('w2Input').value) || 0;
  const w3 = parseFloat(document.getElementById('w3Input').value) || 0;
  const w4 = parseFloat(document.getElementById('w4Input').value) || 0;
  const w5 = parseFloat(document.getElementById('w5Input').value) || 0;

  if ([w1, w2, w3, w4, w5].some(w => w < 0)) {
    return uiAlert('Os valores das semanas não podem ser negativos.');
  }

  // Item 8: avisa quando o fechamento manual difere do total apontado por máquina.
  ensureYearExists(yr);
  const currentMonth = state.years[yr][mIdx];
  const weeksTotal = +(w1 + w2 + w3 + w4 + w5).toFixed(3);
  const machinesTotal = +(currentMonth.items || []).reduce((a, b) => a + Number(b.kg || 0), 0).toFixed(3);
  if (Math.abs(weeksTotal - machinesTotal) > 0.05) {
    const okManual = await uiConfirm(
      `A soma das semanas (${formatValue(weeksTotal, 2)}) é diferente do total apontado por máquina (${formatValue(machinesTotal, 2)}).\n\n` +
      `Se salvar, ${MONTH_NAMES[mIdx]}/${yr} passa a usar este FECHAMENTO MANUAL como total do mês. ` +
      `Novos apontamentos neste mês serão somados à semana escolhida, sem apagar o que você digitou.\n\n` +
      `Para voltar a usar o total das máquinas, clique em "Sincronizar Agora" na aba Máquinas & Carteira.`,
      { title: 'Fechamento semanal manual', okText: 'Salvar fechamento manual' }
    );
    if (!okManual) return;
  }

  viewFilter.activeYear = yr;
  viewFilter.activeMonthIndex = mIdx;

  await commitChange(() => {
    ensureYearExists(yr);
    const monthObj = state.years[yr][mIdx];
    monthObj.weeks = [+w1.toFixed(3), +w2.toFixed(3), +w3.toFixed(3), +w4.toFixed(3), +w5.toFixed(3)];
    const itemsTotal = (monthObj.items || []).reduce((a, b) => a + Number(b.kg || 0), 0);
    const sumW = w1 + w2 + w3 + w4 + w5;
    if (Math.abs(sumW - itemsTotal) > 0.05) {
      monthObj.weeksManual = true;
    } else {
      delete monthObj.weeksManual;
    }
    monthObj.producedKg = +sumW.toFixed(3);
  });
}

async function deleteHistoryLogById(logId) {
  if (!(await requireEditAuth())) return;

  const log = (state.dailyLogs || []).find(l => l.id === logId);
  if (!log) return;

  if (!(await uiConfirm(
    `Deseja excluir o registro de ${formatValue(log.kg, 3)} (${log.machine} - Bitola ${log.gauge}) e reverter esse valor na produção, semanas e carteira?`,
    { title: 'Excluir lançamento', okText: 'Excluir', danger: true }
  ))) {
    return;
  }

  await commitChange(() => {
  const logIndex = (state.dailyLogs || []).findIndex(l => l.id === logId);
  if (logIndex === -1) return; // outro PC já excluiu este registro
  const targetLog = state.dailyLogs[logIndex];
  if (targetLog && state.years[targetLog.year] && state.years[targetLog.year][targetLog.monthIndex]) {
    const monthObj = state.years[targetLog.year][targetLog.monthIndex];
    const itemIdx = monthObj.items.findIndex(i => i.machine === targetLog.machine && i.gauge === targetLog.gauge);
    const itemsKgBefore = monthObj.items.reduce((a, b) => a + Number(b.kg || 0), 0);

    if (itemIdx !== -1 && targetLog.kg > 0) {
      const item = monthObj.items[itemIdx];
      if (targetLog.wasCreatedNow && targetLog.prevKg === 0) {
        const isBase = BASE_ITEMS_TEMPLATE.some(b => b.machine === item.machine && b.gauge === item.gauge);
        if (!isBase) {
          monthObj.items.splice(itemIdx, 1);
        } else {
          item.kg = 0;
        }
      } else if (targetLog.rawMode === 'add') {
        item.kg = Math.max(0, +(item.kg - targetLog.kg).toFixed(3));
      } else if (targetLog.rawMode === 'set' && typeof targetLog.prevKg === 'number') {
        item.kg = +targetLog.prevKg.toFixed(3);
      } else {
        item.kg = 0;
      }
    }

    if (typeof targetLog.deductedBacklogKg === 'number' && targetLog.deductedBacklogKg !== 0) {
      if (!monthObj.backlog) monthObj.backlog = createEmptyBacklogMap(0);
      monthObj.backlog[targetLog.gauge] = Math.max(0, +((monthObj.backlog[targetLog.gauge] || 0) + targetLog.deductedBacklogKg).toFixed(3));
    }

    if (targetLog.downtimeHours > 0 && monthObj.downtimeHours) {
      monthObj.downtimeHours[targetLog.machine] = Math.max(0, +((monthObj.downtimeHours[targetLog.machine] || 0) - targetLog.downtimeHours).toFixed(2));
    }

    if (monthObj.weeksManual) {
      const itemsKgAfter = monthObj.items.reduce((a, b) => a + Number(b.kg || 0), 0);
      applyWeekDelta(monthObj, typeof targetLog.weekIndex === 'number' ? targetLog.weekIndex : 4, itemsKgAfter - itemsKgBefore);
    }
    reconcileMonthConsistency(monthObj, typeof targetLog.weekIndex === 'number' ? targetLog.weekIndex : null);
  }

  state.dailyLogs.splice(logIndex, 1);
  });
}

async function removeOrZeroMachineRow(itemIdx) {
  if (!(await requireEditAuth())) return;

  const yr = viewFilter.activeYear;
  const mIdx = viewFilter.activeMonthIndex;
  const m = getActiveMonthObj();
  const item = m.items[itemIdx];
  if (!item) return;

  const machineName = item.machine;
  const gaugeName = item.gauge;
  const isBase = BASE_ITEMS_TEMPLATE.some(b => b.machine === machineName && b.gauge === gaugeName);
  const msg = isBase
    ? `Deseja zerar o peso de ${machineName} (${gaugeName}) em ${m.name}/${yr}?`
    : `Deseja remover a barra extra ${machineName} (${gaugeName}) de ${m.name}/${yr}?`;

  if (!(await uiConfirm(msg, { title: isBase ? 'Zerar peso' : 'Excluir linha', okText: isBase ? 'Zerar' : 'Excluir', danger: true }))) return;

  const currentKg = Number(item.kg || 0);
  const returnToBacklog = currentKg > 0 && await uiConfirm(
    `Deseja devolver os ${formatValue(currentKg, 2)} zerados de volta para a Carteira de Pedidos da bitola ${gaugeName}?`,
    { title: 'Devolver à carteira', okText: 'Devolver', cancelText: 'Não devolver' }
  );

  await commitChange(() => {
    ensureYearExists(yr);
    const activeMonth = state.years[yr][mIdx];
    const idx = activeMonth.items.findIndex(i => i.machine === machineName && i.gauge === gaugeName);
    if (idx === -1) return;

    const removedKg = Number(activeMonth.items[idx].kg || 0);
    if (isBase) {
      activeMonth.items[idx].kg = 0;
    } else {
      activeMonth.items.splice(idx, 1);
    }

    if (returnToBacklog && removedKg > 0) {
      if (!activeMonth.backlog) activeMonth.backlog = createEmptyBacklogMap(0);
      activeMonth.backlog[gaugeName] = +((activeMonth.backlog[gaugeName] || 0) + removedKg).toFixed(3);
    }

    if (activeMonth.weeksManual && removedKg > 0) applyWeekDelta(activeMonth, 4, -removedKg);
    reconcileMonthConsistency(activeMonth, null);
  });
}

async function clearAllHistoryLogs() {
  if (!(await requireAdminAuth())) return;
  if (!(await uiConfirm(
    'Deseja limpar toda a lista de histórico de lançamentos diários?\n\n(Os pesos já lançados continuam nos totais; só a lista some.)',
    { title: 'Limpar histórico', okText: 'Limpar', danger: true }
  ))) return;
  await commitChange(() => { state.dailyLogs = []; });
}

async function handleUpdateGoal() {
  if (!(await requireEditAuth())) return;

  const yr = parseInt(document.getElementById('goalYearInput').value, 10) || viewFilter.activeYear;
  const mIdx = parseInt(document.getElementById('goalMonthSelect').value, 10);
  const val = parseFloat(document.getElementById('inputGoalKg').value);
  if (isNaN(val) || val < 0) return uiAlert('Informe uma meta válida em kg.');

  viewFilter.activeYear = yr;
  viewFilter.activeMonthIndex = mIdx;

  await commitChange(() => {
    ensureYearExists(yr);
    state.years[yr][mIdx].goalKg = val;
  });
}

async function resetDefaultData() {
  if (!(await requireAdminAuth())) return;
  const typed = await uiPrompt(
    'ATENÇÃO: isto APAGA todos os lançamentos, metas, carteira e sucata de TODOS os anos, ' +
    'em TODOS os computadores, e volta aos dados originais de 2026.\n\n' +
    'Um backup dos dados atuais será baixado automaticamente antes.\n\n' +
    'Para confirmar, digite RESTAURAR (em maiúsculas):',
    { title: 'Restaurar padrão', okText: 'Apagar e restaurar', placeholder: 'RESTAURAR' }
  );
  if (typed === null) return;
  if (typed.trim() !== 'RESTAURAR') {
    uiAlert('Texto de confirmação incorreto. Nada foi alterado.');
    return;
  }
  downloadBackup('Backup_Antes_de_Restaurar');
  setTodayDate();
  await commitChange(() => {
    const fresh = createDefaultDatabase();
    fresh.appliedOpIds = state.appliedOpIds;   // mantém o controle de operações
    Object.keys(state).forEach(k => delete state[k]);
    Object.assign(state, fresh);
  });
}

function renderAll() {
  renderKPIsAndStatus();
  renderTables();
  renderCharts();
}

window.addEventListener('online', () => {
  syncFromCloud(true);
});

window.addEventListener('offline', () => {
  updateCloudBadge('Sem Internet (Cache Offline)', false);
});

window.addEventListener('DOMContentLoaded', async () => {
  populateCatalogSelects();
  const opInput = document.getElementById('inputOperatorName');
  opInput.addEventListener('input', () => { opInput.dataset.auto = opInput.value ? '0' : '1'; });
  updateAuthUI();
  verifyStoredSession();
  setTodayDate();
  updateScrapLiveCalculation();
  await syncFromCloud(true);

  setInterval(() => {
    syncFromCloud(false);
  }, 15000);
});
