// ============================================================================
// BACKEND GOOGLE APPS SCRIPT - GRANDE AÇO PCP
// Versão com: usuários com senha própria (admin / pcp / viewer),
// controle de conflito entre PCs, gravação em bloco único e
// textos divididos em pedaços (sem estourar o limite de 50.000 caracteres
// por célula do Google Sheets).
//
// FORMATO DA ABA "DB_SISTEMA" (PARTITIONED_V3):
//   A1 = 'PARTITIONED_V3'   B1 = texto com a última atualização
//   Linhas 2+: [chave, pedaço]  ex.: ['__meta__#0', '~{...'], ['2026#0', '~[...']
//   Cada pedaço começa com '~' para o Sheets nunca tratar o texto como número
//   ou fórmula. Continua lendo o formato antigo (PARTITIONED_V2 / JSON em A1).
// ============================================================================

const DB_SHEET_NAME = 'DB_SISTEMA';
const LOG_SHEET_NAME = 'Historico_Diario';
const FORMAT_V3 = 'PARTITIONED_V3';
const CHUNK_SIZE = 45000;          // limite da célula é 50.000 caracteres
const MAX_DAILY_LOGS = 500;
const MAX_APPLIED_OP_IDS = 300;

// ============================================================================
// USUÁRIOS E SESSÕES
// Os usuários ficam nas Propriedades do Script (chave PCP_USERS), NUNCA na
// planilha nem nos dados enviados aos navegadores. A senha é guardada só como
// "hash" com sal (não dá para ler a senha de volta).
//
// Perfis:  admin  → tudo + gerenciar usuários
//          pcp    → lançar, editar e excluir dados de produção/sucata
//          viewer → só consulta (pode trocar a própria senha)
//
// Primeiro uso: se não existir nenhum usuário, é criado o usuário "admin" com
// senha provisória = PIN antigo do PCP (ou 1234). No primeiro acesso o sistema
// obriga a trocar a senha.
// ============================================================================
const USERS_PROPERTY = 'PCP_USERS';
const LEGACY_PIN_PROPERTY = 'PCP_PIN';
const ROLES = ['admin', 'pcp', 'viewer'];
const HASH_ROUNDS = 300;
const MIN_PASSWORD_LENGTH = 6;
const SESSION_SECONDS = 21600;       // 6 h sem uso → precisa entrar de novo
const MAX_LOGIN_FAILS = 8;           // tentativas erradas por usuário...
const MAX_LOGIN_FAILS_GLOBAL = 40;   // ...e no total...
const LOGIN_LOCK_SECONDS = 600;      // ...a cada 10 minutos
const RESULT_SECONDS = 600;

function hashPassword_(password, salt) {
  let h = '';
  for (let i = 0; i < HASH_ROUNDS; i++) {
    const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + '|' + h + '|' + password, Utilities.Charset.UTF_8);
    h = Utilities.base64Encode(bytes);
  }
  return h;
}

function newSalt_() {
  return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
}

function normalizeUsername_(u) {
  return String(u || '').trim().toLowerCase();
}

function isValidUsername_(u) {
  return /^[a-z0-9._-]{3,30}$/.test(u);
}

function loadUsers_(sheet) {
  const props = PropertiesService.getScriptProperties();
  const raw = props.getProperty(USERS_PROPERTY);
  if (raw) return JSON.parse(raw);

  // Primeiro uso: cria o admin com o PIN antigo como senha provisória.
  let temp = props.getProperty(LEGACY_PIN_PROPERTY);
  if (!temp) {
    try { const db = readDb_(sheet); temp = db && db.pcpPin; } catch (e) {}
  }
  temp = String(temp || '1234');
  const salt = newSalt_();
  const users = {
    admin: {
      name: 'Administrador', role: 'admin', active: true, mustChange: true,
      salt: salt, hash: hashPassword_(temp, salt),
      createdAt: Date.now(), lastLogin: null
    }
  };
  saveUsers_(users);
  return users;
}

function saveUsers_(users) {
  PropertiesService.getScriptProperties().setProperty(USERS_PROPERTY, JSON.stringify(users));
}

function publicUser_(username, u) {
  return {
    username: username, name: u.name, role: u.role, active: u.active !== false,
    mustChange: !!u.mustChange, createdAt: u.createdAt || null, lastLogin: u.lastLogin || null
  };
}

