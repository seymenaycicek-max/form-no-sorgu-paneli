const statusEl = document.querySelector('#recordsStatus');
const listEl = document.querySelector('#recordsList');

loadRecords();

async function loadRecords() {
  try {
    const response = await fetch('/api/technician-test-records?limit=300');
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Kayıtlar alınamadı.');
    }

    renderRecords(data.records || []);
  } catch (error) {
    statusEl.textContent = error.message || 'Kayıtlar yüklenirken hata oluştu.';
    statusEl.dataset.type = 'error';
  }
}

function renderRecords(records) {
  if (!records.length) {
    statusEl.textContent = 'Henüz teknisyen test kaydı yok.';
    statusEl.dataset.type = 'empty';
    listEl.innerHTML = '';
    return;
  }

  statusEl.textContent = `${records.length} teknisyen test kaydı listeleniyor.`;
  statusEl.dataset.type = 'ok';

  listEl.innerHTML = records.map(renderRecord).join('');
}

function renderRecord(record) {
  const failedItems = record.items
    .filter((item) => item.result === 'red')
    .map((item) => formatItemLabel(item));
  const code = formatCode(record.orderCode || record.note);

  return `
    <article class="record-item">
      <div class="record-main">
        <div>
          <small>Sipariş Kodu</small>
          <strong class="record-code">${escapeHtml(code)}</strong>
          <span>${escapeHtml(formatDevice(record))}</span>
        </div>
        <mark class="${record.finalStatus === 'red' ? 'record-red' : 'record-ok'}">
          ${record.finalStatus === 'red' ? 'RED' : 'OK'}
        </mark>
      </div>

      <dl class="record-meta">
        <div>
          <dt>Tarih</dt>
          <dd>${escapeHtml(formatDate(record.date))}</dd>
        </div>
        <div>
          <dt>Kayıt</dt>
          <dd>${escapeHtml(formatDateTime(record.createdAt))}</dd>
        </div>
        <div>
          <dt>OK</dt>
          <dd>${formatNumber(record.okCount)}</dd>
        </div>
        <div>
          <dt>RED</dt>
          <dd>${formatNumber(record.redCount)}</dd>
        </div>
      </dl>

      <div class="record-failures">
        <span>Çarpı atılanlar</span>
        <p>${failedItems.length ? escapeHtml(failedItems.join(', ')) : 'Yok'}</p>
      </div>

      <div class="record-note-view">
        <span>Notlar</span>
        <p>${escapeHtml(formatNote(record))}</p>
      </div>

      <details class="record-details">
        <summary>${escapeHtml(code)} teknisyen test detaylarını göster</summary>
        <div class="record-tests">
          ${record.items.map(renderTestItem).join('')}
        </div>
      </details>
    </article>
  `;
}

function renderTestItem(item) {
  const isRed = item.result === 'red';
  const symbol = isRed ? '✕' : '✓';

  return `
    <div class="${isRed ? 'record-test red' : 'record-test ok'}">
      <span>${escapeHtml(formatItemLabel(item))}</span>
      <strong class="record-symbol" aria-label="${isRed ? 'Çarpı' : 'Tik'}">${symbol}</strong>
    </div>
  `;
}

function formatItemLabel(item) {
  const name = String(item.name || '').trim();
  const extra = String(item.extra || '').trim();

  if (!extra) {
    return name;
  }

  if (normalizeText(name).includes('PIL SAGLIGI')) {
    return `${name}: ${extra.replace(/%+$/g, '').trim()}%`;
  }

  return `${name}: ${extra}`;
}

function normalizeText(value) {
  return String(value || '')
    .toLocaleUpperCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function formatCode(value) {
  const text = String(value || '').trim();
  return text || 'Kod yazılmadı';
}

function formatNote(record) {
  return String(record.note || '').trim() || 'Not yazılmadı';
}

function formatDevice(record) {
  const model = String(record.model || '').trim() || 'Model yok';
  return `${model} / ${formatGb(record.gb)}`;
}

function formatGb(value) {
  const text = String(value || '').trim();
  return text ? `${text} GB` : 'Hafıza yok';
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(`${value}T00:00:00`).toLocaleDateString('tr-TR');
}

function formatDateTime(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('tr-TR');
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('tr-TR');
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
