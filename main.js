/* =========================================================
   RAWABAT ClientFlow — main.js
   Advanced Ads Tracking Version
========================================================= */

const CONFIG = {
  whatsappNumber: "201000045140",
  storageKey: "rawabat_last_lead",
  utmStorageKey: "rawabat_utm_data",
  sessionStorageKey: "rawabat_session_id",
  debug: true,
  totalSteps: 4,
  requiredByStep: {
    1: ["name", "phone"],
    2: ["restaurant", "location"],
    3: [],
    4: []
  }
};

const state = {
  currentStep: 1,
  pricingViewed: false,
  formStarted: false,
  leadSubmitted: false,
  whatsappClicked: false,
  trackedSteps: new Set()
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

function logEvent(name, data = {}) {
  if (CONFIG.debug) {
    console.log("[Rawabat Tracking]", name, data);
  }
}

function hasPixel() {
  return typeof window.fbq === "function";
}

function getSessionId() {
  let id = localStorage.getItem(CONFIG.sessionStorageKey);

  if (!id) {
    id = `rb_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(CONFIG.sessionStorageKey, id);
  }

  return id;
}

function getUtmData() {
  const params = new URLSearchParams(window.location.search);

  const data = {
    utm_source: params.get("utm_source") || localStorage.getItem("utm_source") || "direct",
    utm_medium: params.get("utm_medium") || localStorage.getItem("utm_medium") || "none",
    utm_campaign: params.get("utm_campaign") || localStorage.getItem("utm_campaign") || "none",
    utm_content: params.get("utm_content") || localStorage.getItem("utm_content") || "none",
    utm_term: params.get("utm_term") || localStorage.getItem("utm_term") || "none",
    fbclid: params.get("fbclid") || localStorage.getItem("fbclid") || "",
    landing_page: window.location.href,
    referrer: document.referrer || "direct",
    session_id: getSessionId()
  };

  Object.entries(data).forEach(([key, value]) => {
    if (value) localStorage.setItem(key, value);
  });

  localStorage.setItem(CONFIG.utmStorageKey, JSON.stringify(data));

  return data;
}

function basePayload(extra = {}) {
  return {
    ...getUtmData(),
    page_path: window.location.pathname,
    page_title: document.title,
    timestamp: new Date().toISOString(),
    ...extra
  };
}

function initMetaPixel() {
  if (hasPixel()) return;

  (function (f, b, e, v, n, t, s) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];
    t = b.createElement(e);
    t.async = true;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");

  fbq("init", "910167190291826");
  fbq("track", "PageView", basePayload({ event_source: "page_load" }));

  logEvent("PageView", basePayload({ event_source: "page_load" }));
}

function trackStandard(eventName, payload = {}) {
  const data = basePayload(payload);

  if (hasPixel()) {
    fbq("track", eventName, data);
  }

  logEvent(eventName, data);
}

function trackCustom(eventName, payload = {}) {
  const data = basePayload(payload);

  if (hasPixel()) {
    fbq("trackCustom", eventName, data);
  }

  logEvent(eventName, data);
}

function trackLead(label = "lead", extra = {}) {
  trackStandard("Lead", {
    content_name: label,
    funnel: "clientflow_restaurants",
    ...extra
  });
}

function trackContact(label = "contact", extra = {}) {
  trackStandard("Contact", {
    content_name: label,
    funnel: "clientflow_restaurants",
    ...extra
  });
}

function trackViewContent(label = "content", extra = {}) {
  trackStandard("ViewContent", {
    content_name: label,
    funnel: "clientflow_restaurants",
    ...extra
  });
}

function getForm() {
  return $("#smartLeadForm");
}

function getData() {
  const form = getForm();
  return form ? Object.fromEntries(new FormData(form).entries()) : {};
}

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

function getWhatsAppUrl(message) {
  return `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

function buildLeadSummary() {
  const data = getData();
  const utm = getUtmData();

  return [
    "مرحبًا، أريد تجربة ClientFlow لمطعمي",
    "",
    `الاسم: ${data.name || "-"}`,
    `واتساب العميل: ${data.phone || "-"}`,
    `اسم المطعم: ${data.restaurant || "-"}`,
    `الدولة/المدينة: ${data.location || "-"}`,
    `عدد الفروع: ${data.branches || "-"}`,
    `رسائل واتساب يوميًا: ${data.messages || "-"}`,
    `حالة المنيو: ${data.menu_status || "-"}`,
    `الباقة الأقرب: ${data.package || "-"}`,
    `المشكلة الحالية: ${data.problem || "-"}`,
    "",
    `Lead Score: ${calculateLeadScore()}%`,
    `Session ID: ${utm.session_id}`,
    `UTM Source: ${utm.utm_source}`,
    `UTM Medium: ${utm.utm_medium}`,
    `Campaign: ${utm.utm_campaign}`,
    `Page: ${utm.landing_page}`
  ].join("\n");
}

function setHiddenTracking() {
  const utm = getUtmData();

  const fields = {
    utm_source: utm.utm_source,
    utm_campaign: utm.utm_campaign,
    page_url: utm.landing_page
  };

  Object.entries(fields).forEach(([key, value]) => {
    const input = $("#" + key);
    if (input) input.value = value;
  });
}

function fieldWrapper(field) {
  return field ? field.closest(".form-field") : null;
}

function validateField(name) {
  const form = getForm();
  if (!form || !form.elements[name]) return true;

  const field = form.elements[name];
  const value = String(field.value || "").trim();

  let isValid = value.length >= 2;

  if (name === "phone") {
    isValid = normalizePhone(value).length >= 8;
  }

  const wrapper = fieldWrapper(field);
  if (wrapper) wrapper.classList.toggle("is-invalid", !isValid);

  field.setAttribute("aria-invalid", String(!isValid));

  return isValid;
}

function validateStep(step) {
  return (CONFIG.requiredByStep[step] || []).every(validateField);
}

function calculateLeadScore() {
  const data = getData();

  let score = 55;

  if (String(data.name || "").trim()) score += 8;
  if (normalizePhone(data.phone).length >= 8) score += 12;
  if (String(data.restaurant || "").trim()) score += 10;
  if (String(data.location || "").trim()) score += 8;
  if (data.messages && !String(data.messages).includes("أقل")) score += 7;
  if (data.menu_status && String(data.menu_status).includes("جاهز")) score += 5;
  if (data.branches && !String(data.branches).includes("فرع واحد")) score += 5;
  if (data.package && !String(data.package).includes("Starter")) score += 5;
  if (data.problem && String(data.problem).trim().length > 10) score += 8;

  return Math.min(score, 100);
}

function updateLeadScore() {
  const score = calculateLeadScore();
  const bar = $("#leadScoreBar");
  const text = $("#leadScoreText");

  if (bar) bar.style.width = score + "%";
  if (text) text.textContent = score + "%";

  trackCustom("LeadScoreUpdated", {
    score,
    lead_quality: score >= 85 ? "hot" : score >= 70 ? "warm" : "cold"
  });
}

function updateSmartProgress() {
  const progress = Math.round((state.currentStep / CONFIG.totalSteps) * 100);

  const progressBar = $("#smartProgressBar");
  const progressText = $("#smartProgressText");
  const stepLabel = $("#smartStepLabel");

  if (progressBar) progressBar.style.width = progress + "%";
  if (progressText) progressText.textContent = progress + "%";
  if (stepLabel) stepLabel.textContent = `الخطوة ${state.currentStep} من ${CONFIG.totalSteps}`;

  $$(".smart-step").forEach((step) => {
    step.classList.toggle("is-active", Number(step.dataset.step) === state.currentStep);
  });

  $$(".smart-step-pill").forEach((pill) => {
    pill.classList.toggle("is-active", Number(pill.dataset.stepPill) === state.currentStep);
  });

  const prevBtn = $("#prevStepBtn");
  const nextBtn = $("#nextStepBtn");
  const submitBtn = $("#submitSmartFormBtn");

  if (prevBtn) prevBtn.disabled = state.currentStep === 1;
  if (nextBtn) nextBtn.hidden = state.currentStep === CONFIG.totalSteps;
  if (submitBtn) submitBtn.hidden = state.currentStep !== CONFIG.totalSteps;
}

function trackFormStep(step) {
  if (state.trackedSteps.has(step)) return;

  state.trackedSteps.add(step);

  trackCustom("FormStep", {
    step,
    progress: Math.round((step / CONFIG.totalSteps) * 100),
    score: calculateLeadScore()
  });
}

function goStep(direction) {
  if (direction > 0 && !validateStep(state.currentStep)) {
    trackCustom("FormValidationError", {
      step: state.currentStep
    });
    return;
  }

  state.currentStep = Math.max(
    1,
    Math.min(CONFIG.totalSteps, state.currentStep + direction)
  );

  updateSmartProgress();
  updateLeadScore();
  trackFormStep(state.currentStep);
}

function showSuccess() {
  const success = $("#leadSuccess");
  if (success) success.classList.add("is-visible");
}

async function copyLeadSummary() {
  const text = buildLeadSummary();

  try {
    await navigator.clipboard.writeText(text);
    showSuccess();

    trackContact("copy_lead_summary", {
      score: calculateLeadScore()
    });
  } catch (error) {
    alert(text);
  }
}

function submitSmartForm(event) {
  event.preventDefault();

  if (state.leadSubmitted) return;

  const isValid = [1, 2].every(validateStep);

  if (!isValid) {
    state.currentStep = 1;
    updateSmartProgress();

    trackCustom("SubmitBlocked", {
      reason: "required_fields_missing"
    });

    return;
  }

  state.leadSubmitted = true;

  const summary = buildLeadSummary();
  const score = calculateLeadScore();
  const data = getData();

  try {
    localStorage.setItem(CONFIG.storageKey, summary);
  } catch (error) {
    console.warn("Could not save lead summary", error);
  }

  showSuccess();

  trackLead("qualified_lead", {
    status: "qualified",
    score,
    lead_quality: score >= 85 ? "hot" : score >= 70 ? "warm" : "cold",
    restaurant: data.restaurant || "",
    location: data.location || "",
    package: data.package || ""
  });

  trackCustom("QualifiedLead", {
    score,
    package: data.package || "",
    messages: data.messages || "",
    branches: data.branches || ""
  });

  openTrackedWhatsApp(summary, {
    source: "smart_form_submit",
    score,
    qualified: true
  });
}

function openTrackedWhatsApp(message, extra = {}) {
  const clickId = `wa_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const url = getWhatsAppUrl(message);

  try {
    localStorage.setItem("rawabat_last_whatsapp_click_id", clickId);
  } catch (error) {}

  trackLead("whatsapp_click", {
    click_id: clickId,
    ...extra
  });

  trackLead("whatsapp_conversion", {
    click_id: clickId,
    ...extra
  });

  trackCustom("WhatsAppClick", {
    click_id: clickId,
    ...extra
  });

  window.open(url, "_blank", "noopener,noreferrer");
}

function handleScroll() {
  const nav = $("#nav");
  if (nav) nav.classList.toggle("is-scrolled", scrollY > 40);

  const pricing = $("#pricing");

  if (
    pricing &&
    !state.pricingViewed &&
    pricing.getBoundingClientRect().top < innerHeight * 0.75
  ) {
    state.pricingViewed = true;

    trackViewContent("pricing_view", {
      intent: "high",
      section: "pricing"
    });

    trackCustom("PricingView", {
      intent: "high",
      score: calculateLeadScore()
    });
  }
}

function initReveal() {
  const elements = $$(".reveal");

  if (!("IntersectionObserver" in window)) {
    elements.forEach((element) => element.classList.add("show"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("show");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  elements.forEach((element) => observer.observe(element));
}

function initTrackingLinks() {
  const whatsappLinks = $$("a[href*='wa.me'], a[href*='whatsapp'], [data-track-lead]");

  whatsappLinks.forEach((element) => {
    element.addEventListener("click", () => {
      const label = element.dataset.trackLead || "whatsapp_link";
      const href = element.getAttribute("href") || "";

      trackLead("whatsapp_click", {
        button_label: label,
        href,
        source: "link_click",
        score: calculateLeadScore()
      });

      if (label && label !== "whatsapp_click") {
        trackCustom("SpecificButtonClick", {
          button_label: label,
          href,
          score: calculateLeadScore()
        });
      }
    });
  });

  $$("[data-track-contact]").forEach((element) => {
    element.addEventListener("click", () => {
      trackContact(element.dataset.trackContact || "contact_click", {
        score: calculateLeadScore()
      });
    });
  });
}

function initForm() {
  const form = getForm();
  if (!form) return;

  form.addEventListener("focusin", () => {
    if (!state.formStarted) {
      state.formStarted = true;

      trackContact("form_start", {
        step: 1,
        score: calculateLeadScore()
      });

      trackCustom("FormStarted", {
        step: 1,
        score: calculateLeadScore()
      });

      trackFormStep(1);
    }
  });

  form.addEventListener("input", updateLeadScore);
  form.addEventListener("change", updateLeadScore);
  form.addEventListener("submit", submitSmartForm);

  ["name", "phone", "restaurant", "location"].forEach((name) => {
    form.elements[name]?.addEventListener("blur", () => validateField(name));
  });

  $("#nextStepBtn")?.addEventListener("click", () => goStep(1));
  $("#prevStepBtn")?.addEventListener("click", () => goStep(-1));
  $("#copyLeadSummaryBtn")?.addEventListener("click", copyLeadSummary);
}

function initPageTracking() {
  trackViewContent("landing_view", {
    section: "hero",
    funnel_step: "landing"
  });

  trackCustom("LandingPageViewed", {
    funnel: "clientflow_restaurants"
  });
}

function init() {
  initMetaPixel();
  setHiddenTracking();
  initTrackingLinks();
  initForm();
  initReveal();
  updateSmartProgress();
  updateLeadScore();
  handleScroll();
  initPageTracking();

  addEventListener("scroll", handleScroll, { passive: true });
}

document.readyState === "loading"
  ? document.addEventListener("DOMContentLoaded", init)
  : init();
