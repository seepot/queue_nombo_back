export default function AduanPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Aduan & Maklum Balas</h1>
        <p className="text-gray-500 mt-1">
          Pengurusan aduan dan maklum balas pelanggan
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <svg
          className="w-16 h-16 mx-auto text-gray-300 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
        <h3 className="text-lg font-medium text-gray-600 mb-2">
          Modul Aduan
        </h3>
        <p className="text-gray-400 text-sm">
          Tiada aduan untuk dipaparkan pada masa ini.
        </p>
      </div>
    </div>
  );
}
