'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function SignUpPage() {
	const router = useRouter();
	const { status } = useSession();

	useEffect(() => {
		if (status !== 'loading') {
			// Redirect to dashboard users/new page
			router.replace('/dashboard/users/new');
		}
	}, [status, router]);

	// Show loading while redirecting
	return (
		<div className="min-h-screen bg-[var(--text-primary)] flex items-center justify-center">
			<div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500/30 border-t-cyan-400"></div>
		</div>
	);
}
