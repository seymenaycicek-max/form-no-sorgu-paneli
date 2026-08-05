const elements = {
  sheetList: document.getElementById('sheetList'),
  sheetTotal: document.getElementById('sheetTotal'),
  visibleTotal: document.getElementById('visibleTotal'),
  settingsStatus: document.getElementById('settingsStatus'),
  emptyState: document.getElementById('emptyState'),
  refreshSheetsButton: document.getElementById('refreshSheetsButton'),
  toast: document.getElementById('toast')
};

elements.refreshSheetsButton.addEventListener('click', loadSheets);

loadSheets();

async function loadSheets() {
  setBusy(true);
  elements.settingsStatus.textContent = 'Yükleniyor';
  setEmptyState('Sayfalar yükleniyor.', 'Lütfen birkaç saniye bekleyin.');

  try {
    const response = await fetch('/api/sheets', { cache: 'no-store' });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Sayfalar getirilemedi.');
    }

    renderSheets(data.sheets || []);
  } catch (error) {
    elements.sheetList.innerHTML = '';
    elements.sheetTotal.textContent = '0';
    elements.visibleTotal.textContent = '0';
    elements.settingsStatus.textContent = 'Hata';
    setEmptyState('Sayfalar gösterilemedi.', error.message);
    showToast(error.message, true);
  } finally {
    setBusy(false);
  }
}

function renderSheets(sheets) {
  const visibleCount = sheets.filter((sheet) => sheet.visible && sheet.eligible && !sheet.protected).length;

  elements.sheetList.innerHTML = '';
  elements.sheetTotal.textContent = String(sheets.length);
  elements.visibleTotal.textContent = String(visibleCount);
  elements.settingsStatus.textContent = `${visibleCount} açık`;

  if (!sheets.length) {
    setEmptyState('Sayfa bulunamadı.', 'Google Sheets dosyasında sayfa yok.');
    return;
  }

  elements.emptyState.hidden = true;

  sheets.forEach((sheet) => {
    elements.sheetList.appendChild(createSheetItem(sheet));
  });
}

function createSheetItem(sheet) {
  const item = document.createElement('article');
  item.className = 'sheet-item';

  const textWrap = document.createElement('div');
  textWrap.className = 'sheet-info';

  const name = document.createElement('strong');
  name.textContent = sheet.name;

  const detail = document.createElement('span');
  detail.textContent = getSheetDetail(sheet);

  textWrap.appendChild(name);
  textWrap.appendChild(detail);

  const right = document.createElement('div');
  right.className = 'sheet-right';

  const badge = document.createElement('span');
  badge.className = getBadgeClass(sheet);
  badge.textContent = getBadgeText(sheet);

  const toggle = document.createElement('label');
  toggle.className = 'switch';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = Boolean(sheet.visible);
  checkbox.disabled = sheet.protected || !sheet.eligible;

  const slider = document.createElement('span');
  slider.className = 'switch-slider';

  checkbox.addEventListener('change', () => updateVisibility(sheet.name, checkbox));

  toggle.appendChild(checkbox);
  toggle.appendChild(slider);

  right.appendChild(badge);
  right.appendChild(toggle);

  item.appendChild(textWrap);
  item.appendChild(right);

  return item;
}

async function updateVisibility(name, checkbox) {
  const visible = checkbox.checked;
  checkbox.disabled = true;

  try {
    const response = await fetch('/api/sheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, visible })
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Ayar kaydedilemedi.');
    }

    renderSheets(data.sheets || []);
    showToast(data.message || 'Ayar kaydedildi.', false);
  } catch (error) {
    checkbox.checked = !visible;
    checkbox.disabled = false;
    showToast(error.message, true);
  }
}

function getSheetDetail(sheet) {
  if (sheet.protected) {
    return 'Toplam sayfası sorguya dahil edilmez.';
  }

  if (!sheet.eligible) {
    return 'Başlık satırında FORM NO olmadığı için sorguya dahil edilemez.';
  }

  return sheet.visible ? 'Form no sorgusunda aranıyor.' : 'Form no sorgusunda gizli.';
}

function getBadgeClass(sheet) {
  if (sheet.protected || !sheet.eligible) return 'sheet-badge protected';
  if (sheet.visible) return 'sheet-badge';
  return 'sheet-badge hidden';
}

function getBadgeText(sheet) {
  if (sheet.protected) return 'Kilitli';
  if (!sheet.eligible) return 'Uygun Değil';
  return sheet.visible ? 'Gösteriliyor' : 'Gizli';
}

function setBusy(isBusy) {
  elements.refreshSheetsButton.disabled = isBusy;
}

function setEmptyState(title, detail) {
  elements.emptyState.innerHTML = '';
  const titleNode = document.createElement('strong');
  titleNode.textContent = title;
  const detailNode = document.createElement('span');
  detailNode.textContent = detail;
  elements.emptyState.appendChild(titleNode);
  elements.emptyState.appendChild(detailNode);
  elements.emptyState.hidden = false;
}

function showToast(message, isError) {
  elements.toast.textContent = message;
  elements.toast.classList.toggle('error', Boolean(isError));
  elements.toast.hidden = false;

  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    elements.toast.hidden = true;
  }, 3500);
}
