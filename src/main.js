import copy from '/node_modules/copy-text-to-clipboard/index.js';
import Database from '@tauri-apps/plugin-sql';
import { exit } from '@tauri-apps/plugin-process';

let db;
let usedEmojis = [];
let highlightedBtn = null;
let selectedEmojis = [];
let extraSearchableTexts = {};
let dialogOpen = false;
let dialogMode = 'emoji';
let dialogEmojiBtns = [];
let dialogEmojiBaseName = null;
let highlightedDialogBtn = null;
let updateExtraSearchableTextTimeout = null;

const filterStyleSheet = document.getElementById('filter_style').sheet;
const filterInput = document.getElementById('filter-input');
const filteredEmojisEl = document.getElementById('filtered-emojis');
const selectedEmojisEl = document.getElementById('selected-emojis');
const selectedEmojiModelBtn = document.getElementById('selected-emoji-model-btn');
let emojiBtns = filteredEmojisEl.getElementsByClassName('emoji-btn');

const dialog = document.getElementById('dialog');
const dialogBackdrop = document.getElementById('dialog-backdrop');
const dialogPanel = document.getElementById('dialog-panel');

function parseIntSafe(val, minVal = 0) {
  if (!val) return 0;
  val = parseInt(val);
  if (isNaN(val) || (minVal !== null && val < minVal)) return minVal;
  return val;
}

function parseBooleanSafe(val) {
  return !(!val || val === 'false');
}

function getSourceButton(emojiName) {
  for (let i=0; i<emojiBtns.length; ++i) {
    if (emojiBtns[i].dataset.pinned !== 'true' && emojiBtns[i].dataset.used !== 'true' && emojiBtns[i].title === emojiName) {
      return emojiBtns[i];
    }
  }
  return null;
}

function updateUsedEmojiBtns(onLoad = false) {
  
  const maxUsedEmojiBtns = Math.min(settings.max_used_emojis, usedEmojis.length);
  let pinnedEmojiBtnCount = 0;
  let usedEmojiBtnCount = 0;
  let insertBeforeBtn = null;
  let i;
  
  if (!onLoad) {
    for (i=0; i<emojiBtns.length; ++i) {
      if (emojiBtns[i].dataset.pinned === 'true') {
        ++pinnedEmojiBtnCount;
      } else if (emojiBtns[i].dataset.used === 'true') {
        ++usedEmojiBtnCount;
      } else {
        insertBeforeBtn = emojiBtns[i];
        break;
      }
    }
  }
  
  if (usedEmojiBtnCount < maxUsedEmojiBtns) {
    let insertAfterBtn = null;
    for (i=usedEmojiBtnCount; i<maxUsedEmojiBtns; ++i) {
      const sourceBtn = getSourceButton(usedEmojis[i].name);
      if (sourceBtn) {
        // Note: If something goes wrong and the source button is not found,
        // The actual number of displayed buttons may be fewer than the max.
        const btn = sourceBtn.cloneNode();
        btn.dataset.used = 'true';
        btn.textContent = sourceBtn.textContent;
        if (insertAfterBtn) insertAfterBtn.insertAdjacentElement('afterend', btn);
        else if (insertBeforeBtn) insertBeforeBtn.insertAdjacentElement('beforebegin', btn);
        else filteredEmojisEl.prepend(btn);
        insertAfterBtn = btn;
      }
    }
  } else if (usedEmojiBtnCount > maxUsedEmojiBtns) {
    while (emojiBtns[pinnedEmojiBtnCount + maxUsedEmojiBtns].dataset.used === 'true') {
      if (emojiBtns[pinnedEmojiBtnCount + maxUsedEmojiBtns] === highlightedBtn) emojiNav();
      emojiBtns[pinnedEmojiBtnCount + maxUsedEmojiBtns].remove();
    }
  }
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
  highlightFirstEmojiBtn();
}

function dialogEmojiNav(forward = true) {
  let newBtn = null;
  if (!highlightedDialogBtn) {
    if (dialogEmojiBtns.length) newBtn = dialogEmojiBtns[0];
  } else {
    for (let i=0; i<dialogEmojiBtns.length; ++i) {
      if (dialogEmojiBtns[i] === highlightedDialogBtn) {
        if (forward) {
          if (i < dialogEmojiBtns.length - 1) newBtn = dialogEmojiBtns[i+1];
        } else {
          if (i > 0) newBtn = dialogEmojiBtns[i-1];
        }
      }
    }
  }
  if (newBtn) {
    if (highlightedDialogBtn) highlightedDialogBtn.classList.remove('selected');
    highlightedDialogBtn = newBtn;
    highlightedDialogBtn.classList.add('selected');
  }
}

