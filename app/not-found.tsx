import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0D0D1A] text-[#E8E8F0] p-4 text-center">
      <h2 className="text-2xl font-bold text-[#00E5FF] mb-2">404 - Page Not Found</h2>
      <p className="text-[#A4A9C6] text-sm mb-6">The page you are looking for does not exist or has been moved.</p>
      <Link href="/" className="px-5 py-2.5 bg-[#00E5FF] text-black font-bold rounded-xl hover:bg-[#00E5FF]/80 transition duration-200">
        Return Home
      </Link>
    </div>
  );
}
