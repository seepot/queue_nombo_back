import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
          404
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Halaman Tidak Dijumpai
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Maaf, halaman yang anda cari tidak wujud atau telah dipindahkan.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex justify-center items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
          >
            Kembali ke Dashboard
          </Link>
          <Link
            href="/login"
            className="inline-flex justify-center items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
          >
            Log Masuk
          </Link>
        </div>
      </div>
    </div>
  );
}
