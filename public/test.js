const TEST_ITEMS = [
  'ŞARJ',
  'KABLOSUZ ŞARJ',
  'POWER',
  'İMEİ KONTROLÜ',
  'KOZMETİK',
  'VİDA',
  'EKRAN',
  'TUŞ TAKIMI',
  'SİM YUVASI ARIZA',
  'ŞEBEKE/SİM KART',
  'GELEN SES',
  'GİDEN SES',
  'SENSÖR',
  'KALEM',
  'ÖN KAMERA/VİD.SES',
  'ARKA KAMERA/VİD.SES',
'SES KAYDEDİCİSİ',
'PUSULA',
'NFC',
  'FLASH',
  'TRUE TONE',
  'ICLOUD/ACCOUNT',
  'WIFI',
  'BLUETOOTH',
  'ZİL SESİ',
  'TİTREŞİM',
  'TOUCH ID/FACE ID',
  'PİL SAĞLIĞI',
  'GENEL TEMİZLİK'
];

const BATTERY_INDEX = TEST_ITEMS.indexOf('PİL SAĞLIĞI');
const COSMETIC_INDEX = TEST_ITEMS.indexOf('KOZMETİK');
const BATTERY_PASS_LIMIT = 85;

const COSMETIC_GRADES = [
  {
    value: 'A+',
    className: 'grade-aplus'
  },
  {
    value: 'A',
    className: 'grade-a'
  },
  {
    value: 'B',
    className: 'grade-b'
  },
  {
    value: 'D',
    className: 'grade-d'
  },
  {
    value: 'E',
    className: 'grade-e'
  }
];

const state = {
  activeIndex: 0,
  history: [],
  results: Array(TEST_ITEMS.length).fill(''),
  batteryHealth: '',
  cosmeticGrade: '',
  cosmeticMenuOpen: false,
  saving: false
};

const elements = {
  table: document.getElementById('testTable'),
  okCount: document.getElementById('okCount'),
  redCount: document.getElementById('redCount'),
  finalStatus: document.getElementById('finalStatus'),
  progressText: document.getElementById('progressText'),
  progressBar: document.getElementById('progressBar'),
  progressContainer: document.querySelector('.test-progress-bar'),
  activeText: document.getElementById('activeText'),
  clearButton: document.getElementById('clearButton'),
  toast: document.getElementById('toast'),
  testDate: document.getElementById('testDate'),
  testModel: document.getElementById('testModel'),
  testGb: document.getElementById('testGb'),
  testNote: document.getElementById('testNote')
};

const requiredElements = [
  'table',
  'okCount',
  'redCount',
  'finalStatus',
  'progressText',
  'progressBar',
  'activeText',
  'clearButton',
  'toast',
  'testDate',
  'testModel',
  'testGb'
];

const missingElements = requiredElements.filter(
  (key) => !elements[key]
);

if (missingElements.length > 0) {
  console.error(
    `Test sayfasında eksik HTML elemanları var: ${missingElements.join(', ')}`
  );
} else {
  startTestApp();
}

/* =========================================================
   UYGULAMAYI BAŞLAT
   ========================================================= */

function startTestApp() {
  elements.clearButton.addEventListener(
    'click',
    clearPaper
  );

  document.addEventListener(
    'keydown',
    handleKeyDown
  );

  document.addEventListener(
    'click',
    handleDocumentClick
  );

  setToday();
  renderTable();
  updateSummary();
}

/* =========================================================
   TABLOYU OLUŞTUR
   ========================================================= */

