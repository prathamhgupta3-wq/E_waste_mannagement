const { z } = require('zod');

const updateCollectorStatusSchema = z.object({
  status: z.enum([
    'ACCEPTED',
    'COLLECTED',
    'DELIVERED_TO_RECYCLER',
    'COMPLETED',
    'FAILED'
  ]),
  reason: z.string().optional()
});

module.exports = {
  updateCollectorStatusSchema
};
