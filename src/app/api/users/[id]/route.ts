import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const userId = id;

    if (!userId) {
      return NextResponse.json({ message: 'User ID required' }, { status: 400 });
    }

    // Users can view their own profile, admins can view any profile
    if (session.user?.role !== 'admin' && session.user?.id !== userId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        address: true,
        city: true,
        country: true,
        createdAt: true,
        updatedAt: true,
        shipments: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            vehicleType: true,
            vehicleMake: true,
            vehicleModel: true,
            vehicleYear: true,
            vehicleVIN: true,
            status: true,
            createdAt: true,
            containerId: true,
            price: true,
            vehiclePhotos: true,
            container: {
              select: {
                containerNumber: true,
                status: true,
                currentLocation: true,
                estimatedArrival: true,
                vesselName: true,
                shippingLine: true,
                progress: true
              }
            }
          }
        }
      },
    });

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const userId = id;

    if (!userId) {
      return NextResponse.json({ message: 'User ID required' }, { status: 400 });
    }

    // Only admins can update other users (except maybe self-update, but usually user settings are separate)
    if (session.user?.role !== 'admin' && session.user?.id !== userId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, role, phone, address, city, country } = body;

    // Validate email if changed (check uniqueness)
    if (email) {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser && existingUser.id !== userId) {
        return NextResponse.json({ message: 'Email already in use' }, { status: 400 });
      }
    }

    // Only admins can change roles
    if (role && session.user.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden: Cannot change role' }, { status: 403 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        email,
        role, // only if provided
        phone,
        address,
        city,
        country,
      },
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    // Only admins can delete users
    if (session.user?.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden: Only admins can delete users' }, { status: 403 });
    }
    const { id } = await params;
    const userId = id;
    if (!userId) {
      return NextResponse.json({ message: 'User ID required' }, { status: 400 });
    }
    // Prevent self-delete
    if (session.user.id === userId) {
      return NextResponse.json({ message: 'You cannot delete your own account.' }, { status: 400 });
    }
    const deleted = await prisma.user.delete({ where: { id: userId } });
    return NextResponse.json({ success: true, deleted });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
