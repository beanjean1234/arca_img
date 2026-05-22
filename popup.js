const SETTINGS_KEY = 'arcaSettings';
const DEFAULT_SETTINGS = {
  isFolded: false,
  whiteMode: false,
  columns: 2,
  lang: getDefaultLanguage()
};

let currentSettings = { ...DEFAULT_SETTINGS };
let saveStatusTimer = null;

const whiteModeInput = document.getElementById('whiteMode');
const saveStatus = document.getElementById('saveStatus');
const columnButtons = [...document.querySelectorAll('[data-columns]')];
const languageButtons = [...document.querySelectorAll('[data-lang]')];

localizePopup();
loadSettings();

whiteModeInput.addEventListener('change', (event) => {
  saveSettings({ whiteMode: event.target.checked });
});

columnButtons.forEach((button) => {
  button.addEventListener('click', () => {
    saveSettings({ columns: Number.parseInt(button.dataset.columns, 10) });
  });
});

languageButtons.forEach((button) => {
  button.addEventListener('click', () => {
    saveSettings({ lang: button.dataset.lang });
  });
});

function localizePopup() {
  if (!hasChromeApi('i18n')) return;

  document.querySelectorAll('[data-i18n]').forEach((element) => {
    const message = chrome.i18n.getMessage(element.dataset.i18n);
    if (message) element.textContent = message;
  });

  const uiLanguage = chrome.i18n.getUILanguage().split('-')[0];
  document.documentElement.lang = uiLanguage || 'en';
}

function loadSettings() {
  if (!hasChromeApi('storage')) {
    renderSettings();
    return;
  }

  chrome.storage.local.get([SETTINGS_KEY], (result) => {
    currentSettings = { ...DEFAULT_SETTINGS, ...result[SETTINGS_KEY] };
    renderSettings();
  });
}

function saveSettings(nextSettings) {
  currentSettings = { ...currentSettings, ...nextSettings };
  renderSettings();

  if (!hasChromeApi('storage')) {
    showSavedStatus();
    return;
  }

  chrome.storage.local.set({ [SETTINGS_KEY]: currentSettings }, () => {
    showSavedStatus();
  });
}

function renderSettings() {
  whiteModeInput.checked = Boolean(currentSettings.whiteMode);
  setPressedState(columnButtons, 'columns', String(currentSettings.columns));
  setPressedState(languageButtons, 'lang', currentSettings.lang);
}

function setPressedState(buttons, dataKey, selectedValue) {
  buttons.forEach((button) => {
    button.setAttribute('aria-pressed', button.dataset[dataKey] === selectedValue);
  });
}

function showSavedStatus() {
  saveStatus.textContent = hasChromeApi('i18n') ? chrome.i18n.getMessage('popup_saved') || 'Saved' : 'Saved';
  saveStatus.classList.add('is-visible');
  window.clearTimeout(saveStatusTimer);
  saveStatusTimer = window.setTimeout(() => {
    saveStatus.classList.remove('is-visible');
  }, 1400);
}

function getDefaultLanguage() {
  if (!hasChromeApi('i18n')) return 'ko';

  const uiLanguage = chrome.i18n.getUILanguage().toLowerCase();
  if (uiLanguage.startsWith('ja')) return 'ja';
  if (uiLanguage.startsWith('en')) return 'en';
  return 'ko';
}

function hasChromeApi(apiName) {
  return typeof chrome !== 'undefined' && chrome[apiName];
}
