/* =========================================================
   RAWABAT ClientFlow — main.js
   Order: Config/Variables → Functions → Event Listeners → Init
========================================================= */

/* =========================
   1) Config / Variables
========================= */
const CONFIG = {
  whatsappNumber: "201000045140",
  storageKey: "rawabat_last_lead",
  scrollThreshold: 40,
  pricingViewThreshold: 0.75,
  revealThreshold: 0.12,
  defaultUtmSource: "direct",
  defaultUtmCampaign: "none",
  selectors: {
    nav: "#nav",
    pricing: "#pricing",
    reveal: ".reveal",
    leadForm: "#enterpriseLeadForm",
    leadSuccess: "#leadSuccess",
    leadScoreBar: "#leadScoreBar",
    leadScoreText: "#leadScoreText",
    copyLeadSummaryBtn: "#copyLeadSummaryBtn",
    utmSource: "#utm_source",
    utmCampaign: "#utm_campaign",
    pageUrl: "#page_url",
    trackLead: "[data-track-lead]",
    trackContact: "[data-track-contact]"
  },
  leadRequiredFields: ["name", "phone", "restaurant", "location"]
};

const state = {
  pricingViewed: false
};

/* =========================
   2) Functions
========================= */
function safeQuery(selector, root = document) {
  return root.querySelector(selector);
}

