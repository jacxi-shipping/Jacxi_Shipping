'use client';

import { FileText, PackageCheck, PlaneTakeoff, Truck } from 'lucide-react';
import { motion, Variants } from 'framer-motion';

const steps = [
  {
    number: '01',
    title: 'Request a Quote',
    description: 'Fill out our simple form with your vehicle details and destination. We\'ll send you a competitive, transparent quote within 24 hours.',
    icon: FileText,
  },
  {
    number: '02',
    title: 'Vehicle Pickup',
    description: 'Our team collects your vehicle from anywhere in the United States. We handle loading, securing, and all pre-departure documentation.',
    icon: PackageCheck,
  },
  {
    number: '03',
    title: 'Dubai Transit Hub',
    description: 'Your vehicle passes through our state-of-the-art Dubai hub with expert care, inspection, and customs processing handled by our specialists.',
    icon: PlaneTakeoff,
  },
  {
    number: '04',
    title: 'Afghanistan Delivery',
    description: 'Door-to-door delivery to your chosen province with full customs clearance. We notify you at every milestone of the journey.',
    icon: Truck,
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

export default function ProcessSection() {
  return (
    <section id="process" className="relative py-32 overflow-hidden bg-[var(--background)]">
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
            The Process
          </span>
          <h2 className="text-4xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-5xl lg:text-6xl mb-6">
            Ship Your Vehicle in <br className="hidden sm:block" />
            <span className="text-[var(--accent-gold)]">4 Simple Steps</span>
          </h2>
          <p className="text-lg leading-relaxed text-[var(--text-secondary)] opacity-80 max-w-2xl mx-auto">
            We&apos;ve engineered every step to be transparent, predictable, and stress-free. Our system adapts to your vehicle footprint automatically.
          </p>
        </motion.div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4"
        >
          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <motion.article 
                key={step.number} 
                variants={itemVariants}
                whileHover={{ y: -8, scale: 1.02 }}
                className="group relative flex flex-col rounded-[2.5rem] border border-[var(--border)] bg-white/80 backdrop-blur-xl p-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.03)] transition-all overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-transparent to-[rgba(var(--accent-gold-rgb),0.05)] z-0" />
                
                <div className="relative z-10 flex items-center justify-between mb-8">
                  <span className="text-[3rem] font-extrabold leading-none text-[var(--accent-gold)] opacity-40 transition-all group-hover:opacity-100">
                    {step.number}
                  </span>
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm transition-transform group-hover:rotate-12 group-hover:scale-110">
                    <Icon className="h-7 w-7 text-[var(--accent-gold)]" strokeWidth={1.5} />
                  </div>
                </div>

                <h3 className="relative z-10 mt-auto text-2xl font-bold tracking-tight text-[var(--text-primary)] mb-4">
                  {step.title}
                </h3>
                <p className="relative z-10 leading-relaxed text-[var(--text-secondary)] opacity-90">
                  {step.description}
                </p>
              </motion.article>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}