function renderTable() {
  elements.table.innerHTML = '';

  TEST_ITEMS.forEach((item, index) => {
    const row = document.createElement('div');

    row.className = getRowClass(index);
    row.dataset.index = String(index);
    row.setAttribute('role', 'row');

    if (index === BATTERY_INDEX) {
      row.classList.add('battery-row');
    }

    if (index === COSMETIC_INDEX) {
      row.classList.add('cosmetic-row');
    }

    row.addEventListener('click', () => {
      setActive(index);
    });

    const name = document.createElement('button');

    name.className = 'test-name';
    name.type = 'button';
    name.textContent = item;

    name.setAttribute(
      'aria-label',
      `${item} testini aktif hale getir`
    );

    name.addEventListener('click', (event) => {
      event.stopPropagation();
      setActive(index);
    });

    const okButton = createResultButton(
      index,
      'ok',
      '✓'
    );

    const redButton = createResultButton(
      index,
      'red',
      '✕'
    );

    let resultArea;

    if (index === BATTERY_INDEX) {
      resultArea = createBatteryHealthInput(index);
    } else if (index === COSMETIC_INDEX) {
      resultArea = createCosmeticGradePicker(index);
    } else {
      resultArea = createResultDisplay(index);
    }

    row.append(
      name,
      okButton,
      redButton,
      resultArea
    );

    elements.table.appendChild(row);
  });
}

/* =========================================================
   OK VE RED BUTONLARI
   ========================================================= */

function createResultButton(index, value, text) {
  const button = document.createElement('button');
  const selected = state.results[index] === value;

  button.type = 'button';

  button.className = selected
    ? `mark-button ${value} selected`
    : `mark-button ${value}`;

  button.textContent = text;

  button.setAttribute(
    'aria-pressed',
    String(selected)
  );

  button.setAttribute(
    'aria-label',
    `${TEST_ITEMS[index]}: ${
      value === 'ok' ? 'OK' : 'RED'
    }`
  );

  button.addEventListener('click', (event) => {
    event.stopPropagation();

    /*
     * Pil sağlığında OK ve RED elle seçilmez.
     * Yüzdeye göre otomatik belirlenir.
     */
    if (index === BATTERY_INDEX) {
      state.activeIndex = BATTERY_INDEX;
      state.cosmeticMenuOpen = false;

      renderAndUpdate();
      focusBatteryInput();

      showToast(
        'Pil sağlığı yüzdesini yazıp Enter tuşuna basın.',
        false
      );

      return;
    }

    markResult(index, value);
  });

  return button;
}

/* =========================================================
   NORMAL SONUÇ ALANI
   ========================================================= */

function createResultDisplay(index) {
  const result = document.createElement('div');
  const value = state.results[index];

  result.className = getResultClass(value);
  result.textContent = getResultText(value);

  result.setAttribute(
    'aria-label',
    `${TEST_ITEMS[index]} sonucu: ${getAccessibleResultText(value)}`
  );

  return result;
}

/* =========================================================
   PİL SAĞLIĞI
   85–100 = YEŞİL OK
   0–84 = KIRMIZI RED
   ========================================================= */

function createBatteryHealthInput(index) {
  const wrapper = document.createElement('div');

  wrapper.className =
    'test-result battery-health-cell';

  if (state.results[index] === 'ok') {
    wrapper.classList.add('ok');
  }

  if (state.results[index] === 'red') {
    wrapper.classList.add('red');
  }

  const input = document.createElement('input');

  input.type = 'number';
  input.className = 'battery-health-input';
  input.min = '0';
  input.max = '100';
  input.step = '1';
  input.inputMode = 'numeric';
  input.placeholder = '85';
  input.value = state.batteryHealth;

  input.setAttribute(
    'aria-label',
    'Pil sağlığı yüzdesi'
  );

  const percent = document.createElement('span');

  percent.textContent = '%';
  percent.setAttribute('aria-hidden', 'true');

  input.addEventListener('click', (event) => {
    event.stopPropagation();
  });

  input.addEventListener('focus', () => {
    state.activeIndex = BATTERY_INDEX;
    updateSummary();
  });

  input.addEventListener('keydown', (event) => {
    /*
     * Pil alanına sayı yazarken genel 1 ve 2
     * kısayollarının çalışmasını engeller.
     */
    event.stopPropagation();

    if (event.key === 'Enter') {
      event.preventDefault();
      completeBatteryEntry();
    }
  });

  input.addEventListener('input', () => {
    handleBatteryInput(input, index);
  });

  wrapper.append(input, percent);

  return wrapper;
}

