const Database = window.__TAURI__.sql;
const { exit } = window.__TAURI__.process;

let db;
let emojiBtns = [];
let highlightedBtn = null;
let selectedEmojis = [];

const filterStyleSheet = document.getElementById('filter_style').sheet;
const filteredEmojisEl = document.getElementById('filtered-emojis');
const selectedEmojisEl = document.getElementById('selected-emojis');
const selectedEmojiModelBtn = document.getElementById('selected-emoji-model-btn');

/**
 * Initialize settings
 */
const settings = {
  theme: 'system',
  emoji_size: 'medium',
  max_used_emojis: 10,
  remember_used_emojis: true,
  show_unsupported_emojis: false,
  close_on_copy: true,
  st1: 'false',
  st2: 'false',
  hair: 'false',
  dir: 'false',
};

if ('emoji_size' in localStorage) setSetting('emoji_size', localStorage.emoji_size, false);
if ('max_used_emojis' in localStorage) setSetting('max_used_emojis', parseIntSafe(localStorage.max_used_emojis), false);
if ('close_on_copy' in localStorage) setSetting('close_on_copy', parseBooleanSafe(localStorage.close_on_copy), false);

async function loadStore() {
  db = await Database.load('sqlite:clemoji.db');
  // Get settings
  let rows = await db.select('SELECT * FROM settings');
  for (const row of rows) {
    setSetting(row.name, row.value, false);
  }
  // Get used emojis
  rows = await db.select('SELECT rowid, * FROM used_emojis ORDER BY rowid DESC LIMIT 100');
  let usedEmojis = [];
  rowLoop: for (let i=0; i<rows.length; ++i) {
    for (let j=0; j<usedEmojis.length; ++j) {
      if (usedEmojis[j].name === rows[i].emoji_name) {
        usedEmojis[j].hotness += rows.length - i;
        continue rowLoop;
      }
    }
    usedEmojis.push({ name: rows[i].emoji_name, hotness: rows.length - i });
  }
  usedEmojis.sort((a, b) => a.hotness - b.hotness);
  for (const usedEmoji of usedEmojis) {
    const sourceBtn = document.querySelector('.emoji-btn[title="'+CSS.escape(usedEmoji.name)+'"');
    if (sourceBtn) {
      const btn = sourceBtn.cloneNode();
      btn.dataset.used = 'true';
      btn.textContent = sourceBtn.textContent;
      filteredEmojisEl.prepend(btn);
    }
  }
  // Get pinned emojis
  rows = await db.select('SELECT * FROM pinned_emojis');
  for (const row of rows) {
    const btn = document.querySelector('.emoji-btn[title="'+CSS.escape(row.emoji_name)+'"');
    if (btn) togglePinnedEmoji(btn, true);
  }
  highlightFirstEmojiBtn();
}

loadStore();

function parseIntSafe(val, minVal = 0) {
  if (!val) return 0;
  val = parseInt(val);
  if (isNaN(val) || (minVal !== null && val < minVal)) return minVal;
  return val;
}

function parseBooleanSafe(val) {
  return !(!val || val === 'false');
}

function highlightBtn(btn) {
  btn.scrollIntoView({behavior: 'smooth', block: 'nearest'});
  btn.classList.add('selected');
  highlightedBtn = btn;
}

function highlightFirstEmojiBtn() {
  if (highlightedBtn) highlightedBtn.classList.remove('selected');
  for (const btn of emojiBtns) {
    if (btn.checkVisibility()) {
      highlightBtn(btn);
      return true;
    }
  }
  highlightedBtn = null;
}

function emojiNav(forward = true) {
  if (!highlightedBtn) {
    highlightFirstEmojiBtn();
    if (!highlightedBtn) return false;
  }
  let foundNewBtn = false;
  newBtn = highlightedBtn;
  while (!foundNewBtn) {
    newBtn = forward ? newBtn.nextElementSibling : newBtn.previousElementSibling;
    if (newBtn === null) return false;
    if (newBtn.checkVisibility()) {
      highlightedBtn.classList.remove('selected');
      highlightBtn(newBtn);
      return true;
    }
  }
}

function filterEmojis(e) {
  while (filterStyleSheet.cssRules.length) {
    filterStyleSheet.deleteRule(0);
  }
  const filter = CSS.escape((e.target.value.toString() ?? '').trim().toLowerCase());
  if (filter) {
    filterStyleSheet.insertRule('#filtered-emojis .emoji-btn:not([data-searchable-text*="'+filter+'"]){display:none;}');
  }
  highlightFirstEmojiBtn();
}

