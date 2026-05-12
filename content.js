const CACHE = new Map();
let popupEl = null;

let currentHoveredUrl = null;
let currentHoveredTitle = null;
let currentMediaList = [];

// Selection State
let isSelectMode = false;
let selectedMediaUrls = new Set();

let savedPos = null;
let savedSize = null;
let currentSettings = {
  isFolded: false,
  whiteMode: false,
  columns: 2,
  lang: 'ko'
};

const TRANSLATIONS = {
  ko: {
    drag_zone: '&#10021; 이미지 뷰어 (드래그)',
    fold: '접기',
    unfold: '펼치기',
    settings: '설정',
    white_mode: '화이트 모드',
    col_count: '표시 칸 수',
    col_1: '1줄',
    col_2: '2줄',
    dl_selected: '선택 다운로드',
    dl_all: '모두 다운로드',
    select_all: '모든 이미지 선택',
    loading: '이미지 로딩 중...',
    empty: '게시글에 이미지가 없습니다.',
    title_none: '제목 없음',
    dl_none_alert: '선택된 이미지가 없습니다.',
    dl_error_alert: '다운로드 스크립트에 문제가 있습니다. 확장 프로그램을 다시 활성화해 주세요.',
    lang: '언어'
  },
  ja: {
    drag_zone: '&#10021; 画像ビューアー (ドラッグ)',
    fold: '閉じる',
    unfold: '広げる',
    settings: '設定',
    white_mode: 'ホワイトモード',
    col_count: '表示列数',
    col_1: '1列',
    col_2: '2列',
    dl_selected: '選択ダウンロード',
    dl_all: 'すべてダウンロード',
    select_all: 'すべて選択',
    loading: '画像を読み込み中...',
    empty: '記事に画像がありません。',
    title_none: '題名なし',
    dl_none_alert: '選択された画像がありません。',
    dl_error_alert: 'ダウンロードスクリプトに問題があります。拡張機能を再起動してください。',
    lang: '言語'
  },
  en: {
    drag_zone: '&#10021; Image Viewer (Drag)',
    fold: 'Fold',
    unfold: 'Unfold',
    settings: 'Settings',
    white_mode: 'White Mode',
    col_count: 'Columns',
    col_1: '1 Col',
    col_2: '2 Cols',
    dl_selected: 'Download Selected',
    dl_all: 'Download All',
    select_all: 'Select All',
    loading: 'Loading images...',
    empty: 'No images in this post.',
    title_none: 'No Title',
    dl_none_alert: 'No images selected.',
    dl_error_alert: 'Problem with the download script. Please reactivate the extension.',
    lang: 'Language'
  }
};

function t(key) {
  const lang = currentSettings.lang || 'ko';
  return TRANSLATIONS[lang][key] || key;
}

function getBrowserLang() {
  const uiLang = chrome.i18n.getUILanguage().toLowerCase();
  if (uiLang.startsWith('ko')) return 'ko';
  if (uiLang.startsWith('ja')) return 'ja';
  return 'en';
}

chrome.storage.local.get(['arcaPopupX', 'arcaPopupY', 'arcaPopupW', 'arcaPopupH', 'arcaSettings'], (res) => {
  if (res.arcaPopupX !== undefined) savedPos = { x: res.arcaPopupX, y: res.arcaPopupY };
  if (res.arcaPopupW !== undefined) savedSize = { w: res.arcaPopupW, h: res.arcaPopupH };
  
  if (res.arcaSettings) {
    currentSettings = { ...currentSettings, ...res.arcaSettings };
  } else {
    // First time, detect browser language
    currentSettings.lang = getBrowserLang();
    saveSettings();
  }

  if (popupEl) {
    applyStoredState();
  }
});

function saveSettings() {
  chrome.storage.local.set({ arcaSettings: currentSettings });
}