function handleBatteryInput(input, index) {
  let value = input.value;

  /*
   * Alan boşaltılırsa pil sonucu da temizlenir.
   */
  if (value === '') {
    state.batteryHealth = '';
    state.results[index] = '';

    updateBatteryVisuals(index);
    updateSummary();

    return;
  }

  let numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return;
  }

  /*
   * Ondalık değeri tam sayıya çevir.
   * Değeri 0 ile 100 arasında tut.
   */
  numberValue = Math.trunc(numberValue);
  numberValue = Math.max(
    0,
    Math.min(100, numberValue)
  );

  input.value = String(numberValue);
  state.batteryHealth = String(numberValue);

  /*
   * 85 ve üzeri otomatik yeşil tik.
   * 84 ve altı otomatik kırmızı çarpı.
   */
  state.results[index] =
    numberValue >= BATTERY_PASS_LIMIT
      ? 'ok'
      : 'red';

  updateBatteryVisuals(index);
  updateSummary();
}

function completeBatteryEntry() {
  if (state.batteryHealth === '') {
    showToast(
      'Pil sağlığı için 0 ile 100 arasında bir değer girin.',
      true
    );

    focusBatteryInput();
    return;
  }

  const batteryValue = Number(
    state.batteryHealth
  );

  if (
    !Number.isFinite(batteryValue) ||
    batteryValue < 0 ||
    batteryValue > 100
  ) {
    showToast(
      'Pil sağlığı 0 ile 100 arasında olmalıdır.',
      true
    );

    focusBatteryInput();
    return;
  }

  /*
   * Enter basıldığında sonucu kesinleştir.
   */
  state.results[BATTERY_INDEX] =
    batteryValue >= BATTERY_PASS_LIMIT
      ? 'ok'
      : 'red';

  /*
   * Pil sağlığından sonraki eksik teste geç.
   */
  state.activeIndex = findNextIncomplete(
    BATTERY_INDEX + 1
  );

  renderAndUpdate();
  scrollActiveRowIntoView();
  focusActiveSpecialArea();
  showCompletionMessage();
}

function updateBatteryVisuals(index) {
  const row = elements.table.querySelector(
    `.test-row[data-index="${index}"]`
  );

  if (!row) {
    return;
  }

  const okButton = row.querySelector(
    '.mark-button.ok'
  );

  const redButton = row.querySelector(
    '.mark-button.red'
  );

  const batteryCell = row.querySelector(
    '.battery-health-cell'
  );

  const isOk = state.results[index] === 'ok';
  const isRed = state.results[index] === 'red';

  if (okButton) {
    okButton.classList.toggle(
      'selected',
      isOk
    );

    okButton.setAttribute(
      'aria-pressed',
      String(isOk)
    );
  }

  if (redButton) {
    redButton.classList.toggle(
      'selected',
      isRed
    );

    redButton.setAttribute(
      'aria-pressed',
      String(isRed)
    );
  }

  if (batteryCell) {
    batteryCell.classList.toggle(
      'ok',
      isOk
    );

    batteryCell.classList.toggle(
      'red',
      isRed
    );
  }

  row.classList.toggle(
    'filled',
    isItemComplete(index)
  );
}

/* =========================================================
   KOZMETİK SINIFI
   A+, A, B, D, E
   ========================================================= */

