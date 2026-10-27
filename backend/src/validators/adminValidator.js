const { z } = require('zod');

const assignCollectorSchema = z.object({
  collectorId: z.string().min(1, 'Collector ID is required.')
});

const verifyCollectorSchema = z.object({
  verificationStatus: z.enum(['VERIFIED', 'REJECTED'])
});

const createCollectionCentreSchema = z.object({
  name: z.string().min(3, 'Centre name must be at least 3 characters.'),
  address: z.string().min(5, 'Address is required.'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  contactDetails: z.string().min(5, 'Contact details are required.'),
  acceptedWasteCategories: z.array(z.string()).min(1, 'At least one accepted waste category is required.')
});

module.exports = {
  assignCollectorSchema,
  verifyCollectorSchema,
  createCollectionCentreSchema
};