function applyStoredState() {
  if (!popupEl) return;
  if (savedPos) {
    popupEl.style.left = `${savedPos.x}px`;
    popupEl.style.top = `${savedPos.y}px`;
    popupEl.style.right = 'auto';
  } else {
    popupEl.style.right = '40px';
    popupEl.style.top = '100px';
  }

  if (savedSize) {
    popupEl.style.width = savedSize.w;
    popupEl.style.height = savedSize.h;
  }

  const whiteModeChk = document.getElementById('arca-img-white-mode');
  if (whiteModeChk) whiteModeChk.checked = currentSettings.whiteMode;

  if (currentSettings.whiteMode) {
    popupEl.classList.add('arca-white-mode');
  } else {
    popupEl.classList.remove('arca-white-mode');
  }

  const contentArea = document.getElementById('arca-img-content-area');
  if (contentArea) {
    contentArea.style.setProperty('--arca-cols', currentSettings.columns);
  }

  const colBtns = document.querySelectorAll('.arca-col-btn');
  colBtns.forEach(btn => {
    if (parseInt(btn.dataset.cols, 10) === currentSettings.columns) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  const langBtns = document.querySelectorAll('.arca-lang-btn');
  langBtns.forEach(btn => {
    if (btn.dataset.lang === currentSettings.lang) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  updateStaticTranslations();
  applyFoldState();
}

function updateStaticTranslations() {
  if (!popupEl) return;

  const dragZone = popupEl.querySelector('.arca-drag-zone');
  if (dragZone) dragZone.innerHTML = t('drag_zone');

  const settingsBtn = popupEl.querySelector('.arca-settings-btn');
  if (settingsBtn) settingsBtn.title = t('settings');

  const whiteModeLabel = popupEl.querySelector('.arca-label-white-mode');
  if (whiteModeLabel) whiteModeLabel.innerText = t('white_mode');

  const colCountLabel = popupEl.querySelector('.arca-label-col-count');
  if (colCountLabel) colCountLabel.innerText = t('col_count');

  const col1Btn = popupEl.querySelector('.arca-col-btn[data-cols="1"]');
  if (col1Btn) col1Btn.innerText = t('col_1');
  const col2Btn = popupEl.querySelector('.arca-col-btn[data-cols="2"]');
  if (col2Btn) col2Btn.innerText = t('col_2');

  const langLabel = popupEl.querySelector('.arca-label-lang');
  if (langLabel) langLabel.innerText = t('lang');

  const dlSelected = document.getElementById('arca-dl-selected');
  if (dlSelected) dlSelected.innerText = t('dl_selected');
  const dlAll = document.getElementById('arca-dl-all');
  if (dlAll) dlAll.innerText = t('dl_all');

  const selectAllLabel = document.querySelector('.arca-select-all-text');
  if (selectAllLabel) selectAllLabel.innerText = t('select_all');

  applyFoldState(); // To update Fold/Unfold text
}

function applyFoldState() {
  const bodyWrap = document.querySelector('.arca-img-body-wrap');
  const foldBtn = document.querySelector('.arca-fold-btn');
  if (!bodyWrap || !foldBtn) return;

  if (currentSettings.isFolded) {
    foldBtn.innerText = t('unfold');
    bodyWrap.classList.add('collapsed');

    // allow height to animate down to header
    if (popupEl) popupEl.style.height = 'auto';
  } else {
    foldBtn.innerText = t('fold');
    bodyWrap.classList.remove('collapsed');

    if (popupEl && savedSize && savedSize.h && savedSize.h !== 'auto') {
      popupEl.style.height = savedSize.h;
    }
  }
}

function createPopup() {
  if (popupEl) return;
  popupEl = document.createElement('div');
  popupEl.id = 'arca-img-popup';

  const headerEl = document.createElement('div');
  headerEl.className = 'arca-img-header';

  const dragZone = document.createElement('div');
  dragZone.className = 'arca-drag-zone';
  dragZone.innerHTML = '&#10021; 이미지 뷰어 (드래그)';

  const foldBtn = document.createElement('button');
  foldBtn.className = 'arca-fold-btn';
  foldBtn.innerText = '접기';

  const gearBtn = document.createElement('button');
  gearBtn.className = 'arca-settings-btn';
  gearBtn.innerHTML = '&#9881;';
  gearBtn.title = '설정';

  headerEl.appendChild(dragZone);
  headerEl.appendChild(gearBtn);
  headerEl.appendChild(foldBtn);

  const bodyEl = document.createElement('div');
  bodyEl.className = 'arca-img-body';

  const controlsHtml = `
    <div class="arca-wrapper" id="arca-img-settings-wrap" style="display: none;">
      <div class="arca-toggle-group">
        <span class="arca-label arca-label-white-mode">${t('white_mode')}</span>
        <label class="arca-switch">
          <input type="checkbox" id="arca-img-white-mode">
          <span class="arca-switch-slider"></span>
        </label>
      </div>

      <div class="arca-divider"></div>

      <div class="arca-segmented-group">
        <span class="arca-label arca-label-col-count">${t('col_count')}</span>
        <div class="arca-segmented-control">
          <button class="arca-col-btn" data-cols="1">${t('col_1')}</button>
          <button class="arca-col-btn" data-cols="2">${t('col_2')}</button>
        </div>
      </div>

      <div class="arca-divider"></div>

      <div class="arca-segmented-group">
        <span class="arca-label arca-label-lang">${t('lang')}</span>
        <div class="arca-segmented-control">
          <button class="arca-lang-btn" data-lang="ko">KO</button>
          <button class="arca-lang-btn" data-lang="ja">JA</button>
          <button class="arca-lang-btn" data-lang="en">EN</button>
        </div>
      </div>
    </div>
  `;
  const controlsEl = document.createElement('div');
  controlsEl.innerHTML = controlsHtml;

  const contentWrapperEl = document.createElement('div');
  contentWrapperEl.className = 'arca-img-content';
  contentWrapperEl.id = 'arca-img-content-area';

  const footerEl = document.createElement('div');
  footerEl.className = 'arca-img-footer';
  footerEl.id = 'arca-img-footer-area';
  footerEl.innerHTML = `
    <div>
      <button class="arca-dl-btn primary" id="arca-dl-selected">선택 다운로드</button>
      <button class="arca-dl-btn" id="arca-dl-all">모두 다운로드</button>
    </div>
  `;

  const selectAllArea = document.createElement('div');
  selectAllArea.className = 'arca-select-all-wrap';
  selectAllArea.id = 'arca-select-all-area';
  selectAllArea.innerHTML = `
    <div>
      <label class="arca-checkbox-label modern" style="color: #0ea5e9; font-weight: bold;">
        <input type="checkbox" id="arca-img-select-all"> <span class="arca-select-all-text">${t('select_all')}</span>
      </label>
    </div>
  `;

  const titleArea = document.createElement('div');
  titleArea.className = 'arca-img-title-area';
  titleArea.id = 'arca-img-title-area';
  titleArea.style.display = 'none';

  bodyEl.appendChild(controlsEl);
  bodyEl.appendChild(titleArea);
  bodyEl.appendChild(selectAllArea);
  bodyEl.appendChild(contentWrapperEl);
  bodyEl.appendChild(footerEl);

  const bodyWrap = document.createElement('div');
  bodyWrap.className = 'arca-img-body-wrap';
  bodyWrap.appendChild(bodyEl);

  popupEl.appendChild(headerEl);
  popupEl.appendChild(bodyWrap);
  document.body.appendChild(popupEl);

  gearBtn.addEventListener('click', () => {
    const wrap = document.getElementById('arca-img-settings-wrap');
    if (wrap.style.display === 'none') {
      wrap.style.display = 'flex';
      gearBtn.classList.add('active');
    } else {
      wrap.style.display = 'none';
      gearBtn.classList.remove('active');
    }
  });

  foldBtn.addEventListener('click', () => {
    currentSettings.isFolded = !currentSettings.isFolded;
    applyFoldState();
    saveSettings();
  });

  const whiteModeChk = document.getElementById('arca-img-white-mode');

  whiteModeChk.addEventListener('change', (e) => {
    currentSettings.whiteMode = e.target.checked;
    saveSettings();
    if (currentSettings.whiteMode) {
      popupEl.classList.add('arca-white-mode');
    } else {
      popupEl.classList.remove('arca-white-mode');
    }
  });

  const langBtns = document.querySelectorAll('.arca-lang-btn');
  langBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      currentSettings.lang = btn.dataset.lang;
      saveSettings();
      applyStoredState();
      renderMediaList();
    });
  });

  const colBtns = document.querySelectorAll('.arca-col-btn');
  colBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      currentSettings.columns = parseInt(btn.dataset.cols, 10);
      saveSettings();

      // Update UI active state
      colBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Apply to content area
      const contentArea = document.getElementById('arca-img-content-area');
      if (contentArea) {
        contentArea.style.setProperty('--arca-cols', currentSettings.columns);
      }
    });
  });

  const selectAllCb = document.getElementById('arca-img-select-all');
  if (selectAllCb) {
    selectAllCb.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      if (isChecked) {
        currentMediaList.forEach(m => selectedMediaUrls.add(m.src));
      } else {
        currentMediaList.forEach(m => selectedMediaUrls.delete(m.src));
      }

      if (selectedMediaUrls.size === 0) {
        isSelectMode = false;
      }

      renderMediaList();
    });
  }

  // Download Button Listeners
  const dlSelected = document.getElementById('arca-dl-selected');
  const dlAll = document.getElementById('arca-dl-all');

  dlSelected.addEventListener('click', () => {
    if (selectedMediaUrls.size === 0) {
      alert(t('dl_none_alert'));
      return;
    }
    const urls = Array.from(selectedMediaUrls);
    downloadImages(urls);
  });

  dlAll.addEventListener('click', () => {
    const urls = currentMediaList.map(m => m.src);
    downloadImages(urls);
  });

  applyStoredState();

  // Drag logic
  let isDragging = false;
  let startX, startY, initialX, initialY;

  dragZone.addEventListener('mousedown', (e) => {
    if (e.target !== dragZone) return;

    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const rect = popupEl.getBoundingClientRect();
    initialX = rect.left;
    initialY = rect.top;

    popupEl.style.right = 'auto';
    popupEl.style.bottom = 'auto';
    popupEl.style.left = `${initialX}px`;
    popupEl.style.top = `${initialY}px`;
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    popupEl.style.left = `${initialX + dx}px`;
    popupEl.style.top = `${initialY + dy}px`;
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      const rect = popupEl.getBoundingClientRect();
      savedPos = { x: rect.left, y: rect.top };
      chrome.storage.local.set({
        arcaPopupX: rect.left,
        arcaPopupY: rect.top
      });
    }
  });

  // Observe resize to save width/height state
  const resizeObserver = new ResizeObserver(() => {
    if (currentSettings.isFolded) {
      // Don't accidentally save the 'folded/collapsed' auto height
      if (popupEl.style.width) {
        savedSize = { ...savedSize, w: popupEl.style.width };
        chrome.storage.local.set({ arcaPopupW: popupEl.style.width });
      }
    } else {
      if (popupEl.style.width || popupEl.style.height) {
        savedSize = { w: popupEl.style.width, h: popupEl.style.height };
        chrome.storage.local.set({
          arcaPopupW: popupEl.style.width,
          arcaPopupH: popupEl.style.height
        });
      }
    }
  });
  resizeObserver.observe(popupEl);
}

