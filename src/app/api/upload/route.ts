import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { put } from '@vercel/blob';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
	try {
		const session = await auth();

		if (!session) {
			return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
		}

		// Only admins can upload images
		if (session.user?.role !== 'admin') {
			return NextResponse.json(
				{ message: 'Forbidden: Only admins can upload images' },
				{ status: 403 }
			);
		}

		const formData = await request.formData();
		const file = formData.get('file') as File;

		if (!file) {
			return NextResponse.json(
				{ message: 'No file provided' },
				{ status: 400 }
			);
		}

		// Validate file type
		const allowedTypes = [
			'image/jpeg', 
			'image/jpg', 
			'image/png', 
			'image/webp',
			'application/pdf',
			'text/csv',
			'application/vnd.ms-excel',
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
			'application/msword', // .doc
			'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // .docx
		];
		
		if (!allowedTypes.includes(file.type)) {
			return NextResponse.json(
				{ message: 'Invalid file type. Allowed: Images, PDF, CSV, Excel, Word.' },
				{ status: 400 }
			);
		}

		// Validate file size (max 5MB)
		const maxSize = 5 * 1024 * 1024; // 5MB
		if (file.size > maxSize) {
			return NextResponse.json(
				{ message: 'File size exceeds 5MB limit' },
				{ status: 400 }
			);
		}

		const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
		if (!blobToken) {
			console.error('BLOB_READ_WRITE_TOKEN is not configured');
			return NextResponse.json(
				{ message: 'Blob storage is not configured. Set BLOB_READ_WRITE_TOKEN.' },
				{ status: 500 },
			);
		}

		const sanitizedBaseName =
			file.name?.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9.\-_]/g, '') || 'upload.jpg';
		const objectKey = `shipments/${Date.now()}-${randomUUID()}-${sanitizedBaseName}`;

		const blob = await put(objectKey, file, {
			access: 'public',
			token: blobToken,
			contentType: file.type,
		});

		return NextResponse.json(
			{
				message: 'File uploaded successfully',
				url: blob.url,
				filename: blob.pathname,
			},
			{ status: 200 }
		);
	} catch (error) {
		console.error('Error uploading file:', error);
		return NextResponse.json(
			{ message: 'Internal server error' },
			{ status: 500 }
		);
	}
}

