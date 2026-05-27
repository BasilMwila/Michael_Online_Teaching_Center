export default function Empty({ title = 'Nothing here yet', message, action }) {
  return (
    <div className="card p-10 text-center">
      <div className="w-16 h-16 mx-auto rounded-full bg-brand-50 grid place-items-center mb-4">
        <svg className="w-8 h-8 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2a4 4 0 014-4h4M3 7l9 6 9-6" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
      {message && <p className="text-gray-600 mb-4">{message}</p>}
      {action}
    </div>
  );
}
