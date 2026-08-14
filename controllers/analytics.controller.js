import Order from '../models/Order.js';
import User from '../models/User.js';
import ProductFamily from '../models/ProductFamily.js';
import Category from '../models/Category.js';
import asyncHandler from '../utils/asyncHandler.js';

const RANGE_DAYS = { '7d': 7, '30d': 30, '90d': 90, all: null };

const sum = (arr, fn) => arr.reduce((s, x) => s + (fn(x) || 0), 0);

const isSameLocalDay = (date, reference) =>
  date.getFullYear() === reference.getFullYear() &&
  date.getMonth() === reference.getMonth() &&
  date.getDate() === reference.getDate();

const buildDailyBuckets = (orders, days) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const buckets = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const day = new Date(today);
    day.setDate(day.getDate() - i);
    const revenue = sum(
      orders.filter((o) => o.status !== 'cancelled' && isSameLocalDay(new Date(o.placedAt), day)),
      (o) => o.total,
    );
    buckets.push({ label: day.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), revenue });
  }
  return buckets;
};

const buildWeeklyBuckets = (orders, weeks) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const buckets = [];
  for (let i = weeks - 1; i >= 0; i -= 1) {
    const end = new Date(today);
    end.setDate(end.getDate() - i * 7);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    const revenue = sum(
      orders.filter((o) => {
        if (o.status === 'cancelled') return false;
        const d = new Date(o.placedAt);
        return d >= start && d <= end;
      }),
      (o) => o.total,
    );
    buckets.push({ label: start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), revenue });
  }
  return buckets;
};

const buildMonthlyBuckets = (orders, months) => {
  const now = new Date();
  const buckets = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const bucketDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const revenue = sum(
      orders.filter((o) => {
        if (o.status === 'cancelled') return false;
        const d = new Date(o.placedAt);
        return d.getFullYear() === bucketDate.getFullYear() && d.getMonth() === bucketDate.getMonth();
      }),
      (o) => o.total,
    );
    buckets.push({ label: bucketDate.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }), revenue });
  }
  return buckets;
};

