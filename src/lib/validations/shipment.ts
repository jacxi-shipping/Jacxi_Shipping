import { z } from 'zod';

// Shipment validation schema - Simplified per container-first architecture
// Shipments only contain: car info, status, container ID, owner, and internal notes
export const shipmentSchema = z.object({
  // Owner/Customer
  userId: z.string().min(1, 'User assignment is required'),
  
  // Car Information
  vehicleType: z.string().min(1, 'Vehicle type is required'),
  vehicleMake: z.string().optional(),
  vehicleModel: z.string().optional(),
  vehicleYear: z.string().optional().refine(
    (val) => !val || (parseInt(val) >= 1900 && parseInt(val) <= new Date().getFullYear() + 1),
    { message: 'Please enter a valid year between 1900 and ' + (new Date().getFullYear() + 1) }
  ),
  vehicleVIN: z.string().optional().refine(
    (val) => !val || val.length >= 17,
    { message: 'VIN must be at least 17 characters' }
  ),
  vehicleColor: z.string().optional(),
  lotNumber: z.string().optional(),
  auctionName: z.string().optional(),
  weight: z.string().optional().refine(
    (val) => !val || (parseFloat(val) > 0 && parseFloat(val) <= 50000),
    { message: 'Weight must be between 0 and 50,000 lbs' }
  ),
  dimensions: z.string().optional().refine(
    (val) => !val || val.length <= 100,
    { message: 'Dimensions cannot exceed 100 characters' }
  ),
  insuranceValue: z.string().optional().refine(
    (val) => !val || (parseFloat(val) > 0),
    { message: 'Insurance value must be greater than 0' }
  ),
  price: z.string().optional().refine(
    (val) => !val || (parseFloat(val) > 0),
    { message: 'Price must be greater than 0' }
  ),
  vehiclePhotos: z.array(z.string()).default([]),
  hasKey: z.boolean().optional(),
  hasTitle: z.boolean().optional(),
  titleStatus: z.enum(['PENDING', 'DELIVERED']).optional(),
  paymentMode: z.enum(['CASH', 'DUE']).optional(),
  
  // Status (ON_HAND or IN_TRANSIT)
  status: z.enum(['ON_HAND', 'IN_TRANSIT']).default('ON_HAND'),
  
  // Container ID (nullable, required when status is IN_TRANSIT)
  containerId: z.string().optional(),
  
  // Internal Notes
  internalNotes: z.string().optional().refine(
    (val) => !val || val.length <= 2000,
    { message: 'Internal notes cannot exceed 2000 characters' }
  ),
}).refine((data) => {
  // If status is IN_TRANSIT, container ID is required
  if (data.status === 'IN_TRANSIT' && !data.containerId) {
    return false;
  }
  return true;
}, {
  message: 'Container selection is required when status is IN_TRANSIT',
  path: ['containerId'],
});

export const shipmentUpdateSchema = z.object({
  // Car Information
  vehicleType: z.string().min(1, 'Vehicle type is required').optional(),
  vehicleMake: z.string().optional(),
  vehicleModel: z.string().optional(),
  vehicleYear: z.string().optional().refine(
    (val) => !val || (parseInt(val) >= 1900 && parseInt(val) <= new Date().getFullYear() + 1),
    { message: 'Please enter a valid year between 1900 and ' + (new Date().getFullYear() + 1) }
  ),
  vehicleVIN: z.string().optional().refine(
    (val) => !val || val.length >= 17,
    { message: 'VIN must be at least 17 characters' }
  ),
  vehicleColor: z.string().optional(),
  lotNumber: z.string().optional(),
  auctionName: z.string().optional(),
  weight: z.string().optional().refine(
    (val) => !val || (parseFloat(val) > 0 && parseFloat(val) <= 50000),
    { message: 'Weight must be between 0 and 50,000 lbs' }
  ),
  dimensions: z.string().optional().refine(
    (val) => !val || val.length <= 100,
    { message: 'Dimensions cannot exceed 100 characters' }
  ),
  insuranceValue: z.string().optional().refine(
    (val) => !val || (parseFloat(val) > 0),
    { message: 'Insurance value must be greater than 0' }
  ),
  price: z.string().optional().refine(
    (val) => !val || (parseFloat(val) > 0),
    { message: 'Price must be greater than 0' }
  ),
  hasKey: z.boolean().optional(),
  hasTitle: z.boolean().optional(),
  titleStatus: z.enum(['PENDING', 'DELIVERED']).optional(),
  paymentMode: z.enum(['CASH', 'DUE']).optional(),
  
  // Status and Container
  status: z.enum(['ON_HAND', 'IN_TRANSIT']).optional(),
  containerId: z.string().optional(),
  
  // Internal Notes
  internalNotes: z.string().optional().refine(
    (val) => !val || val.length <= 2000,
    { message: 'Internal notes cannot exceed 2000 characters' }
  ),
});

export type ShipmentFormData = z.input<typeof shipmentSchema>;
export type ShipmentUpdateFormData = z.infer<typeof shipmentUpdateSchema>;

