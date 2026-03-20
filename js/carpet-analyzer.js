/**
 * ÖZMER AI Halı Analiz Sihirbazı
 * 3 adımlı wizard: Fotoğraf Yükleme → Ek Bilgi → Sonuç
 */
(function () {
  "use strict";

  const WHATSAPP_NUMBER = "905322418969";
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const PHOTO_SLOTS = [
    {
      id: "overview",
      label: "Genel Görünüm",
      desc: "Halınızın uzaktan, tamamını gösteren bir fotoğrafı",
      icon: "fa-expand",
      required: true,
    },
    {
      id: "closeup",
      label: "Yakın Çekim",
      desc: "Halının dokusunu ve tüy yapısını gösteren makro çekim",
      icon: "fa-magnifying-glass-plus",
      required: false,
    },
    {
      id: "backside",
      label: "Arka Yüzü",
      desc: "Halının arka tarafındaki ilmek yapısı",
      icon: "fa-rotate",
      required: false,
    },
    {
      id: "label",
      label: "Etiket",
      desc: "Varsa halının üzerindeki etiket bilgisi",
      icon: "fa-tag",
      required: false,
    },
  ];

  let uploadedFiles = {};
  let currentStep = 1;

  function initWizard(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = buildWizardHTML();
    bindEvents(container);
  }

  function buildWizardHTML() {
    return `
      <div class="carpet-wizard">
        <div class="wizard-header">
          <div class="wizard-icon"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
          <h2>AI ile Halınızın Türünü Öğrenin</h2>
          <p>Fotoğraf yükleyin, yapay zeka halınızın türünü ve fiyatını anında belirlesin</p>
        </div>

        <div class="wizard-progress">
          <div class="progress-step active" data-step="1">
            <span class="step-number">1</span>
            <span class="step-label">Fotoğraf</span>
          </div>
          <div class="progress-line"></div>
          <div class="progress-step" data-step="2">
            <span class="step-number">2</span>
            <span class="step-label">Bilgi</span>
          </div>
          <div class="progress-line"></div>
          <div class="progress-step" data-step="3">
            <span class="step-number">3</span>
            <span class="step-label">Sonuç</span>
          </div>
        </div>

        <!-- Step 1: Photo Upload -->
        <div class="wizard-step" id="wizard-step-1">
          <div class="photo-grid">
            ${PHOTO_SLOTS.map((slot) => buildPhotoSlot(slot)).join("")}
          </div>
          <p class="photo-hint"><i class="fa-solid fa-circle-info"></i> En az 1 fotoğraf yükleyin. Daha fazla fotoğraf = daha doğru analiz.</p>
          <div class="wizard-actions">
            <button class="wizard-btn primary" id="btn-step1-next" disabled>
              Devam <i class="fa-solid fa-arrow-right"></i>
            </button>
          </div>
        </div>

        <!-- Step 2: Optional Info -->
        <div class="wizard-step hidden" id="wizard-step-2">
          <div class="info-form">
            <div class="form-group">
              <label for="carpet-brand"><i class="fa-solid fa-tag"></i> Marka / Model (Opsiyonel)</label>
              <input type="text" id="carpet-brand" placeholder="Örn: Sanat Halı, Pierre Cardin...">
            </div>
            <div class="form-group">
              <label for="carpet-notes"><i class="fa-solid fa-pencil"></i> Eklemek İstediğiniz Not (Opsiyonel)</label>
              <textarea id="carpet-notes" rows="3" placeholder="Örn: Halı çok eski, leke var, özel bakım gerekebilir..."></textarea>
            </div>
          </div>
          <div class="wizard-actions">
            <button class="wizard-btn secondary" id="btn-step2-back">
              <i class="fa-solid fa-arrow-left"></i> Geri
            </button>
            <button class="wizard-btn primary" id="btn-analyze">
              <i class="fa-solid fa-magnifying-glass"></i> Analiz Et
            </button>
          </div>
        </div>

        <!-- Step 3: Result -->
        <div class="wizard-step hidden" id="wizard-step-3">
          <div id="analyze-loading" class="hidden">
            <div class="loading-animation">
              <div class="loading-spinner"></div>
              <p class="loading-text">Halınız analiz ediliyor...</p>
              <div class="loading-steps">
                <div class="loading-step" id="ls-1"><i class="fa-solid fa-image"></i> Fotoğraflar işleniyor</div>
                <div class="loading-step" id="ls-2"><i class="fa-solid fa-magnifying-glass"></i> Doku analizi yapılıyor</div>
                <div class="loading-step" id="ls-3"><i class="fa-solid fa-brain"></i> Tür belirleniyor</div>
                <div class="loading-step" id="ls-4"><i class="fa-solid fa-calculator"></i> Fiyat hesaplanıyor</div>
              </div>
            </div>
          </div>

          <div id="analyze-result" class="hidden"></div>
          <div id="analyze-error" class="hidden"></div>
        </div>
      </div>
    `;
  }

  function buildPhotoSlot(slot) {
    return `
      <div class="photo-slot" id="slot-${slot.id}" data-slot="${slot.id}">
        <input type="file" accept="image/*" capture="environment" id="input-${slot.id}" class="photo-input">
        <div class="photo-placeholder" id="placeholder-${slot.id}">
          <i class="fa-solid ${slot.icon}"></i>
          <span class="slot-label">${slot.label}</span>
          <span class="slot-desc">${slot.desc}</span>
          ${slot.required ? '<span class="slot-required">Zorunlu</span>' : '<span class="slot-optional">Opsiyonel</span>'}
        </div>
        <div class="photo-preview hidden" id="preview-${slot.id}">
          <img src="" alt="${slot.label}">
          <button class="photo-remove" data-slot="${slot.id}" title="Kaldır">
            <i class="fa-solid fa-xmark"></i>
          </button>
          <span class="photo-label">${slot.label}</span>
        </div>
      </div>
    `;
  }

  function bindEvents(container) {
    // Photo slot clicks
    PHOTO_SLOTS.forEach((slot) => {
      const slotEl = container.querySelector(`#slot-${slot.id}`);
      const input = container.querySelector(`#input-${slot.id}`);
      const placeholder = container.querySelector(`#placeholder-${slot.id}`);

      placeholder.addEventListener("click", () => input.click());

      input.addEventListener("change", (e) => {
        if (e.target.files && e.target.files[0]) {
          handleFileSelect(slot.id, e.target.files[0], container);
        }
      });

      // Drag & drop
      slotEl.addEventListener("dragover", (e) => {
        e.preventDefault();
        slotEl.classList.add("dragover");
      });
      slotEl.addEventListener("dragleave", () => {
        slotEl.classList.remove("dragover");
      });
      slotEl.addEventListener("drop", (e) => {
        e.preventDefault();
        slotEl.classList.remove("dragover");
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleFileSelect(slot.id, e.dataTransfer.files[0], container);
        }
      });
    });

    // Remove buttons
    container.addEventListener("click", (e) => {
      const removeBtn = e.target.closest(".photo-remove");
      if (removeBtn) {
        const slotId = removeBtn.dataset.slot;
        removePhoto(slotId, container);
      }
    });

    // Navigation buttons
    container
      .querySelector("#btn-step1-next")
      .addEventListener("click", () => goToStep(2, container));
    container
      .querySelector("#btn-step2-back")
      .addEventListener("click", () => goToStep(1, container));
    container
      .querySelector("#btn-analyze")
      .addEventListener("click", () => startAnalysis(container));
  }

  function handleFileSelect(slotId, file, container) {
    if (!file.type.startsWith("image/")) {
      alert("Lütfen bir fotoğraf dosyası seçin.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      alert("Dosya boyutu 5MB'dan küçük olmalıdır.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      uploadedFiles[slotId] = {
        data: e.target.result,
        mimeType: file.type,
        name: file.name,
      };

      const placeholder = container.querySelector(`#placeholder-${slotId}`);
      const preview = container.querySelector(`#preview-${slotId}`);
      const img = preview.querySelector("img");

      img.src = e.target.result;
      placeholder.classList.add("hidden");
      preview.classList.remove("hidden");

      updateNextButton(container);
    };
    reader.readAsDataURL(file);
  }

  function removePhoto(slotId, container) {
    delete uploadedFiles[slotId];

    const placeholder = container.querySelector(`#placeholder-${slotId}`);
    const preview = container.querySelector(`#preview-${slotId}`);
    const input = container.querySelector(`#input-${slotId}`);

    preview.classList.add("hidden");
    placeholder.classList.remove("hidden");
    input.value = "";

    updateNextButton(container);
  }

  function updateNextButton(container) {
    const btn = container.querySelector("#btn-step1-next");
    const hasPhotos = Object.keys(uploadedFiles).length > 0;
    btn.disabled = !hasPhotos;
  }

  function goToStep(step, container) {
    currentStep = step;

    // Hide all steps
    container.querySelectorAll(".wizard-step").forEach((el) => el.classList.add("hidden"));

    // Show target step
    container.querySelector(`#wizard-step-${step}`).classList.remove("hidden");

    // Update progress
    container.querySelectorAll(".progress-step").forEach((el) => {
      const s = parseInt(el.dataset.step);
      el.classList.toggle("active", s <= step);
      el.classList.toggle("completed", s < step);
    });

    container.querySelectorAll(".progress-line").forEach((el, i) => {
      el.classList.toggle("active", i + 1 < step);
    });
  }

  async function startAnalysis(container) {
    goToStep(3, container);

    const loading = container.querySelector("#analyze-loading");
    const result = container.querySelector("#analyze-result");
    const error = container.querySelector("#analyze-error");

    loading.classList.remove("hidden");
    result.classList.add("hidden");
    error.classList.add("hidden");

    // Animate loading steps
    animateLoadingSteps(container);

    const brand = container.querySelector("#carpet-brand").value.trim();
    const notes = container.querySelector("#carpet-notes").value.trim();

    const images = PHOTO_SLOTS.filter((s) => uploadedFiles[s.id]).map((s) => ({
      data: uploadedFiles[s.id].data,
      mimeType: uploadedFiles[s.id].mimeType,
    }));

    const brandText = [brand, notes].filter(Boolean).join(" - ");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images,
          brand: brandText || undefined,
        }),
      });

      const data = await response.json();

      loading.classList.add("hidden");

      if (!response.ok || !data.success) {
        showError(container, data.error || "Bir hata oluştu.");
        return;
      }

      showResult(container, data.result);
    } catch (err) {
      loading.classList.add("hidden");
      showError(container, "Bağlantı hatası. Lütfen tekrar deneyin.");
    }
  }

  function animateLoadingSteps(container) {
    const steps = ["ls-1", "ls-2", "ls-3", "ls-4"];
    steps.forEach((id, i) => {
      setTimeout(() => {
        const el = container.querySelector(`#${id}`);
        if (el) el.classList.add("active");
      }, i * 800);
    });
  }

  function showResult(container, data) {
    const resultDiv = container.querySelector("#analyze-result");

    if (data.needsExpert) {
      resultDiv.innerHTML = `
        <div class="result-card expert-needed">
          <div class="result-icon"><i class="fa-solid fa-user-tie"></i></div>
          <h3>Uzman İncelemesi Gerekiyor</h3>
          <p>Fotoğraflardan kesin bir tespit yapılamadı. Uzmanımız size WhatsApp üzerinden dönüş yapacaktır.</p>
          ${data.description ? `<p class="result-note"><i class="fa-solid fa-circle-info"></i> ${data.description}</p>` : ""}
          <div class="result-actions">
            <a href="https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Merhaba, halımın türünü öğrenmek istiyorum. AI analizi belirsiz sonuç verdi.")}" target="_blank" class="wizard-btn whatsapp">
              <i class="fa-brands fa-whatsapp"></i> WhatsApp ile İletişim
            </a>
            <a href="/randevu" class="wizard-btn secondary">
              <i class="fa-solid fa-calendar-check"></i> Randevu Al
            </a>
          </div>
          <button class="wizard-btn outline" id="btn-retry">
            <i class="fa-solid fa-rotate"></i> Tekrar Dene
          </button>
        </div>
      `;
    } else {
      const confidenceClass =
        data.confidence >= 80 ? "high" : data.confidence >= 60 ? "medium" : "low";

      resultDiv.innerHTML = `
        <div class="result-card success">
          <div class="result-icon"><i class="fa-solid fa-circle-check"></i></div>
          <h3>Analiz Tamamlandı</h3>

          <div class="result-details">
            <div class="result-row">
              <span class="result-label">Halı Türü</span>
              <span class="result-value type">${data.carpetType}</span>
            </div>
            <div class="result-row">
              <span class="result-label">Birim Fiyat</span>
              <span class="result-value price">${data.pricePerM2} TL / m²</span>
            </div>
            <div class="result-row">
              <span class="result-label">Güven Oranı</span>
              <span class="result-value">
                <div class="confidence-bar">
                  <div class="confidence-fill ${confidenceClass}" style="width: ${data.confidence}%"></div>
                </div>
                <span class="confidence-text">%${data.confidence}</span>
              </span>
            </div>
          </div>

          ${data.description ? `<p class="result-note"><i class="fa-solid fa-robot"></i> ${data.description}</p>` : ""}

          <p class="result-disclaimer"><i class="fa-solid fa-triangle-exclamation"></i> Kesin fiyat, halı teslim alınırken uzman personelimizce belirlenecektir.</p>

          <div class="result-actions">
            <a href="/randevu" class="wizard-btn primary">
              <i class="fa-solid fa-calendar-check"></i> Hemen Randevu Al
            </a>
            <a href="https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Merhaba, AI analizi halımı " + data.carpetType + " olarak belirledi. Randevu almak istiyorum.")}" target="_blank" class="wizard-btn whatsapp">
              <i class="fa-brands fa-whatsapp"></i> WhatsApp
            </a>
          </div>
          <button class="wizard-btn outline" id="btn-retry">
            <i class="fa-solid fa-rotate"></i> Tekrar Dene
          </button>
        </div>
      `;
    }

    resultDiv.classList.remove("hidden");

    // Bind retry button
    const retryBtn = resultDiv.querySelector("#btn-retry");
    if (retryBtn) {
      retryBtn.addEventListener("click", () => {
        uploadedFiles = {};
        const container = retryBtn.closest(".carpet-analyzer-container");
        if (container) {
          initWizard(container.id);
        } else {
          // Find closest wizard container and reinitialize
          const wizardContainer = retryBtn.closest("[id^='carpet-analyzer']");
          if (wizardContainer) initWizard(wizardContainer.id);
        }
      });
    }
  }

  function showError(container, message) {
    const errorDiv = container.querySelector("#analyze-error");
    errorDiv.innerHTML = `
      <div class="result-card error">
        <div class="result-icon"><i class="fa-solid fa-circle-exclamation"></i></div>
        <h3>Bir Sorun Oluştu</h3>
        <p>${message}</p>
        <div class="result-actions">
          <button class="wizard-btn primary" id="btn-retry-error">
            <i class="fa-solid fa-rotate"></i> Tekrar Dene
          </button>
          <a href="https://wa.me/${WHATSAPP_NUMBER}" target="_blank" class="wizard-btn whatsapp">
            <i class="fa-brands fa-whatsapp"></i> WhatsApp ile İletişim
          </a>
        </div>
      </div>
    `;
    errorDiv.classList.remove("hidden");

    const retryBtn = errorDiv.querySelector("#btn-retry-error");
    if (retryBtn) {
      retryBtn.addEventListener("click", () => goToStep(1, container.closest("[id^='carpet-analyzer']") || container.parentElement));
    }
  }

  // Expose to global scope
  window.initCarpetAnalyzer = initWizard;

  // Auto-init on DOMContentLoaded
  document.addEventListener("DOMContentLoaded", () => {
    document
      .querySelectorAll(".carpet-analyzer-container")
      .forEach((el) => initWizard(el.id));
  });
})();
