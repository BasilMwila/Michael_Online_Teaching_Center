export default function Spinner({ size = 8 }) {
  const sizeMap = { 6: 'h-6 w-6', 8: 'h-8 w-8', 12: 'h-12 w-12' };
  return (
    <div className="grid place-items-center py-10">
      <div className={`animate-spin rounded-full border-b-2 border-brand-600 ${sizeMap[size] || sizeMap[8]}`} />
    </div>
  );
}
