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
            <p className="text-sm font-extrabold uppercase tracking-widest text-[var(--accent-gold)]">Client proof</p>
            <h2 className="mt-4 max-w-xl text-[2rem] font-extrabold leading-[1.1] tracking-tight text-[var(--text-primary)] sm:text-[3rem] lg:text-[3.5rem]">
              Trusted by customers shipping <br className="hidden lg:block"/>
              <span className="text-[var(--text-secondary)]">high-value vehicles.</span>
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[var(--text-secondary)] sm:text-xl">
              International vehicle shipping requires trust. Customers choose <span className="font-semibold text-[var(--text-primary)]">JACXI</span> for clear communication, careful handling, and route expertise.
            </p>

            <div className="mt-8 grid gap-4">
              {proof.map((item) => (
                <div key={item} className="group relative overflow-hidden rounded-xl border border-[rgba(var(--border-rgb),0.5)] bg-white/50 p-4 shadow-sm backdrop-blur-sm transition-all hover:bg-white hover:border-[var(--accent-gold)] hover:shadow-md">
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(var(--accent-gold-rgb),0.1)] group-hover:bg-[var(--accent-gold)] transition-colors duration-300">
                      <CheckCircle2 className="h-4.5 w-4.5 text-[var(--accent-gold)] group-hover:text-white transition-colors duration-300" />
                    </div>
                    <span className="text-sm font-bold block text-[var(--text-primary)]">{item}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            className="grid gap-6 md:grid-cols-2 mt-8 lg:mt-0"
          >
            {testimonials.map((item) => (
              <motion.article
                key={item.name}
                variants={itemVariants}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[rgba(var(--border-rgb),0.6)] bg-white p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-1.5 hover:border-[var(--accent-gold)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)]"
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[var(--accent-gold)] to-yellow-200 transform origin-left scale-x-0 transition-transform duration-500 ease-out group-hover:scale-x-100" />
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between gap-4 mb-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(var(--accent-gold-rgb),0.08)] text-[var(--accent-gold)] shadow-inner">
                      <Quote className="h-5 w-5" />
                    </div>
                    <div className="flex items-center gap-1 text-[var(--accent-gold)] bg-[rgba(var(--accent-gold-rgb),0.05)] px-2 py-1 rounded-full border border-[rgba(var(--accent-gold-rgb),0.2)]">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star key={index} className="h-3 w-3 fill-current" />
                      ))}
                    </div>
                  </div>
                  <p className="mt-4 text-[1.05rem] leading-relaxed text-[var(--text-secondary)] tracking-wide mb-8 italic outline-none">&ldquo;{item.quote}&rdquo;</p>
                </div>

                <div className="relative z-10 mt-auto flex items-center gap-4 border-t border-[rgba(var(--border-rgb),0.5)] pt-6">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-gold)] text-lg font-extrabold text-white shadow-md">
                    {item.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-extrabold tracking-tight text-[var(--text-primary)] leading-tight">{item.name}</p>
                    <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] opacity-80 mt-1">{item.role}</p>
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