function createCosmeticGradePicker(index) {
  const wrapper = document.createElement('div');

  wrapper.className =
    'test-result cosmetic-grade-cell';

  const picker = document.createElement('div');

  picker.className = 'cosmetic-grade-picker';

  const trigger = document.createElement('button');

  trigger.type = 'button';
  trigger.className = 'cosmetic-grade-trigger';

  trigger.setAttribute(
    'aria-label',
    'Kozmetik sınıfını seç'
  );

  trigger.setAttribute(
    'aria-expanded',
    String(state.cosmeticMenuOpen)
  );

  if (state.cosmeticGrade) {
    trigger.textContent = state.cosmeticGrade;

    const selectedGrade = COSMETIC_GRADES.find(
      (grade) =>
        grade.value === state.cosmeticGrade
    );

    if (selectedGrade) {
      trigger.classList.add(
        selectedGrade.className
      );
    }
  } else {
    trigger.textContent = '+';
    trigger.classList.add('grade-empty');
  }

  trigger.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();

    state.activeIndex = index;

    state.cosmeticMenuOpen =
      !state.cosmeticMenuOpen;

    renderAndUpdate();
  });

  const menu = document.createElement('div');

  menu.className = state.cosmeticMenuOpen
    ? 'cosmetic-grade-menu open'
    : 'cosmetic-grade-menu';

  COSMETIC_GRADES.forEach((grade) => {
    const option = document.createElement('button');

    option.type = 'button';

    option.className =
      `cosmetic-grade-option ${grade.className}`;

    option.textContent = grade.value;

    option.setAttribute(
      'aria-label',
      `Kozmetik sınıfı ${grade.value}`
    );

    option.setAttribute(
      'aria-pressed',
      String(
        state.cosmeticGrade === grade.value
      )
    );

    if (
      state.cosmeticGrade === grade.value
    ) {
      option.classList.add('selected');
    }

    option.addEventListener(
      'click',
      (event) => {
        event.preventDefault();
        event.stopPropagation();

        selectCosmeticGrade(
          index,
          grade.value
        );
      }
    );

    menu.appendChild(option);
  });

  picker.append(trigger, menu);
  wrapper.appendChild(picker);

  return wrapper;
}

function selectCosmeticGrade(index, grade) {
  state.cosmeticGrade = grade;
  state.cosmeticMenuOpen = false;

  /*
   * Kozmetik OK veya RED seçilmişse
   * bir sonraki teste geç.
   */
  if (state.results[index]) {
    state.activeIndex = findNextIncomplete(
      index + 1
    );
  } else {
    /*
     * OK veya RED seçilmediyse
     * kozmetik satırında kal.
     */
    state.activeIndex = index;
  }

  renderAndUpdate();
  scrollActiveRowIntoView();
  focusActiveSpecialArea();
  showCompletionMessage();
}

function handleDocumentClick(event) {
  if (!state.cosmeticMenuOpen) {
    return;
  }

  const clickedInsideMenu =
    event.target.closest(
      '.cosmetic-grade-picker'
    );

  if (clickedInsideMenu) {
    return;
  }

  state.cosmeticMenuOpen = false;
  renderAndUpdate();
}

/* =========================================================
   KLAVYE KISAYOLLARI
   1 = OK
   2 = RED
   ========================================================= */

function handleKeyDown(event) {
  const target = event.target;
  const tagName = target.tagName.toLowerCase();

  const isTyping =
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    target.isContentEditable;

  /*
   * Input veya textarea içindeyken
   * genel kısayolları çalıştırma.
   */
  if (isTyping) {
    return;
  }

  if (event.key === '1') {
    event.preventDefault();

    /*
     * Aktif satır pil sağlığıysa
     * sayı alanını otomatik seç.
     */
    if (state.activeIndex === BATTERY_INDEX) {
      showToast(
        'Pil sağlığı yüzdesini yazıp Enter tuşuna basın.',
        false
      );

      focusBatteryInput();
      return;
    }

    markResult(
      state.activeIndex,
      'ok'
    );

    return;
  }

  if (event.key === '2') {
    event.preventDefault();

    /*
     * Aktif satır pil sağlığıysa
     * sayı alanını otomatik seç.
     */
    if (state.activeIndex === BATTERY_INDEX) {
      showToast(
        'Pil sağlığı yüzdesini yazıp Enter tuşuna basın.',
        false
      );

      focusBatteryInput();
      return;
    }

    markResult(
      state.activeIndex,
      'red'
    );

    return;
  }

  if (event.key === 'Backspace') {
    event.preventDefault();
    undoLastMark();
    return;
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    moveActive(1);
    return;
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault();
    moveActive(-1);
    return;
  }

  if (event.code === 'Space') {
    event.preventDefault();

    if (!isComplete()) {
      showToast(
        'Tüm testler, kozmetik sınıfı ve pil sağlığı doldurulmalıdır.',
        true
      );

      return;
    }

    saveAndClearPaper();
  }
}

