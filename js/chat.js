/* =============================================================================
   Familiar — "Fam", the support chat
   -----------------------------------------------------------------------------
   Starts as the standard friendly growth-hack chat bubble. It keeps messaging
   as you scroll, and its replies change with dread.
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
      typingEl.setAttribute('aria-label', 'Fam is typing');
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

  /* Messages are queued so they never talk over each other. */
  function say(text, typing = 1100) {
    queue = queue.then(async () => {
      showTyping(true);
      await F.sleep(typing);
      showTyping(false);
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
    const n = M.chatMessages.length;
    if (d < 0.2) {
      return [
        'Great question! 😊 One of our specialists will get back to you shortly.',
        'Thanks for reaching out! Familiar can definitely help with that — and so much more.',
        'Love that. While you wait, have you seen our Pro plan?',
      ][(n - 1) % 3];
    }
    if (d < 0.5) {
      return [
        'Mm-hm.',
        'I know.',
        `“${msg}”. Interesting. I'll remember that.`,
        "You don't need to type, you know. I already know what you're going to say.",
      ][(n - 1) % 4];
    }
    if (d < 0.8) {
      return [
        msg.split('').reverse().join(''),
        'you sound tired.',
        'stay a little longer.',
        "you're typing faster now.",
      ][(n - 1) % 4];
    }
    return [
      msg.toLowerCase(),
      `${msg.toLowerCase()} ${msg.toLowerCase()} ${msg.toLowerCase()}`,
      "you don't need to talk anymore. i'll talk for you.",
      'shh.',
    ][(n - 1) % 4];
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
    { d: 0.17, text: "Still there? No rush. I'm not going anywhere." },
    { d: 0.37, text: 'I like the way you scroll. Slowly. Carefully.' },
    { d: 0.56, text: 'you can ask me anything, you know. i already know the answer.' },
    { d: 0.665, text: "it's getting dark, isn't it." },
    { d: 0.77, text: 'i can see you.' },
    { d: 0.9, text: "why won't you talk to me", typing: 5200 },
  ];

  let greeted = false;
  setTimeout(() => {
    if (!greeted) {
      greeted = true;
      say("Hi there 👋 I'm Fam. Got any questions about Familiar? I'm happy to help!", 900);
    }
  }, 6500);

  let lastStatus = '';
  F.on('dread', (d) => {
    for (const s of script) {
      if (!s.sent && d >= s.d) {
        s.sent = true;
        greeted = true; // skip the hello if they're already this far
        say(s.text, s.typing || 1500);
        break;
      }
    }
    const st = d < 0.5 ? 'Typically replies instantly' : d < 0.75 ? 'Always online' : 'Here';
    if (st !== lastStatus) {
      lastStatus = st;
      status.textContent = st;
    }
  });

  F.on('welcome-back', () => say('welcome back.', 2600));
})();
