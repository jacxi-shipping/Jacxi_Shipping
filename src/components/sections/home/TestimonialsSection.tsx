'use client';

import { motion, Variants } from 'framer-motion';

const testimonials = [
  {
    quote: 'JACXI handled my Toyota Land Cruiser with absolute professionalism. Arrived in Herat in perfect condition, and the customs process was seamless.',
    name: 'Ahmed R.',
    role: 'Herat, Afghanistan',
  },
  {
    quote: 'I was nervous about shipping my car internationally, but the JACXI team kept me updated every step of the way. Highly recommend.',
    name: 'Khalid M.',
    role: 'Kabul, Afghanistan',
  },
  {
    quote: 'Best price I found for USA to Afghanistan shipping. The team is responsive, honest, and reliable. My second vehicle with them.',
    name: 'Farida N.',
    role: 'Kandahar, Afghanistan',
  },
  {
    quote: 'The level of precision and care JACXI brings to logistics is unmatched. They handled our fleet shipment with absolute professionalism.',
    name: 'Sarah Jenkins',
    role: 'Director of Operations, AutoMotive Global',
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 15 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

export default function TestimonialsSection() {
  return (
    <section id="testimonials" className="relative bg-white py-32 overflow-hidden">
      {/* Decorative gradient blur */}
      <div className="absolute bottom-0 right-0 -mr-[10%] -mb-[10%] w-[50%] h-[50%] bg-[var(--accent-gold)]/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="mx-auto max-w-3xl text-center mb-20"
        >
          <span className="mb-4 inline-block text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent-gold)]">
            Client Stories
          </span>
          <h2 className="text-4xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-5xl lg:text-5xl mb-6">
            Trusted by the <br className="hidden sm:block" />
            <span className="text-[var(--accent-gold)]">Best Around the Globe</span>
          </h2>
        </motion.div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-2 max-w-6xl mx-auto"
        >
          {testimonials.map((item, index) => (
            <motion.article 
              key={item.name} 
              variants={itemVariants}
              whileHover={{ y: -5, scale: 1.01 }}
              className="group relative flex flex-col rounded-[2.5rem] border border-[var(--border)] bg-white/80 backdrop-blur-xl p-10 shadow-[0_8px_32px_0_rgba(0,0,0,0.03)] transition-all overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-transparent to-[rgba(var(--accent-gold-rgb),0.03)] z-0" />
              
              <div className="relative z-10 mb-8">
                <svg className="h-10 w-10 text-[var(--accent-gold)] opacity-30 group-hover:opacity-60 transition-opacity" fill="currentColor" viewBox="0 0 32 32" aria-hidden="true">
                  <path d="M9.352 4C4.456 7.456 1 13.12 1 19.36c0 5.088 3.072 8.064 6.624 8.064 3.36 0 5.856-2.688 5.856-5.856 0-3.168-2.208-5.472-5.088-5.472-.576 0-1.344.096-1.536.192.48-3.264 3.552-7.104 6.624-9.024L9.352 4zm16.512 0c-4.8 3.456-8.256 9.12-8.256 15.36 0 5.088 3.072 8.064 6.624 8.064 3.264 0 5.856-2.688 5.856-5.856 0-3.168-2.304-5.472-5.184-5.472-.576 0-1.248.096-1.44.192.48-3.264 3.456-7.104 6.528-9.024L25.864 4z" />
                </svg>
              </div>

              <p className="relative z-10 text-xl leading-relaxed text-[var(--text-primary)] font-medium">
                &ldquo;{item.quote}&rdquo;
              </p>
              
              <div className="relative z-10 mt-auto flex items-center gap-4 pt-10">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgba(var(--accent-gold-rgb),0.1)] text-lg font-bold text-[var(--accent-gold)]">
                  {item.name.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-[var(--text-primary)]">{item.name}</p>
                  <p className="text-sm font-medium text-[var(--text-secondary)]">{item.role}</p>
                </div>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}