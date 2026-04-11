const CACHE = new Map();
let popupEl = null;

let currentHoveredUrl = null;
let currentMediaList = [];

// Selection State
let isSelectMode = false;
let selectedMediaUrls = new Set();

let savedPos = null;
let savedSize = null;
let currentSettings = {
  isFolded: false,
  showAll: false,
  limit: 5
};

chrome.storage.local.get(['arcaPopupX', 'arcaPopupY', 'arcaPopupW', 'arcaPopupH', 'arcaSettings'], (res) => {
  if (res.arcaPopupX !== undefined) savedPos = { x: res.arcaPopupX, y: res.arcaPopupY };
  if (res.arcaPopupW !== undefined) savedSize = { w: res.arcaPopupW, h: res.arcaPopupH };
  if (res.arcaSettings) currentSettings = { ...currentSettings, ...res.arcaSettings };
  
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
  
  const chk = document.getElementById('arca-img-show-all');
  const slider = document.getElementById('arca-img-limit');
  const sliderVal = document.getElementById('arca-slider-val');
  
  if (chk) chk.checked = currentSettings.showAll;
  if (slider) {
     slider.value = currentSettings.limit;
     slider.disabled = currentSettings.showAll;
  }
  if (sliderVal) sliderVal.innerText = currentSettings.limit;
  
  applyFoldState();
}

function applyFoldState() {
  const bodyEl = document.querySelector('.arca-img-body');
  const foldBtn = document.querySelector('.arca-fold-btn');
  if (!bodyEl || !foldBtn) return;
  
  if (currentSettings.isFolded) {
    bodyEl.style.display = 'none';
    foldBtn.innerText = '펼치기';
  } else {
    bodyEl.style.display = 'flex';
    foldBtn.innerText = '접기';
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
  
  headerEl.appendChild(dragZone);
  headerEl.appendChild(foldBtn);
  
  const bodyEl = document.createElement('div');
  bodyEl.className = 'arca-img-body';
  
  const controlsHtml = `
    <div class="arca-wrapper">
      <div class="arca-slider-wrap">
        이미지 수 <input type="range" id="arca-img-limit" min="5" max="10" step="1">
        <span id="arca-slider-val"></span>
      </div>
      <label class="arca-checkbox-label">
        <input type="checkbox" id="arca-img-show-all"> 전부 보기
      </label>
    </div>
    <div class="arca-select-all-wrap" id="arca-select-all-area" style="display: none;">
      <label class="arca-checkbox-label" style="color: #0ea5e9; font-weight: bold;">
        <input type="checkbox" id="arca-img-select-all"> 모든 이미지 선택
      </label>
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
    <button class="arca-dl-btn primary" id="arca-dl-selected">선택 다운로드</button>
    <button class="arca-dl-btn" id="arca-dl-all">모두 다운로드</button>
  `;
  
  bodyEl.appendChild(controlsEl);
  bodyEl.appendChild(contentWrapperEl);
  bodyEl.appendChild(footerEl);
  
  popupEl.appendChild(headerEl);
  popupEl.appendChild(bodyEl);
  document.body.appendChild(popupEl);
  
  foldBtn.addEventListener('click', () => {
    currentSettings.isFolded = !currentSettings.isFolded;
    applyFoldState();
    saveSettings();
  });
  
  const chk = document.getElementById('arca-img-show-all');
  const slider = document.getElementById('arca-img-limit');
  const sliderVal = document.getElementById('arca-slider-val');

  chk.addEventListener('change', (e) => {
    currentSettings.showAll = e.target.checked;
    slider.disabled = currentSettings.showAll;
    saveSettings();
    renderMediaList();
  });

  slider.addEventListener('input', (e) => {
    currentSettings.limit = parseInt(e.target.value, 10);
    sliderVal.innerText = currentSettings.limit;
    renderMediaList();
  });
  
  slider.addEventListener('change', () => {
    saveSettings();
  });
  
  const selectAllCb = document.getElementById('arca-img-select-all');
  if (selectAllCb) {
    selectAllCb.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      let toShow = currentMediaList;
      if (!currentSettings.showAll) {
        toShow = currentMediaList.slice(0, currentSettings.limit);
      }
      
      if (isChecked) {
        toShow.forEach(m => selectedMediaUrls.add(m.src));
      } else {
        toShow.forEach(m => selectedMediaUrls.delete(m.src));
      }
      renderMediaList();
    });
  }
  
  // Download Button Listeners
  const dlSelected = document.getElementById('arca-dl-selected');
  const dlAll = document.getElementById('arca-dl-all');
  
  dlSelected.addEventListener('click', () => {
    if (selectedMediaUrls.size === 0) {
      alert("선택된 이미지가 없습니다.");
      return;
    }
    const urls = Array.from(selectedMediaUrls);
    downloadImages(urls);
  });
  
  dlAll.addEventListener('click', () => {
    let toShow = currentMediaList;
    if (!currentSettings.showAll) {
      toShow = currentMediaList.slice(0, currentSettings.limit);
    }
    const urls = toShow.map(m => m.src);
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
    if (popupEl.style.width || popupEl.style.height) {
      chrome.storage.local.set({
        arcaPopupW: popupEl.style.width,
        arcaPopupH: popupEl.style.height
      });
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
       alert("다운로드 스크립트에 문제가 있습니다. 확장 프로그램을 다시 활성화해 주세요.");
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
  if (!contentArea) return;
  
  if (footerArea) footerArea.style.display = 'none'; // hide footer in loading/empty state
  
  if (stateHtmlOrKey === 'loading') {
    contentArea.innerHTML = '<div class="arca-img-loading">이미지 로딩 중...</div>';
  } else if (stateHtmlOrKey === 'empty') {
    contentArea.innerHTML = '<div class="arca-img-empty">게시글에 이미지가 없습니다.</div>';
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
  
  let toShow = currentMediaList;
  if (!currentSettings.showAll) {
    toShow = currentMediaList.slice(0, currentSettings.limit);
  }
  
  const contentArea = document.getElementById('arca-img-content-area');
  const footerArea = document.getElementById('arca-img-footer-area');
  if (!contentArea) return;
  
  const html = toShow.map(m => {
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
    footerArea.style.display = 'flex';
    if (selectAllArea) selectAllArea.style.display = 'flex';
    
    // Automatically check 'Select All' if every displayed item is selected
    if (selectAllCb && toShow.length > 0) {
      selectAllCb.checked = toShow.every(m => selectedMediaUrls.has(m.src));
    }
  } else {
    contentArea.classList.remove('arca-select-mode');
    footerArea.style.display = 'none';
    if (selectAllArea) selectAllArea.style.display = 'none';
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
    if (!articleBody) throw new Error('article-body not found');
    
    const mediaQuery = 'img, video[data-orig="gif"], video[autoplay][loop]';
    const mediaList = Array.from(articleBody.querySelectorAll(mediaQuery))
      .map(el => extractMedia(el, url))
      .filter(Boolean);
      
    CACHE.set(url, mediaList);
    return mediaList;
  } catch (err) {
    console.error('Arca Img Preview error: ', err);
    return null;
  }
}

document.addEventListener('mouseover', async (e) => {
  const target = e.target.closest('a.vrow.column');
  if (!target) return;
  
  const href = target.href;
  if (!href || currentHoveredUrl === href) return;
  
  // Reset states before exploring new thread
  currentHoveredUrl = href;
  isSelectMode = false;
  selectedMediaUrls.clear();
  
  showPopup();
  renderState('loading');
  
  const mediaList = await fetchArticleImages(href);
  
  if (currentHoveredUrl === href) {
    currentMediaList = mediaList;
    renderMediaList(); // Initial render will set footer 'display:none' initially
  }
});