window.filterEmojis = function (e) {
  while (filterStyleSheet.cssRules.length) {
    filterStyleSheet.deleteRule(0);
  }
  const filter = CSS.escape((e.target.value.toString() ?? '').trim().toLowerCase());
  if (filter) {
    filterStyleSheet.insertRule('#filtered-emojis .emoji-btn:not([data-searchable-text*="'+filter+'"]){display:none;}');
  }
  highlightFirstEmojiBtn();
}

window.applyFilter = function (val) {
  filterInput.value = val;
  closeDialog();
  filterInput.focus();
  filterEmojis({ target: filterInput });
}

window.clearFilterInput = function () {
  filterInput.value = '';
  filterInput.focus();
  filterEmojis({ target: filterInput });
}

window.handleEmojiBtnClick = function (e, btn) {
  if (btn.dataset.inDialog !== 'true') {
    if (highlightedBtn) highlightedBtn.classList.remove('selected');
    highlightBtn(btn);
  }
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
    removeEmojiFromHistory(btn);
  } else if (!e.shiftKey && !e.ctrlKey && e.altKey) {
    showDialog('emoji', btn);
  }
}

function handleKeydown(e) {
  switch (e.keyCode) {
    case 9: // Tab
      if (dialogOpen) {
        if (dialogMode === 'emoji') {
          e.preventDefault();
          dialogEmojiNav(!e.shiftKey);
        }
      } else {
        e.preventDefault();
        emojiNav(!e.shiftKey);
      }
      break;
    case 13: // Enter
      if (dialogOpen) {
        if (dialogMode === 'emoji') {
          e.preventDefault();
          if (highlightedDialogBtn) handleEmojiBtnClick(e, highlightedDialogBtn);
        }
      } else {
        e.preventDefault();
        if (highlightedBtn) handleEmojiBtnClick(e, highlightedBtn);
      }
      break;
    case 27: // Esc
      event.preventDefault();
      if (dialogOpen) closeDialog();
      else clearFilterInput();
      break;
    case 87: // w
      if (e.ctrlKey) {
        event.preventDefault();
        exit(0);
      }
      break;
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
  if (rowsToDelete > 0) {
    let deletedRows = 0;
    for (let i=0; i<rows.length; ++i) {
      if (deletedRows < rowsToDelete) {
        await db.execute('DELETE FROM used_emojis WHERE rowid=?;', [rows[i].rowid]);
        ++deletedRows;
      } else {
        await db.execute('UPDATE used_emojis SET rowid=? WHERE rowid=?;', [(i - deletedRows + 1), rows[i].rowid]);
      }
    }
  }
}

function removeEmojiFromHistory(btn) {
  if (btn.dataset.used === 'true') emojiNav();
  const usedEmojiBtns = filteredEmojisEl.querySelectorAll('.emoji-btn[data-used="true"]');
  for (const usedEmojiBtn of usedEmojiBtns) {
    if (usedEmojiBtn.title === btn.title) {
      usedEmojiBtn.remove();
      break;
    }
  }
  if (db) db.execute('DELETE FROM used_emojis WHERE emoji_name=?;', [btn.title]);
}

window.clearEmojiHistory = function () {
  document.getElementById('btn-clear-emoji-history').disabled = true;
  const usedEmojiBtns = filteredEmojisEl.querySelectorAll('.emoji-btn[data-used="true"]');
  for (const usedEmojiBtn of usedEmojiBtns) {
    if (usedEmojiBtn === highlightedBtn) emojiNav();
    usedEmojiBtn.remove();
  }
  if (db) db.execute('DELETE FROM used_emojis;');
  document.getElementById('svg-clear-history-clock').classList.add('hidden');
  document.getElementById('svg-clear-history-check').classList.remove('hidden');
  setTimeout(() => {
    document.getElementById('svg-clear-history-check').classList.add('hidden');
    document.getElementById('svg-clear-history-clock').classList.remove('hidden');
    document.getElementById('btn-clear-emoji-history').disabled = false;
  }, 3000);
}

function togglePinnedEmoji(sourceBtn, onLoad = false) {
  if (!onLoad) {
    if (sourceBtn.dataset.pinned) {
      emojiNav();
      sourceBtn.remove();
      savePinnedEmojisToDb();
      return false;
    }
    for (let i=0; i<emojiBtns.length; ++i) {
      if (emojiBtns[i].dataset.pinned !== 'true') break;
      if (emojiBtns[i].title === sourceBtn.title) {
        const thisBtn = emojiBtns[i];
        thisBtn.remove();
        filteredEmojisEl.prepend(thisBtn);
        savePinnedEmojisToDb();
        return false;
      }
    }
  }
  const btn = sourceBtn.cloneNode();
  btn.classList.remove('selected');
  btn.dataset.pinned = 'true';
  btn.removeAttribute('data-used');
  btn.textContent = sourceBtn.textContent;
  filteredEmojisEl.prepend(btn);
  if (!onLoad) savePinnedEmojisToDb();
}

async function savePinnedEmojisToDb() {
  if (!db) return false;
  await db.execute('DELETE FROM pinned_emojis;');
  for (let i=0; i<emojiBtns.length; ++i) {
    if (emojiBtns[i].dataset.pinned !== 'true') break;
    await db.execute('INSERT INTO pinned_emojis (emoji_name) VALUES (?);', [emojiBtns[i].title]);
  }
}

window.showDialog = function (mode, btn = null) {
  dialogOpen = true;
  dialogMode = mode;
  const modeClassToAdd = 'dialog-'+mode;
  const modeClasses = ['dialog-emoji', 'dialog-help', 'dialog-settings'];
  document.body.classList.remove(...modeClasses.filter(x => x !== modeClassToAdd));
  document.body.classList.add(modeClassToAdd);
  dialogEmojiBtns = [];
  highlightedDialogBtn = null;
  if (mode === 'emoji') {
    document.getElementById('dialog-emoji-title').textContent = String(btn.title).charAt(0).toUpperCase() + String(btn.title).slice(1);
    document.getElementById('dialog-emoji-category').textContent = btn.dataset.category;
    document.getElementById('dialog-emoji-subcategory').textContent = btn.dataset.subcategory;
    const extraSearchableText = (extraSearchableTexts[btn.dataset.baseName] ?? '').trim();
    displayExtraSearchableText(extraSearchableText);
    const dialogEmojisEl = document.getElementById('dialog-emojis');
    dialogEmojisEl.textContent = '';
    dialogEmojiBaseName = btn.dataset.baseName;
    const sourceBtn = getSourceButton(btn.title);
    let variantBtns = [];
    let foundBtn = false;
    for (let i=0; i<emojiBtns.length; ++i) {
      if (emojiBtns[i].dataset.pinned === 'true' || emojiBtns[i].dataset.used === 'true') continue;
      if (emojiBtns[i].dataset.baseName === btn.dataset.baseName) {
        variantBtns.push(emojiBtns[i]);
        foundBtn = true;
      } else if (foundBtn) {
        break;
      }
    }
    variantBtns.unshift(sourceBtn);
    for (let i=0; i<variantBtns.length; ++i) {
      const variantBtn = variantBtns[i];
      if (i > 0 && variantBtn.title === sourceBtn.title) continue;
      const newBtn = variantBtn.cloneNode();
      newBtn.classList.remove('selected');
      newBtn.removeAttribute('data-pinned');
      newBtn.removeAttribute('data-used');
      newBtn.dataset.inDialog = 'true';
      newBtn.textContent = variantBtn.textContent;
      dialogEmojisEl.appendChild(newBtn);
      dialogEmojiBtns.push(newBtn);
    }
  } else {
    dialogEmojiBaseName = null;
  }
  dialogEmojiNav();
  dialog.show();
  setTimeout(() => {
    dialogBackdrop.removeAttribute('data-closed');
    dialogPanel.removeAttribute('data-closed');
  }, 10);
}

function displayExtraSearchableText(extraSearchableText) {
  document.getElementById('add-extra-searchable-text-btn').classList.toggle('hidden', extraSearchableText);
  document.getElementById('dialog-emoji-extra-searchable-text').textContent = extraSearchableText;
  document.getElementById('input-extra-searchable-text').value = extraSearchableText;
}

window.toggleExtraSearchableTextInput = function () {
  const isHidden = document.getElementById('container-input-extra-searchable-text').classList.toggle('hidden');
  if (!isHidden) document.getElementById('input-extra-searchable-text').focus();
}

window.updateExtraSearchableText = function () {
  if (!dialogEmojiBaseName) return false;
  clearTimeout(updateExtraSearchableTextTimeout);
  updateExtraSearchableTextTimeout = setTimeout(async () => {
    if (!db) return false;
    const extraSearchableText = document.getElementById('input-extra-searchable-text').value.trim();
    if (extraSearchableText) {
      const result = await db.execute('UPDATE extra_searchable_texts SET searchable_text=? WHERE emoji_name=?', [extraSearchableText, dialogEmojiBaseName]);
      if (!result.rowsAffected) {
        await db.execute('INSERT INTO extra_searchable_texts (emoji_name, searchable_text) VALUES (?, ?);', [dialogEmojiBaseName, extraSearchableText]);
      }
    } else {
      await db.execute('DELETE FROM extra_searchable_texts WHERE emoji_name=?', [dialogEmojiBaseName]);
    }
    displayExtraSearchableText(extraSearchableText);
    for (let i=0; i<emojiBtns.length; ++i) {
      if (emojiBtns[i].dataset.baseName === dialogEmojiBaseName) {
        emojiBtns[i].dataset.searchableText = (
          emojiBtns[i].title
          + ' ' + emojiBtns[i].category
          + ' ' + emojiBtns[i].subcategory
          + (extraSearchableText ? ' ' + extraSearchableText : '')
        ).toLowerCase();
      }
    }
  }, 250);
}

window.closeDialog = function () {
  dialogOpen = false;
  dialogBackdrop.setAttribute('data-closed', 'true');
  dialogPanel.setAttribute('data-closed', 'true');
  setTimeout(() => {
    dialog.close();
  }, 160);
}

window.setSetting = function (settingName, value, onLoad = false) {
  
  // Parse certain values
  if (settingName === 'max_used_emojis') {
    value = parseIntSafe(value);
  } else if (settingName === 'remember_used_emojis' || settingName === 'show_unsupported_emojis' || settingName === 'close_on_copy') {
    value = parseBooleanSafe(value);
  }
  
  // Record old value & store new value
  const oldValue = settings[settingName];
  settings[settingName] = value;
  
  // Handle value change
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
    if (value != oldValue) updateUsedEmojiBtns(onLoad);
    localStorage.max_used_emojis = value;
  } else if (settingName === 'show_unsupported_emojis') { // Show unsupported
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
      if (settings.st2 !== 'false') setSetting('st2', 'false', onLoad);
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
      if (settings.st2 === 'false') setSetting('st2', value, onLoad);
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
  
  // Update inputs if needed
  if (settingName === 'theme' || settingName === 'emoji_size' || settingName === 'st1' || settingName === 'st2' || settingName === 'hair' || settingName === 'dir') {
    const select = document.getElementById('select-'+settingName);
    if (select && select.value !== value) select.value = value;
  } else if (settingName === 'remember_used_emojis' || settingName === 'show_unsupported_emojis' || settingName === 'close_on_copy') {
    document.getElementById('checkbox-'+settingName).checked = value;
    value = (value ? 'true' : 'false');
  } else if (settingName === 'max_used_emojis') {
    document.getElementById('input-max_used_emojis').value = value;
  }
  
  // Save to db
  if (!onLoad) saveSettingToDb(settingName, value);
}

async function saveSettingToDb(settingName, value) {
  if (db) {
    const response = await db.execute('UPDATE settings SET value=? WHERE name=?;', [value, settingName]);
    console.log('saveSettingToDb', response);
  }
}

/**
 * Initialize
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

if ('emoji_size' in localStorage) setSetting('emoji_size', localStorage.emoji_size, true);
if ('max_used_emojis' in localStorage) setSetting('max_used_emojis', parseIntSafe(localStorage.max_used_emojis), true);
if ('close_on_copy' in localStorage) setSetting('close_on_copy', parseBooleanSafe(localStorage.close_on_copy), true);

async function loadStore() {
  
  db = await Database.load('sqlite:clemoji.db');
  if (!db) {
    alert('Error: could not load database.')
    return false;
  }
  let rows;
  
  // Get used emojis
  rows = await db.select('SELECT rowid, * FROM used_emojis ORDER BY rowid DESC LIMIT 100');
  rowLoop: for (let i=0; i<rows.length; ++i) {
    for (let j=0; j<usedEmojis.length; ++j) {
      if (usedEmojis[j].name === rows[i].emoji_name) {
        usedEmojis[j].hotness += rows.length - i;
        continue rowLoop;
      }
    }
    usedEmojis.push({ name: rows[i].emoji_name, hotness: rows.length - i });
  }
  usedEmojis.sort((a, b) => b.hotness - a.hotness);
  updateUsedEmojiBtns(true);
  
  // Get pinned emojis
  rows = await db.select('SELECT * FROM pinned_emojis');
  for (const row of rows) {
    const btn = getSourceButton(row.emoji_name);
    if (btn) togglePinnedEmoji(btn, true);
  }
  
  // Get settings
  rows = await db.select('SELECT * FROM settings');
  for (const row of rows) {
    setSetting(row.name, row.value, true);
  }
  
  highlightFirstEmojiBtn();
  
  // Get extra searchable texts
  rows = await db.select('SELECT * FROM extra_searchable_texts');
  for (const row of rows) {
    extraSearchableTexts[row.emoji_name] = row.searchable_text;
    for (let i=0; i<emojiBtns.length; ++i) {
      if (emojiBtns[i].dataset.baseName === row.emoji_name) {
        emojiBtns[i].dataset.searchableText = emojiBtns[i].dataset.searchableText + ' ' + CSS.escape(row.searchable_text);
      }
    }
  }
}

loadStore();

window.addEventListener("DOMContentLoaded", () => {
  
  filterInput.focus();
  
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
