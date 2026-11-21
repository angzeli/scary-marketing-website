/* =============================================================================
   Familiar — memory
   -----------------------------------------------------------------------------
   What the page remembers between visits, kept in this browser's
   localStorage and nowhere else ("Forget me" in the footer clears it):

     familiar.visits   how many times the landing page has been opened
     familiar.last     the previous visit: { ms, depth, at }
                       (how long it lasted, how far down it got, when)
     familiar.seen     set by sections.js once the visitor reaches the end

   No message content, no cursor trails, nothing typed is ever stored.

   It also knows what time it is: between 3:00 and 3:59 a.m. local time the
   page starts already a little wrong.
   ========================================================================== */
(function () {
  'use strict';

  const F = window.Familiar;

  let previous = null;
  try {
    const p = JSON.parse(F.store.get('last'));
    if (p && typeof p.ms === 'number' && typeof p.depth === 'number') previous = p;
  } catch (e) { /* nothing remembered */ }

  const visits = (Number(F.store.get('visits')) || 0) + 1;
  F.store.set('visits', String(visits));

  F.memory = {
    visits,
    previous,
    witching: new Date().getHours() === 3,
  };

  // the witching hour: the room is already dim when you arrive
  if (F.memory.witching) F.floor = Math.max(F.floor, 0.3);

  // remember this visit (the latest snapshot becomes "last time" for the next one)
  let depth = 0;
  F.on('dread', (d) => {
    if (d > depth) depth = d;
  });
  const save = () => {
    if (F.forgetting) return; // "Forget me" is on its way out; don't write it all back
    F.store.set('last', JSON.stringify({ ms: Math.round(F.elapsed()), depth: Math.round(depth * 100) / 100, at: Date.now() }));
  };
  setInterval(save, 5000);
  addEventListener('pagehide', save);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) save();
  });
})();
