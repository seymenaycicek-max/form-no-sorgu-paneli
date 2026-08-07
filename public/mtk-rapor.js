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

const greenMinInput = document.querySelector('#greenMin');
const whiteMinInput = document.querySelector('#whiteMin');
const redMaxInput = document.querySelector('#redMax');
const resetColorsButton = document.querySelector('#resetColors');

const colorStorageKey = 'mtkReportColorSettings';
const defaultColorSettings = {
  greenMin: 8,
  whiteMin: 7,
  redMax: 6
};

let currentReport = null;
let colorSettings = loadColorSettings();

dateInput.value = new Date().toISOString().slice(0, 10);
writeColorInputs();

form.addEventListener('submit', (event) => {
  event.preventDefault();
  loadReport();
});

[greenMinInput, whiteMinInput, redMaxInput].forEach((input) => {
  input.addEventListener('input', () => {
    colorSettings = readColorInputs();
    saveColorSettings();

    if (currentReport) {
      renderReport(currentReport);
    }
  });
});

resetColorsButton.addEventListener('click', () => {
  colorSettings = { ...defaultColorSettings };
  saveColorSettings();
  writeColorInputs();

  if (currentReport) {
    renderReport(currentReport);
  }
});

loadReport();

async function loadReport() {
  setStatus('Rapor yükleniyor...', 'loading');
  rowsEl.innerHTML = '';
  currentReport = null;

  try {
    const response = await fetch(
      `/api/mtk-report?date=${encodeURIComponent(dateInput.value)}`
    );
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Rapor alınamadı.');
    }

    currentReport = data;
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
    rowsEl.innerHTML = '';
    return;
  }

  setStatus(`${data.rows.length} teknisyen listelendi.`, 'ok');

  rowsEl.innerHTML = data.rows
    .map((row) => {
      const tier = getTier(row.toplam);

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

function getTier(total) {
  const value = Number(total || 0);

  if (value >= colorSettings.greenMin) return 'tier-high';
  if (value >= colorSettings.whiteMin) return 'tier-mid';
  if (value <= colorSettings.redMax) return 'tier-low';

  return 'tier-mid';
}

function readColorInputs() {
  const greenMin = readPositiveNumber(greenMinInput, defaultColorSettings.greenMin);
  const whiteMin = readPositiveNumber(whiteMinInput, defaultColorSettings.whiteMin);
  const redMax = readPositiveNumber(redMaxInput, defaultColorSettings.redMax);

  return {
    greenMin,
    whiteMin,
    redMax
  };
}

function writeColorInputs() {
  greenMinInput.value = colorSettings.greenMin;
  whiteMinInput.value = colorSettings.whiteMin;
  redMaxInput.value = colorSettings.redMax;
}

function readPositiveNumber(input, fallback) {
  const value = Number(input.value);

  if (!Number.isFinite(value) || value < 0) {
    return fallback;
  }

  return Math.floor(value);
}

function loadColorSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(colorStorageKey) || '{}');

    return {
      greenMin: numberOrDefault(saved.greenMin, defaultColorSettings.greenMin),
      whiteMin: numberOrDefault(saved.whiteMin, defaultColorSettings.whiteMin),
      redMax: numberOrDefault(saved.redMax, defaultColorSettings.redMax)
    };
  } catch {
    return { ...defaultColorSettings };
  }
}

function saveColorSettings() {
  localStorage.setItem(colorStorageKey, JSON.stringify(colorSettings));
}

function numberOrDefault(value, fallback) {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    return fallback;
  }

  return Math.floor(number);
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
