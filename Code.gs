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
const GEMINI_MODEL = 'gemini-1.5-flash';

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
      case 'aiCoach':     result = aiCoach(body);      break;
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

// ── AI COACH (Gemini) ────────────────────────────────────────────────────────
// Guarda la key una vez en Apps Script:
// PropertiesService.getScriptProperties().setProperty('GEMINI_API_KEY', 'TU_API_KEY')
function aiCoach({ questionType, questionText, sentence, verbBase, verbMeaning, field, userAnswer, correctAnswer }) {
  const key = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!key) return { error: 'Falta GEMINI_API_KEY en Script Properties' };
  if (!questionText || !correctAnswer || !verbBase || !field) return { error: 'Faltan datos para generar feedback IA' };

  const payload = {
    contents: [{
      role: 'user',
      parts: [{
        text: buildAiPrompt({
          questionType,
          questionText,
          sentence,
          verbBase,
          verbMeaning,
          field,
          userAnswer,
          correctAnswer
        })
      }]
    }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 180
    }
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(key)}`;
  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const code = response.getResponseCode();
  const raw = response.getContentText();
  const data = raw ? JSON.parse(raw) : {};
  if (code < 200 || code >= 300) {
    const msg = data.error?.message || `Gemini HTTP ${code}`;
    return { error: `Error IA: ${msg}` };
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return { error: 'La IA no devolvió contenido' };
  return { success: true, text: String(text).trim() };
}

function buildAiPrompt(ctx) {
  return [
    'Eres un tutor de inglés para hispanohablantes.',
    'Devuelve solo texto en español, breve (2 a 4 frases), tono claro y motivador.',
    'No cambies ni inventes conjugaciones: usa como forma oficial únicamente "correctAnswer".',
    'Explica por qué la respuesta del usuario no coincide y da una pista práctica para recordarlo.',
    '',
    `Tipo de pregunta: ${ctx.questionType || 'desconocido'}`,
    `Campo evaluado: ${ctx.field === 'p' ? 'pasado simple' : 'participio pasado'}`,
    `Verbo base: ${ctx.verbBase}`,
    `Significado (es): ${ctx.verbMeaning || 'n/a'}`,
    `Pregunta: ${ctx.questionText}`,
    `Frase (si aplica): ${ctx.sentence || 'n/a'}`,
    `Respuesta del usuario: ${ctx.userAnswer || '(vacío)'}`,
    `Respuesta correcta oficial: ${ctx.correctAnswer}`,
    '',
    'Formato deseado:',
    '- Frase 1: diferencia concreta entre respuesta del usuario y correcta.',
    '- Frase 2: mini regla o patrón útil.',
    '- Frase 3 (opcional): un tip de memoria corto.'
  ].join('\n');
}
