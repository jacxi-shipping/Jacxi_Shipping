import { NextResponse, NextRequest } from 'next/server';
import { Prisma, PrismaClient } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admins can list users
    if (session.user?.role !== 'admin') {
      return NextResponse.json(
        { message: 'Forbidden: Only admins can view users' },
        { status: 403 }
      );
    }

    // parse pagination and search query params
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const pageSize = Math.max(1, parseInt(url.searchParams.get('pageSize') || '9', 10));
    const query = url.searchParams.get('query')?.trim() || '';

    // Build search filter
    const where: Prisma.UserWhereInput = {};
    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
      ];
    }

    // counts for stats (total, admins, regularUsers) - always for all users
    const total = await prisma.user.count({ where });
    const admins = await prisma.user.count({ where: { ...where, role: 'admin' } });
    const regularUsers = total - admins;

    const users = await prisma.user.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: {
          select: { shipments: true }
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ users, total, page, pageSize, admins, regularUsers });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
