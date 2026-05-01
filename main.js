/* =========================================================
   RAWABAT ClientFlow — main.js
========================================================= */

const CONFIG = {
  whatsappNumber: "201000045140",
  storageKey: "rawabat_last_lead",
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
  pricingViewed: false
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const hasPixel = () => typeof window.fbq === "function";

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
  fbq("track", "PageView");
}

function trackLead(label = "lead") {
  if (hasPixel()) fbq("track", "Lead", { content_name: label });
}

function trackContact(label = "contact") {
  if (hasPixel()) fbq("track", "Contact", { content_name: label });
}

function trackViewContent(label = "content") {
  if (hasPixel()) fbq("track", "ViewContent", { content_name: label });
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
    `UTM Source: ${data.utm_source || "-"}`,
    `Campaign: ${data.utm_campaign || "-"}`,
    `Page: ${data.page_url || window.location.href}`
  ].join("\n");
}

function setHiddenTracking() {
  const params = new URLSearchParams(location.search);

  const fields = {
    utm_source: params.get("utm_source") || "direct",
    utm_campaign: params.get("utm_campaign") || "none",
    page_url: location.href
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

  let score = 75;

  if (String(data.name || "").trim()) score += 4;
  if (normalizePhone(data.phone).length >= 8) score += 5;
  if (String(data.restaurant || "").trim()) score += 4;
  if (String(data.location || "").trim()) score += 4;
  if (data.messages && !String(data.messages).includes("أقل")) score += 3;
  if (data.problem && String(data.problem).trim().length > 10) score += 5;

  return Math.min(score, 100);
}

function updateLeadScore() {
  const score = calculateLeadScore();
  const bar = $("#leadScoreBar");
  const text = $("#leadScoreText");

  if (bar) bar.style.width = score + "%";
  if (text) text.textContent = score + "%";
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

function goStep(direction) {
  if (direction > 0 && !validateStep(state.currentStep)) return;

  state.currentStep = Math.max(
    1,
    Math.min(CONFIG.totalSteps, state.currentStep + direction)
  );

  updateSmartProgress();
  updateLeadScore();
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
    trackContact("copy_lead_summary");
  } catch (error) {
    alert(text);
  }
}

function submitSmartForm(event) {
  event.preventDefault();

  const isValid = [1, 2].every(validateStep);

  if (!isValid) {
    state.currentStep = 1;
    updateSmartProgress();
    return;
  }

  const summary = buildLeadSummary();

  try {
    localStorage.setItem(CONFIG.storageKey, summary);
  } catch (error) {
    console.warn("Could not save lead summary", error);
  }

  showSuccess();
  trackLead("smart_form_submit");

  window.open(getWhatsAppUrl(summary), "_blank", "noopener,noreferrer");
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
    trackViewContent("pricing");
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
  $$("[data-track-lead]").forEach((element) => {
    element.addEventListener("click", () => {
      trackLead(element.dataset.trackLead || "lead_click");
    });
  });

  $$("[data-track-contact]").forEach((element) => {
    element.addEventListener("click", () => {
      trackContact(element.dataset.trackContact || "contact_click");
    });
  });
}

function initForm() {
  const form = getForm();
  if (!form) return;

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

function init() {
  initMetaPixel();
  setHiddenTracking();
  initTrackingLinks();
  initForm();
  initReveal();
  updateSmartProgress();
  updateLeadScore();
  handleScroll();

  addEventListener("scroll", handleScroll, { passive: true });
}

document.readyState === "loading"
  ? document.addEventListener("DOMContentLoaded", init)
  : init();