function showPopup() {
  createPopup();
  popupEl.classList.add('show');
}

function downloadImages(urls) {
  if (urls.length === 0) return;
  chrome.runtime.sendMessage({ action: 'downloadImages', urls: urls }, (response) => {
    if (chrome.runtime.lastError) {
      console.error("Download fail: ", chrome.runtime.lastError);
      alert(t('dl_error_alert'));
    }
    // Automatically leave selection mode
    isSelectMode = false;
    selectedMediaUrls.clear();
    renderMediaList();
  });
}

function renderState(stateHtmlOrKey) {
  const contentArea = document.getElementById('arca-img-content-area');
  const footerArea = document.getElementById('arca-img-footer-area');
  const selectAllArea = document.getElementById('arca-select-all-area');
  if (!contentArea) return;

  if (footerArea) footerArea.classList.remove('show');
  if (selectAllArea) selectAllArea.classList.remove('show');

  if (stateHtmlOrKey === 'loading') {
    contentArea.innerHTML = `<div class="arca-img-loading">${t('loading')}</div>`;
  } else if (stateHtmlOrKey === 'empty') {
    contentArea.innerHTML = `<div class="arca-img-empty">${t('empty')}</div>`;
  } else {
    contentArea.innerHTML = stateHtmlOrKey;
  }
}

