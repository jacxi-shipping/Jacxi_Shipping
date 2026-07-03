'use client';

import { motion, Variants } from 'framer-motion';
import { CheckCircle2, Quote, Star } from 'lucide-react';

const testimonials = [
  {
    quote: 'JACXI handled my Toyota Land Cruiser with absolute professionalism. It arrived in Herat in perfect condition, and the customs process was clear.',
    name: 'Ahmed R.',
    role: 'Herat, Afghanistan',
  },
  {
    quote: 'I was nervous about shipping my car internationally, but the JACXI team kept me updated at every stage. Reliable and responsive.',
    name: 'Khalid M.',
    role: 'Kabul, Afghanistan',
  },
  {
    quote: 'Best price I found for USA to Afghanistan shipping. The team is honest, direct, and careful with the details.',
    name: 'Farida N.',
    role: 'Kandahar, Afghanistan',
  },
  {
    quote: 'They handled our fleet shipment with strong coordination from pickup through final destination. The route visibility made a real difference.',
    name: 'Sarah Jenkins',
    role: 'Fleet client',
  },
];

const proof = [
  'Verified route communication',
  'Document support included',
  'Afghanistan delivery network',
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.09 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.46, ease: [0.22, 1, 0.36, 1] } },
};

export default function TestimonialsSection() {
  return (
    <section id="testimonials" className="relative overflow-hidden bg-[var(--panel)] py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
            className="lg:sticky lg:top-28"
          >
            <p className="text-sm font-bold uppercase text-[var(--accent-gold)]">Client proof</p>
            <h2 className="mt-4 max-w-xl text-4xl font-black leading-tight text-[var(--text-primary)] sm:text-5xl">
              Trusted by customers shipping high-value vehicles.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--text-secondary)] sm:text-lg">
              International vehicle shipping requires trust. Customers choose JACXI for clear communication, careful handling, and route expertise.
            </p>

            <div className="mt-7 grid gap-2">
              {proof.map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-3">
                  <CheckCircle2 className="h-4 w-4 text-[var(--accent-gold)]" />
                  <span className="text-sm font-bold text-[var(--text-primary)]">{item}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            className="grid gap-3 md:grid-cols-2"
          >
            {testimonials.map((item) => (
              <motion.article
                key={item.name}
                variants={itemVariants}
                className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-[rgba(var(--accent-gold-rgb),0.55)] hover:shadow-[0_18px_42px_rgba(var(--text-primary-rgb),0.10)]"
              >
                <div className="flex items-center justify-between gap-4">
                  <Quote className="h-7 w-7 text-[var(--accent-gold)]" />
                  <div className="flex items-center gap-1 text-[var(--accent-gold)]">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star key={index} className="h-3.5 w-3.5 fill-current" />
                    ))}
                  </div>
                </div>
                <p className="mt-6 text-base leading-7 text-[var(--text-primary)]">&ldquo;{item.quote}&rdquo;</p>

                <div className="mt-8 flex items-center gap-3 border-t border-[var(--border)] pt-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[rgba(var(--accent-gold-rgb),0.12)] text-sm font-black text-[var(--accent-gold)]">
                    {item.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-black text-[var(--text-primary)]">{item.name}</p>
                    <p className="text-sm text-[var(--text-secondary)]">{item.role}</p>
                  </div>
                </div>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