/* =========================================================
   TEST İŞARETLEME
   ========================================================= */

function markResult(index, value) {
  if (
    index < 0 ||
    index >= TEST_ITEMS.length
  ) {
    return;
  }

  /*
   * Pil sağlığında 1 veya 2 ile işaretleme yok.
   * Yüzde alanı otomatik seçilir.
   */
  if (index === BATTERY_INDEX) {
    state.activeIndex = BATTERY_INDEX;
    state.cosmeticMenuOpen = false;

    renderAndUpdate();
    focusBatteryInput();

    showToast(
      'Pil sağlığı yüzdesini yazıp Enter tuşuna basın.',
      false
    );

    return;
  }

  const previous = state.results[index];

  if (previous !== value) {
    state.history.push({
      type: 'result',
      index,
      previous
    });

    state.results[index] = value;
  }

  /*
   * Kozmetik satırındaysa ve sınıf
   * seçilmediyse menüyü otomatik aç.
   */
  if (
    index === COSMETIC_INDEX &&
    state.cosmeticGrade === ''
  ) {
    state.activeIndex = COSMETIC_INDEX;
    state.cosmeticMenuOpen = true;

    renderAndUpdate();

    showToast(
      'Kozmetik sınıfını seçin.',
      false
    );

    return;
  }

  state.cosmeticMenuOpen = false;

  state.activeIndex = findNextIncomplete(
    index + 1
  );

  renderAndUpdate();
  scrollActiveRowIntoView();

  /*
   * Sonraki satır pil sağlığıysa
   * sayı alanını otomatik seç.
   */
  if (state.activeIndex === BATTERY_INDEX) {
    focusBatteryInput();

    showToast(
      'Pil sağlığı yüzdesini girin. Enter ile devam edin.',
      false
    );

    return;
  }

  focusActiveSpecialArea();
  showCompletionMessage();
}

/* =========================================================
   GERİ AL
   ========================================================= */

function undoLastMark() {
  const last = state.history.pop();

  if (!last) {
    showToast(
      'Geri alınacak işaret yok.',
      true
    );

    return;
  }

  if (last.type === 'result') {
    state.results[last.index] =
      last.previous;

    state.activeIndex = last.index;
  }

  state.cosmeticMenuOpen = false;

  renderAndUpdate();
  scrollActiveRowIntoView();
  focusActiveSpecialArea();
}

/* =========================================================
   SONRAKİ EKSİK TESTİ BUL
   ========================================================= */

function findNextIncomplete(startIndex) {
  for (
    let offset = 0;
    offset < TEST_ITEMS.length;
    offset += 1
  ) {
    const index =
      (startIndex + offset) %
      TEST_ITEMS.length;

    if (!isItemComplete(index)) {
      return index;
    }
  }

  return TEST_ITEMS.length - 1;
}

/* =========================================================
   TEST TAMAMLANMA KONTROLÜ
   ========================================================= */

function isItemComplete(index) {
  if (!state.results[index]) {
    return false;
  }

  if (
    index === BATTERY_INDEX &&
    state.batteryHealth === ''
  ) {
    return false;
  }

  if (
    index === COSMETIC_INDEX &&
    state.cosmeticGrade === ''
  ) {
    return false;
  }

  return true;
}

