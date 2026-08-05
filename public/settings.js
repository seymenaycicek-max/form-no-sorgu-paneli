const elements = {
  sheetSelect: document.getElementById('sheetSelect'),
  sheetList: document.getElementById('sheetList'),
  sheetTotal: document.getElementById('sheetTotal'),
  settingsStatus: document.getElementById('settingsStatus'),
  emptyState: document.getElementById('emptyState'),
  addSheetForm: document.getElementById('addSheetForm'),
  newSheetName: document.getElementById('newSheetName'),
  refreshSheetsButton: document.getElementById('refreshSheetsButton'),
  deleteSheetButton: document.getElementById('deleteSheetButton'),
  toast: document.getElementById('toast')
};

elements.addSheetForm.addEventListener('submit', handleAddSheet);
elements.refreshSheetsButton.addEventListener('click', loadSheets);
elements.deleteSheetButton.addEventListener('click', handleDeleteSheet);

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
    elements.sheetSelect.innerHTML = '';
    elements.sheetList.innerHTML = '';
    elements.sheetTotal.textContent = '0';
    elements.settingsStatus.textContent = 'Hata';
    setEmptyState('Sayfalar gösterilemedi.', error.message);
    showToast(error.message, true);
  } finally {
    setBusy(false);
  }
}

function renderSheets(sheets) {
  elements.sheetSelect.innerHTML = '';
  elements.sheetList.innerHTML = '';
  elements.sheetTotal.textContent = String(sheets.length);
  elements.settingsStatus.textContent = `${sheets.length} sayfa`;

  if (!sheets.length) {
    setEmptyState('Sayfa bulunamadı.', 'Google Sheets dosyasında görünür sayfa yok.');
    return;
  }

  elements.emptyState.hidden = true;

  sheets.forEach((sheet) => {
    const option = document.createElement('option');
    option.value = sheet.name;
    option.textContent = sheet.protected ? `${sheet.name} (korumalı)` : sheet.name;
    option.dataset.protected = sheet.protected ? 'true' : 'false';
    elements.sheetSelect.appendChild(option);

    const item = document.createElement('article');
    item.className = 'sheet-item';

    const name = document.createElement('strong');
    name.textContent = sheet.name;

    const badge = document.createElement('span');
    badge.className = sheet.protected ? 'sheet-badge protected' : 'sheet-badge';
    badge.textContent = sheet.protected ? 'Korumalı' : 'Silinebilir';

    item.appendChild(name);
    item.appendChild(badge);
    elements.sheetList.appendChild(item);
  });
}

async function handleAddSheet(event) {
  event.preventDefault();

  const name = elements.newSheetName.value.trim();

  if (!name) {
    showToast('Yeni sayfa adı yazın.', true);
    return;
  }

  setBusy(true);

  try {
    const response = await fetch('/api/sheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Sayfa eklenemedi.');
    }

    elements.newSheetName.value = '';
    renderSheets(data.sheets || []);
    elements.sheetSelect.value = name;
    showToast(data.message || 'Sayfa eklendi.', false);
  } catch (error) {
    showToast(error.message, true);
  } finally {
    setBusy(false);
  }
}

async function handleDeleteSheet() {
  const name = elements.sheetSelect.value;
  const selectedOption = elements.sheetSelect.selectedOptions[0];

  if (!name) {
    showToast('Silinecek sayfa seçin.', true);
    return;
  }

  if (selectedOption && selectedOption.dataset.protected === 'true') {
    showToast('Bu sayfa korumalı, silinemez.', true);
    return;
  }

  const confirmed = window.confirm(`${name} sayfası silinsin mi? Bu işlem geri alınamaz.`);

  if (!confirmed) {
    return;
  }

  setBusy(true);

  try {
    const response = await fetch(`/api/sheets?name=${encodeURIComponent(name)}`, {
      method: 'DELETE'
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Sayfa silinemedi.');
    }

    renderSheets(data.sheets || []);
    showToast(data.message || 'Sayfa silindi.', false);
  } catch (error) {
    showToast(error.message, true);
  } finally {
    setBusy(false);
  }
}

function setBusy(isBusy) {
  elements.refreshSheetsButton.disabled = isBusy;
  elements.deleteSheetButton.disabled = isBusy;
  elements.addSheetForm.querySelector('button').disabled = isBusy;
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
