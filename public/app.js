const elements = {
  searchForm: document.getElementById('searchForm'),
  formNoInput: document.getElementById('formNoInput'),
  searchButton: document.getElementById('searchButton'),
  resultCount: document.getElementById('resultCount'),
  resultList: document.getElementById('resultList'),
  emptyState: document.getElementById('emptyState'),
  toast: document.getElementById('toast'),
  sheetSelect: document.getElementById('sheetSelect'),
  addSheetForm: document.getElementById('addSheetForm'),
  newSheetName: document.getElementById('newSheetName'),
  refreshSheetsButton: document.getElementById('refreshSheetsButton'),
  deleteSheetButton: document.getElementById('deleteSheetButton')
};

elements.searchForm.addEventListener('submit', handleSearch);
elements.addSheetForm.addEventListener('submit', handleAddSheet);
elements.refreshSheetsButton.addEventListener('click', loadSheets);
elements.deleteSheetButton.addEventListener('click', handleDeleteSheet);
elements.formNoInput.focus();
loadSheets();

async function handleSearch(event) {
  event.preventDefault();

  const formNo = elements.formNoInput.value.trim();

  if (!formNo) {
    showToast('Form no yazın.', true);
    return;
  }

  setLoading(true);
  elements.resultCount.textContent = 'Aranıyor';
  elements.resultList.innerHTML = '';
  setEmptyState('Kayıtlar getiriliyor...', 'Lütfen birkaç saniye bekleyin.');

  try {
    const response = await fetch(`/api/search?formNo=${encodeURIComponent(formNo)}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Sonuç getirilemedi.');
    }

    renderResults(data.results || []);
  } catch (error) {
    elements.resultCount.textContent = '0 kayıt';
    setEmptyState('Sonuç getirilemedi.', 'Bağlantıyı veya sistem ayarlarını kontrol edin.');
    showToast(error.message, true);
  } finally {
    setLoading(false);
  }
}

async function loadSheets() {
  elements.refreshSheetsButton.disabled = true;

  try {
    const response = await fetch('/api/sheets');
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Sayfalar getirilemedi.');
    }

    renderSheetOptions(data.sheets || []);
  } catch (error) {
    showToast(error.message, true);
  } finally {
    elements.refreshSheetsButton.disabled = false;
  }
}

function renderSheetOptions(sheets) {
  elements.sheetSelect.innerHTML = '';

  sheets.forEach((sheet) => {
    const option = document.createElement('option');
    option.value = sheet.name;
    option.textContent = sheet.protected ? `${sheet.name} (korumalı)` : sheet.name;
    option.dataset.protected = sheet.protected ? 'true' : 'false';
    elements.sheetSelect.appendChild(option);
  });
}

async function handleAddSheet(event) {
  event.preventDefault();

  const name = elements.newSheetName.value.trim();

  if (!name) {
    showToast('Yeni sayfa adı yazın.', true);
    return;
  }

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
    renderSheetOptions(data.sheets || []);
    elements.sheetSelect.value = name;
    showToast(data.message || 'Sayfa eklendi.', false);
  } catch (error) {
    showToast(error.message, true);
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

  try {
    const response = await fetch(`/api/sheets?name=${encodeURIComponent(name)}`, {
      method: 'DELETE'
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Sayfa silinemedi.');
    }

    renderSheetOptions(data.sheets || []);
    showToast(data.message || 'Sayfa silindi.', false);
  } catch (error) {
    showToast(error.message, true);
  }
}

function renderResults(results) {
  elements.resultList.innerHTML = '';
  elements.resultCount.textContent = `${results.length} kayıt`;

  if (!results.length) {
    setEmptyState('Kayıt bulunamadı.', 'Bu form no için seçili sayfalarda eşleşme yok.');
    return;
  }

  elements.emptyState.hidden = true;
  results.forEach((device, index) => {
    elements.resultList.appendChild(createResultCard(device, index + 1));
  });
}

function createResultCard(device, index) {
  const card = document.createElement('article');
  card.className = 'result-card';

  const header = document.createElement('div');
  header.className = 'result-card-header';

  const titleWrap = document.createElement('div');
  titleWrap.className = 'card-title';

  const small = document.createElement('span');
  small.className = 'card-index';
  small.textContent = `${device.sheetName || 'Sayfa'} / Kayıt ${index}`;

  const title = document.createElement('h3');
  title.textContent = device.formNo ? `Form No ${device.formNo}` : 'Form No -';

  const meta = document.createElement('p');
  meta.className = 'card-meta';
  meta.textContent = `Teknisyen: ${device.teknisyen || '-'} • Kalite Kontrol: ${device.kaliteKontrol || '-'}`;

  titleWrap.appendChild(small);
  titleWrap.appendChild(title);
  titleWrap.appendChild(meta);

  const statusText = getDisplayStatus(device);
  const status = document.createElement('span');
  status.className = getStatusClass(statusText);
  status.textContent = statusText;

  const action = createCompleteAction(device, status);
  const headerRight = document.createElement('div');
  headerRight.className = 'card-actions';
  headerRight.appendChild(status);
  headerRight.appendChild(action);

  header.appendChild(titleWrap);
  header.appendChild(headerRight);
  card.appendChild(header);

  const body = document.createElement('div');
  body.className = 'result-grid';

  [
    ['Tarih', device.tarih, 'compact'],
    ['Model', device.model, 'strong'],
    ['IMEI', device.imei, 'mono'],
    ['Renk', device.renk, 'compact'],
    ['Kaldı Sebebi', device.kaldiSebebi, 'wide'],
    ['Not', device.not, 'wide'],
    ['Teknisyen', device.teknisyen, 'compact'],
    ['Kalite Kontrol', device.kaliteKontrol, 'compact']
  ].forEach(([label, value, variant]) => body.appendChild(createField(label, value, variant)));

  card.appendChild(body);
  return card;
}

function createCompleteAction(device, statusElement) {
  const label = document.createElement('label');
  label.className = 'complete-check';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = isCompleted(device);

  const text = document.createElement('span');
  text.textContent = checkbox.checked ? 'Tamamlandı' : 'Tamamlandı';

  checkbox.addEventListener('change', async () => {
    const nextCompleted = checkbox.checked;
    checkbox.disabled = true;
    text.textContent = nextCompleted ? 'Yazılıyor...' : 'Temizleniyor...';

    try {
      const response = await fetch('/api/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetName: device.sheetName,
          rowNumber: device.rowNumber,
          completed: nextCompleted
        })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Tamamlandı yazılamadı.');
      }

      device.tamamlandi = nextCompleted ? 'Tamamlandı' : '';
      text.textContent = 'Tamamlandı';
      label.classList.toggle('is-done', nextCompleted);
      const statusText = getDisplayStatus(device);
      statusElement.textContent = statusText;
      statusElement.className = getStatusClass(statusText);
      showToast(data.message || (nextCompleted ? 'Tamamlandı yazıldı.' : 'Tamamlandı temizlendi.'), false);
    } catch (error) {
      checkbox.checked = !nextCompleted;
      checkbox.disabled = false;
      text.textContent = 'Tamamlandı';
      showToast(error.message, true);
      return;
    }

    checkbox.disabled = false;
  });

  if (checkbox.checked) {
    label.classList.add('is-done');
  }

  label.appendChild(checkbox);
  label.appendChild(text);
  return label;
}

function createField(label, value, variant = '') {
  const item = document.createElement('div');
  item.className = variant ? `result-field ${variant}` : 'result-field';

  const fieldLabel = document.createElement('span');
  fieldLabel.textContent = label;

  const fieldValue = document.createElement('strong');
  fieldValue.textContent = value || '-';

  item.appendChild(fieldLabel);
  item.appendChild(fieldValue);
  return item;
}

function getStatusClass(status) {
  const normalized = String(status || '').toLocaleLowerCase('tr-TR');

  if (normalized.includes('tamam')) return 'status-pill status-completed';
  if (normalized.includes('kald')) return 'status-pill status-waiting';
  if (normalized.includes('gec') || normalized.includes('geç')) return 'status-pill status-ok';
  return 'status-pill';
}

function getDisplayStatus(device) {
  if (isCompleted(device)) {
    return 'Tamamlandı';
  }

  return device.durum || 'Durum yok';
}

function isCompleted(device) {
  return String(device.tamamlandi || '').toLocaleLowerCase('tr-TR').includes('tamam');
}

function setLoading(isLoading) {
  elements.searchButton.disabled = isLoading;
  elements.searchButton.classList.toggle('is-loading', isLoading);
  elements.searchButton.querySelector('.button-text').textContent = isLoading ? 'Aranıyor' : 'Ara';
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