function countActiveAdmins_(users) {
  return Object.keys(users).filter(k => users[k].role === 'admin' && users[k].active !== false).length;
}

// ---- Limite de tentativas ----
function loginLocked_(username) {
  const cache = CacheService.getScriptCache();
  return Number(cache.get('fail_' + username) || 0) >= MAX_LOGIN_FAILS ||
         Number(cache.get('fail__all') || 0) >= MAX_LOGIN_FAILS_GLOBAL;
}

function registerLoginFail_(username) {
  const cache = CacheService.getScriptCache();
  ['fail_' + username, 'fail__all'].forEach(k => {
    cache.put(k, String(Number(cache.get(k) || 0) + 1), LOGIN_LOCK_SECONDS);
  });
}

// ---- Sessões (o navegador gera um token aleatório e o servidor o registra no login) ----
function isValidToken_(t) {
  return /^[a-f0-9]{48,128}$/.test(String(t || ''));
}

// Confere o token e devolve { username, user } atualizado, ou null.
function getSession_(sheet, token) {
  if (!isValidToken_(token)) return null;
  const cache = CacheService.getScriptCache();
  const username = cache.get('sess_' + token);
  if (!username) return null;
  const users = loadUsers_(sheet);
  const u = users[username];
  if (!u || u.active === false) { cache.remove('sess_' + token); return null; }
  cache.put('sess_' + token, username, SESSION_SECONDS); // renova enquanto estiver em uso
  return { username: username, user: u, users: users };
}

function canWrite_(session) {
  return !!session && !session.user.mustChange && (session.user.role === 'admin' || session.user.role === 'pcp');
}

// Resultado das ações enviadas por POST (o navegador não consegue ler a resposta
// do POST, então consulta depois por GET ?action=result&opId=...).
function rememberResult_(opId, result) {
  if (opId && /^[a-zA-Z0-9_-]{8,80}$/.test(opId)) {
    CacheService.getScriptCache().put('res_' + opId, JSON.stringify(result), RESULT_SECONDS);
  }
  return respond_(result);
}

