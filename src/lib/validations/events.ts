import { z } from 'zod';

// Shipment event validation schema
export const shipmentEventSchema = z.object({
  status: z.string().min(1, 'Status is required'),
  location: z.string().min(2, 'Location must be at least 2 characters').max(200, 'Location cannot exceed 200 characters'),
  description: z.string().optional().refine(
    (val) => !val || val.length <= 500,
    { message: 'Description cannot exceed 500 characters' }
  ),
  completed: z.boolean().optional().default(false),
  latitude: z.string().optional().refine(
    (val) => !val || (parseFloat(val) >= -90 && parseFloat(val) <= 90),
    { message: 'Latitude must be between -90 and 90' }
  ),
  longitude: z.string().optional().refine(
    (val) => !val || (parseFloat(val) >= -180 && parseFloat(val) <= 180),
    { message: 'Longitude must be between -180 and 180' }
  ),
});

export type ShipmentEventFormData = z.infer<typeof shipmentEventSchema>;

