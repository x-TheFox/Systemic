import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-white/40 gap-4">
      <p>Page not found.</p>
      <Link href="/" className="text-accent hover:underline text-sm">
        Go home
      </Link>
    </div>
  );
}
