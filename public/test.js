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

const state = {
  activeIndex: 0,
  history: [],
  results: Array(TEST_ITEMS.length).fill(''),
  batteryHealth: ''
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

elements.clearButton.addEventListener('click', clearPaper);
document.addEventListener('keydown', handleKeyDown);

setToday();
renderTable();
updateSummary();

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

    row.addEventListener('click', () => {
      setActive(index);
    });

    const name = document.createElement('button');

    name.className = 'test-name';
    name.type = 'button';
    name.textContent = item;

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

    const result =
      index === BATTERY_INDEX
        ? createBatteryHealthInput(index)
        : createResultDisplay(index);

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
    `${TEST_ITEMS[index]}: ${value === 'ok' ? 'OK' : 'RED'}`
  );

  button.addEventListener('click', (event) => {
    event.stopPropagation();
    markResult(index, value);
  });

  return button;
}

function createResultDisplay(index) {
  const result = document.createElement('div');
  const value = state.results[index];

  result.className = getResultClass(value);
  result.textContent = getResultText(value);

  return result;
}

function createBatteryHealthInput(index) {
  const wrapper = document.createElement('div');

  wrapper.className = 'test-result battery-health-cell';

  const input = document.createElement('input');

  input.type = 'number';
  input.className = 'battery-health-input';
  input.min = '0';
  input.max = '100';
  input.step = '1';
  input.inputMode = 'numeric';
  input.placeholder = '100';
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

  input.addEventListener('input', () => {
    let value = input.value;

    if (value !== '') {
      const numberValue = Number(value);

      if (numberValue > 100) {
        value = '100';
      }

      if (numberValue < 0) {
        value = '0';
      }
    }

    input.value = value;
    state.batteryHealth = value;

    updateSummary();
  });

  input.addEventListener('change', () => {
    if (state.batteryHealth === '') {
      return;
    }

    const numberValue = Math.max(
      0,
      Math.min(100, Number(state.batteryHealth))
    );

    state.batteryHealth = String(numberValue);

    if (state.results[index]) {
      state.activeIndex = findNextIncomplete(
        index + 1
      );
    }

    renderAndUpdate();
    showCompletionMessage();
  });

  wrapper.append(input, percent);

  return wrapper;
}

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
    markResult(state.activeIndex, 'ok');
    return;
  }

  if (event.key === '2') {
    event.preventDefault();
    markResult(state.activeIndex, 'red');
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
        'Tüm testler ve pil sağlığı doldurulmalıdır.',
        true
      );

      return;
    }

    clearPaper();
  }
}

function markResult(index, value) {
  if (
    index < 0 ||
    index >= TEST_ITEMS.length
  ) {
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
   * Pil sağlığı satırında OK veya RED seçildiğinde
   * yüzde girilmemişse aynı satırda kal.
   */
  if (
    index === BATTERY_INDEX &&
    state.batteryHealth === ''
  ) {
    state.activeIndex = index;

    renderAndUpdate();
    focusBatteryInput();

    return;
  }

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

  state.results[last.index] = last.previous;
  state.activeIndex = last.index;

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

  return true;
}

function isComplete() {
  return TEST_ITEMS.every((item, index) => {
    return isItemComplete(index);
  });
}

function moveActive(direction) {
  state.activeIndex = Math.max(
    0,
    Math.min(
      TEST_ITEMS.length - 1,
      state.activeIndex + direction
    )
  );

  renderAndUpdate();
  scrollActiveRowIntoView();
}

function setActive(index) {
  state.activeIndex = index;

  renderAndUpdate();

  if (index === BATTERY_INDEX) {
    focusBatteryInput();
  }
}

function renderAndUpdate() {
  renderTable();
  updateSummary();
}

function updateSummary() {
  const okCount = state.results.filter(
    (result) => result === 'ok'
  ).length;

  const redCount = state.results.filter(
    (result) => result === 'red'
  ).length;

  const completedCount = TEST_ITEMS.reduce(
    (total, item, index) => {
      return total + (isItemComplete(index) ? 1 : 0);
    },
    0
  );

  const percent = Math.round(
    (completedCount / TEST_ITEMS.length) * 100
  );

  elements.okCount.textContent = String(okCount);
  elements.redCount.textContent = String(redCount);

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
    state.results[BATTERY_INDEX] &&
    state.batteryHealth === ''
  ) {
    elements.activeText.textContent =
      'Pil sağlığı yüzdesini girin';
  } else {
    elements.activeText.textContent =
      `Sıradaki test: ${TEST_ITEMS[state.activeIndex]}`;
  }

  if (!isComplete()) {
    elements.finalStatus.textContent = '-';
    elements.finalStatus.className = '';
    return;
  }

  if (redCount > 0) {
    elements.finalStatus.textContent = 'RED';
    elements.finalStatus.className = 'final-red';
    return;
  }

  elements.finalStatus.textContent = 'OK';
  elements.finalStatus.className = 'final-ok';
}

function clearPaper() {
  state.activeIndex = 0;
  state.history = [];
  state.results = Array(TEST_ITEMS.length).fill('');
  state.batteryHealth = '';

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
  const activeRow = elements.table.querySelector(
    `.test-row[data-index="${state.activeIndex}"]`
  );

  if (activeRow) {
    activeRow.scrollIntoView({
      block: 'nearest',
      behavior: 'smooth'
    });
  }
}

function showCompletionMessage() {
  if (!isComplete()) {
    return;
  }

  const hasRed = state.results.includes('red');

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

function showToast(message, isError = false) {
  elements.toast.textContent = message;

  elements.toast.classList.toggle(
    'error',
    Boolean(isError)
  );

  elements.toast.hidden = false;

  window.clearTimeout(showToast.timer);

  showToast.timer = window.setTimeout(() => {
    elements.toast.hidden = true;
  }, 2800);
}