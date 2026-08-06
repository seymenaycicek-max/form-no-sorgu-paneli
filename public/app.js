const elements = {
  searchForm: document.getElementById('searchForm'),
  formNoInput: document.getElementById('formNoInput'),
  searchButton: document.getElementById('searchButton'),
  resultCount: document.getElementById('resultCount'),
  resultList: document.getElementById('resultList'),
  emptyState: document.getElementById('emptyState'),
  toast: document.getElementById('toast')
};

elements.searchForm.addEventListener(
  'submit',
  handleSearch
);

elements.formNoInput.focus();

/* =========================================================
   ARAMA
   ========================================================= */

async function handleSearch(event) {
  event.preventDefault();

  const formNo =
    elements.formNoInput.value.trim();

  if (!formNo) {
    showToast('Form no yazın.', true);
    elements.formNoInput.focus();
    return;
  }

  setLoading(true);

  elements.resultCount.textContent =
    'Aranıyor';

  elements.resultList.innerHTML = '';

  setEmptyState(
    'Kayıtlar getiriliyor...',
    'Lütfen birkaç saniye bekleyin.'
  );

  try {
    const response = await fetch(
      `/api/search?formNo=${encodeURIComponent(formNo)}`
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || 'Sonuç getirilemedi.'
      );
    }

    renderResults(data.results || []);
  } catch (error) {
    elements.resultCount.textContent =
      '0 kayıt';

    setEmptyState(
      'Sonuç getirilemedi.',
      'Bağlantıyı veya sistem ayarlarını kontrol edin.'
    );

    showToast(
      error.message || 'Bir hata oluştu.',
      true
    );
  } finally {
    setLoading(false);
  }
}

/* =========================================================
   SONUÇLARI GÖSTER
   ========================================================= */

function renderResults(results) {
  elements.resultList.innerHTML = '';

  elements.resultCount.textContent =
    `${results.length} kayıt`;

  if (!results.length) {
    setEmptyState(
      'Kayıt bulunamadı.',
      'Bu form no için aranan sayfalarda eşleşme yok.'
    );

    return;
  }

  elements.emptyState.hidden = true;

  results.forEach((device, index) => {
    const card = createResultCard(
      device,
      index + 1
    );

    elements.resultList.appendChild(card);
  });
}

/* =========================================================
   SONUÇ KARTI
   ========================================================= */

function createResultCard(device, index) {
  const card = document.createElement('article');

  card.className = 'result-card';

  const header = document.createElement('div');

  header.className = 'result-card-header';

  const titleWrap = document.createElement('div');

  titleWrap.className = 'card-title';

  const small = document.createElement('span');

  small.className = 'card-index';

  small.textContent =
    `${device.sheetName || 'Sayfa'} / Kayıt ${index}`;

  const title = document.createElement('h3');

  title.textContent = device.formNo
    ? `Form No ${device.formNo}`
    : 'Form No -';

  const meta = document.createElement('p');

  meta.className = 'card-meta';

  meta.textContent =
    `Teknisyen: ${device.teknisyen || '-'} • ` +
    `Kalite Kontrol: ${device.kaliteKontrol || '-'}`;

  titleWrap.append(
    small,
    title,
    meta
  );

  const headerBadges =
    document.createElement('div');

  headerBadges.className =
    'result-header-badges';

  const statusText =
    device.durum || 'Durum yok';

  const status =
    document.createElement('span');

  status.className =
    getStatusClass(statusText);

  status.textContent = statusText;

  headerBadges.appendChild(status);

  /*
   * Google Sheets P sütununda PKA varsa
   * kartın üst kısmında rozet gösterilir.
   */
  if (isPkaDevice(device)) {
    const pkaBadge =
      document.createElement('span');

    pkaBadge.className = 'pka-badge';
    pkaBadge.textContent = 'PKA';

    pkaBadge.title =
      'Parça Kaynaklı Arıza';

    headerBadges.appendChild(pkaBadge);
  }

  header.append(
    titleWrap,
    headerBadges
  );

  card.appendChild(header);

  const body = document.createElement('div');

  body.className = 'result-grid';

  const fields = [
    [
      'Tarih',
      device.tarih,
      'compact'
    ],
    [
      'Model',
      device.model,
      'strong'
    ],
    [
      'IMEI',
      maskImei(device.imei),
      'mono'
    ],
    [
      'Renk',
      device.renk,
      'compact'
    ],
    [
      'Kaldı Sebebi',
      device.kaldiSebebi,
      'wide'
    ],
    [
      'Not',
      device.not,
      'wide'
    ],
    [
      'Teknisyen',
      device.teknisyen,
      'compact'
    ],
    [
      'Kalite Kontrol',
      device.kaliteKontrol,
      'compact'
    ]
  ];

  fields.forEach(
    ([label, value, variant]) => {
      body.appendChild(
        createField(
          label,
          value,
          variant
        )
      );
    }
  );

  card.appendChild(body);

  /*
   * PKA olan cihazlarda kartın altında
   * açıklamalı uyarı gösterilir.
   */
  if (isPkaDevice(device)) {
    card.appendChild(
      createPkaWarning()
    );
  }

  return card;
}

