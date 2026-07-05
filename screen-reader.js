(() => {
  // ====== Settings you can change ======
  const DEBOUNCE_MS = 350;       // wait for user to finish selecting
  const MAX_CHARS = 600;         // avoid reading huge selections by accident
  const REQUIRE_ARMING = true;   // set false if you want to try without first click (may be blocked)
  // ====================================

  let armed = !REQUIRE_ARMING;
  let lastSpoken = "";
  let debounceTimer = null;

  function isArabic(text) {
    return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text);
  }

  function getSelectedText() {
    const sel = window.getSelection ? window.getSelection() : null;
    return (sel && sel.toString && sel.toString().trim()) || "";
  }

  function selectionIsInEditableField() {
    const a = document.activeElement;
    if (!a) return false;
    const tag = (a.tagName || "").toLowerCase();
    return tag === "input" || tag === "textarea" || a.isContentEditable;
  }

  function pickVoice(langPrefix) {
    const voices = window.speechSynthesis.getVoices() || [];
    let v = voices.find(v => (v.lang || "").toLowerCase().startsWith(langPrefix));
    if (v) return v;

    // Fallback: name hints (varies)
    const hint = langPrefix === "ar" ? /(arab|arabic)/i : /(english|en)/i;
    v = voices.find(v => hint.test(v.name || ""));
    return v || null;
  }

  function speak(text) {
    window.speechSynthesis.cancel();

    const u = new SpeechSynthesisUtterance(text);
    const langPrefix = isArabic(text) ? "ar" : "en";

    u.lang = langPrefix === "ar" ? "ar-SA" : "en-US";
    const voice = pickVoice(langPrefix);
    if (voice) u.voice = voice;

    u.rate = 1;
    u.pitch = 1;
    u.volume = 1;

    window.speechSynthesis.speak(u);
  }

  function onSelectionChange() {
    if (selectionIsInEditableField()) return;

    let text = getSelectedText();
    if (!text) return;

    if (!armed) {
      // Browser may block speech until a user gesture occurs
      return;
    }

    if (text.length > MAX_CHARS) text = text.slice(0, MAX_CHARS);

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const finalText = getSelectedText();
      if (!finalText) return;

      const normalized = finalText.trim();
      if (!normalized || normalized === lastSpoken) return;

      lastSpoken = normalized;
      speak(normalized);
    }, DEBOUNCE_MS);
  }

  function armOnce() {
    armed = true;
    window.removeEventListener("pointerdown", armOnce, true);
    window.removeEventListener("keydown", armOnce, true);
    // Initialize voices after gesture (helps on some browsers)
    window.speechSynthesis.getVoices();
  }

  // Voice list loads async in Chrome/Edge
  window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();

  document.addEventListener("selectionchange", onSelectionChange);

  if (REQUIRE_ARMING) {
    window.addEventListener("pointerdown", armOnce, true);
    window.addEventListener("keydown", armOnce, true);
  }
})();