function isComplete() {
  return TEST_ITEMS.every(
    (item, index) => {
      return isItemComplete(index);
    }
  );
}

/* =========================================================
   AKTİF SATIR
   ========================================================= */

function moveActive(direction) {
  state.activeIndex = Math.max(
    0,
    Math.min(
      TEST_ITEMS.length - 1,
      state.activeIndex + direction
    )
  );

  state.cosmeticMenuOpen = false;

  renderAndUpdate();
  scrollActiveRowIntoView();
  focusActiveSpecialArea();
}

function setActive(index) {
  state.activeIndex = index;

  if (index !== COSMETIC_INDEX) {
    state.cosmeticMenuOpen = false;
  }

  renderAndUpdate();
  scrollActiveRowIntoView();
  focusActiveSpecialArea();
}

function focusActiveSpecialArea() {
  if (state.activeIndex === BATTERY_INDEX) {
    focusBatteryInput();
  }
}

/* =========================================================
   EKRANI GÜNCELLE
   ========================================================= */

function renderAndUpdate() {
  renderTable();
  updateSummary();
}

/* =========================================================
   ÖZET, SAYILAR VE İLERLEME ÇUBUĞU
   ========================================================= */

function updateSummary() {
  const okCount = state.results.filter(
    (result) => result === 'ok'
  ).length;

  const redCount = state.results.filter(
    (result) => result === 'red'
  ).length;

  const completedCount = TEST_ITEMS.reduce(
    (total, item, index) => {
      return total + (
        isItemComplete(index) ? 1 : 0
      );
    },
    0
  );

  const percent = Math.round(
    (
      completedCount /
      TEST_ITEMS.length
    ) * 100
  );

  elements.okCount.textContent =
    String(okCount);

  elements.redCount.textContent =
    String(redCount);

  elements.progressText.textContent =
    `${completedCount} / ${TEST_ITEMS.length} tamamlandı`;

  elements.progressBar.style.width =
    `${percent}%`;

  if (elements.progressContainer) {
    elements.progressContainer.setAttribute(
      'aria-valuenow',
      String(completedCount)
    );

    elements.progressContainer.setAttribute(
      'aria-valuemax',
      String(TEST_ITEMS.length)
    );
  }

  if (isComplete()) {
    elements.activeText.textContent =
      'Tüm testler tamamlandı';
  } else if (
    state.activeIndex === BATTERY_INDEX &&
    state.batteryHealth === ''
  ) {
    elements.activeText.textContent =
      'Pil sağlığı yüzdesini yazıp Enter tuşuna basın';
  } else if (
    state.activeIndex === COSMETIC_INDEX &&
    state.cosmeticGrade === ''
  ) {
    elements.activeText.textContent =
      'Kozmetik sınıfını seçin';
  } else {
    elements.activeText.textContent =
      `Sıradaki test: ${
        TEST_ITEMS[state.activeIndex]
      }`;
  }

  if (!isComplete()) {
    elements.finalStatus.textContent = '-';
    elements.finalStatus.className = '';
    return;
  }

  if (redCount > 0) {
    elements.finalStatus.textContent =
      'RED';

    elements.finalStatus.className =
      'final-red';

    return;
  }

  elements.finalStatus.textContent =
    'OK';

  elements.finalStatus.className =
    'final-ok';
}

/* =========================================================
   KAĞIDI TEMİZLE
   ========================================================= */

function clearPaper() {
  state.activeIndex = 0;
  state.history = [];

  state.results = Array(
    TEST_ITEMS.length
  ).fill('');

  state.batteryHealth = '';
  state.cosmeticGrade = '';
  state.cosmeticMenuOpen = false;

  elements.testModel.value = '';
  elements.testGb.value = '';

  if (elements.testNote) {
    elements.testNote.value = '';
  }

  setToday();
  renderAndUpdate();

  showToast(
    'Kağıt temizlendi. Yeni cihaza geçebilirsiniz.',
    false
  );
}

