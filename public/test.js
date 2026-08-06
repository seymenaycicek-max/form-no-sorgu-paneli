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

const state = {
  activeIndex: 0,
  history: [],
  results: Array(TEST_ITEMS.length).fill('')
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
  'testGb',
  'testNote'
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
  elements.clearButton.addEventListener('click', clearPaper);
  document.addEventListener('keydown', handleKeyDown);

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

    row.addEventListener('click', () => {
      setActive(index);
    });

    const name = document.createElement('button');

    name.className = 'test-name';
    name.type = 'button';
    name.textContent = item;
    name.setAttribute('role', 'gridcell');
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
      '✓',
      `${item}: OK`
    );

    const redButton = createResultButton(
      index,
      'red',
      '✕',
      `${item}: RED`
    );

    const result = document.createElement('div');

    result.className = getResultClass(
      state.results[index]
    );

    result.textContent = getResultText(
      state.results[index]
    );

    result.setAttribute('role', 'gridcell');

    result.setAttribute(
      'aria-label',
      `${item} sonucu: ${getAccessibleResultText(
        state.results[index]
      )}`
    );

    row.append(
      name,
      okButton,
      redButton,
      result
    );

    elements.table.appendChild(row);
  });
}

function createResultButton(
  index,
  value,
  text,
  ariaLabel
) {
  const button = document.createElement('button');
  const isSelected = state.results[index] === value;

  button.type = 'button';

  button.className = isSelected
    ? `mark-button ${value} selected`
    : `mark-button ${value}`;

  button.textContent = text;

  button.setAttribute(
    'role',
    'gridcell'
  );

  button.setAttribute(
    'aria-label',
    ariaLabel
  );

  button.setAttribute(
    'aria-pressed',
    String(isSelected)
  );

  button.addEventListener('click', (event) => {
    event.stopPropagation();
    markResult(index, value);
  });

  return button;
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
        'Tüm test satırları dolmadan yeni kağıda geçilemez.',
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

  /*
   * Aynı işarete tekrar basılırsa
   * gereksiz geri alma kaydı oluşturma.
   */
  if (previous === value) {
    state.activeIndex = findNextEmpty(
      index + 1
    );

    renderAndUpdate();
    return;
  }

  state.history.push({
    index,
    previous
  });

  state.results[index] = value;

  state.activeIndex = findNextEmpty(
    index + 1
  );

  renderAndUpdate();

  if (isComplete()) {
    const hasRed = state.results.includes('red');

    if (hasRed) {
      showToast(
        'Test tamamlandı: Cihaz RED kaldı. Yeni cihaz için Space basın.',
        true
      );
    } else {
      showToast(
        'Test tamamlandı: Cihaz OK geçti. Yeni cihaz için Space basın.',
        false
      );
    }
  }
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

function findNextEmpty(startIndex) {
  for (
    let index = startIndex;
    index < state.results.length;
    index += 1
  ) {
    if (!state.results[index]) {
      return index;
    }
  }

  for (
    let index = 0;
    index < Math.min(
      startIndex,
      state.results.length
    );
    index += 1
  ) {
    if (!state.results[index]) {
      return index;
    }
  }

  return state.results.length - 1;
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

  const filledCount = okCount + redCount;

  const percent = Math.round(
    (filledCount / TEST_ITEMS.length) * 100
  );

  const activeItem =
    TEST_ITEMS[state.activeIndex] || '-';

  const complete = isComplete();

  elements.okCount.textContent =
    String(okCount);

  elements.redCount.textContent =
    String(redCount);

  elements.progressText.textContent =
    `${filledCount} / ${TEST_ITEMS.length} tamamlandı`;

  elements.progressBar.style.width =
    `${percent}%`;

  if (elements.progressContainer) {
    elements.progressContainer.setAttribute(
      'aria-valuenow',
      String(filledCount)
    );

    elements.progressContainer.setAttribute(
      'aria-valuemax',
      String(TEST_ITEMS.length)
    );
  }

  elements.activeText.textContent = complete
    ? 'Tüm testler tamamlandı'
    : `Sıradaki test: ${activeItem}`;

  if (!complete) {
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

  state.results = Array(
    TEST_ITEMS.length
  ).fill('');

  elements.testModel.value = '';
  elements.testGb.value = '';
  elements.testNote.value = '';

  setToday();
  renderAndUpdate();

  showToast(
    'Kağıt temizlendi. Yeni cihaza geçebilirsiniz.',
    false
  );
}

function isComplete() {
  return state.results.every(Boolean);
}

function getRowClass(index) {
  const classes = ['test-row'];

  if (index === state.activeIndex) {
    classes.push('active');
  }

  if (state.results[index]) {
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

function setToday() {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(
    now.getMonth() + 1
  ).padStart(2, '0');

  const day = String(
    now.getDate()
  ).padStart(2, '0');

  /*
   * input type="date" yalnızca
   * YYYY-MM-DD formatını kabul eder.
   */
  elements.testDate.value =
    `${year}-${month}-${day}`;
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

  showToast.timer = window.setTimeout(() => {
    elements.toast.hidden = true;
  }, 2800);
}