function handleEmojiBtnClick(e, btn) {
  if (highlightedBtn) highlightedBtn.classList.remove('selected');
  highlightBtn(btn);
  if (!e.shiftKey && !e.ctrlKey && !e.altKey) {
    selectedEmojis = [{ emoji: btn.textContent, name: btn.title }];
    handleSelectedEmojisChange();
    addEmojiToHistory(btn);
    if (settings.close_on_copy) setTimeout(() => exit(0), 10);
  } else if (e.shiftKey && !e.ctrlKey && !e.altKey) {
    selectedEmojis.push({ emoji: btn.textContent, name: btn.title });
    handleSelectedEmojisChange();
    addEmojiToHistory(btn);
  } else if (!e.shiftKey && e.ctrlKey && !e.altKey) {
    togglePinnedEmoji(btn);
  } else if (e.shiftKey && e.ctrlKey && !e.altKey) {
    // removeEmojiFromHistory(emojiData, highlightedEmojiIndex.value);
  }
}

function handleSelectedEmojisChange() {
  while (selectedEmojisEl.children.length) {
    selectedEmojisEl.removeChild(selectedEmojisEl.lastChild);
  }
  let strToCopy = '';
  for (let i=0; i<selectedEmojis.length; ++i) {
    const btn = selectedEmojiModelBtn.cloneNode();
    btn.removeAttribute('id');
    btn.textContent = selectedEmojis[i].emoji;
    btn.title = selectedEmojis[i].name;
    btn.classList.remove('hidden');
    btn.classList.add('selected-emoji-btn');
    btn.addEventListener('click', e => {
      selectedEmojis.splice(i, 1);
      handleSelectedEmojisChange();
    });
    selectedEmojisEl.appendChild(btn);
    strToCopy = strToCopy + selectedEmojis[i].emoji;
  }
  copy(strToCopy);
}

async function addEmojiToHistory(btn) {
  if (!db || !settings.remember_used_emojis) return false;
  await db.execute('INSERT INTO used_emojis (emoji_name) VALUES (?);', [btn.title]);
  let rows = await db.select('SELECT rowid, * FROM used_emojis ORDER BY rowid ASC');
  const rowsToDelete = rows.length - 100;
  let response;
  if (rowsToDelete > 0) {
    let deletedRows = 0;
    for (let i=0; i<rows.length; ++i) {
      if (deletedRows < rowsToDelete) {
        response = await db.execute('DELETE FROM used_emojis WHERE rowid=?;', [rows[i].rowid]);
        ++deletedRows;
      } else {
        response = await db.execute('UPDATE used_emojis SET rowid=? WHERE rowid=?;', [(i - deletedRows + 1), rows[i].rowid]);
      }
    }
  }
}

function togglePinnedEmoji(sourceBtn, onLoad = false) {
  if (!onLoad) {
    if (sourceBtn.dataset.pinned) {
      emojiNav();
      sourceBtn.remove();
      savePinnedEmojisToDb();
      return false;
    }
    const pinnedBtns = document.querySelectorAll('.emoji-btn[data-pinned]');
    for (const pinnedBtn of pinnedBtns) {
      if (pinnedBtn.title === sourceBtn.title) {
        pinnedBtn.remove();
        filteredEmojisEl.prepend(pinnedBtn);
        savePinnedEmojisToDb();
        return false;
      }
    }
  }
  btn = sourceBtn.cloneNode();
  btn.classList.remove('selected');
  btn.dataset.pinned = 'true';
  btn.textContent = sourceBtn.textContent;
  filteredEmojisEl.prepend(btn);
  if (!onLoad) savePinnedEmojisToDb();
}

async function savePinnedEmojisToDb() {
  if (!db) return false;
  await db.execute('DELETE FROM pinned_emojis;');
  const pinnedBtns = document.querySelectorAll('.emoji-btn[data-pinned]');
  for (const pinnedBtn of pinnedBtns) {
    await db.execute('INSERT INTO pinned_emojis (emoji_name) VALUES (?);', [pinnedBtn.title]);
  }
}

function handleKeydown(e) {
  switch (e.keyCode) {
    case 9: // Tab
      e.preventDefault();
      emojiNav(!e.shiftKey);
      break;
    case 13: // Enter
      e.preventDefault();
      if (highlightedBtn) handleEmojiBtnClick(e, highlightedBtn);
      break;
  }
}

