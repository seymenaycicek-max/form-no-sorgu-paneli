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
  elements.emptyState.textContent = 'Kayıtlar getiriliyor...';
  elements.emptyState.hidden = false;

  try {
    const response = await fetch(`/api/search?formNo=${encodeURIComponent(formNo)}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Sonuç getirilemedi.');
    }

    renderResults(data.results || []);
  } catch (error) {
    elements.resultCount.textContent = '0 kayıt';
    elements.emptyState.textContent = 'Sonuç getirilemedi.';
    elements.emptyState.hidden = false;
    showToast(error.message, true);
  } finally {
    setLoading(false);
  }
}

function renderResults(results) {
  elements.resultList.innerHTML = '';
  elements.resultCount.textContent = `${results.length} kayıt`;

  if (!results.length) {
    elements.emptyState.textContent = 'Bu form no için kayıt bulunamadı.';
    elements.emptyState.hidden = false;
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
  const small = document.createElement('span');
  small.className = 'card-index';
  small.textContent = `${device.sheetName || 'Sayfa'} / Kayıt ${index}`;

  const title = document.createElement('h3');
  title.textContent = device.formNo ? `Form No ${device.formNo}` : 'Form No -';

  const meta = document.createElement('p');
  meta.className = 'card-meta';
  meta.textContent = `Teknisyen: ${device.teknisyen || '-'} | Kalite Kontrol: ${device.kaliteKontrol || '-'}`;

  titleWrap.appendChild(small);
  titleWrap.appendChild(title);
  titleWrap.appendChild(meta);

  const status = document.createElement('span');
  status.className = getStatusClass(device.durum);
  status.textContent = device.durum || 'Durum yok';

  const action = createCompleteAction(device);
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
    ['Tarih', device.tarih],
    ['Model', device.model],
    ['IMEI', device.imei],
    ['Renk', device.renk],
    ['Kaldı Sebebi', device.kaldiSebebi],
    ['Not', device.not],
    ['Teknisyen', device.teknisyen],
    ['Kalite Kontrol', device.kaliteKontrol]
  ].forEach(([label, value]) => body.appendChild(createField(label, value)));

  card.appendChild(body);
  return card;
}

function createCompleteAction(device) {
  const label = document.createElement('label');
  label.className = 'complete-check';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = String(device.tamamlandi || '').toLocaleLowerCase('tr-TR').includes('tamam');
  checkbox.disabled = checkbox.checked;

  const text = document.createElement('span');
  text.textContent = 'Tamamlandı';

  checkbox.addEventListener('change', async () => {
    if (!checkbox.checked) return;

    checkbox.disabled = true;
    text.textContent = 'Yazılıyor...';

    try {
      const response = await fetch('/api/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetName: device.sheetName,
          rowNumber: device.rowNumber
        })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Tamamlandı yazılamadı.');
      }

      text.textContent = 'Tamamlandı';
      showToast(data.message || 'Tamamlandı yazıldı.', false);
    } catch (error) {
      checkbox.checked = false;
      checkbox.disabled = false;
      text.textContent = 'Tamamlandı';
      showToast(error.message, true);
    }
  });

  label.appendChild(checkbox);
  label.appendChild(text);
  return label;
}

function createField(label, value) {
  const item = document.createElement('div');
  item.className = 'result-field';

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
  elements.searchButton.textContent = isLoading ? 'Aranıyor' : 'Ara';
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