function renderMediaList() {
  if (!currentMediaList || currentMediaList.length === 0) {
    renderState('empty');
    isSelectMode = false;
    selectedMediaUrls.clear();
    return;
  }

  const contentArea = document.getElementById('arca-img-content-area');
  const footerArea = document.getElementById('arca-img-footer-area');
  if (!contentArea) return;

  contentArea.style.setProperty('--arca-cols', currentSettings.columns);

  const html = currentMediaList.map(m => {
    const isChecked = selectedMediaUrls.has(m.src) ? 'selected' : '';
    let mediaHTML = '';
    if (m.type === 'video') {
      mediaHTML = `<video src="${m.src}" autoplay loop muted playsinline></video>`;
    } else {
      mediaHTML = `<img src="${m.src}" alt="preview" />`;
    }
    return `
      <div class="arca-media-wrapper ${isChecked}" data-src="${m.src}">
        ${mediaHTML}
        <div class="arca-img-check"></div>
      </div>
    `;
  }).join('');

  contentArea.innerHTML = html;

  // Update Selection View and Footer rendering
  const selectAllArea = document.getElementById('arca-select-all-area');
  const selectAllCb = document.getElementById('arca-img-select-all');

  if (isSelectMode) {
    contentArea.classList.add('arca-select-mode');

    if (footerArea) footerArea.classList.add('show');
    if (selectAllArea) selectAllArea.classList.add('show');

    // Automatically check 'Select All' if every displayed item is selected
    if (selectAllCb && currentMediaList.length > 0) {
      selectAllCb.checked = currentMediaList.every(m => selectedMediaUrls.has(m.src));
    }
  } else {
    contentArea.classList.remove('arca-select-mode');

    if (footerArea) footerArea.classList.remove('show');
    if (selectAllArea) selectAllArea.classList.remove('show');
  }

  // Attach select handlers dynamically
  const wrappers = contentArea.querySelectorAll('.arca-media-wrapper');
  wrappers.forEach(w => {
    w.addEventListener('click', () => {
      const src = w.getAttribute('data-src');

      if (!isSelectMode) {
        // First click triggers Select Mode and checks the item
        isSelectMode = true;
        selectedMediaUrls.add(src);
        renderMediaList();
      } else {
        // Subsequent clicks toggle items
        if (selectedMediaUrls.has(src)) {
          selectedMediaUrls.delete(src);
          w.classList.remove('selected');
        } else {
          selectedMediaUrls.add(src);
          w.classList.add('selected');
        }

        if (selectedMediaUrls.size === 0) {
          isSelectMode = false;
          renderMediaList();
        } else {
          // Update Select All Checkbox dynamically without full re-render
          const selectAllCb = document.getElementById('arca-img-select-all');
          if (selectAllCb) {
            selectAllCb.checked = currentMediaList.length > 0 && currentMediaList.every(m => selectedMediaUrls.has(m.src));
          }
        }
      }
    });
  });
}

