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
  cosmeticMenuOpen: false
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

    let result;

    if (index === BATTERY_INDEX) {
      result = createBatteryHealthInput(index);
    } else if (index === COSMETIC_INDEX) {
      result = createCosmeticGradePicker(index);
    } else {
      result = createResultDisplay(index);
    }

    row.append(
      name,
      okButton,
      redButton,
      result
    );

    elements.table.appendChild(row);
  });
}

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
     * Pil sağlığı sonucu elle değiştirilemez.
     * Sonuç yüzdeye göre otomatik belirlenir.
     */
    if (index === BATTERY_INDEX) {
      state.activeIndex = BATTERY_INDEX;

      if (state.batteryHealth === '') {
        showToast(
          'Pil sağlığını girin. 85 ve üzeri OK, 84 ve altı RED olur.',
          true
        );
      }

      focusBatteryInput();
      return;
    }

    markResult(index, value);
  });

  return button;
}

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
   85–100 = OK
   0–84 = RED
   ========================================================= */

function createBatteryHealthInput(index) {
  const wrapper = document.createElement('div');

  wrapper.className = 'test-result battery-health-cell';

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

  input.addEventListener('keydown', (event) => {
    event.stopPropagation();

    if (event.key === 'Enter') {
      event.preventDefault();
      completeBatteryEntry();
    }
  });

  input.addEventListener('input', () => {
    handleBatteryInput(input, index);
  });

  input.addEventListener('change', () => {
    completeBatteryEntry();
  });

  wrapper.append(input, percent);

  return wrapper;
}

function handleBatteryInput(input, index) {
  let value = input.value;

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

  numberValue = Math.trunc(numberValue);
  numberValue = Math.max(
    0,
    Math.min(100, numberValue)
  );

  input.value = String(numberValue);
  state.batteryHealth = String(numberValue);

  /*
   * 85 ve üstü yeşil tik.
   * 84 ve altı kırmızı çarpı.
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

  state.activeIndex = findNextIncomplete(
    BATTERY_INDEX + 1
  );

  renderAndUpdate();
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
   * OK veya RED seçildiyse sonraki teste geç.
   * Seçilmediyse kozmetik satırında kal.
   */
  if (state.results[index]) {
    state.activeIndex = findNextIncomplete(
      index + 1
    );
  } else {
    state.activeIndex = index;
  }

  renderAndUpdate();
  showCompletionMessage();
}

function handleDocumentClick() {
  if (!state.cosmeticMenuOpen) {
    return;
  }

  state.cosmeticMenuOpen = false;
  renderAndUpdate();
}

/* =========================================================
   KLAVYE KISAYOLLARI
   ========================================================= */

function handleKeyDown(event) {
  const target = event.target;
  const tagName = target.tagName.toLowerCase();

  const isTyping =
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    target.isContentEditable;

  if (isTyping) {
    return;
  }

  if (event.key === '1') {
    event.preventDefault();

    if (
      state.activeIndex === BATTERY_INDEX
    ) {
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

    if (
      state.activeIndex === BATTERY_INDEX
    ) {
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
        'Tüm testler, pil sağlığı ve kozmetik sınıfı doldurulmalıdır.',
        true
      );

      return;
    }

    clearPaper();
  }
}

/* =========================================================
   TEST SONUÇLARI
   ========================================================= */

function markResult(index, value) {
  if (
    index < 0 ||
    index >= TEST_ITEMS.length
  ) {
    return;
  }

  /*
   * Pil sağlığı yüzdesine göre
   * otomatik belirlenir.
   */
  if (index === BATTERY_INDEX) {
    state.activeIndex = BATTERY_INDEX;
    renderAndUpdate();
    focusBatteryInput();
    return;
  }

  const previous = state.results[index];

  if (previous !== value) {
    state.history.push({
      index,
      previous
    });

    state.results[index] = value;
  }

  /*
   * Kozmetik sınıfı seçilmediyse
   * kozmetik satırında kal ve menüyü aç.
   */
  if (
    index === COSMETIC_INDEX &&
    state.cosmeticGrade === ''
  ) {
    state.activeIndex = COSMETIC_INDEX;
    state.cosmeticMenuOpen = true;

    renderAndUpdate();
    return;
  }

  state.cosmeticMenuOpen = false;

  state.activeIndex = findNextIncomplete(
    index + 1
  );

  renderAndUpdate();
  showCompletionMessage();
}

function undoLastMark() {
  const last = state.history.pop();

  if (!last) {
    showToast(
      'Geri alınacak işaret yok.',
      true
    );

    return;
  }

  state.results[last.index] =
    last.previous;

  state.activeIndex = last.index;
  state.cosmeticMenuOpen = false;

  renderAndUpdate();
}

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

  if (
    state.activeIndex === BATTERY_INDEX
  ) {
    focusBatteryInput();
  }
}

function setActive(index) {
  state.activeIndex = index;

  if (index !== COSMETIC_INDEX) {
    state.cosmeticMenuOpen = false;
  }

  renderAndUpdate();

  if (index === BATTERY_INDEX) {
    focusBatteryInput();
  }
}

function renderAndUpdate() {
  renderTable();
  updateSummary();
}

/* =========================================================
   ÖZET VE İLERLEME
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
      'Pil sağlığı yüzdesini girin';
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
   TEMİZLEME
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
   SINIF VE METİNLER
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
   ODAK VE KAYDIRMA
   ========================================================= */

function focusBatteryInput() {
  window.requestAnimationFrame(() => {
    const input = document.querySelector(
      '.battery-health-input'
    );

    if (input) {
      input.focus();
      input.select();
    }
  });
}

function scrollActiveRowIntoView() {
  const activeRow =
    elements.table.querySelector(
      `.test-row[data-index="${state.activeIndex}"]`
    );

  if (activeRow) {
    activeRow.scrollIntoView({
      block: 'nearest',
      behavior: 'smooth'
    });
  }
}

/* =========================================================
   BİLDİRİMLER
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