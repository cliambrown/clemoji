// const { invoke } = window.__TAURI__.core;

let emojiBtns = [];
let highlightedBtn = null;
const settings = {
  theme: 'system',
  emoji_size: 'medium',
  st1: 'false',
  st2: 'false',
  hair: 'false',
  dir: 'false',
};

function filterEmojis(e) {
  const filter = (e.target.value.toString() ?? '').trim().toLowerCase();
  for (let i=0; i<emojiBtns.length; ++i) {
    emojiBtns[i].dataset.filtered = filter && emojiBtns[i].dataset.searchableText.indexOf(filter) === -1
      ? 'true'
      : 'false';
  }
  highlightFirstEmojiBtn();
}

function highlightBtn(btn) {
  highlightedBtn = btn;
  highlightedBtn.classList.add('selected');
}

function highlightFirstEmojiBtn() {
  if (highlightedBtn) highlightedBtn.classList.remove('selected');
  for (const btn of emojiBtns) {
    if (btn.dataset.filtered === 'false') {
      highlightBtn(btn);
      return true;
    }
  }
  highlightedBtn = null;
}

function handleEmojiBtnClick(btn, e) {
  if (highlightedBtn) highlightedBtn.classList.remove('selected');
  highlightBtn(btn);
  if (!e.shiftKey && !e.ctrlKey && !e.altKey) {
    copy(btn.textContent);
  } else if (e.shiftKey && !e.ctrlKey && !e.altKey) {
    // addEmojiToSelected(emojiData, highlightedEmojiIndex.value);
  } else if (!e.shiftKey && e.ctrlKey && !e.altKey) {
    // pinEmoji(emojiData, highlightedEmojiIndex.value);
  } else if (e.shiftKey && e.ctrlKey && !e.altKey) {
    // removeEmojiFromHistory(emojiData, highlightedEmojiIndex.value);
  }
}

function emojiNav(forward = true) {
  if (!highlightedBtn) {
    highlightFirstEmojiBtn();
    return false;
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

function handleKeydown(e) {
  switch (e.keyCode) {
    case 9: // Tab
      e.preventDefault();
      emojiNav(!e.shiftKey);
      break;
    case 13: // Enter
      e.preventDefault();
      if (highlightedBtn) handleEmojiBtnClick(highlightedBtn, e);
      break;
  }
}

function setSetting(settingName, value) {
  console.log('setSetting', settingName, value)
  settings[settingName] = value;
  if (settingName === 'theme') {
    document.documentElement.classList.toggle(
      'dark',
      value === 'dark' || (value === 'system' && window.matchMedia("(prefers-color-scheme: dark)").matches)
    );
  } else if (settingName === 'emoji_size') {
    if (value === 'small') {
      document.body.classList.remove('emoji_size-large');
      document.body.classList.add('emoji_size-small');
    } else if (value === 'medium') {
      document.body.classList.remove('emoji_size-small', 'emoji_size-large');
    } else {
      document.body.classList.remove('emoji_size-small');
      document.body.classList.add('emoji_size-large');
    }
  } else if (settingName === 'st1') {
    const st1Classes = ['st1-false','st1-lst','st1-mlst','st1-mst','st1-mdst','st1-dst'];
    const st1ClassToAdd = 'st1-'+value;
    document.body.classList.remove(...st1Classes.filter(x => x !== st1ClassToAdd));
    document.body.classList.add(st1ClassToAdd);
    if (value === 'false') {
      document.getElementById('st2-option-false').disabled = false;
      if (settings.st2 !== 'false') setSetting('st2', 'false');
      document.getElementById('select-st2').value = 'false';
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
      if (settings.st2 === 'false') setSetting('st2', value);
      document.getElementById('select-st2').value = value;
      document.getElementById('st2-option-false').disabled = true;
    }
  } else if (settingName === 'st2') {
    const st2Classes = ['st2-false','st2-lst','st2-mlst','st2-mst','st2-mdst','st2-dst'];
    const st2ClassToAdd = 'st2-'+value;
    document.body.classList.remove(...st2Classes.filter(x => x !== st2ClassToAdd));
    document.body.classList.add(st2ClassToAdd);
  } else if (settingName === 'hair') {
    const hairClasses = ['hair-false','hair-blond','hair-beard','hair-red','hair-curly','hair-white','hair-bald'];
    const hairClassToAdd = 'hair-'+value;
    document.body.classList.remove(...hairClasses.filter(x => x !== hairClassToAdd));
    document.body.classList.add(hairClassToAdd);
  } else if (settingName === 'dir') {
    if (value === 'false') {
      document.body.classList.remove('dir-right');
      document.body.classList.add('dir-false');
    } else {
      document.body.classList.remove('dir-false');
      document.body.classList.add('dir-right');
    }
  }
}

window.addEventListener("DOMContentLoaded", () => {
  
  emojiBtns = document.getElementsByClassName('emoji-btn');
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