// Ações de conta (login, senha, usuários). Roda dentro do lock do doPost.
function handleAccountAction_(sheet, p) {
  const action = p.action;

  if (action === 'login') {
    const username = normalizeUsername_(p.username);
    if (!isValidToken_(p.token)) return { status: 'error', message: 'Sessão inválida. Recarregue a página.' };
    if (loginLocked_(username)) return { status: 'error', code: 'locked', message: 'Muitas tentativas erradas. Aguarde 10 minutos.' };
    const users = loadUsers_(sheet);
    const u = users[username];
    if (!u || hashPassword_(String(p.password || ''), u.salt) !== u.hash) {
      registerLoginFail_(username);
      return { status: 'error', code: 'wrong', message: 'Usuário ou senha incorretos.' };
    }
    if (u.active === false) return { status: 'error', code: 'inactive', message: 'Este usuário está desativado. Fale com o administrador.' };
    u.lastLogin = Date.now();
    saveUsers_(users);
    CacheService.getScriptCache().put('sess_' + p.token, username, SESSION_SECONDS);
    return { status: 'ok', user: publicUser_(username, u) };
  }

  if (action === 'logout') {
    if (isValidToken_(p.token)) CacheService.getScriptCache().remove('sess_' + p.token);
    return { status: 'ok' };
  }

  const session = getSession_(sheet, p.token);
  if (!session) return { status: 'error', code: 'auth', message: 'Sua sessão expirou. Entre de novo.' };
  const users = session.users;
  const me = session.user;

  if (action === 'changePassword') {
    if (hashPassword_(String(p.currentPassword || ''), me.salt) !== me.hash) {
      registerLoginFail_(session.username);
      return { status: 'error', code: 'wrong', message: 'Senha atual incorreta.' };
    }
    const np = String(p.newPassword || '');
    if (np.length < MIN_PASSWORD_LENGTH) return { status: 'error', message: 'A nova senha precisa ter pelo menos ' + MIN_PASSWORD_LENGTH + ' caracteres.' };
    if (np === String(p.currentPassword || '')) return { status: 'error', message: 'A nova senha precisa ser diferente da atual.' };
    me.salt = newSalt_();
    me.hash = hashPassword_(np, me.salt);
    me.mustChange = false;
    saveUsers_(users);
    return { status: 'ok', user: publicUser_(session.username, me) };
  }

  // Daqui para baixo: só administrador.
  if (me.role !== 'admin' || me.mustChange) return { status: 'error', code: 'forbidden', message: 'Apenas administradores podem gerenciar usuários.' };

  if (action === 'createUser') {
    const username = normalizeUsername_(p.username);
    const name = String(p.name || '').trim().slice(0, 60);
    const role = String(p.role || '');
    const temp = String(p.tempPassword || '');
    if (!isValidUsername_(username)) return { status: 'error', message: 'Usuário inválido: use de 3 a 30 letras minúsculas, números, ponto, hífen ou sublinhado (sem espaço).' };
    if (users[username]) return { status: 'error', message: 'Já existe um usuário "' + username + '".' };
    if (!name) return { status: 'error', message: 'Informe o nome da pessoa.' };
    if (ROLES.indexOf(role) < 0) return { status: 'error', message: 'Perfil inválido.' };
    if (temp.length < MIN_PASSWORD_LENGTH) return { status: 'error', message: 'A senha provisória precisa ter pelo menos ' + MIN_PASSWORD_LENGTH + ' caracteres.' };
    const salt = newSalt_();
    users[username] = { name: name, role: role, active: true, mustChange: true, salt: salt, hash: hashPassword_(temp, salt), createdAt: Date.now(), lastLogin: null };
    saveUsers_(users);
    return { status: 'ok', user: publicUser_(username, users[username]) };
  }

  if (action === 'updateUser') {
    const username = normalizeUsername_(p.username);
    const u = users[username];
    if (!u) return { status: 'error', message: 'Usuário não encontrado.' };
    const wasActiveAdmin = u.role === 'admin' && u.active !== false;
    if (typeof p.name === 'string' && p.name.trim()) u.name = p.name.trim().slice(0, 60);
    if (typeof p.role === 'string') {
      if (ROLES.indexOf(p.role) < 0) return { status: 'error', message: 'Perfil inválido.' };
      u.role = p.role;
    }
    if (typeof p.active === 'boolean') u.active = p.active;
    if (wasActiveAdmin && countActiveAdmins_(users) === 0) {
      return { status: 'error', message: 'É preciso manter pelo menos um administrador ativo.' };
    }
    saveUsers_(users);
    return { status: 'ok', user: publicUser_(username, u) };
  }

  if (action === 'resetPassword') {
    const username = normalizeUsername_(p.username);
    const u = users[username];
    if (!u) return { status: 'error', message: 'Usuário não encontrado.' };
    const temp = String(p.tempPassword || '');
    if (temp.length < MIN_PASSWORD_LENGTH) return { status: 'error', message: 'A senha provisória precisa ter pelo menos ' + MIN_PASSWORD_LENGTH + ' caracteres.' };
    u.salt = newSalt_();
    u.hash = hashPassword_(temp, u.salt);
    u.mustChange = true;
    saveUsers_(users);
    CacheService.getScriptCache().remove('fail_' + username);
    return { status: 'ok', user: publicUser_(username, u) };
  }

  if (action === 'deleteUser') {
    const username = normalizeUsername_(p.username);
    if (!users[username]) return { status: 'error', message: 'Usuário não encontrado.' };
    if (username === session.username) return { status: 'error', message: 'Você não pode excluir o próprio usuário.' };
    delete users[username];
    if (countActiveAdmins_(users) === 0) return { status: 'error', message: 'É preciso manter pelo menos um administrador ativo.' };
    saveUsers_(users);
    return { status: 'ok' };
  }

  return { status: 'error', message: 'Ação desconhecida.' };
}

// Guarda por 10 min o motivo de uma gravação recusada, para o PC consultar.
function rememberRejection_(saveId, reason) {
  if (saveId) CacheService.getScriptCache().put('rej_' + saveId, reason, 600);
}

function autorizarPermissoes() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  getDbSheet_(ss);
  Logger.log('Permissões autorizadas com sucesso: ' + ss.getName());
}

