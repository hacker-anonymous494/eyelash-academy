export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return;
  }
  if (Notification.permission === 'default') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return Notification.permission === 'granted';
}

export function sendNotification(title, options = {}) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  new Notification(title, {
    icon: '/vite.svg', // or your logo
    ...options,
  });
}