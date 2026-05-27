export default function PageHeader({ title, subtitle, children }) {
  return (
    <section className="bg-gradient-to-br from-brand-700 to-brand-900 text-white">
      <div className="max-w-7xl mx-auto container-px py-12 sm:py-16">
        <div className="max-w-3xl">
          <h1 className="text-3xl sm:text-4xl font-display font-bold mb-3">{title}</h1>
          {subtitle && <p className="text-brand-50/90 text-lg">{subtitle}</p>}
          {children && <div className="mt-6">{children}</div>}
        </div>
      </div>
    </section>
  );
}
