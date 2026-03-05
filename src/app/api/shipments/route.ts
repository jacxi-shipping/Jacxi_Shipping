import { NextRequest, NextResponse } from 'next/server';
import { Prisma, TitleStatus, PaymentStatus } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { syncShipmentShippingFareEntries } from '@/lib/shipment-shipping-fare';
import { syncShipmentDamageEntries } from '@/lib/shipment-damage';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status'); // ON_HAND or IN_TRANSIT
    const containerId = searchParams.get('containerId');
    const search = searchParams.get('search');
    const includeFinancial = searchParams.get('includeFinancial') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Build where clause based on user role
    const where: Prisma.ShipmentWhereInput = {};
    const isAdmin = session.user?.role === 'admin';
    
    // Regular users can only see their own shipments
    if (session.user?.role !== 'admin') {
      where.userId = session.user?.id;
    }

    // Add status filter (ON_HAND or IN_TRANSIT)
    if (status && (status === 'ON_HAND' || status === 'IN_TRANSIT')) {
      where.status = status;
    }

    // Filter by container
    if (containerId) {
      where.containerId = containerId;
    }

    // Search by VIN, make, model
    if (search) {
      where.OR = [
        { vehicleVIN: { contains: search, mode: 'insensitive' } },
        { vehicleMake: { contains: search, mode: 'insensitive' } },
        { vehicleModel: { contains: search, mode: 'insensitive' } },
        { lotNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const baseSelect = {
      id: true,
      vehicleType: true,
      vehicleMake: true,
      vehicleModel: true,
      vehicleYear: true,
      vehicleVIN: true,
      vehicleColor: true,
      lotNumber: true,
      auctionName: true,
      status: true,
      createdAt: true,
      paymentStatus: true,
      price: true,
      ...(isAdmin ? { companyShippingFare: true } : {}),
      shippingCompanyId: true,
      containerId: true,
      internalNotes: true,
      shippingCompany: {
        select: {
          id: true,
          name: true,
        },
      },
      container: {
        select: {
          id: true,
          containerNumber: true,
          trackingNumber: true,
          vesselName: true,
          status: true,
          estimatedArrival: true,
          currentLocation: true,
          loadingPort: true,
          destinationPort: true,
          progress: true,
          shippingLine: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    };

    const [shipments, total] = await Promise.all([
      prisma.shipment.findMany({
        where,
        select: includeFinancial
          ? {
              ...baseSelect,
              ledgerEntries: {
                select: {
                  type: true,
                  amount: true,
                },
              },
            }
          : baseSelect,
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.shipment.count({ where }),
    ]);

    const normalizedShipments = includeFinancial
      ? (shipments as Array<any>).map((shipment) => {
          const totalDebit = shipment.ledgerEntries
            .filter((entry: { type: string }) => entry.type === 'DEBIT')
            .reduce((sum: number, entry: { amount: number }) => sum + entry.amount, 0);
          const totalCredit = shipment.ledgerEntries
            .filter((entry: { type: string }) => entry.type === 'CREDIT')
            .reduce((sum: number, entry: { amount: number }) => sum + entry.amount, 0);
          const amountDue = Math.max(0, totalDebit - totalCredit);

          return {
            ...shipment,
            amountDue,
            ledgerEntries: undefined,
          };
        })
      : shipments;

    return NextResponse.json({
      shipments: normalizedShipments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching shipments:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

type CreateShipmentPayload = {
  userId: string;
  shippingCompanyId: string;
  serviceType?: 'PURCHASE_AND_SHIPPING' | 'SHIPPING_ONLY';
  vehicleType: string;
  vehicleMake?: string | null;
  vehicleModel?: string | null;
  vehicleYear?: number | string | null;
  vehicleVIN?: string | null;
  vehicleColor?: string | null;
  lotNumber?: string | null;
  auctionName?: string | null;
  weight?: number | string | null;
  dimensions?: string | null;
  specialInstructions?: string | null;
  insuranceValue?: number | string | null;
  price?: number | string | null;
  companyShippingFare?: number | string | null;
  damageCost?: number | string | null;
  damageCredit?: number | string | null;
  vehiclePhotos?: string[] | null;
  status?: 'ON_HAND' | 'IN_TRANSIT' | null;
  containerId?: string | null;
  internalNotes?: string | null;
  hasKey?: boolean | null;
  hasTitle?: boolean | null;
  titleStatus?: string | null;
  paymentMode?: 'CASH' | 'DUE' | null;
  // Purchase fields (for PURCHASE_AND_SHIPPING service type)
  purchasePrice?: number | string | null;
  purchaseDate?: string | null;
  purchaseLocation?: string | null;
  dealerName?: string | null;
  purchaseNotes?: string | null;
};

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admins can create shipments and assign them to users
    if (session.user?.role !== 'admin') {
      return NextResponse.json(
        { message: 'Forbidden: Only admins can create shipments' },
        { status: 403 }
      );
    }

    const data = (await request.json()) as CreateShipmentPayload;
    const { 
      userId, // Admin must specify which user this shipment is for
      shippingCompanyId,
      serviceType,
      vehicleType, 
      vehicleMake, 
      vehicleModel, 
      vehicleYear,
      vehicleVIN,
      vehicleColor,
      lotNumber,
      auctionName,
      weight,
      dimensions,
      insuranceValue,
      price,
      companyShippingFare,
      damageCost,
      damageCredit,
      vehiclePhotos,
      status: providedStatus,
      containerId,
      internalNotes,
      hasKey,
      hasTitle,
      titleStatus,
      paymentMode,
      // Purchase fields
      purchasePrice,
      purchaseDate,
      purchaseLocation,
      dealerName,
      purchaseNotes,
    } = data;

    // Validate required fields
    if (!vehicleType || !userId || !shippingCompanyId) {
      return NextResponse.json(
        { message: 'Missing required fields: vehicleType, userId, and shippingCompanyId are required' },
        { status: 400 }
      );
    }

    // If status is IN_TRANSIT, containerId is required
    if (providedStatus === 'IN_TRANSIT' && !containerId) {
      return NextResponse.json(
        { message: 'Container ID is required for IN_TRANSIT shipments' },
        { status: 400 }
      );
    }

    // If containerId is provided, verify it exists
    if (containerId) {
      const container = await prisma.container.findUnique({
        where: { id: containerId },
        include: { shipments: true },
      });

      if (!container) {
        return NextResponse.json(
          { message: 'Container not found' },
          { status: 404 }
        );
      }

      // Check capacity
      if (container.shipments.length >= container.maxCapacity) {
        return NextResponse.json(
          { message: `Container is at full capacity (${container.maxCapacity} vehicles)` },
          { status: 400 }
        );
      }
    }

    // Verify that the userId exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    const shippingCompany = await prisma.company.findUnique({
      where: { id: shippingCompanyId },
      select: { id: true, isActive: true },
    });

    if (!shippingCompany || !shippingCompany.isActive) {
      return NextResponse.json(
        { message: 'Valid active shipping company is required' },
        { status: 400 }
      );
    }

    // Check for duplicate VIN if provided
    if (vehicleVIN && vehicleVIN.trim()) {
      const existingShipment = await prisma.shipment.findFirst({
        where: { 
          vehicleVIN: vehicleVIN.trim(),
        },
        select: {
          id: true,
          vehicleVIN: true,
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      if (existingShipment) {
        return NextResponse.json(
          { 
            message: `This VIN is already assigned to another shipment (VIN: ${existingShipment.vehicleVIN}, User: ${existingShipment.user.name || existingShipment.user.email})`,
          },
          { status: 400 }
        );
      }
    }

    const normalizedStatus = containerId ? 'IN_TRANSIT' : (providedStatus || 'ON_HAND');
    const sanitizedVehiclePhotos = Array.isArray(vehiclePhotos)
      ? vehiclePhotos.filter((photo): photo is string => typeof photo === 'string')
      : [];
    const parsedVehicleYear =
      typeof vehicleYear === 'number'
        ? vehicleYear
        : typeof vehicleYear === 'string'
        ? parseInt(vehicleYear, 10)
        : null;
    const parsedWeight =
      typeof weight === 'number' ? weight : typeof weight === 'string' ? parseFloat(weight) : null;
    const parsedInsuranceValue =
      typeof insuranceValue === 'number'
        ? insuranceValue
        : typeof insuranceValue === 'string'
        ? parseFloat(insuranceValue)
        : null;
    const parsedPrice =
      typeof price === 'number' ? price : typeof price === 'string' ? parseFloat(price) : null;
    const parsedCompanyShippingFare =
      typeof companyShippingFare === 'number'
        ? companyShippingFare
        : typeof companyShippingFare === 'string'
        ? parseFloat(companyShippingFare)
        : null;
    const parsedDamageCost =
      typeof damageCost === 'number'
        ? damageCost
        : typeof damageCost === 'string'
        ? parseFloat(damageCost)
        : null;
    const parsedDamageCredit =
      typeof damageCredit === 'number'
        ? damageCredit
        : typeof damageCredit === 'string'
        ? parseFloat(damageCredit)
        : null;

    const hasCustomerFare = !!(parsedPrice && parsedPrice > 0);
    const hasCompanyFare = !!(parsedCompanyShippingFare && parsedCompanyShippingFare > 0);

    if (hasCustomerFare !== hasCompanyFare) {
      return NextResponse.json(
        { message: 'Both customer shipping fare and company shipping fare are required together' },
        { status: 400 }
      );
    }

    if (normalizedStatus === 'IN_TRANSIT' && !hasCustomerFare) {
      return NextResponse.json(
        { message: 'Customer shipping fare and company shipping fare are required for in-transit shipment assignment' },
        { status: 400 }
      );
    }
    const parsedPurchasePrice =
      typeof purchasePrice === 'number' ? purchasePrice : typeof purchasePrice === 'string' ? parseFloat(purchasePrice) : null;
    
    // Calculate vehicle age if vehicleYear is provided
    const currentYear = new Date().getFullYear();
    const calculatedVehicleAge = parsedVehicleYear ? currentYear - parsedVehicleYear : null;
    
    // Validate titleStatus - only allowed if hasTitle is true
    const finalTitleStatus = (hasTitle === true && titleStatus) ? titleStatus as TitleStatus : null;
    
    // Validate purchase price for PURCHASE_AND_SHIPPING
    if (serviceType === 'PURCHASE_AND_SHIPPING' && !parsedPurchasePrice) {
      return NextResponse.json(
        { message: 'Purchase price is required for Purchase + Shipping service type' },
        { status: 400 }
      );
    }
    
    const shipment = await prisma.$transaction(async (tx) => {
      // Determine payment status based on payment mode
      let finalPaymentStatus = 'PENDING';
      if (paymentMode === 'CASH') {
        finalPaymentStatus = 'COMPLETED';
      } else if (paymentMode === 'DUE') {
        finalPaymentStatus = 'PENDING';
      }

      const createdShipment = await tx.shipment.create({
        data: {
          userId: userId, // Use the userId from request (assigned by admin)
          serviceType: serviceType || 'SHIPPING_ONLY',
          vehicleType,
          vehicleMake,
          vehicleModel,
          vehicleYear: parsedVehicleYear,
          vehicleVIN,
          vehicleColor,
          lotNumber,
          auctionName,
          status: normalizedStatus,
          containerId: containerId || null,
          shippingCompanyId,
          weight: parsedWeight,
          dimensions,
          insuranceValue: parsedInsuranceValue,
          price: parsedPrice,
          companyShippingFare: parsedCompanyShippingFare,
          damageCost: parsedDamageCost,
          damageCredit: parsedDamageCredit,
          vehiclePhotos: sanitizedVehiclePhotos,
          paymentStatus: finalPaymentStatus as PaymentStatus,
          paymentMode: paymentMode || null,
          internalNotes: internalNotes || null,
          // Vehicle details
          hasKey: typeof hasKey === 'boolean' ? hasKey : null,
          hasTitle: typeof hasTitle === 'boolean' ? hasTitle : null,
          titleStatus: finalTitleStatus,
          vehicleAge: calculatedVehicleAge,
          // Purchase information
          purchasePrice: parsedPurchasePrice,
          purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
          purchaseLocation: purchaseLocation || null,
          dealerName: dealerName || null,
          purchaseNotes: purchaseNotes || null,
        },
      });

      const vehicleLabel =
        [createdShipment.vehicleYear, createdShipment.vehicleMake, createdShipment.vehicleModel]
          .filter(Boolean)
          .join(' ') || createdShipment.vehicleType;

      await syncShipmentShippingFareEntries(tx, {
        shipmentId: createdShipment.id,
        userId: createdShipment.userId,
        shippingCompanyId: createdShipment.shippingCompanyId,
        userFareAmount: createdShipment.price,
        companyFareAmount: createdShipment.companyShippingFare,
        vehicleLabel,
        vehicleVIN: createdShipment.vehicleVIN,
        actorUserId: session.user?.id as string,
        shouldPost: createdShipment.status === 'IN_TRANSIT' && !!createdShipment.containerId,
      });

      await syncShipmentDamageEntries(tx, {
        shipmentId: createdShipment.id,
        userId: createdShipment.userId,
        shippingCompanyId: createdShipment.shippingCompanyId,
        damageCost: createdShipment.damageCost,
        damageCredit: createdShipment.damageCredit,
        vehicleLabel,
        vehicleVIN: createdShipment.vehicleVIN,
        actorUserId: session.user?.id as string,
        shouldPost: createdShipment.status === 'IN_TRANSIT' && !!createdShipment.containerId,
      });

      // Update container count if assigned
      if (containerId) {
        await tx.container.update({
          where: { id: containerId },
          data: {
            currentCount: {
              increment: 1,
            },
          },
        });
      }

      return createdShipment;
    });

    return NextResponse.json(
      { 
        message: 'Shipment created successfully',
        shipment,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating shipment:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

