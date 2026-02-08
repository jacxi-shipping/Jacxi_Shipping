import { NotificationType } from '@prisma/client';
import { prisma } from '@/lib/db';

type NotificationInput = {
  userId: string;
  title: string;
  description: string;
  type?: NotificationType;
  link?: string | null;
};

export async function createNotification(input: NotificationInput) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      title: input.title,
      description: input.description,
      type: input.type ?? 'INFO',
      link: input.link ?? null,
    },
  });
}

export async function createNotifications(inputs: NotificationInput[]) {
  if (inputs.length === 0) {
    return { count: 0 };
  }

  return prisma.notification.createMany({
    data: inputs.map((input) => ({
      userId: input.userId,
      title: input.title,
      description: input.description,
      type: input.type ?? 'INFO',
      link: input.link ?? null,
    })),
  });
}
