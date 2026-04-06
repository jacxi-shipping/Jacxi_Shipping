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

export default function TestimonialsSection() {
  return (
    <section id="testimonials" className="bg-white py-28">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="landing-reveal mb-3 text-xs font-bold uppercase tracking-[0.32em] text-[var(--accent-gold)]" style={{ animationDelay: '60ms' }}>Client Stories</p>
          <h2 className="landing-reveal text-3xl font-bold tracking-[-0.03em] text-[var(--text-primary)] sm:text-4xl lg:text-[3.2rem]" style={{ animationDelay: '140ms' }}>What Our Clients Say</h2>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2">
          {testimonials.map((item, index) => (
            <article key={item.name} className="landing-reveal flex min-h-[280px] flex-col rounded-[2rem] border border-[var(--border)] bg-[var(--background)] p-8 shadow-sm shadow-slate-900/5" style={{ animationDelay: `${240 + index * 110}ms` }}>
              <p className="text-[1.05rem] leading-8 text-[var(--text-primary)]">&ldquo;{item.quote}&rdquo;</p>
              <div className="mt-auto flex items-center gap-4 pt-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(var(--accent-gold-rgb),0.14)] text-sm font-bold text-[var(--accent-gold)]">
                  {item.name.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-[var(--text-primary)]">{item.name}</p>
                  <p className="text-sm text-[var(--text-secondary)]">{item.role}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}