// Default wording for system notification templates — used only to power
// "Reset to Default" in the admin UI. Matched by event + statusKey, since
// that's the fixed identity of a system template (mirrors the frontend's
// old systemNotificationTemplates.js seed).
const SYSTEM_NOTIFICATION_DEFAULTS = [
  { event: 'order.status_changed', statusKey: 'confirmed', title: '🎉 Order Confirmed!', message: 'Your order #{orderNumber} has been confirmed' },
  { event: 'order.status_changed', statusKey: 'shipped', title: '📦 Order Shipped!', message: 'Your order #{orderNumber} is on its way' },
  { event: 'order.status_changed', statusKey: 'out-for-delivery', title: '🚚 Out for Delivery!', message: 'Your order #{orderNumber} will arrive soon' },
  { event: 'order.status_changed', statusKey: 'delivered', title: '✅ Order Delivered!', message: 'Your order #{orderNumber} has been delivered' },
  { event: 'order.status_changed', statusKey: null, title: 'Order Update', message: 'Your order #{orderNumber} status: {status}' },
  { event: 'order.tracking_added', statusKey: null, title: '📦 Tracking Available!', message: 'Track your order #{orderNumber}' },
];

export default SYSTEM_NOTIFICATION_DEFAULTS;