/* =========================================================
   PKA KONTROLÜ
   ========================================================= */

function isPkaDevice(device) {
  /*
   * Asıl beklenen alan device.pka değeridir.
   * Diğer isimler farklı API isimlendirmeleri
   * kullanılırsa diye desteklenmiştir.
   */
  const rawValue =
    device.pka ??
    device.PKA ??
    device.parcaKaynakliAriza ??
    device.parcaKaynakli ??
    device.pSutunu ??
    '';

  if (rawValue === true) {
    return true;
  }

  const normalized =
    String(rawValue)
      .trim()
      .toLocaleUpperCase('tr-TR');

  return (
    normalized === 'PKA' ||
    normalized === 'PARÇA KAYNAKLI ARIZA' ||
    normalized === 'PARCA KAYNAKLI ARIZA'
  );
}

function createPkaWarning() {
  const warning =
    document.createElement('div');

  warning.className = 'pka-warning';

  const icon =
    document.createElement('span');

  icon.className = 'pka-icon';
  icon.textContent = '⚙';
  icon.setAttribute('aria-hidden', 'true');

  const copy =
    document.createElement('div');

  const title =
    document.createElement('strong');

  title.textContent =
    'Parça Kaynaklı Arıza';

  const description =
    document.createElement('span');

  description.textContent =
    'Bu cihaz Google Sheets üzerinde PKA olarak işaretlenmiştir.';

  copy.append(
    title,
    description
  );

  warning.append(
    icon,
    copy
  );

  return warning;
}

/* =========================================================
   IMEI GİZLEME
   ========================================================= */

function maskImei(value) {
  const original =
    String(value ?? '').trim();

  if (!original) {
    return '-';
  }

  /*
   * Boşluk, çizgi ve diğer karakterleri kaldırır.
   */
  const imei =
    original.replace(/\D/g, '');

  /*
   * IMEI yeterince uzun değilse
   * gelen değeri değiştirmeden gösterir.
   */
  if (imei.length < 8) {
    return original;
  }

  const firstFour =
    imei.slice(0, 4);

  const lastFour =
    imei.slice(-4);

  const hiddenLength =
    imei.length - 8;

  const hiddenPart =
    'X'.repeat(hiddenLength);

  return (
    firstFour +
    hiddenPart +
    lastFour
  );
}

/* =========================================================
   BİLGİ ALANI
   ========================================================= */

function createField(
  label,
  value,
  variant = ''
) {
  const item =
    document.createElement('div');

  item.className = variant
    ? `result-field ${variant}`
    : 'result-field';

  const fieldLabel =
    document.createElement('span');

  fieldLabel.textContent = label;

  const fieldValue =
    document.createElement('strong');

  fieldValue.textContent =
    value === null ||
    value === undefined ||
    String(value).trim() === ''
      ? '-'
      : String(value);

  item.append(
    fieldLabel,
    fieldValue
  );

  return item;
}

/* =========================================================
   DURUM RENGİ
   ========================================================= */

function getStatusClass(status) {
  const normalized =
    String(status || '')
      .toLocaleLowerCase('tr-TR');

  if (normalized.includes('kald')) {
    return 'status-pill status-waiting';
  }

  if (
    normalized.includes('gec') ||
    normalized.includes('geç')
  ) {
    return 'status-pill status-ok';
  }

  return 'status-pill';
}

/* =========================================================
   YÜKLENİYOR DURUMU
   ========================================================= */

function setLoading(isLoading) {
  elements.searchButton.disabled =
    isLoading;

  elements.searchButton.classList.toggle(
    'is-loading',
    isLoading
  );

  const buttonText =
    elements.searchButton.querySelector(
      '.button-text'
    );

  if (buttonText) {
    buttonText.textContent =
      isLoading ? 'Aranıyor' : 'Ara';
  }
}

/* =========================================================
   BOŞ SONUÇ ALANI
   ========================================================= */

function setEmptyState(title, detail) {
  elements.emptyState.innerHTML = '';

  const titleNode =
    document.createElement('strong');

  titleNode.textContent = title;

  const detailNode =
    document.createElement('span');

  detailNode.textContent = detail;

  elements.emptyState.append(
    titleNode,
    detailNode
  );

  elements.emptyState.hidden = false;
}

/* =========================================================
   BİLDİRİM
   ========================================================= */

function showToast(
  message,
  isError = false
) {
  elements.toast.textContent = message;

  elements.toast.classList.toggle(
    'error',
    Boolean(isError)
  );

  elements.toast.hidden = false;

  window.clearTimeout(
    showToast.timer
  );

  showToast.timer =
    window.setTimeout(() => {
      elements.toast.hidden = true;
    }, 3500);
}