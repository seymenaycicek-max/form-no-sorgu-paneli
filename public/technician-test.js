const TEST_ITEMS = [
  'EKRAN',
  'DOKUNMATİK',
  'TUŞ TAKIMI',
  'GELEN SES',
  'GİDEN SES',
  'ÖN KAMERA',
  'ARKA KAMERA',
  'TOUCH ID FACE ID',
  'PİL SAĞLIĞI',
  'BİLİNMEYEN PARÇA',
  'KASA GENEL TEMİZLİK',
  'EKRAN GENEL TEMİZLİK'
];

const BATTERY_INDEX = TEST_ITEMS.indexOf('PİL SAĞLIĞI');
const BATTERY_PASS_LIMIT = 85;

const state = {
  activeIndex: 0,
  history: [],
  results: Array(TEST_ITEMS.length).fill(''),
  batteryHealth: '',
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
  sendButton: document.getElementById('sendButton'),
  toast: document.getElementById('toast'),
  testDate: document.getElementById('testDate'),
  testModel: document.getElementById('testModel'),
  testGb: document.getElementById('testGb'),
  testOrderCode: document.getElementById('testOrderCode'),
  testNote: document.getElementById('testNote')
};

startTechnicianTestApp();

function startTechnicianTestApp() {
  elements.clearButton.addEventListener('click', clearPaper);
  elements.sendButton.addEventListener('click', submitPaper);
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

    if (index === BATTERY_INDEX) {
      row.classList.add('battery-row');
    }

    row.addEventListener('click', () => setActive(index));

    const name = document.createElement('button');
    name.className = 'test-name';
    name.type = 'button';
    name.textContent = item;
    name.setAttribute('aria-label', `${item} testini aktif hale getir`);
    name.addEventListener('click', (event) => {
      event.stopPropagation();
      setActive(index);
    });

    const okButton = createResultButton(index, 'ok', '✓');
    const redButton = createResultButton(index, 'red', '✕');
    const resultArea = index === BATTERY_INDEX
      ? createBatteryHealthInput(index)
      : createResultDisplay(index);

    row.append(name, okButton, redButton, resultArea);
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
  button.setAttribute('aria-pressed', String(selected));
  button.setAttribute('aria-label', `${TEST_ITEMS[index]}: ${value === 'ok' ? 'OK' : 'RED'}`);

  button.addEventListener('click', (event) => {
    event.stopPropagation();

    if (index === BATTERY_INDEX) {
      state.activeIndex = BATTERY_INDEX;
      renderAndUpdate();
      focusBatteryInput();
      showToast('Pil sağlığı yüzdesini yazıp Enter tuşuna basın.');
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
  result.setAttribute('aria-label', `${TEST_ITEMS[index]} sonucu: ${value || 'işaretlenmedi'}`);

  return result;
}

function createBatteryHealthInput(index) {
  const wrapper = document.createElement('div');
  wrapper.className = 'test-result battery-health-cell';
  wrapper.classList.toggle('ok', state.results[index] === 'ok');
  wrapper.classList.toggle('red', state.results[index] === 'red');

  const input = document.createElement('input');
  input.type = 'number';
  input.className = 'battery-health-input';
  input.min = '0';
  input.max = '100';
  input.step = '1';
  input.inputMode = 'numeric';
  input.placeholder = '85';
  input.value = state.batteryHealth;
  input.setAttribute('aria-label', 'Pil sağlığı yüzdesi');

  const percent = document.createElement('span');
  percent.textContent = '%';
  percent.setAttribute('aria-hidden', 'true');

  input.addEventListener('click', (event) => event.stopPropagation());
  input.addEventListener('focus', () => {
    state.activeIndex = BATTERY_INDEX;
    updateSummary();
  });
  input.addEventListener('keydown', (event) => {
    event.stopPropagation();

    if (event.key === 'Enter') {
      event.preventDefault();
      completeBatteryEntry();
    }
  });
  input.addEventListener('input', () => handleBatteryInput(input, index));

  wrapper.append(input, percent);

  return wrapper;
}

function handleBatteryInput(input, index) {
  if (input.value === '') {
    state.batteryHealth = '';
    state.results[index] = '';
    updateBatteryVisuals(index);
    updateSummary();
    return;
  }

  let numberValue = Number(input.value);

  if (!Number.isFinite(numberValue)) {
    return;
  }

  numberValue = Math.max(0, Math.min(100, Math.trunc(numberValue)));
  input.value = String(numberValue);
  state.batteryHealth = String(numberValue);
  state.results[index] = numberValue >= BATTERY_PASS_LIMIT ? 'ok' : 'red';

  updateBatteryVisuals(index);
  updateSummary();
}

function completeBatteryEntry() {
  if (state.batteryHealth === '') {
    showToast('Pil sağlığı için 0 ile 100 arasında bir değer girin.', true);
    focusBatteryInput();
    return;
  }

  state.activeIndex = findNextIncomplete(BATTERY_INDEX + 1);
  renderAndUpdate();
  scrollActiveRowIntoView();
  showCompletionMessage();
}

function updateBatteryVisuals(index) {
  const row = elements.table.querySelector(`.test-row[data-index="${index}"]`);

  if (!row) {
    return;
  }

  const isOk = state.results[index] === 'ok';
  const isRed = state.results[index] === 'red';

  row.querySelector('.mark-button.ok')?.classList.toggle('selected', isOk);
  row.querySelector('.mark-button.red')?.classList.toggle('selected', isRed);
  row.querySelector('.battery-health-cell')?.classList.toggle('ok', isOk);
  row.querySelector('.battery-health-cell')?.classList.toggle('red', isRed);
  row.classList.toggle('filled', isItemComplete(index));
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

    if (state.activeIndex === BATTERY_INDEX) {
      focusBatteryInput();
      showToast('Pil sağlığı yüzdesini yazıp Enter tuşuna basın.');
      return;
    }

    markResult(state.activeIndex, 'ok');
    return;
  }

  if (event.key === '2') {
    event.preventDefault();

    if (state.activeIndex === BATTERY_INDEX) {
      focusBatteryInput();
      showToast('Pil sağlığı yüzdesini yazıp Enter tuşuna basın.');
      return;
    }

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
    submitPaper();
  }
}

function markResult(index, value) {
  if (index < 0 || index >= TEST_ITEMS.length) {
    return;
  }

  if (index === BATTERY_INDEX) {
    state.activeIndex = BATTERY_INDEX;
    renderAndUpdate();
    focusBatteryInput();
    showToast('Pil sağlığı yüzdesini yazıp Enter tuşuna basın.');
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

  state.activeIndex = findNextIncomplete(index + 1);
  renderAndUpdate();
  scrollActiveRowIntoView();

  if (state.activeIndex === BATTERY_INDEX) {
    focusBatteryInput();
    showToast('Pil sağlığı yüzdesini girin. Enter ile devam edin.');
    return;
  }

  showCompletionMessage();
}

function undoLastMark() {
  const last = state.history.pop();

  if (!last) {
    showToast('Geri alınacak işaret yok.', true);
    return;
  }

  state.results[last.index] = last.previous;
  state.activeIndex = last.index;
  renderAndUpdate();
  scrollActiveRowIntoView();
}

function findNextIncomplete(startIndex) {
  for (let offset = 0; offset < TEST_ITEMS.length; offset += 1) {
    const index = (startIndex + offset) % TEST_ITEMS.length;

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

  if (index === BATTERY_INDEX && state.batteryHealth === '') {
    return false;
  }

  return true;
}

function isComplete() {
  return TEST_ITEMS.every((item, index) => isItemComplete(index));
}

function moveActive(direction) {
  state.activeIndex = Math.max(0, Math.min(TEST_ITEMS.length - 1, state.activeIndex + direction));
  renderAndUpdate();
  scrollActiveRowIntoView();
}

function setActive(index) {
  state.activeIndex = index;
  renderAndUpdate();
  scrollActiveRowIntoView();

  if (index === BATTERY_INDEX) {
    focusBatteryInput();
  }
}

function renderAndUpdate() {
  renderTable();
  updateSummary();
}

function updateSummary() {
  const okCount = state.results.filter((result) => result === 'ok').length;
  const redCount = state.results.filter((result) => result === 'red').length;
  const completedCount = TEST_ITEMS.reduce((total, item, index) => (
    total + (isItemComplete(index) ? 1 : 0)
  ), 0);
  const percent = Math.round((completedCount / TEST_ITEMS.length) * 100);

  elements.okCount.textContent = String(okCount);
  elements.redCount.textContent = String(redCount);
  elements.progressText.textContent = `${completedCount} / ${TEST_ITEMS.length} tamamlandı`;
  elements.progressBar.style.width = `${percent}%`;
  elements.progressContainer?.setAttribute('aria-valuenow', String(completedCount));
  elements.progressContainer?.setAttribute('aria-valuemax', String(TEST_ITEMS.length));

  if (isComplete()) {
    elements.activeText.textContent = 'Tüm teknisyen testleri tamamlandı';
  } else if (state.activeIndex === BATTERY_INDEX && state.batteryHealth === '') {
    elements.activeText.textContent = 'Pil sağlığı yüzdesini yazıp Enter tuşuna basın';
  } else {
    elements.activeText.textContent = `Sıradaki test: ${TEST_ITEMS[state.activeIndex]}`;
  }

  if (!isComplete()) {
    elements.finalStatus.textContent = '-';
    elements.finalStatus.className = '';
    return;
  }

  elements.finalStatus.textContent = redCount > 0 ? 'RED' : 'OK';
  elements.finalStatus.className = redCount > 0 ? 'final-red' : 'final-ok';
}

function clearPaper() {
  state.activeIndex = 0;
  state.history = [];
  state.results = Array(TEST_ITEMS.length).fill('');
  state.batteryHealth = '';
  elements.testModel.value = '';
  elements.testGb.value = '';
  elements.testOrderCode.value = '';
  elements.testNote.value = '';
  setToday();
  renderAndUpdate();
  showToast('Teknisyen test kağıdı temizlendi.');
}

async function submitPaper() {
  if (!isComplete()) {
    showToast('Tüm teknisyen testleri ve pil sağlığı doldurulmalıdır.', true);
    return;
  }

  if (state.saving) {
    return;
  }

  state.saving = true;
  showToast('Teknisyen test kaydı alınıyor...');

  try {
    const response = await fetch('/api/technician-test-records', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(createTestRecordPayload())
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Teknisyen test kaydı alınamadı.');
    }

    clearPaper();
    showToast('Teknisyen test kaydedildi.');
  } catch (error) {
    showToast(error.message || 'Teknisyen test kaydı alınırken hata oluştu.', true);
  } finally {
    state.saving = false;
  }
}

function createTestRecordPayload() {
  return {
    date: elements.testDate.value,
    model: elements.testModel.value,
    gb: elements.testGb.value,
    orderCode: elements.testOrderCode.value,
    note: elements.testNote.value,
    items: TEST_ITEMS.map((name, index) => ({
      name,
      result: state.results[index],
      extra: index === BATTERY_INDEX ? state.batteryHealth : ''
    }))
  };
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
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  elements.testDate.value = `${year}-${month}-${day}`;
}

function focusBatteryInput() {
  window.requestAnimationFrame(() => {
    const input = document.querySelector('.battery-health-input');

    if (!input) {
      return;
    }

    input.focus();
    input.select();
    input.closest('.test-row')?.scrollIntoView({
      block: 'center',
      behavior: 'smooth'
    });
  });
}

function scrollActiveRowIntoView() {
  window.requestAnimationFrame(() => {
    elements.table
      .querySelector(`.test-row[data-index="${state.activeIndex}"]`)
      ?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
  });
}

function showCompletionMessage() {
  if (!isComplete()) {
    return;
  }

  showToast(
    state.results.includes('red')
      ? 'Teknisyen testi tamamlandı: RED var.'
      : 'Teknisyen testi tamamlandı: Tümü OK.'
  );
}

function showToast(message, isError = false) {
  elements.toast.textContent = message;
  elements.toast.classList.toggle('error', Boolean(isError));
  elements.toast.hidden = false;

  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    elements.toast.hidden = true;
  }, 2800);
}
