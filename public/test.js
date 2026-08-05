const TEST_ITEMS = [
  'ŞARJ',
  'KABLOSUZ ŞARJ',
  'POWER',
  'İMEİ KONTROLÜ',
  'KOZMETİK',
  'VİDA',
  'EKRAN',
  'TUŞ TAKIMI',
  'YAN TUŞLAR',
  'SİM YUVASI ARIZA',
  'ŞEBEKE/SİM KART',
  'GELEN SES',
  'GİDEN SES',
  'SENSÖR',
  'KULAKLIK',
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
  'GENEL TEMİZLİK',
  'SIFIRLANDI'
];

const state = {
  activeIndex: 0,
  results: Array(TEST_ITEMS.length).fill('')
};

const elements = {
  table: document.getElementById('testTable'),
  okCount: document.getElementById('okCount'),
  redCount: document.getElementById('redCount'),
  finalStatus: document.getElementById('finalStatus'),
  progressText: document.getElementById('progressText'),
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
    row.className = index === state.activeIndex ? 'test-row active' : 'test-row';
    row.addEventListener('click', () => {
      state.activeIndex = index;
      renderTable();
      updateSummary();
    });

    const name = document.createElement('button');
    name.className = 'test-name';
    name.type = 'button';
    name.textContent = item;
    name.addEventListener('click', (event) => {
      event.stopPropagation();
      state.activeIndex = index;
      renderTable();
      updateSummary();
    });

    const ok = createResultButton(index, 'ok', '✓');
    const red = createResultButton(index, 'red', '✕');
    const result = document.createElement('div');
    result.className = getResultClass(state.results[index]);
    result.textContent = getResultText(state.results[index]);

    row.appendChild(name);
    row.appendChild(ok);
    row.appendChild(red);
    row.appendChild(result);
    elements.table.appendChild(row);
  });
}

function createResultButton(index, value, text) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = state.results[index] === value ? `mark-button ${value} selected` : `mark-button ${value}`;
  button.textContent = text;
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    markResult(index, value);
  });
  return button;
}

function handleKeyDown(event) {
  const tagName = event.target.tagName.toLowerCase();
  const isTyping = tagName === 'input' || tagName === 'textarea';

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
      showToast('Tüm test satırları dolmadan Space temizlemez.', true);
      return;
    }

    clearPaper();
  }
}

function markResult(index, value) {
  if (index < 0 || index >= TEST_ITEMS.length) {
    return;
  }

  state.results[index] = value;
  state.activeIndex = findNextEmpty(index + 1);
  renderTable();
  updateSummary();

  if (isComplete()) {
    showToast('Test kağıdı doldu. Yeni cihaz için Space basın.', false);
  }
}

function findNextEmpty(startIndex) {
  for (let index = startIndex; index < state.results.length; index += 1) {
    if (!state.results[index]) {
      return index;
    }
  }

  for (let index = 0; index < startIndex; index += 1) {
    if (!state.results[index]) {
      return index;
    }
  }

  return state.results.length - 1;
}

function moveActive(direction) {
  state.activeIndex = Math.max(0, Math.min(TEST_ITEMS.length - 1, state.activeIndex + direction));
  renderTable();
  updateSummary();
}

function updateSummary() {
  const okCount = state.results.filter((result) => result === 'ok').length;
  const redCount = state.results.filter((result) => result === 'red').length;
  const filledCount = okCount + redCount;
  const activeItem = TEST_ITEMS[state.activeIndex] || '-';

  elements.okCount.textContent = String(okCount);
  elements.redCount.textContent = String(redCount);
  elements.progressText.textContent = `${filledCount} / ${TEST_ITEMS.length} tamamlandı`;
  elements.activeText.textContent = isComplete() ? 'Tüm testler doldu' : `Sıradaki test: ${activeItem}`;
  elements.finalStatus.textContent = !isComplete() ? '-' : redCount > 0 ? 'RED' : 'OK';
  elements.finalStatus.className = redCount > 0 ? 'final-red' : 'final-ok';
}

function clearPaper() {
  state.activeIndex = 0;
  state.results = Array(TEST_ITEMS.length).fill('');
  elements.testModel.value = '';
  elements.testGb.value = '';
  elements.testNote.value = '';
  setToday();
  renderTable();
  updateSummary();
  showToast('Kağıt temizlendi. Yeni cihaza geçebilirsiniz.', false);
}

function isComplete() {
  return state.results.every(Boolean);
}

function getResultClass(result) {
  if (result === 'ok') return 'test-result ok';
  if (result === 'red') return 'test-result red';
  return 'test-result';
}

function getResultText(result) {
  if (result === 'ok') return '✓';
  if (result === 'red') return '✕';
  return '';
}

function setToday() {
  const now = new Date();
  elements.testDate.value = now.toLocaleDateString('tr-TR');
}

function showToast(message, isError) {
  elements.toast.textContent = message;
  elements.toast.classList.toggle('error', Boolean(isError));
  elements.toast.hidden = false;

  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    elements.toast.hidden = true;
  }, 2800);
}