function setSetting(settingName, value, updateDb = false) {
  
  if (settingName === 'max_used_emojis') {
    value = parseIntSafe(value);
  } else if (settingName === 'remember_used_emojis' || settingName === 'show_unsupported_emojis' || settingName === 'close_on_copy') {
    value = parseBooleanSafe(value);
  }
  settings[settingName] = value;
  
  if (settingName === 'theme') { // Theme
    document.documentElement.classList.toggle(
      'dark',
      value === 'dark' || (value === 'system' && window.matchMedia("(prefers-color-scheme: dark)").matches)
    );
    localStorage.theme = value;
  } else if (settingName === 'emoji_size') { // Emoji Size
    if (value === 'small') {
      document.body.classList.remove('emoji_size-large');
      document.body.classList.add('emoji_size-small');
    } else if (value === 'medium') {
      document.body.classList.remove('emoji_size-small', 'emoji_size-large');
    } else {
      document.body.classList.remove('emoji_size-small');
      document.body.classList.add('emoji_size-large');
    }
    localStorage.emoji_size = value;
  } else if (settingName === 'max_used_emojis') { // Max Used Emojis
    // TODO
    localStorage.max_used_emojis = value;
    // TODO
  } else if (settingName === 'remember_used_emojis') {
    // TODO
  } else if (settingName === 'show_unsupported_emojis') {
    document.body.classList.toggle('hide-unsupported', !value);
  } else if (settingName === 'close_on_copy') {
    localStorage.close_on_copy = value;
  } else if (settingName === 'st1') { // Skin Tone 1
    const st1Classes = ['st1-false','st1-lst','st1-mlst','st1-mst','st1-mdst','st1-dst'];
    const st1ClassToAdd = 'st1-'+value;
    document.body.classList.remove(...st1Classes.filter(x => x !== st1ClassToAdd));
    document.body.classList.add(st1ClassToAdd);
    if (value === 'false') {
      document.getElementById('st2-option-false').disabled = false;
      if (settings.st2 !== 'false') setSetting('st2', 'false', updateDb);
      document.getElementById('st2-option-lst').disabled = true;
      document.getElementById('st2-option-mlst').disabled = true;
      document.getElementById('st2-option-mst').disabled = true;
      document.getElementById('st2-option-mdst').disabled = true;
      document.getElementById('st2-option-dst').disabled = true;
    } else {
      document.getElementById('st2-option-lst').disabled = false;
      document.getElementById('st2-option-mlst').disabled = false;
      document.getElementById('st2-option-mst').disabled = false;
      document.getElementById('st2-option-mdst').disabled = false;
      document.getElementById('st2-option-dst').disabled = false;
      if (settings.st2 === 'false') setSetting('st2', value, updateDb);
      document.getElementById('st2-option-false').disabled = true;
    }
  } else if (settingName === 'st2') { // Skin Tone 2
    const st2Classes = ['st2-false','st2-lst','st2-mlst','st2-mst','st2-mdst','st2-dst'];
    const st2ClassToAdd = 'st2-'+value;
    document.body.classList.remove(...st2Classes.filter(x => x !== st2ClassToAdd));
    document.body.classList.add(st2ClassToAdd);
  } else if (settingName === 'hair') { // Hair
    const hairClasses = ['hair-false','hair-blond','hair-beard','hair-red','hair-curly','hair-white','hair-bald'];
    const hairClassToAdd = 'hair-'+value;
    document.body.classList.remove(...hairClasses.filter(x => x !== hairClassToAdd));
    document.body.classList.add(hairClassToAdd);
  } else if (settingName === 'dir') { // Direction
    if (value === 'false') {
      document.body.classList.remove('dir-right');
      document.body.classList.add('dir-false');
    } else {
      document.body.classList.remove('dir-false');
      document.body.classList.add('dir-right');
    }
  }
  
  if (settingName === 'theme' || settingName === 'emoji_size' || settingName === 'st1' || settingName === 'st2' || settingName === 'hair' || settingName === 'dir') {
    const select = document.getElementById('select-'+settingName);
    if (select && select.value !== value) select.value = value;
  } else if (settingName === 'show_unsupported_emojis' || settingName === 'close_on_copy') {
    document.getElementById('checkbox-'+settingName).checked = value;
    value = (value ? 'true' : 'false');
  }
  
  if (updateDb) saveSettingToDb(settingName, value);
}

async function saveSettingToDb(settingName, value) {
  if (db) {
    const response = await db.execute('UPDATE settings SET value=? WHERE name=?;', [value, settingName]);
    console.log('saveSettingToDb', response);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  
  emojiBtns = document.getElementById('filtered-emojis').getElementsByClassName('emoji-btn');
  
  highlightFirstEmojiBtn();
  
  window.addEventListener('keydown', handleKeydown);
  
  setTimeout(() => {
    // Use size comparison to detect unsupported emojis
    const el = document.createElement('span');
    el.style = "position:absolute;visibility:hidden;";
    el.textContent = '☺️';
    document.body.appendChild(el);
    let elSize = el.getBoundingClientRect();
    const compareW = elSize.width;
    const compareH = elSize.height;
    let btn;
    let codes;
    let supported;
    let emoji;
    for (let i=0; i<emojiBtns.length; ++i) {
      btn = emojiBtns[i];
      el.textContent = btn.textContent;
      elSize = el.getBoundingClientRect();
      supported = (elSize.width === compareW && elSize.height === compareH);
      if (!supported) {
        codes = btn.dataset.code.split(',').map(x => parseInt('0x'+x));
        emoji = String.fromCodePoint(...codes);
        el.textContent = emoji;
        elSize = el.getBoundingClientRect();
        supported = (elSize.width === compareW && elSize.height === compareH);
        if (supported) btn.textContent = emoji;
        else btn.dataset.unsupported = 'true';
      }
    }
    el.remove();
  }, 10);
  
});
