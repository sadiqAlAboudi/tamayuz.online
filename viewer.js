(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const fileParam = params.get('file');
  const titleParam = params.get('title');

  const loading = $('viewerLoading');
  const errorBox = $('viewerError');
  const pagesRoot = $('pdfPages');
  const stage = $('viewerStage');
  let pdf = null;
  let currentPage = 1;
  let zoom = 1;
  let scrollTick = false;
  const pageElements = new Map();
  const pagePromises = new Map();
  const renderTasks = new Map();

  const setError = message => {
    loading.hidden = true;
    pagesRoot.hidden = true;
    errorBox.hidden = false;
    errorBox.textContent = message;
  };

  async function loadPageInfo(pageNumber) {
    if (!pagePromises.has(pageNumber)) pagePromises.set(pageNumber, pdf.getPage(pageNumber));
    return pagePromises.get(pageNumber);
  }

  async function renderCard(card) {
    if (!pdf || card.dataset.rendering === '1') return;
    const pageNumber = Number(card.dataset.page);
    if (card.dataset.renderedZoom === String(zoom)) return;
    card.dataset.rendering = '1';
    const zoomAtStart = zoom;
    try {
      const page = await loadPageInfo(pageNumber);
      const baseViewport = page.getViewport({ scale: 1 });
      const width = Math.min(920, stage.clientWidth - 64) * zoomAtStart;
      const scale = width / baseViewport.width;
      const viewport = page.getViewport({ scale });
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const canvas = card.querySelector('canvas');
      const ctx = canvas.getContext('2d', { alpha: false });

      const oldTask = renderTasks.get(pageNumber);
      if (oldTask) { try { oldTask.cancel(); } catch (_) {} }

      canvas.width = Math.floor(viewport.width * ratio);
      canvas.height = Math.floor(viewport.height * ratio);
      canvas.style.width = '100%';
      canvas.style.height = 'auto';
      card.style.width = `${width}px`;
      card.style.aspectRatio = `${baseViewport.width} / ${baseViewport.height}`;

      const task = page.render({
        canvasContext: ctx,
        viewport,
        transform: ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : null,
        background: '#ffffff'
      });
      renderTasks.set(pageNumber, task);
      await task.promise;
      card.dataset.renderedZoom = String(zoomAtStart);
    } catch (err) {
      if (err?.name !== 'RenderingCancelledException') {
        card.dataset.renderFailed = '1';
        console.error('PDF page render failed:', pageNumber, err);
      }
    } finally {
      card.dataset.rendering = '0';
      renderTasks.delete(pageNumber);
      if (card.dataset.renderedZoom !== String(zoom) && !card.dataset.renderFailed) {
        const rect = card.getBoundingClientRect();
        const stageRect = stage.getBoundingClientRect();
        if (rect.bottom > stageRect.top - 900 && rect.top < stageRect.bottom + 900) renderCard(card);
      }
    }
  }

  let watermarkText = 'منصة التميز — نسخة معاينة';

  async function buildContinuousPages() {
    pagesRoot.replaceChildren();
    pageElements.clear();
    pagePromises.clear();

    for (let n = 1; n <= pdf.numPages; n++) {
      const card = document.createElement('article');
      card.className = 'pdf-page-card';
      card.dataset.page = String(n);
      card.style.aspectRatio = '210 / 297';
      card.setAttribute('aria-label', `صفحة ${n}`);

      const canvas = document.createElement('canvas');
      canvas.className = 'pdf-page-canvas';
      canvas.setAttribute('aria-label', `محتوى الصفحة ${n}`);

      if (watermarkText) {
        const mark = document.createElement('div');
        mark.className = 'pdf-page-watermark';
        mark.setAttribute('aria-hidden', 'true');
        mark.textContent = watermarkText;
        card.appendChild(mark);
      }

      const num = document.createElement('span');
      num.className = 'pdf-page-number';
      num.textContent = `${n} / ${pdf.numPages}`;

      card.appendChild(canvas);
      card.appendChild(num);
      pagesRoot.appendChild(card);
      pageElements.set(n, card);
    }

    loading.hidden = true;
    pagesRoot.hidden = false;
    $('pageCount').textContent = String(pdf.numPages);
    $('pageNum').textContent = '1';
    $('prevPage').disabled = false;
    $('nextPage').disabled = false;
    $('zoomIn').disabled = false;
    $('zoomOut').disabled = false;

    setupIntersectionObserver();
  }

  function setupIntersectionObserver() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) renderCard(entry.target);
      });
    }, { root: stage, rootMargin: '600px 0px 600px 0px', threshold: 0.01 });

    pageElements.forEach(card => observer.observe(card));
  }

  function updatePageCounter() {
    const stageRect = stage.getBoundingClientRect();
    const midY = stageRect.top + stageRect.height / 3;
    let closestPage = currentPage;
    let minDistance = Infinity;

    for (const [n, card] of pageElements) {
      const rect = card.getBoundingClientRect();
      const distance = Math.abs(rect.top - midY);
      if (distance < minDistance) {
        minDistance = distance;
        closestPage = n;
      }
    }

    if (closestPage !== currentPage) {
      currentPage = closestPage;
      $('pageNum').textContent = String(currentPage);
    }
  }

  function onStageScroll() {
    if (scrollTick) return;
    scrollTick = true;
    requestAnimationFrame(() => {
      updatePageCounter();
      scrollTick = false;
    });
  }

  function goToPage(n) {
    const card = pageElements.get(n);
    if (!card) return;
    const targetTop = card.getBoundingClientRect().top - stage.getBoundingClientRect().top + stage.scrollTop - 12;
    stage.scrollTo({ top: targetTop, behavior: 'smooth' });
    renderCard(card);
  }

  async function rerenderLoadedPages() {
    for (const [, card] of pageElements) {
      if (card.dataset.renderedZoom) {
        card.dataset.renderedZoom = '';
        renderCard(card);
      }
    }
    $('zoomLabel').textContent = `${Math.round(zoom * 100)}%`;
  }

  async function init() {
    if (!window.pdfjsLib) return setError('تعذّر تحميل مكتبة عارض PDF. تحقق من اتصال الإنترنت ثم حدّث الصفحة.');
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    let pdfUrl = fileParam;
    let bookletTitle = titleParam;

    if (!pdfUrl) {
      return setError('رابط الملزمة غير صحيح أو لم يتم تحديد ملف PDF.');
    }

    $('bookletTitle').textContent = bookletTitle || 'معاينة الملزمة';
    watermarkText = `منصة التميز — ${bookletTitle || 'نسخة معاينة'} — tamayuz.online`;

    const inquiryBtn = $('viewerInquiry');
    if (inquiryBtn) {
      const text = encodeURIComponent(bookletTitle ? `السلام عليكم، أريد الاستفسار عن ${bookletTitle}` : 'السلام عليكم، أريد الاستفسار عن الملزمة');
      inquiryBtn.href = `https://wa.me/9647881085046?text=${text}`;
    }

    try {
      const task = pdfjsLib.getDocument({
        url: pdfUrl,
        withCredentials: false,
        disableAutoFetch: false
      });
      pdf = await task.promise;
      await buildContinuousPages();
    } catch (err) {
      console.error('PDF viewer initialization failed:', err);
      setError('تعذّر فتح ملف الـ PDF. قد يكون الملف غير متوفر أو جارٍ تحديثه.');
    }
  }

  $('prevPage').addEventListener('click', () => goToPage(Math.max(1, currentPage - 1)));
  $('nextPage').addEventListener('click', () => goToPage(Math.min(pdf?.numPages || currentPage, currentPage + 1)));
  $('zoomIn').addEventListener('click', () => { zoom = Math.min(1.6, +(zoom + 0.1).toFixed(2)); rerenderLoadedPages(); });
  $('zoomOut').addEventListener('click', () => { zoom = Math.max(0.7, +(zoom - 0.1).toFixed(2)); rerenderLoadedPages(); });
  stage.addEventListener('scroll', onStageScroll, { passive: true });
  window.addEventListener('resize', () => rerenderLoadedPages());
  document.addEventListener('contextmenu', event => { if (event.target.closest('.pdf-page-card')) event.preventDefault(); });
  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'p') event.preventDefault();
  });

  init();
})();