/* =========================================================
   TEST KAYDINI VERITABANINA YAZ
   ========================================================= */

async function saveAndClearPaper() {
  if (state.saving) {
    return;
  }

  state.saving = true;

  showToast(
    'Test kaydi aliniyor...',
    false
  );

  try {
    const response = await fetch('/api/test-records', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(createTestRecordPayload())
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Test kaydi alinamadi.');
    }

    clearPaper();

    showToast(
      'Test kaydedildi. Yeni cihaza gecebilirsiniz.',
      false
    );
  } catch (error) {
    showToast(
      error.message || 'Test kaydi alinirken hata olustu.',
      true
    );
  } finally {
    state.saving = false;
  }
}

function createTestRecordPayload() {
  return {
    date: elements.testDate.value,
    model: elements.testModel.value,
    gb: elements.testGb.value,
    note: elements.testNote ? elements.testNote.value : '',
    items: TEST_ITEMS.map((name, index) => {
      let extra = '';

      if (index === BATTERY_INDEX) {
        extra = state.batteryHealth;
      }

      if (index === COSMETIC_INDEX) {
        extra = state.cosmeticGrade;
      }

      return {
        name,
        result: state.results[index],
        extra
      };
    })
  };
}

/* =========================================================
   CSS SINIFLARI
   ========================================================= */

function getRowClass(index) {
  const classes = ['test-row'];

  if (index === state.activeIndex) {
    classes.push('active');
  }

  if (isItemComplete(index)) {
    classes.push('filled');
  }

  return classes.join(' ');
}

function getResultClass(result) {
  if (result === 'ok') {
    return 'test-result ok';
  }

  if (result === 'red') {
    return 'test-result red';
  }

  return 'test-result';
}

function getResultText(result) {
  if (result === 'ok') {
    return '✓';
  }

  if (result === 'red') {
    return '✕';
  }

  return '';
}

function getAccessibleResultText(result) {
  if (result === 'ok') {
    return 'OK';
  }

  if (result === 'red') {
    return 'RED';
  }

  return 'işaretlenmedi';
}

/* =========================================================
   TARİH
   ========================================================= */

function setToday() {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(
    now.getMonth() + 1
  ).padStart(2, '0');

  const day = String(
    now.getDate()
  ).padStart(2, '0');

  elements.testDate.value =
    `${year}-${month}-${day}`;
}

/* =========================================================
   PİL ALANINA ODAKLAN
   ========================================================= */

function focusBatteryInput() {
  window.requestAnimationFrame(() => {
    const input = document.querySelector(
      '.battery-health-input'
    );

    if (!input) {
      return;
    }

    input.focus();
    input.select();

    const row = input.closest('.test-row');

    if (row) {
      row.scrollIntoView({
        block: 'center',
        behavior: 'smooth'
      });
    }
  });
}

/* =========================================================
   AKTİF SATIRI EKRANA GETİR
   ========================================================= */

function scrollActiveRowIntoView() {
  window.requestAnimationFrame(() => {
    const activeRow =
      elements.table.querySelector(
        `.test-row[data-index="${state.activeIndex}"]`
      );

    if (!activeRow) {
      return;
    }

    activeRow.scrollIntoView({
      block: 'nearest',
      behavior: 'smooth'
    });
  });
}

/* =========================================================
   TEST TAMAMLANDI BİLDİRİMİ
   ========================================================= */

function showCompletionMessage() {
  if (!isComplete()) {
    return;
  }

  const hasRed =
    state.results.includes('red');

  if (hasRed) {
    showToast(
      'Test tamamlandı: Cihaz RED kaldı.',
      true
    );

    return;
  }

  showToast(
    'Test tamamlandı: Cihaz OK geçti.',
    false
  );
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

  showToast.timer = window.setTimeout(
    () => {
      elements.toast.hidden = true;
    },
    2800
  );
}
