import './styles.css';
import { getCurrentWindow } from '@tauri-apps/api/window';

const TARGET_ORIGIN = 'https://kkhb.vercel.app';
const TARGET_URL = `${TARGET_ORIGIN}/test`;
const LOAD_TIMEOUT_MS = 15000;

type ViewState = 'loading' | 'ready' | 'error';

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('Uygulama kök elemanı bulunamadı.');
}

app.innerHTML = `
  <main class="shell">
    <section class="state loading-state" id="loadingState" aria-live="polite">
      <div class="brand-mark">HB</div>
      <h1>HB Kalite Kontrol yükleniyor…</h1>
      <p>Test ekranı hazırlanıyor.</p>
    </section>

    <section class="state error-state" id="errorState" hidden aria-live="assertive">
      <div class="brand-mark danger">!</div>
      <h1>Bağlantı kurulamadı.</h1>
      <p>İnternet bağlantınızı kontrol edip tekrar deneyin.</p>
      <div class="actions">
        <button id="retryButton" type="button">Tekrar Dene</button>
        <button id="closeButton" type="button" class="secondary">Uygulamayı Kapat</button>
      </div>
    </section>

    <iframe
      id="testFrame"
      title="HB Kalite Kontrol Test Ekranı"
      sandbox="allow-forms allow-same-origin allow-scripts allow-downloads"
      referrerpolicy="strict-origin-when-cross-origin"
      hidden
    ></iframe>
  </main>
`;

const loadingState = document.querySelector<HTMLElement>('#loadingState');
const errorState = document.querySelector<HTMLElement>('#errorState');
const testFrame = document.querySelector<HTMLIFrameElement>('#testFrame');
const retryButton = document.querySelector<HTMLButtonElement>('#retryButton');
const closeButton = document.querySelector<HTMLButtonElement>('#closeButton');

if (!loadingState || !errorState || !testFrame || !retryButton || !closeButton) {
  throw new Error('Uygulama arayüzü başlatılamadı.');
}

const ui = {
  loadingState,
  errorState,
  testFrame,
  retryButton,
  closeButton
};

let loadTimer: number | undefined;

ui.retryButton.addEventListener('click', () => {
  void loadRemotePage();
});

ui.closeButton.addEventListener('click', () => {
  void getCurrentWindow().close().catch(() => {
    window.close();
  });
});

document.addEventListener(
  'keydown',
  (event) => {
    if (event.key !== 'Backspace') {
      return;
    }

    const target = event.target;
    const isEditable =
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      (target instanceof HTMLElement && target.isContentEditable);

    if (!isEditable) {
      event.preventDefault();
    }
  },
  { capture: true }
);

ui.testFrame.addEventListener('load', () => {
  if (ui.testFrame.getAttribute('src') !== TARGET_URL) {
    return;
  }

  window.clearTimeout(loadTimer);
  setViewState('ready');
  ui.testFrame.focus();
});

void loadRemotePage();

async function loadRemotePage(): Promise<void> {
  setViewState('loading');
  ui.testFrame.removeAttribute('src');

  try {
    await checkConnection();
    ui.testFrame.src = TARGET_URL;
    loadTimer = window.setTimeout(() => {
      setViewState('error');
    }, LOAD_TIMEOUT_MS);
  } catch {
    setViewState('error');
  }
}

async function checkConnection(): Promise<void> {
  if (!navigator.onLine) {
    throw new Error('offline');
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 7000);

  try {
    await fetch(TARGET_URL, {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal
    });
  } finally {
    window.clearTimeout(timeout);
  }
}

function setViewState(state: ViewState): void {
  ui.loadingState.hidden = state !== 'loading';
  ui.errorState.hidden = state !== 'error';
  ui.testFrame.hidden = state !== 'ready';

  if (state !== 'ready') {
    ui.testFrame.removeAttribute('src');
  }
}
