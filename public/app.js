const elements = {
  searchForm: document.getElementById('searchForm'),
  formNoInput: document.getElementById('formNoInput'),
  searchButton: document.getElementById('searchButton'),
  resultCount: document.getElementById('resultCount'),
  resultList: document.getElementById('resultList'),
  emptyState: document.getElementById('emptyState'),
  toast: document.getElementById('toast')
};

elements.searchForm.addEventListener('submit', handleSearch);
elements.formNoInput.focus();

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

function renderResults(results) {
  elements.resultList.innerHTML = '';
  elements.resultCount.textContent = `${results.length} kayıt`;

  if (!results.length) {
    setEmptyState('Kayıt bulunamadı.', 'Bu form no için aranan sayfalarda eşleşme yok.');
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

  const statusText = device.durum || 'Durum yok';
  const status = document.createElement('span');
  status.className = getStatusClass(statusText);
  status.textContent = statusText;

  header.appendChild(titleWrap);
  header.appendChild(status);
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

  if (normalized.includes('kald')) return 'status-pill status-waiting';
  if (normalized.includes('gec') || normalized.includes('geç')) return 'status-pill status-ok';
  return 'status-pill';
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
