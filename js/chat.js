/* =============================================================================
   Familiar — "Fam", the support chat
   -----------------------------------------------------------------------------
   Starts as the standard friendly growth-hack chat bubble. It keeps messaging
   as you scroll, and its replies change with dread. Messages already in the
   log stay in the language they were sent in, like a real chat; everything
   after a language switch arrives in the new one.
   ========================================================================== */
(function () {
  'use strict';

  const F = window.Familiar;
  const $ = (id) => document.getElementById(id);
  const root = $('chat');
  if (!root) return;

  const toggle = $('chat-toggle');
  const panel = $('chat-panel');
  const log = $('chat-log');
  const form = $('chat-form');
  const input = $('chat-input');
  const badge = $('chat-badge');
  const preview = $('chat-preview');
  const previewBody = $('chat-preview-body');
  const status = $('chat-status');
  const M = F.metrics;

  let open = false;
  let unread = 0;
  let previewTimer = 0;
  let typingEl = null;
  let queue = Promise.resolve();

  function scrollLog() {
    log.scrollTop = log.scrollHeight;
  }

  function add(text, who) {
    const li = document.createElement('li');
    li.className = `chat__msg chat__msg--${who}`;
    li.textContent = text;
    log.appendChild(li);
    scrollLog();
    return li;
  }

  function showTyping(v) {
    if (v && !typingEl) {
      typingEl = document.createElement('li');
      typingEl.className = 'chat__msg chat__msg--bot chat__typing';
      typingEl.setAttribute('aria-label', F.t('chat.typing'));
      typingEl.innerHTML = '<span></span><span></span><span></span>';
      log.appendChild(typingEl);
      scrollLog();
    } else if (!v && typingEl) {
      typingEl.remove();
      typingEl = null;
    }
  }

  function renderBadge() {
    badge.hidden = unread === 0;
    badge.textContent = unread > 9 ? '9+' : String(unread);
  }

  function showPreview(text) {
    if (open) return;
    previewBody.textContent = text;
    preview.hidden = false;
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => (preview.hidden = true), 7000);
  }

  /* Messages are queued so they never talk over each other. `message` may be
     a function, so text is resolved when it is sent (in the language of that
     moment), not when it was queued. */
  function say(message, typing = 1100) {
    queue = queue.then(async () => {
      showTyping(true);
      await F.sleep(typing);
      showTyping(false);
      const text = typeof message === 'function' ? message() : message;
      add(text, 'bot');
      if (!open) {
        unread++;
        renderBadge();
        showPreview(text);
      }
    });
    return queue;
  }
  F.chatSay = say;

  function setOpen(v) {
    open = v;
    panel.hidden = !v;
    toggle.setAttribute('aria-expanded', String(v));
    if (v) {
      M.chatOpened = true;
      unread = 0;
      renderBadge();
      preview.hidden = true;
      scrollLog();
      setTimeout(() => input.focus({ preventScroll: true }), 50);
    }
  }

  toggle.addEventListener('click', () => setOpen(!open));
  $('chat-close').addEventListener('click', () => {
    setOpen(false);
    toggle.focus();
  });
  previewBody.addEventListener('click', () => setOpen(true));
  preview.querySelector('.chat__preview-close').addEventListener('click', () => (preview.hidden = true));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && open) {
      setOpen(false);
      toggle.focus();
    }
  });

  /* ------------------------------------------------------------- replies */

  function reply(msg) {
    const d = F.dread;
    const tier = d < 0.2 ? 0 : d < 0.5 ? 1 : d < 0.8 ? 2 : 3;
    const pool = F.t(`chat.reply.${tier}`);
    const pick = pool[(M.chatMessages.length - 1) % pool.length];
    return F.fill(pick, {
      msg,
      rev: Array.from(msg).reverse().join(''),
      lower: msg.toLowerCase(),
    });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const msg = input.value.trim();
    if (!msg) return;
    input.value = '';
    M.chatMessages.push(msg);
    add(msg, 'me');
    const d = F.dread;
    say(reply(msg), d < 0.5 ? 1400 : d < 0.8 ? 2400 : 3800);
  });

  /* ------------------------------------------- unprompted, as you scroll */

  const script = [
    { d: 0.17, key: 'chat.script.0' },
    { d: 0.37, key: 'chat.script.1' },
    { d: 0.56, key: 'chat.script.2' },
    { d: 0.665, key: 'chat.script.3' },
    { d: 0.77, key: 'chat.script.4' },
    { d: 0.9, key: 'chat.script.5', typing: 5200 },
  ];

  // Visitors who start part-way into the story (3 a.m., or a "welcome back")
  // skip the messages that belong to the part they never saw.
  script.forEach((s) => {
    if (s.d <= F.floor) s.sent = true;
  });

  /* The hello. A personal one (returning visitor, 3 a.m., the policy page)
     comes sooner and is always said; the generic one is skipped if the
     visitor has already scrolled far enough for Fam to have moved on. */
  const mem = F.memory;
  const greetingKey =
    document.documentElement.dataset.page === 'policy' ? 'chat.greeting.policy'
      : !mem ? 'chat.greeting'
        : mem.witching ? 'chat.greeting.witching'
          : mem.visits >= 4 ? 'chat.greeting.always'
            : mem.visits >= 2 ? 'chat.greeting.again'
              : 'chat.greeting';
  const personal = greetingKey !== 'chat.greeting';
  let greeted = false;
  setTimeout(() => {
    if (!greeted || personal) {
      greeted = true;
      say(() => F.t(greetingKey), 900);
    }
  }, personal ? 2500 : 6500);

  let lastStatus = '';
  function renderStatus() {
    const d = F.dread;
    const text = F.t(d < 0.5 ? 'chat.status.0' : d < 0.75 ? 'chat.status.1' : 'chat.status.2');
    if (text !== lastStatus) {
      lastStatus = text;
      status.textContent = text;
    }
  }

  F.on('dread', (d) => {
    for (const s of script) {
      if (!s.sent && d >= s.d) {
        s.sent = true;
        greeted = true; // skip the hello if they're already this far
        say(() => F.t(s.key), s.typing || 1500);
        break;
      }
    }
    renderStatus();
  });
  F.on('lang', () => {
    renderStatus();
    if (typingEl) typingEl.setAttribute('aria-label', F.t('chat.typing'));
  });
  renderStatus();

  F.on('welcome-back', () => say(() => F.t('chat.welcomeBack'), 2600));
})();