function getDbSheet_(ss) {
  let sheet = ss.getSheetByName(DB_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(DB_SHEET_NAME);
  return sheet;
}

// Lê o banco salvo. Retorna o objeto completo ou null se a planilha estiver vazia.
function readDb_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 1) return null;

  const a1 = sheet.getRange('A1').getValue();
  const b1 = sheet.getRange('B1').getValue();

  // ---- Formato novo (V3): pedaços por linha ----
  if (a1 === FORMAT_V3) {
    if (lastRow < 2) return null;
    const rows = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
    const parts = {};
    rows.forEach(r => {
      const key = String(r[0] || '');
      const sep = key.lastIndexOf('#');
      if (sep <= 0) return;
      const name = key.substring(0, sep);
      const idx = Number(key.substring(sep + 1));
      let chunk = String(r[1] || '');
      if (chunk.charAt(0) === '~') chunk = chunk.substring(1);
      if (!parts[name]) parts[name] = [];
      parts[name][idx] = chunk;
    });

    const join = name => (parts[name] || []).join('');
    const meta = parts['__meta__'] ? JSON.parse(join('__meta__')) : {};
    const db = Object.assign({}, meta);
    db.dailyLogs = parts['__logs__'] ? JSON.parse(join('__logs__')) : (meta.dailyLogs || []);
    db.years = {};
    Object.keys(parts).forEach(name => {
      if (name === '__meta__' || name === '__logs__') return;
      db.years[name] = JSON.parse(join(name));
    });
    return db;
  }

  // ---- Formato anterior (V2): meta em A1, anos nas linhas 3+ ----
  if (b1 === 'PARTITIONED_V2') {
    const meta = JSON.parse(a1 || '{}');
    const years = {};
    if (lastRow >= 3) {
      sheet.getRange(3, 1, lastRow - 2, 2).getValues().forEach(r => {
        if (r[0] && r[1]) years[r[0]] = JSON.parse(r[1]);
      });
    }
    return Object.assign({}, meta, { years: years, dailyLogs: meta.dailyLogs || [] });
  }

  // ---- Formato mais antigo: JSON inteiro em A1 ----
  if (a1) return JSON.parse(a1);
  return null;
}

// Grava o banco inteiro de uma vez (um único setValues) e limpa sobras.
function writeDb_(sheet, st) {
  const meta = {};
  Object.keys(st).forEach(k => {
    if (k !== 'years' && k !== 'dailyLogs' && k !== 'pcpPin') meta[k] = st[k];
  });
  if (Array.isArray(meta.appliedOpIds)) meta.appliedOpIds = meta.appliedOpIds.slice(-MAX_APPLIED_OP_IDS);
  const logs = (st.dailyLogs || []).slice(-MAX_DAILY_LOGS);

  const entries = [['__meta__', JSON.stringify(meta)], ['__logs__', JSON.stringify(logs)]];
  Object.keys(st.years || {}).forEach(yr => entries.push([String(yr), JSON.stringify(st.years[yr])]));

  const rows = [[FORMAT_V3, 'Última atualização: ' + new Date().toLocaleString('pt-BR')]];
  entries.forEach(([name, text]) => {
    for (let i = 0, n = 0; i < text.length || n === 0; i += CHUNK_SIZE, n++) {
      rows.push([name + '#' + n, '~' + text.substring(i, i + CHUNK_SIZE)]);
    }
  });

  const oldLastRow = sheet.getLastRow();
  sheet.getRange(1, 1, rows.length, 2).setValues(rows);
  if (oldLastRow > rows.length) {
    sheet.getRange(rows.length + 1, 1, oldLastRow - rows.length, Math.max(2, sheet.getLastColumn())).clearContent();
  }
}

