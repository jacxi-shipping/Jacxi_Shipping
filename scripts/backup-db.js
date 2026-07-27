async function backupDatabase() {
  const [{ PrismaClient }, fs, path] = await Promise.all([
    import('@prisma/client'),
    import('node:fs/promises'),
    import('node:path'),
  ]);

  const prisma = new PrismaClient({
    datasourceUrl: process.env.jacxi_DATABASE_URL
  });

  console.log('💾 Starting database backup...');

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(process.cwd(), 'backups');

    await fs.mkdir(backupDir, { recursive: true });

    const backupFile = path.join(backupDir, `jacxi-backup-${timestamp}.json`);

    // Backup all data
    const backupData = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      data: {
        users: await prisma.user.findMany({
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
          },
        }),
        shipments: await prisma.shipment.findMany({
          include: {
            events: true,
          },
        }),
        quotes: await prisma.quote.findMany(),
        testimonials: await prisma.testimonial.findMany(),
        blogPosts: await prisma.blogPost.findMany(),
        contacts: await prisma.contact.findMany(),
        newsletters: await prisma.newsletter.findMany(),
      },
    };

    // Write backup to file
    await fs.writeFile(backupFile, JSON.stringify(backupData, null, 2));
    console.log(`✅ Backup created: ${backupFile}`);

    // Get backup statistics
    const stats = {
      users: backupData.data.users.length,
      shipments: backupData.data.shipments.length,
      quotes: backupData.data.quotes.length,
      testimonials: backupData.data.testimonials.length,
      blogPosts: backupData.data.blogPosts.length,
      contacts: backupData.data.contacts.length,
      newsletters: backupData.data.newsletters.length,
    };

    console.log('📊 Backup statistics:');
    Object.entries(stats).forEach(([key, value]) => {
      console.log(`  - ${key}: ${value}`);
    });

    // Clean up old backups (keep only last 10)
    const files = (await fs.readdir(backupDir))
      .filter(file => file.startsWith('jacxi-backup-') && file.endsWith('.json'))
      .sort()
      .reverse();

    if (files.length > 10) {
      const filesToDelete = files.slice(10);
      await Promise.all(
        filesToDelete.map(async (file) => {
          await fs.unlink(path.join(backupDir, file));
          console.log(`🗑️  Deleted old backup: ${file}`);
        }),
      );
    }

    console.log('🎉 Database backup completed successfully!');

  } catch (error) {
    console.error('❌ Backup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

backupDatabase()
  .catch((error) => {
    console.error('❌ Backup error:', error);
    process.exit(1);
  });
