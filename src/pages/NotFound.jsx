import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="max-w-xl mx-auto px-4 py-24 text-center">
      <p className="text-6xl mb-4">🤔</p>
      <h1 className="text-3xl font-display font-bold mb-2">Page not found</h1>
      <p className="text-gray-600 mb-6">We couldn't find that page. Let's get you back on track.</p>
      <Link to="/" className="btn-primary">Back to home</Link>
    </div>
  );
}
