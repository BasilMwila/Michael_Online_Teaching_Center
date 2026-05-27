import Icon from './Icon.jsx';

export default function Empty({ title = 'Nothing here yet', message, action, icon = 'book-open' }) {
  return (
    <div className="card p-12 text-center">
      <div className="icon-tile w-16 h-16 mx-auto bg-gradient-to-br from-brand-50 to-brand-100 text-brand-600">
        <Icon name={icon} size={28} />
      </div>
      <h3 className="mt-5 text-lg font-display font-semibold text-ink-900">{title}</h3>
      {message && <p className="mt-2 text-ink-600 max-w-sm mx-auto">{message}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
