# VerbMaster 🚀
**Sistema de aprendizaje adaptativo para verbos irregulares en inglés**

100 verbos · Repetición espaciada · Multi-usuario · Clasificación entre amigos

---

## ⚡ Setup en 4 pasos

### PASO 1 — Crea la Google Sheet

1. Ve a [sheets.google.com](https://sheets.google.com) y crea una hoja nueva
2. Copia el **ID** de la URL: `https://docs.google.com/spreadsheets/d/**ESTE_ES_EL_ID**/edit`

---

### PASO 2 — Configura el Apps Script (backend gratuito)

1. En tu Google Sheet: **Extensiones → Apps Script**
2. Borra el código que aparece y **pega todo el contenido de `Code.gs`**
3. En la línea 10, reemplaza `'REEMPLAZA_CON_EL_ID_DE_TU_GOOGLE_SHEET'` con el ID del paso anterior
4. Guarda (Ctrl+S)
5. Clic en **"Implementar" → "Nueva implementación"**
   - Tipo: **Aplicación web**
   - Ejecutar como: **Yo**
   - Quién puede acceder: **Cualquier usuario**
6. Clic en **"Implementar"** → copia la **URL** que aparece (la necesitas en el paso 3)

> ⚠️ Si Google pide permisos, acepta todo (es tu propio script)

---

### PASO 3 — Configura la URL en index.html

Abre `index.html` con cualquier editor de texto y busca la línea:

```javascript
const SCRIPT_URL = 'REEMPLAZA_CON_TU_URL_DE_APPS_SCRIPT';
```

Reemplaza el texto con la URL copiada en el paso anterior. Ejemplo:

```javascript
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfy.../exec';
```

---

### PASO 4 — Sube a GitHub Pages

1. Ve a [github.com](https://github.com) → **New repository**
   - Nombre: `verbmaster`
   - Público ✓
   - Clic en **Create repository**

2. En el repo recién creado, clic en **"uploading an existing file"**
   - Arrastra y suelta `index.html` y `Code.gs`
   - Clic en **Commit changes**

3. Ve a **Settings → Pages**
   - Source: **Deploy from a branch**
   - Branch: **main** / **root**
   - Clic en **Save**

4. En ~2 minutos tu app estará en:
   ```
   https://TU_USUARIO.github.io/verbmaster/
   ```

¡Comparte esa URL con tus amigos! 🎉

---

## 🎮 Cómo funciona

| Pantalla | Descripción |
|---|---|
| 🔑 Login | Cada amigo crea su cuenta con usuario + PIN de 4 dígitos |
| 🏠 Home | Estadísticas personales, racha, sesiones recientes |
| 📖 Estudio | Tarjetas con base → pasado → participio + 2 ejemplos en contexto |
| 🎯 Quiz | 12 preguntas mezcladas: selección múltiple + escritura + frases con espacio en blanco |
| ✓/✗ Feedback | Retroalimentación inmediata con corrección antes de continuar |
| 📊 Progreso | Lista completa de los 100 verbos filtrable por nivel |
| 🏆 Clasificación | Ranking de todos los amigos por verbos dominados |

## 🧠 Sistema de repetición espaciada

```
Nivel 0 → repite mañana
Nivel 1 → repite en 1 día
Nivel 2 → repite en 2 días
Nivel 3 → repite en 4 días
Nivel 4 → repite en 7 días  (Fuerte 💪)
Nivel 5 → repite en 14 días (Dominado 🏆)
```

- Acierto → sube de nivel, se espacia
- Error → baja de nivel, vuelve mañana
- 2 errores seguidos → se repite 2 días seguidos

## 📁 Estructura del proyecto

```
verbmaster/
├── index.html    ← App completa (React + Babel, sin build)
├── Code.gs       ← Backend (Google Apps Script)
└── README.md     ← Este archivo
```

## 🆓 Costo

- **Google Sheets + Apps Script**: 100% gratuito
- **GitHub Pages**: 100% gratuito
- **Total**: $0

---

Hecho con ❤️ para aprender inglés con amigos
