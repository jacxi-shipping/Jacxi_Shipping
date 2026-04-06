import { Building2, MapPin } from 'lucide-react';

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

export default function ProvinceCoverageSection() {
  return (
    <section id="coverage" className="bg-[#0f172a] py-28 text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="landing-reveal mb-3 text-xs font-bold uppercase tracking-[0.32em] text-amber-300" style={{ animationDelay: '60ms' }}>Coverage</p>
          <h2 className="landing-reveal text-3xl font-bold tracking-[-0.03em] !text-white sm:text-4xl lg:text-[3.2rem]" style={{ animationDelay: '140ms' }}>Delivering Across All Afghan Provinces</h2>
          <p className="landing-reveal mt-5 text-lg leading-8 text-slate-300" style={{ animationDelay: '220ms' }}>
            From major cities to remote provinces, we ensure your vehicle arrives safely no matter the destination.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {provinces.map((item, index) => (
            <article
              key={item.city}
              className={`landing-reveal flex min-h-[238px] flex-col rounded-[2rem] border p-7 ${item.featured ? 'border-amber-300/50 bg-white text-slate-900' : 'border-slate-700 bg-slate-900/65 text-white'}`}
              style={{ animationDelay: `${280 + index * 100}ms` }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className={`text-[1.75rem] font-bold tracking-[-0.02em] ${item.featured ? '!text-slate-900' : '!text-white'}`}>
                    {item.city}
                  </h3>
                  <div className="mt-3 flex items-center gap-2">
                    {item.label ? (
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${item.featured ? 'bg-amber-100 text-amber-700' : 'bg-slate-800 text-amber-300'}`}>
                        {item.label}
                      </span>
                    ) : null}
                    <p className={`text-sm ${item.featured ? 'text-slate-600' : 'text-slate-300'}`}>{item.province}</p>
                  </div>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.featured ? 'bg-amber-100 text-amber-700' : 'bg-slate-800 text-amber-300'}`}>
                  {item.featured ? <Building2 className="h-6 w-6" /> : <MapPin className="h-6 w-6" />}
                </div>
              </div>
              <p className={`mt-auto pt-6 leading-8 ${item.featured ? 'text-slate-700' : 'text-slate-300'}`}>
                {item.featured ? 'Our primary hub - fastest delivery' : item.note}
              </p>
            </article>
          ))}
        </div>

        <p className="landing-reveal mt-10 text-center text-base text-slate-300" style={{ animationDelay: '820ms' }}>
          We deliver to all 34 provinces of Afghanistan. Contact us for delivery to your specific location.
        </p>
      </div>
    </section>
  );
}