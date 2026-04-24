// ============================================================
//  VerbMaster — Google Apps Script Backend
//  1. Crea una Google Sheet nueva (anota el ID de la URL)
//  2. Ve a Extensiones > Apps Script → pega este código
//  3. Reemplaza SPREADSHEET_ID con el ID de tu hoja
//  4. Implementar > Nueva implementación > Aplicación web
//     Ejecutar como: Yo  |  Quién puede acceder: Cualquier usuario
//  5. Copia la URL generada y pégala en index.html (SCRIPT_URL)
// ============================================================

const SPREADSHEET_ID = '1eQFztJ3h5hEtIAss1vYgQ-KYsCsQUKiWkzGCShicO0g';

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(15000);
  try {
    const body = JSON.parse(e.postData.contents);
    let result;
    switch (body.action) {
      case 'register':    result = register(body);     break;
      case 'login':       result = login(body);        break;
      case 'save':        result = saveSession(body);  break;
      case 'leaderboard': result = leaderboard();      break;
      default:            result = { error: 'Acción desconocida' };
    }
    return out(result);
  } catch (err) {
    return out({ error: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  if (e.parameter.action === 'leaderboard') return out(leaderboard());
  return out({ status: 'VerbMaster API OK' });
}

function out(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── SHEET ─────────────────────────────────────────────────────────────────────
function getSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('users');
  if (!sheet) {
    sheet = ss.insertSheet('users');
    sheet.appendRow(['username', 'pin', 'streak', 'day_number', 'progress', 'history', 'updated_at']);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function findUserRow(sheet, username) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase() === username) {
      return { rowNum: i + 1, row: data[i] };
    }
  }
  return null;
}

// ── REGISTER ──────────────────────────────────────────────────────────────────
function register({ username, pin }) {
  if (!username || !pin) return { error: 'Faltan datos' };
  username = username.toLowerCase().trim();
  if (username.length < 3) return { error: 'Usuario mínimo 3 caracteres' };
  if (!/^\d{4}$/.test(String(pin))) return { error: 'PIN debe ser 4 dígitos' };

  const sheet = getSheet();
  if (findUserRow(sheet, username)) return { error: 'Ese usuario ya existe' };

  sheet.appendRow([username, String(pin), 0, 1, '{}', '[]', new Date().toISOString()]);
  return {
    success: true,
    user: { username, streak: 0, dayNumber: 1 },
    progress: {},
    history: []
  };
}

// ── LOGIN ─────────────────────────────────────────────────────────────────────
function login({ username, pin }) {
  if (!username || !pin) return { error: 'Faltan datos' };
  username = username.toLowerCase().trim();

  const sheet = getSheet();
  const found = findUserRow(sheet, username);
  if (!found) return { error: 'Usuario no encontrado' };
  if (String(found.row[1]) !== String(pin)) return { error: 'PIN incorrecto' };

  return {
    success: true,
    user: {
      username,
      streak: Number(found.row[2]) || 0,
      dayNumber: Number(found.row[3]) || 1
    },
    progress: found.row[4] ? JSON.parse(found.row[4]) : {},
    history: found.row[5] ? JSON.parse(found.row[5]) : []
  };
}

// ── SAVE SESSION ──────────────────────────────────────────────────────────────
function saveSession({ username, pin, streak, dayNumber, progress, session }) {
  username = username.toLowerCase().trim();
  const sheet = getSheet();
  const found = findUserRow(sheet, username);
  if (!found || String(found.row[1]) !== String(pin)) return { error: 'Auth inválida' };

  const history = found.row[5] ? JSON.parse(found.row[5]) : [];
  if (session) {
    history.push(session);
    if (history.length > 14) history.shift();
  }

  sheet.getRange(found.rowNum, 3, 1, 5).setValues([[
    streak,
    dayNumber,
    JSON.stringify(progress),
    JSON.stringify(history),
    new Date().toISOString()
  ]]);

  return { success: true };
}

// ── LEADERBOARD ───────────────────────────────────────────────────────────────
function leaderboard() {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  const leaders = [];

  for (let i = 1; i < data.length; i++) {
    const username  = data[i][0];
    const streak    = Number(data[i][2]) || 0;
    const dayNum    = Number(data[i][3]) || 1;
    const progress  = data[i][4] ? JSON.parse(data[i][4]) : {};
    const history   = data[i][5] ? JSON.parse(data[i][5]) : [];

    let mastered = 0, introduced = 0;
    Object.values(progress).forEach(p => {
      if (p.introduced) { introduced++; if (p.level >= 4) mastered++; }
    });

    const lastPct = history.length ? history[history.length - 1].pct : null;
    leaders.push({ username, streak, dayNum, mastered, introduced, lastPct });
  }

  leaders.sort((a, b) => b.mastered - a.mastered || b.streak - a.streak || b.introduced - a.introduced);
  return { success: true, leaders };
}