// GET /api/admin/analytics?range=7d|30d|90d|all
// Direct server-side port of the aggregation Analytics.jsx used to do by
// pulling every order/user/product down and reducing them in the browser.
// Still an in-memory reduce (not a Mongo aggregation pipeline) to keep the
// exact same math as the original — fine at this data volume, but the
// first thing to revisit if the order collection gets large.
export const getAnalytics = asyncHandler(async (req, res) => {
  const rangeId = RANGE_DAYS[req.query.range] !== undefined ? req.query.range : '30d';
  const days = RANGE_DAYS[rangeId];

  const [orders, categories, families, totalFamilies, familiesWithCost] = await Promise.all([
    Order.find().lean(),
    Category.find().lean(),
    ProductFamily.find({}, 'costPrice').lean(),
    ProductFamily.countDocuments(),
    ProductFamily.countDocuments({ costPrice: { $ne: null } }),
  ]);

  const familyCostMap = new Map(families.map((f) => [String(f._id), f.costPrice]));
  const categoryNameBySlug = new Map(categories.map((c) => [c.slug, c.name]));

  const now = new Date();
  const cutoff = days ? new Date(now.getTime() - days * 86400000) : null;

  const periodOrders = orders.filter((o) => !cutoff || new Date(o.placedAt) >= cutoff);
  const periodValid = periodOrders.filter((o) => o.status !== 'cancelled');

  let prevValid = [];
  if (days) {
    const prevStart = new Date(cutoff.getTime() - days * 86400000);
    prevValid = orders.filter((o) => {
      if (o.status === 'cancelled') return false;
      const d = new Date(o.placedAt);
      return d >= prevStart && d < cutoff;
    });
  }

  const revenue = sum(periodValid, (o) => o.total);
  const prevRevenue = sum(prevValid, (o) => o.total);
  const revenueGrowth = days && prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : null;

  const ordersCount = periodOrders.length;
  const prevOrdersCount = prevValid.length;
  const ordersGrowth = days && prevOrdersCount > 0 ? ((ordersCount - prevOrdersCount) / prevOrdersCount) * 100 : null;

  const avgOrderValue = periodValid.length ? revenue / periodValid.length : 0;

  const cancelledCount = periodOrders.filter((o) => o.status === 'cancelled').length;
  const cancellationRate = ordersCount ? (cancelledCount / ordersCount) * 100 : 0;

  const newCustomers = await User.countDocuments(cutoff ? { createdAt: { $gte: cutoff } } : {});

  // ---------- Product-level rollups ----------
  const productMap = new Map();
  const categoryRevenue = new Map();
  let itemRevenueWithCost = 0;
  let itemCostTotal = 0;
  let itemRevenueTotal = 0;

  periodValid.forEach((order) => {
    (order.items || []).forEach((item) => {
      const productId = String(item.productFamily);
      const lineRevenue = (item.price || 0) * (item.quantity || 0);
      itemRevenueTotal += lineRevenue;

      const existing = productMap.get(productId) || {
        id: productId,
        name: item.name,
        category: item.category,
        image: item.image,
        units: 0,
        revenue: 0,
      };
      existing.units += item.quantity || 0;
      existing.revenue += lineRevenue;
      productMap.set(productId, existing);

      categoryRevenue.set(item.category, (categoryRevenue.get(item.category) || 0) + lineRevenue);

      const costPrice = familyCostMap.get(productId);
      if (costPrice != null) {
        itemRevenueWithCost += lineRevenue;
        itemCostTotal += costPrice * (item.quantity || 0);
      }
    });
  });

  const topProducts = [...productMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 6);

  const topCategories = [...categoryRevenue.entries()]
    .map(([slug, catRevenue]) => ({ slug, name: categoryNameBySlug.get(slug) || slug, revenue: catRevenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6);

  const grossProfit = itemRevenueWithCost - itemCostTotal;
  const marginPercent = itemRevenueWithCost ? (grossProfit / itemRevenueWithCost) * 100 : null;
  const costCoverage = itemRevenueTotal ? (itemRevenueWithCost / itemRevenueTotal) * 100 : 0;

  // ---------- Discount impact ----------
  const ordersWithDiscount = periodValid.filter((o) => o.discountAmount > 0);
  const totalDiscount = sum(ordersWithDiscount, (o) => o.discountAmount);
  const grossSales = revenue + totalDiscount;
  const discountOfSales = grossSales ? (totalDiscount / grossSales) * 100 : 0;

  const couponTally = new Map();
  ordersWithDiscount.forEach((o) => {
    if (!o.couponCode) return;
    couponTally.set(o.couponCode, (couponTally.get(o.couponCode) || 0) + 1);
  });
  const topCoupon = [...couponTally.entries()].sort((a, b) => b[1] - a[1])[0] || null;

  // ---------- Payment methods ----------
  const paymentTally = new Map();
  periodValid.forEach((o) => {
    const key = o.paymentMethod || 'Other';
    const existing = paymentTally.get(key) || { count: 0, revenue: 0 };
    existing.count += 1;
    existing.revenue += o.total || 0;
    paymentTally.set(key, existing);
  });
  const paymentBreakdown = [...paymentTally.entries()]
    .map(([method, stats]) => ({ method, ...stats }))
    .sort((a, b) => b.revenue - a.revenue);

  // ---------- Repeat rate (all-time, not period-scoped) ----------
  const ordersPerCustomer = new Map();
  orders
    .filter((o) => o.status !== 'cancelled' && o.user)
    .forEach((o) => {
      const key = String(o.user);
      ordersPerCustomer.set(key, (ordersPerCustomer.get(key) || 0) + 1);
    });
  const customersWithOrders = ordersPerCustomer.size;
  const repeatCustomers = [...ordersPerCustomer.values()].filter((count) => count > 1).length;
  const repeatRate = customersWithOrders ? (repeatCustomers / customersWithOrders) * 100 : 0;

  // ---------- Revenue trend chart ----------
  let trend;
  if (rangeId === '7d') trend = buildDailyBuckets(orders, 7);
  else if (rangeId === '30d') trend = buildDailyBuckets(orders, 30);
  else if (rangeId === '90d') trend = buildWeeklyBuckets(orders, 13);
  else trend = buildMonthlyBuckets(orders, 12);

  res.status(200).json({
    success: true,
    data: {
      revenue,
      revenueGrowth,
      ordersCount,
      ordersGrowth,
      avgOrderValue,
      cancellationRate,
      newCustomers,
      grossProfit,
      marginPercent,
      costCoverage,
      topProducts,
      topCategories,
      totalDiscount,
      discountOfSales,
      ordersWithDiscountCount: ordersWithDiscount.length,
      topCoupon,
      paymentBreakdown,
      repeatRate,
      customersWithOrders,
      trend,
      totalFamilies,
      familiesWithCost,
    },
  });
});