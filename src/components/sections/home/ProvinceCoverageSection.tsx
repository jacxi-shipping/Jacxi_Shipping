'use client';

import { Building2, MapPin } from 'lucide-react';
import { motion, Variants } from 'framer-motion';

const provinces = [
  {
    city: 'Herat',
    province: 'Herat Province',
    note: 'Our primary hub, fastest delivery',
    label: 'HQ',
    featured: true,
  },
  {
    city: 'Kabul',
    province: 'Kabul Province',
    note: 'National capital, regular service',
  },
  {
    city: 'Kandahar',
    province: 'Kandahar Province',
    note: 'Southern Afghanistan delivery',
  },
  {
    city: 'Mazar-i-Sharif',
    province: 'Balkh Province',
    note: 'Northern Afghanistan hub',
  },
  {
    city: 'Jalalabad',
    province: 'Nangarhar Province',
    note: 'Eastern Afghanistan access',
  },
  {
    city: 'Kunduz',
    province: 'Kunduz Province',
    note: 'Northeastern coverage',
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
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 280, damping: 20 } }
};

export default function ProvinceCoverageSection() {
  return (
    <section id="coverage" className="relative py-32 overflow-hidden bg-[var(--background)]">
      <div className="absolute top-1/2 left-0 -ml-[20%] -mt-[20%] w-[60%] h-[60%] bg-[var(--accent-gold)]/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="mx-auto max-w-3xl text-center mb-20"
        >
          <span className="mb-4 inline-block text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent-gold)]">
            Coverage
          </span>
          <h2 className="text-4xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-5xl lg:text-6xl mb-6">
            Delivering Across All <br className="hidden sm:block" />
            <span className="text-[var(--accent-gold)]">Afghan Provinces</span>
          </h2>
          <p className="text-lg leading-relaxed text-[var(--text-secondary)] opacity-80 max-w-2xl mx-auto">
            From major cities to remote provinces, we ensure your vehicle arrives safely no matter the destination.
          </p>
        </motion.div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3"
        >
          {provinces.map((item, index) => (
            <motion.article 
              key={item.city} 
              variants={itemVariants}
              whileHover={{ y: -8, scale: 1.02 }}
              className={`group relative flex flex-col min-h-[238px] rounded-[2.5rem] border ${item.featured ? 'border-[var(--accent-gold)] bg-white/90 shadow-[0_8px_32px_0_rgba(202,138,4,0.1)] z-10' : 'border-[var(--border)] bg-white/60 shadow-[0_8px_32px_0_rgba(0,0,0,0.03)]'} backdrop-blur-xl p-8 transition-all overflow-hidden`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br from-transparent ${item.featured ? 'to-[rgba(var(--accent-gold-rgb),0.1)]' : 'to-[rgba(var(--accent-gold-rgb),0.02)]'} z-0`} />
              
              <div className="relative z-10 flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className={`text-[1.75rem] font-bold tracking-tight ${item.featured ? 'text-[var(--accent-gold)]' : 'text-[var(--text-primary)]'}`}>
                    {item.city}
                  </h3>
                  <div className="mt-3 flex items-center gap-2">
                    {item.label ? (
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${item.featured ? 'bg-[var(--accent-gold)] text-white' : 'bg-[rgba(var(--accent-gold-rgb),0.1)] text-[var(--accent-gold)]'}`}>
                        {item.label}
                      </span>
                    ) : null}
                    <p className="text-sm font-medium text-[var(--text-secondary)]">{item.province}</p>
                  </div>
                </div>
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl shadow-sm transition-transform group-hover:rotate-12 group-hover:scale-110 ${item.featured ? 'bg-[var(--accent-gold)] text-white' : 'bg-white text-[var(--accent-gold)]'}`}>
                  {item.featured ? <Building2 className="h-6 w-6" strokeWidth={1.5} /> : <MapPin className="h-6 w-6" strokeWidth={1.5} />}
                </div>
              </div>
              <p className={`relative z-10 mt-auto pt-6 leading-relaxed ${item.featured ? 'font-medium text-slate-800' : 'text-[var(--text-secondary)] opacity-90'}`}>
                {item.featured ? 'Our primary hub - fastest delivery' : item.note}
              </p>
            </motion.article>
          ))}
        </motion.div>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, delay: 0.6 }}
          className="mt-16 text-center text-sm font-medium uppercase tracking-[0.15em] text-[var(--text-secondary)]"
        >
          We deliver to all 34 provinces of Afghanistan.
        </motion.p>
      </div>
    </section>
  );
}