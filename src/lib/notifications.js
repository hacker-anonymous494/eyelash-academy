/**
 * notifications.js — Browser Notification API wrapper
 *
 * Fixes:
 * ─ requestNotificationPermission MUST be called on a user gesture
 *   (we export it so call pages can call it on button click)
 * ─ sendNotification checks permission before sending
 * ─ playCallSound() generates a gentle ring using Web Audio API (no file needed)
 * ─ vibrate() for mobile
 */

// ─── Request permission (call this on a user gesture) ─────────────────────────
export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  try {
    const result = await Notification.requestPermission();
    return result === 'granted';
  } catch {
    return false;
  }
}

// ─── Send a browser notification ─────────────────────────────────────────────
export function sendNotification(title, options = {}) {
  if (!('Notification' in window)) return null;
  if (Notification.permission !== 'granted') return null;

  const n = new Notification(title, {
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    requireInteraction: true, // stays until user dismisses
    ...options,
  });

  // Auto-close after 30s if not required to interact
  if (!options.requireInteraction) {
    setTimeout(() => n.close(), 30000);
  }

  return n;
}

// ─── Play a call ring using Web Audio API (no sound file required) ────────────
let audioCtx = null;

export function playCallSound() {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = audioCtx;

    // Simple ring tone: two sine waves, pulsing
    const ringPattern = [
      { freq: 440, duration: 0.4, delay: 0 },
      { freq: 480, duration: 0.4, delay: 0.05 },
      { freq: 440, duration: 0.4, delay: 1.0 },
      { freq: 480, duration: 0.4, delay: 1.05 },
    ];

    ringPattern.forEach(({ freq, duration, delay }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.value = freq;

      const start = ctx.currentTime + delay;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.3, start + 0.05);
      gain.gain.linearRampToValueAtTime(0, start + duration);

      osc.start(start);
      osc.stop(start + duration + 0.05);
    });
  } catch (e) {
    console.warn('[notifications] Web Audio not available:', e.message);
  }
}

// ─── Vibrate (mobile) ─────────────────────────────────────────────────────────
export function vibrateCall() {
  if ('vibrate' in navigator) {
    navigator.vibrate([300, 100, 300, 100, 300]);
  }
}

// ─── Full call notification (notification + sound + vibrate) ─────────────────
export function notifyIncomingCall(sessionId) {
  playCallSound();
  vibrateCall();
  const n = sendNotification('📞 Your call is starting!', {
    body: 'Your instructor is waiting. Click to join.',
    tag: `call-${sessionId}`,
    requireInteraction: true,
    data: { sessionId },
  });
  if (n) {
    n.onclick = () => {
      window.focus();
      window.location.href = `/call/${sessionId}`;
      n.close();
    };
  }
  return n;
}