function respond_(obj, callback) {
  const text = JSON.stringify(obj);
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + text + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  const params = (e && e.parameter) ? e.parameter : {};
  const callback = params.callback || null;
  try {
    const sheet = getDbSheet_(SpreadsheetApp.getActiveSpreadsheet());

    // Resultado de uma ação enviada por POST (login, troca de senha, usuários...).
    if (params.action === 'result') {
      const raw = CacheService.getScriptCache().get('res_' + String(params.opId || ''));
      return respond_(raw ? JSON.parse(raw) : { pending: true }, callback);
    }

    // Confere a sessão (não devolve dados de produção).
    if (params.action === 'session') {
      const s = getSession_(sheet, params.token);
      return respond_(s ? { ok: true, user: publicUser_(s.username, s.user) } : { ok: false }, callback);
    }

    // Lista de usuários (só administrador).
    if (params.action === 'users') {
      const s = getSession_(sheet, params.token);
      if (!s || s.user.role !== 'admin') return respond_({ status: 'error', code: 'forbidden', message: 'Apenas administradores.' }, callback);
      const list = Object.keys(s.users).sort().map(k => publicUser_(k, s.users[k]));
      return respond_({ status: 'ok', users: list }, callback);
    }

    const db = readDb_(sheet);
    if (!db) return respond_({ empty: true }, callback);
    delete db.pcpPin; // nunca envia o PIN antigo ao navegador

    // Com token: informa se a sessão continua valendo (usuário desativado, expirado...).
    if (params.token) {
      const s = getSession_(sheet, params.token);
      db.session = s ? publicUser_(s.username, s.user) : null;
    }

    // O PC pergunta se a gravação dele (saveId) foi recusada e por quê.
    if (params.saveId) {
      const reason = CacheService.getScriptCache().get('rej_' + params.saveId);
      if (reason) db.rejection = reason;
    }
    return respond_(db, callback);
  } catch (err) {
    return respond_({ status: 'error', message: err.toString() }, callback);
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) {
    // Não grava sem o lock: o PC vai perceber na leitura de confirmação e tentar de novo.
    return respond_({ status: 'error', message: 'Servidor ocupado, tente novamente.' });
  }

  try {
    const payload = JSON.parse(e.postData ? e.postData.contents : '{}');
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getDbSheet_(ss);

    // ---- Ações de conta (login, senha, usuários) ----
    if (payload.action) {
      return rememberResult_(payload.opId, handleAccountAction_(sheet, payload));
    }

    if (!payload.state || !payload.state.years) {
      return respond_({ status: 'error', message: 'Payload sem estado.' });
    }

    // ---- Login obrigatório (perfil admin ou pcp) para gravar ----
    const saveId = payload.state.saveId;
    const session = getSession_(sheet, payload.token);
    if (!canWrite_(session)) {
      const reason = !session ? 'auth' : (session.user.mustChange ? 'mustChange' : 'forbidden');
      rememberRejection_(saveId, reason);
      return respond_({ status: 'error', message: 'Gravação recusada (' + reason + ').' });
    }
    delete payload.state.session;
    delete payload.state.rejection;

    // ---- Controle de conflito ----
    // O PC informa em qual versão da nuvem se baseou (baseUpdatedAt).
    // Se a nuvem já está em outra versão, outro PC salvou antes: recusa.
    // (PCs com a página antiga não enviam baseUpdatedAt e continuam gravando.)
    const hasBase = Object.prototype.hasOwnProperty.call(payload, 'baseUpdatedAt');
    if (hasBase) {
      const current = readDb_(sheet);
      const currentUpdatedAt = current ? Number(current.updatedAt) || null : null;
      const base = payload.baseUpdatedAt === null ? null : Number(payload.baseUpdatedAt);
      if (current && currentUpdatedAt !== base) {
        rememberRejection_(saveId, 'conflict');
        return respond_({ status: 'conflict', updatedAt: currentUpdatedAt });
      }
    }

    writeDb_(sheet, payload.state);

    // ---- Histórico em planilha (só quando a gravação foi aceita) ----
    const logs = Array.isArray(payload.lastLogs) ? payload.lastLogs.slice() : [];
    if (payload.lastLog) logs.push(payload.lastLog);
    if (logs.length > 0) {
      let logSheet = ss.getSheetByName(LOG_SHEET_NAME);
      if (!logSheet) {
        logSheet = ss.insertSheet(LOG_SHEET_NAME);
        logSheet.appendRow(['Carimbo de Data/Hora', 'ID Registro', 'Data Apontamento', 'Semana/Mês/Ano', 'Máquina', 'Categoria', 'Bitola', 'Operação', 'Peso (kg)', 'Lançado por']);
      } else if (!logSheet.getRange(1, 10).getValue()) {
        logSheet.getRange(1, 10).setValue('Lançado por');
      }
      const who = session.user.name + ' (' + session.username + ')';
      const now = new Date();
      const rows = logs.map(l => [
        now,
        l.id || '',
        l.date || '',
        'Semana ' + ((l.weekIndex || 0) + 1) + ' - ' + (l.monthName || '') + '/' + (l.year || ''),
        l.machine || '',
        l.category || '',
        l.gauge || '',
        l.mode || '',
        l.kg,
        who
      ]);
      logSheet.getRange(logSheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
    }

    return respond_({ status: 'ok', updatedAt: payload.state.updatedAt });
  } catch (err) {
    return respond_({ status: 'error', message: err.toString() });
  } finally {
    lock.releaseLock();
  }
}
