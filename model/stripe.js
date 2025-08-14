const config = require('config');
const stripe = require('stripe')(process.env.STRIPE_SECRET_API_KEY);

exports.coupon = {};
exports.coupon.createOnce = async function({ percent_off, amount_off, currency = 'eur', redeem_by, name, metadata } = {}){
  const payload = { duration: 'once' };
  if (typeof amount_off === 'number') {
    payload.amount_off = amount_off;
    payload.currency = currency;
  } else if (typeof percent_off === 'number') {
    payload.percent_off = percent_off;
  }
  if (redeem_by) payload.redeem_by = redeem_by;
  if (name) payload.name = name;
  if (metadata) payload.metadata = metadata;
  return await stripe.coupons.create(payload);
}

exports.promotionCode = {};
exports.promotionCode.create = async function({ coupon, code, expires_at, max_redemptions, metadata } = {}){
  return await stripe.promotionCodes.create({
    coupon,
    ...code && { code },
    ...expires_at && { expires_at },
    ...max_redemptions && { max_redemptions },
    active: true,
    ...metadata && { metadata }
  });
}

