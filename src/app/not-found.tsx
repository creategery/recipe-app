export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <div className="text-5xl mb-4">🍽</div>
      <h1 className="text-2xl font-bold text-stone-800 mb-2">Page not found</h1>
      <a href="/" className="text-orange-500 font-medium">Back to recipes</a>
    </div>
  );
}
