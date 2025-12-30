import { z } from 'zod';

export const createOrganizationSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	description: z.string().min(1, 'Description is required'),
	mission: z.string().min(1, 'Mission is required'),
	focusAreas: z.array(z.string()).min(1, 'At least one focus area is required'),
	address1: z.string().min(1, 'Address is required'),
	address2: z.string().optional(),
	city: z.string().min(1, 'City is required'),
	state: z.string().min(1, 'State is required'),
	zipCode: z.string().min(1, 'ZIP code is required'),
});
