/* منصة التميز — Client-side interactivity for Hugo static site */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const esc = (value = '') => String(value).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  let activeCategory = 'all';
  let activeGrade = 'all';
  let selectedProduct = null;
  let galleryIndex = 0;
  const productSlideTimers = new Map();

  function formatIraqiPrice(value) {
    const digits = String(value || '').replace(/[^0-9]/g, '');
    if (!digits) return '';
    const amount = Number(digits);
    if (!Number.isFinite(amount) || amount <= 0) return '';
    return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(amount)} دينار عراقي`;
  }

  // Format existing card prices on page load
  document.querySelectorAll('.price-val').forEach(el => {
    const raw = el.dataset.rawPrice;
    const formatted = formatIraqiPrice(raw);
    if (formatted) el.textContent = formatted;
  });

  // Card Image Cycling
  function initProductCardSlides() {
    for (const timer of productSlideTimers.values()) clearInterval(timer);
    productSlideTimers.clear();

    document.querySelectorAll('.product-card').forEach(card => {
      let images = [];
      try { images = JSON.parse(card.dataset.images || '[]'); } catch {}
      const img = card.querySelector('.product-card-slide');
      if (!img || images.length < 2) return;

      const id = card.dataset.productId || card.dataset.slug;
      let index = 0;
      let isChanging = false;

      const timer = setInterval(() => {
        if (!card.isConnected) { clearInterval(timer); return; }
        if (isChanging || document.hidden || card.matches(':hover') || $('productModal')?.classList.contains('open')) return;

        const rect = card.getBoundingClientRect();
        if (rect.bottom <= 0 || rect.top >= window.innerHeight) return;

        const nextIndex = (index + 1) % images.length;
        const next = new Image();
        next.onload = () => {
          isChanging = true;
          img.classList.add('is-fading-out');
          setTimeout(() => {
            if (!img.isConnected) { isChanging = false; return; }
            img.src = images[nextIndex];
            index = nextIndex;
            requestAnimationFrame(() => {
              img.classList.remove('is-fading-out');
              setTimeout(() => { isChanging = false; }, 360);
            });
          }, 300);
        };
        next.onerror = () => { isChanging = false; };
        next.src = images[nextIndex];
      }, 5000);

      productSlideTimers.set(id, timer);
    });
  }

  // Catalogue Filtering
  function filterProducts() {
    const query = ($('bookSearch')?.value || '').trim().toLowerCase();
    const cards = document.querySelectorAll('.product-card');
    let visibleCount = 0;

    cards.forEach(card => {
      const title = (card.dataset.title || '').toLowerCase();
      const subject = card.dataset.subject || '';
      const grade = card.dataset.grade || '';

      const matchQuery = !query || title.includes(query) || subject.toLowerCase().includes(query);
      const matchCategory = activeCategory === 'all' || subject === activeCategory;
      const matchGrade = activeGrade === 'all' || grade === activeGrade;

      const visible = matchQuery && matchCategory && matchGrade;
      card.hidden = !visible;
      card.style.display = visible ? '' : 'none';
      if (visible) visibleCount++;
    });

    const empty = $('emptyState');
    if (empty) empty.hidden = visibleCount > 0;
  }

  function setCategory(category) {
    activeCategory = category;
    document.querySelectorAll('.filter-chip').forEach(b => {
      const on = b.dataset.category === category;
      b.classList.toggle('selected', on);
      b.setAttribute('aria-pressed', String(on));
    });
    filterProducts();
  }

  // Booklet Details Modal
  function renderGallery(images, title) {
    const current = images[galleryIndex] || '';
    $('modalImage').src = current;
    $('modalImage').alt = `${title} — صورة ${galleryIndex + 1}`;
    $('galleryCount').textContent = `${String(galleryIndex + 1).padStart(2,'0')} / ${String(images.length || 1).padStart(2,'0')}`;
    
    $('modalThumbs').innerHTML = images.map((src, i) =>
      `<button type="button" class="gallery-thumb ${i === galleryIndex ? 'active' : ''}" data-gallery-index="${i}" aria-label="عرض الصورة ${i+1}">
         <img src="${esc(src)}" alt="" loading="lazy">
       </button>`
    ).join('');

    $('galleryPrev').hidden = images.length < 2;
    $('galleryNext').hidden = images.length < 2;
    $('modalThumbs').hidden = images.length < 2;
  }

  function openProductModal(card) {
    if (!card) return;
    let images = [];
    try { images = JSON.parse(card.dataset.images || '[]'); } catch {}

    const title = card.dataset.title || '';
    const subject = card.dataset.subject || '';
    const grade = card.dataset.grade || '';
    const price = card.dataset.price || '';
    const pdfPath = card.dataset.pdf || '';
    const pdfPublic = card.dataset.pdfPublic === 'true';
    const description = card.dataset.description || '';

    selectedProduct = { title, images, pdfPath };
    galleryIndex = 0;
    renderGallery(images, title);

    $('modalTag').textContent = subject;
    $('modalTitle').textContent = title;
    $('modalDescription').textContent = description || 'تعرّف على تفاصيل الملزمة واستعرض نماذج من صفحاتها.';

    const meta = grade ? [`الصف الدراسي: ${grade}`] : [];
    $('modalMeta').innerHTML = meta.map(x => `<span>${esc(x)}</span>`).join('');

    const formattedPrice = formatIraqiPrice(price);
    $('modalPrice').hidden = !formattedPrice;
    $('modalPrice').innerHTML = formattedPrice ? `<span>السعر</span><strong>${esc(formattedPrice)}</strong>` : '';

    const text = encodeURIComponent(`السلام عليكم، أريد الاستفسار عن ${title}`);
    const whatsappBase = $('modalOrder').href.split('?')[0];
    $('modalOrder').href = `${whatsappBase}?text=${text}`;

    if (pdfPath && pdfPublic) {
      $('modalPreview').href = `/viewer.html?file=${encodeURIComponent(pdfPath)}&title=${encodeURIComponent(title)}`;
      $('modalPreview').hidden = false;
    } else {
      $('modalPreview').hidden = true;
    }

    $('productModal').classList.add('open');
    $('productModal').setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeProductModal() {
    $('productModal').classList.remove('open');
    $('productModal').setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    selectedProduct = null;
  }

  function moveGallery(delta) {
    if (!selectedProduct || !selectedProduct.images.length) return;
    const len = selectedProduct.images.length;
    galleryIndex = (galleryIndex + delta + len) % len;
    renderGallery(selectedProduct.images, selectedProduct.title);
  }

  // Reviews Slider
  let reviewIndex = 0;
  let reviewTimer = null;
  let reviewsExpanded = false;
  let cachedCardWidth = 0;
  let cachedGap = 16;
  let cachedViewportWidth = 0;
  let cachedCardsCount = 0;

  function measureReviewLayout() {
    const track = $('reviewsTrack');
    const viewport = $('reviewsViewport');
    if (!track || !viewport) return;
    const cards = track.children;
    cachedCardsCount = cards.length;
    cachedViewportWidth = viewport.clientWidth;
    if (cards.length > 0) {
      cachedCardWidth = cards[0].offsetWidth || 300;
      const style = getComputedStyle(track);
      cachedGap = parseFloat(style.columnGap || style.gap || '16') || 16;
    }
  }

  function reviewVisible() {
    if (!cachedCardsCount || !cachedViewportWidth || !cachedCardWidth) return 1;
    return Math.max(1, Math.min(cachedCardsCount, Math.floor((cachedViewportWidth + cachedGap + 1) / (cachedCardWidth + cachedGap))));
  }
  function reviewMax() { return Math.max(0, cachedCardsCount - reviewVisible()); }

  function updateReviews() {
    if (!cachedCardsCount) return;
    reviewIndex = Math.max(0, Math.min(reviewIndex, reviewMax()));
    const step = cachedCardWidth + cachedGap;
    const track = $('reviewsTrack');
    if (track) track.style.transform = `translateX(${reviewsExpanded ? 0 : reviewIndex * step}px)`;
    if ($('reviewPosition')) $('reviewPosition').textContent = `${String(reviewIndex + 1).padStart(2,'0')} / ${String(Math.max(1, reviewMax() + 1)).padStart(2,'0')}`;

    document.querySelectorAll('#reviewProgress span').forEach((el, i) => el.classList.toggle('active', i === reviewIndex));
    const disabled = reviewMax() === 0 || reviewsExpanded;
    ['reviewPrev', 'reviewNext'].forEach(id => { const b = $(id); if (b) b.disabled = disabled; });
  }

  function goToReview(i) {
    const max = reviewMax();
    reviewIndex = i < 0 ? max : i > max ? 0 : i;
    updateReviews();
  }

  function startReviewTimer() {
    stopReviewTimer();
    if (reviewsExpanded || reviewMax() < 1 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    reviewTimer = setInterval(() => goToReview(reviewIndex >= reviewMax() ? 0 : reviewIndex + 1), 5000);
  }
  function stopReviewTimer() { if (reviewTimer) clearInterval(reviewTimer); reviewTimer = null; }

  function openReviewFull(card) {
    const modal = $('reviewReadMoreModal');
    if (!modal || !card) return;
    $('reviewReadMoreName').textContent = card.dataset.reviewName || 'رأي أحد عملائنا';
    $('reviewReadMoreRole').textContent = card.dataset.reviewRole || '';
    $('reviewReadMoreBody').textContent = card.dataset.reviewBody || '';
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('review-dialog-open');
    stopReviewTimer();
  }

  function closeReviewFull() {
    const modal = $('reviewReadMoreModal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('review-dialog-open');
    startReviewTimer();
  }

  function enableReviewDragging() {
    const viewport = $('reviewsViewport');
    const track = $('reviewsTrack');
    if (!viewport || !track) return;
    let startX = 0;
    let deltaX = 0;
    let startOffset = 0;
    let dragging = false;

    viewport.addEventListener('pointerdown', (e) => {
      if (reviewsExpanded || e.button !== 0 || e.target.closest('button,a')) return;
      dragging = true;
      startX = e.clientX;
      deltaX = 0;
      const step = cachedCardWidth + cachedGap;
      startOffset = reviewIndex * step;
      track.style.transition = 'none';
      viewport.classList.add('is-dragging');
      viewport.setPointerCapture?.(e.pointerId);
      stopReviewTimer();
    });

    viewport.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      deltaX = e.clientX - startX;
      if (Math.abs(deltaX) > 4) {
        track.style.transform = `translateX(${startOffset + deltaX}px)`;
      }
    });

    const finishDrag = () => {
      if (!dragging) return;
      dragging = false;
      viewport.classList.remove('is-dragging');
      track.style.transition = '';
      if (Math.abs(deltaX) > 48) goToReview(reviewIndex + (deltaX > 0 ? 1 : -1));
      else updateReviews();
      startReviewTimer();
    };

    viewport.addEventListener('pointerup', finishDrag);
    viewport.addEventListener('pointercancel', finishDrag);
    viewport.addEventListener('lostpointercapture', finishDrag);
  }

  // Event Listeners
  $('categoryFilters')?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-category]');
    if (b) setCategory(b.dataset.category);
  });

  $('bookSearch')?.addEventListener('input', filterProducts);
  $('gradeFilter')?.addEventListener('change', (e) => {
    activeGrade = e.target.value;
    filterProducts();
  });

  $('resetFilters')?.addEventListener('click', () => {
    if ($('bookSearch')) $('bookSearch').value = '';
    if ($('gradeFilter')) $('gradeFilter').value = 'all';
    activeGrade = 'all';
    setCategory('all');
  });

  $('productsGrid')?.addEventListener('click', (e) => {
    const card = e.target.closest('.product-card');
    if (!card) return;
    if (e.target.closest('.details-btn') || e.target.closest('.product-image') || e.target.closest('h3')) {
      openProductModal(card);
    }
  });

  $('modalClose')?.addEventListener('click', closeProductModal);
  $('productModal')?.addEventListener('click', (e) => {
    if (e.target.hasAttribute('data-close-modal')) closeProductModal();
  });
  $('galleryPrev')?.addEventListener('click', () => moveGallery(-1));
  $('galleryNext')?.addEventListener('click', () => moveGallery(1));
  $('modalThumbs')?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-gallery-index]');
    if (b) {
      galleryIndex = Number(b.dataset.galleryIndex);
      renderGallery(selectedProduct.images, selectedProduct.title);
    }
  });

  // Reviews events
  $('reviewsTrack')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-review-more]');
    if (btn) openReviewFull(btn.closest('.review-card'));
  });
  $('reviewReadMoreClose')?.addEventListener('click', closeReviewFull);
  $('reviewReadMoreModal')?.addEventListener('click', (e) => {
    if (e.target.hasAttribute('data-close-review-modal')) closeReviewFull();
  });
  $('reviewPrev')?.addEventListener('click', () => { goToReview(reviewIndex - 1); startReviewTimer(); });
  $('reviewNext')?.addEventListener('click', () => { goToReview(reviewIndex + 1); startReviewTimer(); });
  $('reviewExpand')?.addEventListener('click', () => {
    reviewsExpanded = !reviewsExpanded;
    document.querySelector('.reviews-section')?.classList.toggle('expanded', reviewsExpanded);
    $('reviewExpand').setAttribute('aria-expanded', String(reviewsExpanded));
    $('reviewExpand').innerHTML = reviewsExpanded ? 'العودة للعرض المتحرك <span>↻</span>' : 'عرض كل الآراء <span>＋</span>';
    reviewIndex = 0;
    updateReviews();
    reviewsExpanded ? stopReviewTimer() : startReviewTimer();
  });

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if ($('productModal')?.classList.contains('open')) closeProductModal();
    if ($('reviewReadMoreModal')?.classList.contains('open')) closeReviewFull();
  });

  // Mobile menu
  const menuToggle = $('menuToggle');
  const mainNav = $('mainNav');
  menuToggle?.addEventListener('click', () => {
    const open = mainNav.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(open));
  });
  mainNav?.addEventListener('click', (e) => {
    if (e.target.closest('a')) {
      mainNav.classList.remove('open');
      menuToggle?.setAttribute('aria-expanded', 'false');
    }
  });

  // Init
  if (document.querySelector('.product-card')) {
    initProductCardSlides();
  }

  // Reviews init & events
  const reviewsSection = document.querySelector('.reviews-section');
  if (reviewsSection && $('reviewsTrack')) {
    reviewsSection.addEventListener('mouseenter', stopReviewTimer);
    reviewsSection.addEventListener('mouseleave', startReviewTimer);

    enableReviewDragging();
    measureReviewLayout();

    const progress = $('reviewProgress');
    if (progress && cachedCardsCount > 1) {
      progress.innerHTML = Array.from({length: Math.max(1, cachedCardsCount - reviewVisible() + 1)}, (_, i) => `<span class="${i === 0 ? 'active' : ''}"></span>`).join('');
    }
    updateReviews();
    startReviewTimer();

    window.addEventListener('resize', () => {
      measureReviewLayout();
      reviewIndex = Math.min(reviewIndex, reviewMax());
      updateReviews();
      startReviewTimer();
    });
  }
})();
