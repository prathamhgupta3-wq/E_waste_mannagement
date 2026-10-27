const { z } = require('zod');

// Valid status transitions state machine
const VALID_STATUS_TRANSITIONS = {
  PENDING: ['ASSIGNED', 'CANCELLED'],
  ASSIGNED: ['ACCEPTED', 'CANCELLED', 'FAILED'],
  ACCEPTED: ['COLLECTED', 'CANCELLED', 'FAILED'],
  COLLECTED: ['DELIVERED_TO_RECYCLER', 'FAILED'],
  DELIVERED_TO_RECYCLER: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
  FAILED: []
};

function isValidStatusTransition(currentStatus, newStatus) {
  if (!VALID_STATUS_TRANSITIONS[currentStatus]) return false;
  return VALID_STATUS_TRANSITIONS[currentStatus].includes(newStatus);
}

const createPickupSchema = z.object({
  pickupAddress: z.string().min(5, 'Pickup address must be at least 5 characters long.'),
  locality: z.string().min(2, 'Locality is required.'),
  pincode: z.string().regex(/^\d{6}$/, 'Pincode must be exactly 6 digits.'),
  preferredDate: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: 'Valid preferred date is required.'
  }),
  preferredTimeSlot: z.string().min(3, 'Preferred time slot is required.'),
  items: z.array(
    z.object({
      wasteCategoryId: z.string().min(1, 'Waste category ID is required.'),
      quantity: z.number().int().min(1, 'Quantity must be at least 1.').default(1),
      estimatedWeight: z.number().positive('Estimated weight must be a positive number.').default(0.5),
      description: z.string().optional()
    })
  ).min(1, 'At least one e-waste item must be specified in the pickup manifest.')
});

module.exports = {
  createPickupSchema,
  VALID_STATUS_TRANSITIONS,
  isValidStatusTransition
};
