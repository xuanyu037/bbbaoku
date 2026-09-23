/**
 * 包安心客服小幫手 —— 檢索式 FAQ 機器人（純前端，比對 FAQ_ENTRIES 關鍵字，不呼叫任何 AI／API）。
 * 只回覆問答庫裡已存在的答案，找不到對應問題時導向真人客服，不會自行生成內容。
 */
(function () {
  if (typeof FAQ_ENTRIES === "undefined") return;

  const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;

  const FALLBACK_ANSWER =
    "不好意思，我還沒學到這個問題的答案 🙏\n" +
    "可以換個說法問我看看，或直接聯繫真人客服協助您：\n" +
    "電話 02-2938-5808｜信箱 dashenghung@gmail.com（服務時間週一至週五 09:00–18:00）";

  function normalize(str) {
    return String(str)
      .toLowerCase()
      .replace(/[\s，。？！,.?!、\-()（）]/g, "");
  }

  function scoreEntry(entry, normalizedQuery) {
    let score = 0;
    const terms = [entry.question].concat(entry.keywords || []);
    terms.forEach((term) => {
      const nTerm = normalize(term);
      if (!nTerm) return;
      if (normalizedQuery.includes(nTerm)) {
        score += nTerm.length * 2;
      } else if (nTerm.includes(normalizedQuery) && normalizedQuery.length >= 2) {
        score += normalizedQuery.length;
      }
    });
    return score;
  }

  function findAnswer(query) {
    const normalizedQuery = normalize(query);
    if (!normalizedQuery) return null;
    let best = null;
    let bestScore = 0;
    FAQ_ENTRIES.forEach((entry) => {
      const score = scoreEntry(entry, normalizedQuery);
      if (score > bestScore) {
        bestScore = score;
        best = entry;
      }
    });
    return bestScore >= 2 ? best : null;
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function buildWidget() {
    const root = el("div", "faq-bot-root");

    const toggle = el("button", "faq-bot-toggle");
    toggle.setAttribute("aria-label", "打開客服小幫手");
    toggle.innerHTML = '<span class="faq-bot-toggle-icon">💬</span>';

    const panel = el("div", "faq-bot-panel");
    panel.hidden = true;

    const header = el("div", "faq-bot-header");
    header.appendChild(el("span", "faq-bot-title", "包安心客服小幫手"));
    const closeBtn = el("button", "faq-bot-close");
    closeBtn.setAttribute("aria-label", "關閉");
    closeBtn.textContent = "✕";
    header.appendChild(closeBtn);

    const log = el("div", "faq-bot-log");

    const quickSection = el("div", "faq-bot-quick-section");
    const quickToggle = el("button", "faq-bot-quick-toggle");
    quickToggle.type = "button";
    quickToggle.innerHTML =
      '<span>常見問題</span><span class="faq-bot-quick-chevron">▾</span>';
    const quickWrap = el("div", "faq-bot-quick");
    FAQ_ENTRIES.filter((e) => e.quick).forEach((entry) => {
      const chip = el("button", "faq-bot-chip", entry.question);
      chip.type = "button";
      chip.addEventListener("click", () => handleAsk(entry.question));
      quickWrap.appendChild(chip);
    });
    quickToggle.addEventListener("click", () => setQuickCollapsed(!quickSection.classList.contains("is-collapsed")));
    quickSection.appendChild(quickToggle);
    quickSection.appendChild(quickWrap);

    function setQuickCollapsed(collapsed) {
      quickSection.classList.toggle("is-collapsed", collapsed);
    }

    const form = el("form", "faq-bot-form");
    const input = el("input", "faq-bot-input");
    input.type = "text";
    input.placeholder = "輸入您的問題…";
    input.autocomplete = "off";
    const sendBtn = el("button", "faq-bot-send", "送出");
    sendBtn.type = "submit";
    form.appendChild(input);
    form.appendChild(sendBtn);

    panel.appendChild(header);
    panel.appendChild(log);
    panel.appendChild(quickSection);
    panel.appendChild(form);

    root.appendChild(panel);
    root.appendChild(toggle);
    document.body.appendChild(root);

    function appendMessage(text, who) {
      const bubble = el("div", "faq-bot-msg faq-bot-msg-" + who);
      text.split("\n").forEach((line, i) => {
        if (i > 0) bubble.appendChild(document.createElement("br"));
        bubble.appendChild(document.createTextNode(line));
      });
      log.appendChild(bubble);
      log.scrollTop = log.scrollHeight;
    }

    function handleAsk(question) {
      appendMessage(question, "user");
      setQuickCollapsed(true);
      const match = findAnswer(question);
      window.setTimeout(() => {
        appendMessage(match ? match.answer : FALLBACK_ANSWER, "bot");
      }, 250);
    }

    function openPanel() {
      panel.hidden = false;
      toggle.classList.add("is-open");
      if (!log.dataset.greeted) {
        appendMessage(
          "您好，我是包安心客服小幫手 🙂\n可以直接輸入問題，或點下面常見問題快速查詢。",
          "bot"
        );
        log.dataset.greeted = "1";
      }
      // 手機上自動 focus 輸入框會叫出鍵盤，部分瀏覽器（尤其 iOS Safari）
      // 對 fixed 定位元素會在鍵盤彈出時跑位，導致關閉鈕點不到，所以觸控裝置不自動 focus。
      if (!isTouchDevice) input.focus();
    }

    function closePanel() {
      panel.hidden = true;
      toggle.classList.remove("is-open");
      input.blur();
    }

    toggle.addEventListener("click", (evt) => {
      evt.stopPropagation();
      if (panel.hidden) openPanel();
      else closePanel();
    });
    closeBtn.addEventListener("click", (evt) => {
      evt.stopPropagation();
      closePanel();
    });

    // 保底機制：不管關閉鈕有沒有點到，點面板以外的任何地方都能收起小幫手。
    document.addEventListener("click", (evt) => {
      if (!panel.hidden && !root.contains(evt.target)) closePanel();
    });

    form.addEventListener("submit", (evt) => {
      evt.preventDefault();
      const value = input.value.trim();
      if (!value) return;
      handleAsk(value);
      input.value = "";
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildWidget);
  } else {
    buildWidget();
  }
})();
