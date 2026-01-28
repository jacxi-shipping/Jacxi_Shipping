'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function FloatingCTA() {
	const [isVisible, setIsVisible] = useState(false);
	const [isExpanded, setIsExpanded] = useState(false);

	useEffect(() => {
		const handleScroll = () => {
			// Show button after scrolling 300px
			setIsVisible(window.scrollY > 300);
		};

		window.addEventListener('scroll', handleScroll);
		return () => window.removeEventListener('scroll', handleScroll);
	}, []);

	const handleGetQuote = () => {
		const quoteSection = document.getElementById('quote');
		if (quoteSection) {
			quoteSection.scrollIntoView({ behavior: 'smooth' });
			setIsExpanded(false);
		}
	};

	const handleContactWhatsApp = () => {
		window.open('https://wa.me/93770000085', '_blank');
	};

	return (
		<AnimatePresence>
			{isVisible && (
				<motion.div
					initial={{ opacity: 0, scale: 0.8, y: 20 }}
					animate={{ opacity: 1, scale: 1, y: 0 }}
					exit={{ opacity: 0, scale: 0.8, y: 20 }}
					className="fixed bottom-8 right-8 z-50"
				>
					{/* Expanded Menu */}
					<AnimatePresence>
						{isExpanded && (
							<motion.div
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: 10 }}
								className="absolute bottom-20 right-0 bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 mb-2 min-w-[200px]"
							>
								<button
									onClick={handleGetQuote}
									className="w-full text-left px-4 py-3 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-3 text-gray-700 hover:text-blue-600 font-medium"
								>
									<MessageSquare className="w-5 h-5" />
									Get a Quote
								</button>
								<button
									onClick={handleContactWhatsApp}
									className="w-full text-left px-4 py-3 hover:bg-green-50 rounded-lg transition-colors flex items-center gap-3 text-gray-700 hover:text-green-600 font-medium mt-1"
								>
									<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
										<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
									</svg>
									WhatsApp Us
								</button>
							</motion.div>
						)}
					</AnimatePresence>

					{/* Main CTA Button */}
					<motion.button
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
						onClick={() => setIsExpanded(!isExpanded)}
						className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 flex items-center justify-center group relative"
					>
						{/* Pulse Effect */}
						<span className="absolute inset-0 rounded-full bg-blue-600 animate-ping opacity-20" />
						
						{/* Icon */}
						<motion.div
							animate={{ rotate: isExpanded ? 45 : 0 }}
							transition={{ duration: 0.2 }}
						>
							{isExpanded ? (
								<X className="w-6 h-6" />
							) : (
								<MessageSquare className="w-6 h-6" />
							)}
						</motion.div>
					</motion.button>

					{/* Tooltip */}
					{!isExpanded && (
						<div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
							Need Help?
							<div className="absolute top-full right-4 w-2 h-2 bg-gray-900 transform rotate-45 -mt-1" />
						</div>
					)}
				</motion.div>
			)}
		</AnimatePresence>
	);
}