function extractMedia(element, baseURI) {
  const isVideo = element.tagName.toLowerCase() === 'video';
  let src = element.getAttribute('src') || element.dataset.src;

  if (!src && isVideo) {
    const source = element.querySelector('source');
    if (source) src = source.getAttribute('src');
  }

  if (!src) return null;

  if (!isVideo) {
    if (src.includes('clear.gif') || src.includes('avatar')) return null;
  }

  if (src.startsWith('//')) {
    src = 'https:' + src;
  } else if (src.startsWith('/')) {
    src = new URL(src, baseURI).href;
  }

  return { type: isVideo ? 'video' : 'img', src };
}

async function fetchArticleImages(url) {
  if (CACHE.has(url)) {
    return CACHE.get(url);
  }

  try {
    const response = await fetch(url);
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const articleBody = doc.querySelector('.article-body');
    if (!articleBody) {
      // Not a valid article page (e.g., channel index link)
      return [];
    }

    const mediaQuery = 'img, video[data-orig="gif"], video[autoplay][loop]';
    const mediaList = Array.from(articleBody.querySelectorAll(mediaQuery))
      .map(el => extractMedia(el, url))
      .filter(Boolean);

    CACHE.set(url, mediaList);
    return mediaList;
  } catch (err) {
    console.warn('Arca Img Preview failed to load link: ', url);
    return [];
  }
}

document.addEventListener('mouseover', async (e) => {
  const target = e.target.closest('a.vrow.column');
  if (!target) return;

  const href = target.href;
  if (!href || currentHoveredUrl === href) return;

  const titleEl = target.querySelector('.title');
  currentHoveredTitle = t('title_none');
  if (titleEl) {
    const textNode = Array.from(titleEl.childNodes).find(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim().length > 0);
    if (textNode) {
      currentHoveredTitle = textNode.textContent.trim();
    } else {
      currentHoveredTitle = titleEl.textContent.trim();
    }
  }

  // Clear previous highlighted background from all rows
  document.querySelectorAll('a.vrow.column').forEach(el => {
    el.style.backgroundColor = '';
  });
  // Highlight the current row
  target.style.backgroundColor = 'var(--color-bg-focus)';

  // Reset states before exploring new thread
  currentHoveredUrl = href;
  isSelectMode = false;
  selectedMediaUrls.clear();

  showPopup();
  renderState('loading');

  const titleArea = document.getElementById('arca-img-title-area');
  if (titleArea) {
    titleArea.innerHTML = `<a href="${href}" target="_blank">${currentHoveredTitle}</a>`;
    titleArea.style.display = 'block';
  }

  const mediaList = await fetchArticleImages(href);

  if (currentHoveredUrl === href) {
    currentMediaList = mediaList;
    renderMediaList(); // Initial render will set footer 'display:none' initially
  }
});
