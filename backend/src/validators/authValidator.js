const { z } = require('zod');

// Public registration schema: CITIZEN or COLLECTOR only!
const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters long.'),
  name: z.string().min(2, 'Name must be at least 2 characters long.'),
  phone: z.string().min(10, 'Contact phone number must be at least 10 digits.'),
  role: z.enum(['CITIZEN', 'COLLECTOR'], {
    errorMap: () => ({ message: "Only 'CITIZEN' or 'COLLECTOR' accounts can be self-registered." })
  }),
  businessName: z.string().optional(),
  serviceAreas: z.union([z.array(z.string()), z.string()]).optional()
});

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(1, 'Password is required.')
});

const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long.').optional(),
  phone: z.string().min(10, 'Phone must be at least 10 digits long.').optional(),
  businessName: z.string().optional(),
  serviceAreas: z.union([z.array(z.string()), z.string()]).optional()
}).refine(data => data.name !== undefined || data.phone !== undefined || data.businessName !== undefined || data.serviceAreas !== undefined, {
  message: 'At least one field must be provided for update.'
});

const provisionAdminSchema = z.object({
  name: z.string().min(2, 'Admin name must be at least 2 characters long.'),
  email: z.string().email('Please enter a valid email address.'),
  phone: z.string().min(10, 'Admin phone number must be at least 10 digits.'),
  password: z.string().min(8, 'Admin password must be at least 8 characters long.')
});

const demoLoginSchema = z.object({
  role: z.enum(['CITIZEN', 'COLLECTOR', 'ADMIN'])
});

module.exports = {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  provisionAdminSchema,
  demoLoginSchema
};