function safeQueryAll(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

function hasMetaPixel() {
  return typeof window.fbq === "function";
}

function trackLead(label = "lead") {
  if (hasMetaPixel()) {
    window.fbq("track", "Lead", { content_name: label });
  }
}

function trackContact(label = "contact") {
  if (hasMetaPixel()) {
    window.fbq("track", "Contact", { content_name: label });
  }
}

function trackViewContent(label = "content") {
  if (hasMetaPixel()) {
    window.fbq("track", "ViewContent", { content_name: label });
  }
}

function setInputValue(selector, value) {
  const input = safeQuery(selector);
  if (input) input.value = value;
}

function setHiddenTrackingFields() {
  const params = new URLSearchParams(window.location.search);

  setInputValue(CONFIG.selectors.utmSource, params.get("utm_source") || CONFIG.defaultUtmSource);
  setInputValue(CONFIG.selectors.utmCampaign, params.get("utm_campaign") || CONFIG.defaultUtmCampaign);
  setInputValue(CONFIG.selectors.pageUrl, window.location.href);
}

function getLeadForm() {
  return safeQuery(CONFIG.selectors.leadForm);
}

function getLeadData() {
  const form = getLeadForm();
  if (!form) return {};

  return Object.fromEntries(new FormData(form).entries());
}

function normalizePhone(phone) {
  return String(phone || "").replace(/\D/g, "");
}

function buildLeadSummary() {
  const data = getLeadData();

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

function getWhatsAppUrl(message) {
  return `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

function getFieldWrapper(field) {
  return field ? field.closest(".form-field") : null;
}

function setFieldValidity(field, isValid) {
  const wrapper = getFieldWrapper(field);
  if (!wrapper) return;

  wrapper.classList.toggle("is-invalid", !isValid);
  field.setAttribute("aria-invalid", String(!isValid));
}

function validateField(fieldName) {
  const form = getLeadForm();
  if (!form || !form.elements[fieldName]) return true;

  const field = form.elements[fieldName];
  const value = String(field.value || "").trim();
  let isValid = value.length >= 2;

  if (fieldName === "phone") {
    isValid = normalizePhone(value).length >= 8;
  }

  setFieldValidity(field, isValid);
  return isValid;
}

function validateEnterpriseForm() {
  return CONFIG.leadRequiredFields.every(validateField);
}

function calculateLeadScore(data) {
  let score = 68;

  if (String(data.name || "").trim()) score += 8;
  if (normalizePhone(data.phone).length >= 8) score += 12;
  if (String(data.restaurant || "").trim()) score += 10;
  if (String(data.location || "").trim()) score += 10;
  if (data.messages && !String(data.messages).includes("أقل")) score += 8;
  if (data.menu_status && String(data.menu_status).includes("جاهز")) score += 7;
  if (String(data.problem || "").trim().length > 10) score += 10;

  return Math.min(score, 100);
}

function updateLeadScore() {
  const data = getLeadData();
  const score = calculateLeadScore(data);
  const bar = safeQuery(CONFIG.selectors.leadScoreBar);
  const text = safeQuery(CONFIG.selectors.leadScoreText);

  if (bar) bar.style.width = `${score}%`;
  if (text) text.textContent = `${score}%`;
}

function showLeadSuccess() {
  const success = safeQuery(CONFIG.selectors.leadSuccess);
  if (success) success.classList.add("is-visible");
}

function saveLeadSummary(summary) {
  try {
    localStorage.setItem(CONFIG.storageKey, summary);
  } catch (error) {
    console.warn("Could not save lead summary to localStorage", error);
  }
}

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    document.execCommand("copy");
    return true;
  } finally {
    document.body.removeChild(textarea);
  }
}

async function copyLeadSummary() {
  const summary = buildLeadSummary();

  try {
    await copyText(summary);
    showLeadSuccess();
    trackContact("copy_lead_summary");
  } catch (error) {
    window.alert(summary);
  }
}

function handleLeadFormSubmit(event) {
  event.preventDefault();

  if (!validateEnterpriseForm()) return;

  const summary = buildLeadSummary();
  saveLeadSummary(summary);
  showLeadSuccess();
  trackLead("enterprise_form_submit");

  window.open(getWhatsAppUrl(summary), "_blank", "noopener,noreferrer");
}

function handleNavScroll() {
  const nav = safeQuery(CONFIG.selectors.nav);
  if (!nav) return;

  nav.classList.toggle("is-scrolled", window.scrollY > CONFIG.scrollThreshold);
}

function handlePricingViewTracking() {
  if (state.pricingViewed) return;

  const pricing = safeQuery(CONFIG.selectors.pricing);
  if (!pricing) return;

  const rect = pricing.getBoundingClientRect();
  const threshold = window.innerHeight * CONFIG.pricingViewThreshold;

  if (rect.top < threshold) {
    state.pricingViewed = true;
    pricing.dataset.viewed = "true";
    trackViewContent("pricing");
  }
}

function handleScroll() {
  handleNavScroll();
  handlePricingViewTracking();
}

function initRevealObserver() {
  const elements = safeQueryAll(CONFIG.selectors.reveal);

  if (!elements.length) return;

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
    { threshold: CONFIG.revealThreshold }
  );

  elements.forEach((element) => observer.observe(element));
}

function initTrackingLinks() {
  safeQueryAll(CONFIG.selectors.trackLead).forEach((link) => {
    link.addEventListener("click", () => trackLead(link.dataset.trackLead || "lead_click"));
  });

  safeQueryAll(CONFIG.selectors.trackContact).forEach((link) => {
    link.addEventListener("click", () => trackContact(link.dataset.trackContact || "contact_click"));
  });
}

function initLeadForm() {
  const form = getLeadForm();
  if (!form) return;

  form.addEventListener("input", updateLeadScore);
  form.addEventListener("change", updateLeadScore);
  form.addEventListener("submit", handleLeadFormSubmit);

  CONFIG.leadRequiredFields.forEach((fieldName) => {
    const field = form.elements[fieldName];
    if (!field) return;

    field.addEventListener("blur", () => validateField(fieldName));
  });

  const copyBtn = safeQuery(CONFIG.selectors.copyLeadSummaryBtn);
  if (copyBtn) copyBtn.addEventListener("click", copyLeadSummary);

  updateLeadScore();
}

function initMetaPixel() {
  if (hasMetaPixel()) return;

  /* Meta Pixel bootstrap */
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

  window.fbq("init", "910167190291826");
  window.fbq("track", "PageView");
}

/* =========================
   3) Event Listeners
========================= */
window.addEventListener("scroll", handleScroll, { passive: true });

/* =========================
   4) Init
========================= */
function init() {
  initMetaPixel();
  setHiddenTrackingFields();
  initTrackingLinks();
  initLeadForm();
  initRevealObserver();
  handleScroll();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
