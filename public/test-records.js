const statusEl = document.querySelector('#recordsStatus');
const listEl = document.querySelector('#recordsList');

loadRecords();

async function loadRecords() {
  try {
    const response = await fetch('/api/test-records?limit=300');
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
    statusEl.textContent = 'Henüz kayıt yok.';
    statusEl.dataset.type = 'empty';
    listEl.innerHTML = '';
    return;
  }

  statusEl.textContent = `${records.length} sipariş kodu listeleniyor.`;
  statusEl.dataset.type = 'ok';

  listEl.innerHTML = records
    .map((record) => {
      const failedItems = record.items
        .filter((item) => item.result === 'red')
        .map((item) => item.name);

      const code = formatCode(record.note);

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

          <details class="record-details">
            <summary>${escapeHtml(code)} test detaylarını göster</summary>
            <div class="record-tests">
              ${record.items.map(renderTestItem).join('')}
            </div>
          </details>
        </article>
      `;
    })
    .join('');
}

function renderTestItem(item) {
  const isRed = item.result === 'red';
  const text = item.result === 'red' ? 'Çarpı' : 'Tik';
  const extra = item.extra ? ` (${escapeHtml(item.extra)})` : '';

  return `
    <div class="${isRed ? 'record-test red' : 'record-test ok'}">
      <span>${escapeHtml(item.name)}${extra}</span>
      <strong>${text}</strong>
    </div>
  `;
}

function formatCode(value) {
  const text = String(value || '').trim();
  return text || 'Kod yazılmadı';
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
