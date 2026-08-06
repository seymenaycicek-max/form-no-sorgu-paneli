const form = document.querySelector('#reportForm');
const dateInput = document.querySelector('#reportDate');
const statusBox = document.querySelector('#statusBox');
const rowsEl = document.querySelector('#reportRows');

const totalRepaired = document.querySelector('#totalRepaired');
const totalRenewal = document.querySelector('#totalRenewal');
const totalAll = document.querySelector('#totalAll');
const footerRepaired = document.querySelector('#footerRepaired');
const footerRenewal = document.querySelector('#footerRenewal');
const footerAll = document.querySelector('#footerAll');

dateInput.value = new Date().toISOString().slice(0, 10);

form.addEventListener('submit', (event) => {
  event.preventDefault();
  loadReport();
});

loadReport();

async function loadReport() {
  setStatus('Rapor yükleniyor...', 'loading');
  rowsEl.innerHTML = '';

  try {
    const response = await fetch(
      `/api/mtk-report?date=${encodeURIComponent(dateInput.value)}`
    );
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Rapor alınamadı.');
    }

    renderReport(data);
  } catch (error) {
    setStatus(error.message, 'error');
    renderTotals({
      onarildi: 0,
      yenileme: 0,
      toplam: 0
    });
  }
}

function renderReport(data) {
  renderTotals(data.totals);

  if (!data.rows.length) {
    setStatus('Seçilen tarihte onarım açıklamasında onarıldı veya yenileme olan cihaz bulunamadı.', 'empty');
    return;
  }

  setStatus(`${data.rows.length} teknisyen listelendi.`, 'ok');

  rowsEl.innerHTML = data.rows
    .map((row) => {
      const tier = getTier(row.toplam, data.totals.toplam);

      return `
        <tr class="${tier}">
          <th>${escapeHtml(row.teknisyen)}</th>
          <td>${formatNumber(row.onarildi)}</td>
          <td>${formatNumber(row.yenileme)}</td>
          <td>${formatNumber(row.toplam)}</td>
        </tr>
      `;
    })
    .join('');
}

function renderTotals(totals) {
  totalRepaired.textContent = formatNumber(totals.onarildi);
  totalRenewal.textContent = formatNumber(totals.yenileme);
  totalAll.textContent = formatNumber(totals.toplam);

  footerRepaired.textContent = formatNumber(totals.onarildi);
  footerRenewal.textContent = formatNumber(totals.yenileme);
  footerAll.textContent = formatNumber(totals.toplam);
}

function getTier(total, grandTotal) {
  if (!grandTotal) return 'tier-low';

  const ratio = total / grandTotal;

  if (ratio >= 0.055 || total >= 6) return 'tier-high';
  if (ratio >= 0.03 || total >= 4) return 'tier-mid';
  return 'tier-low';
}

function setStatus(message, type) {
  statusBox.textContent = message;
  statusBox.dataset.type = type;
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
