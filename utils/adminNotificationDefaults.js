const SYSTEM_NOTIFICATION_DEFAULTS = [
  {
    event: 'order.status_changed',
    statusKey: 'confirmed',
    label: 'Order Confirmed',
    description: "Sent when an order's status changes to Confirmed.",
    title: '🎉 Order Confirmed!',
    message: 'Your order #{orderNumber} has been confirmed',
  },
  {
    event: 'order.status_changed',
    statusKey: 'shipped',
    label: 'Order Shipped',
    description: "Sent when an order's status changes to Shipped.",
    title: '📦 Order Shipped!',
    message: 'Your order #{orderNumber} is on its way',
  },
  {
    event: 'order.status_changed',
    statusKey: 'out-for-delivery',
    label: 'Out for Delivery',
    description: "Sent when an order's status changes to Out for Delivery.",
    title: '🚚 Out for Delivery!',
    message: 'Your order #{orderNumber} will arrive soon',
  },
  {
    event: 'order.status_changed',
    statusKey: 'delivered',
    label: 'Order Delivered',
    description: "Sent when an order's status changes to Delivered.",
    title: '✅ Order Delivered!',
    message: 'Your order #{orderNumber} has been delivered',
  },
  {
    event: 'order.status_changed',
    statusKey: null,
    label: 'Other Status Update',
    description: 'Fallback used for any order status not covered above (e.g. Processing, Cancelled).',
    title: 'Order Update',
    message: 'Your order #{orderNumber} status: {status}',
  },
  {
    event: 'order.tracking_added',
    statusKey: null,
    label: 'Tracking Available',
    description: 'Sent when a tracking number/link is added to an order.',
    title: '📦 Tracking Available!',
    message: 'Track your order #{orderNumber}',
  },
];

export default SYSTEM_NOTIFICATION_DEFAULTS;