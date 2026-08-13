import { body, param, query } from 'express-validator';
import { ORDER_STATUSES } from '../utils/constants.js';

// Covers order.routes.js (storefront — place order, view own orders) and
// adminOrder.routes.js (status updates, notes). Mirrors Order.js's schema;
// items/address are validated on the way in even though they're stored as
// snapshots — the snapshot itself must still be well-formed.

export const placeOrderValidator = [
  body('items').isArray({ min: 1 }).withMessage('An order needs at least one item.'),
  body('items.*.productFamily').isMongoId().withMessage('Invalid product reference.'),
  body('items.*.variantId').isMongoId().withMessage('Invalid variant reference.'),
  body('items.*.size').trim().notEmpty().withMessage('Each item needs a size.'),
  body('items.*.quantity').isInt({ min: 1, max: 10 }).withMessage('Quantity must be between 1 and 10.'),

  body('addressId').optional().isMongoId(),
  body('address').optional().isObject(),
  body('address.name').if(body('addressId').not().exists()).trim().notEmpty(),
  body('address.phone').if(body('addressId').not().exists()).trim().isMobilePhone('en-IN'),
  body('address.line1').if(body('addressId').not().exists()).trim().notEmpty(),
  body('address.city').if(body('addressId').not().exists()).trim().notEmpty(),
  body('address.state').if(body('addressId').not().exists()).trim().notEmpty(),
  body('address.pincode').if(body('addressId').not().exists()).trim().matches(/^\d{6}$/),

  body('paymentMethod').trim().notEmpty().withMessage('Choose a payment method.'),
  body('couponCode').optional({ nullable: true }).trim().isLength({ max: 30 }),
];

export const orderIdParamValidator = [param('orderId').isMongoId().withMessage('Invalid order id.')];

export const updateOrderStatusValidator = [
  param('orderId').isMongoId().withMessage('Invalid order id.'),
  body('status').isIn(ORDER_STATUSES).withMessage('Invalid order status.'),
];

export const updateOrderNotesValidator = [
  param('orderId').isMongoId().withMessage('Invalid order id.'),
  body('adminNotes').trim().isLength({ max: 1000 }),
];

export const listOrdersQueryValidator = [
  query('status').optional().isIn(ORDER_STATUSES),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
];