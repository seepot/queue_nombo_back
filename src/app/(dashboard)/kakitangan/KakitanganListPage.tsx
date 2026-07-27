"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import KakitanganList from "./KakitanganList";

const NEGERI_LIST = [
  { code: "01", name: "Johor" },
  { code: "02", name: "Kedah" },
  { code: "03", name: "Kelantan" },
  { code: "04", name: "Melaka" },
  { code: "05", name: "Negeri Sembilan" },
  { code: "06", name: "Pahang" },
  { code: "07", name: "Pulau Pinang" },
  { code: "08", name: "Perak" },
  { code: "09", name: "Perlis" },
  { code: "10", name: "Selangor" },
  { code: "11", name: "Terengganu" },
  { code: "12", name: "Sabah" },
  { code: "13", name: "Sarawak" },
  { code: "14", name: "WP Kuala Lumpur" },
  { code: "15", name: "WP Labuan" },
  { code: "16", name: "WP Putrajaya" },
];

interface CawanganOption {
  id_cawangan: string;
  nama_cawangan: string;
}

interface User {
  id: number;
  nama: string | null;
  uname: string | null;
  nokp: string | null;
  levelAkses: number | null;
  catatan: string | null;
  idCawangan: string | null;
}

interface Props {
  isAdmin: boolean;
  defaultCawangan: string;
  page: number;
}

export default function KakitanganListPage({ isAdmin, defaultCawangan, page }: Props) {
  const router = useRouter();
  const [negeri, setNegeri] = useState("");
  const [cawanganList, setCawanganList] = useState<CawanganOption[]>([]);
  const [selectedCawangan, setSelectedCawangan] = useState(defaultCawangan);
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(!isAdmin);

  const PAGE_SIZE = 10;
  const [currentPage, setCurrentPage] = useState(page);

  // Auto-load for KC role
  useEffect(() => {
    if (!isAdmin && defaultCawangan) {
      fetchUsers(defaultCawangan, 1);
    }
  }, []);

  const handleNegeriChange = async (code: string) => {
    setNegeri(code);
    setSelectedCawangan("");
    setCawanganList([]);
    if (!code) return;
    try {
      const res = await fetch(`/api/cawangan/list?negeri=${code}`);
      if (res.ok) {
        const result = await res.json();
        setCawanganList(result.data);
      }
    } catch {
      // ignore
    }
  };

  const fetchUsers = async (cawangan: string, pg: number) => {
    setLoading(true);
    try {
      const skip = (pg - 1) * PAGE_SIZE;
      const res = await fetch(
        `/api/kakitangan/list?cawangan=${cawangan}&skip=${skip}&take=${PAGE_SIZE}`
      );
      if (res.ok) {
        const result = await res.json();
        setUsers(result.users);
        setTotal(result.total);
        setCurrentPage(pg);
        setSearched(true);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleCari = () => {
    if (!selectedCawangan && !negeri) return;
    const caw = selectedCawangan || `negeri:${negeri}`;
    fetchUsers(caw, 1);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const skip = (currentPage - 1) * PAGE_SIZE;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Senarai Kakitangan</h1>
        <p className="text-gray-500 mt-1">
          {isAdmin ? "Carian kakitangan mengikut negeri dan cawangan" : `Senarai kakitangan cawangan anda (${total} orang)`}
        </p>
      </div>

      {/* Filter for Admin */}
      {isAdmin && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Negeri <span className="text-red-500">*</span>
                </label>
                <select
                  value={negeri}
                  onChange={(e) => handleNegeriChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">Sila pilih Negeri</option>
                  {NEGERI_LIST.map((n) => (
                    <option key={n.code} value={n.code}>{n.name}</option>
                  ))}
                </select>
              </div>
              {cawanganList.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cawangan
                  </label>
                  <select
                    value={selectedCawangan}
                    onChange={(e) => setSelectedCawangan(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">Semua Cawangan</option>
                    {cawanganList.map((c) => (
                      <option key={c.id_cawangan} value={c.id_cawangan}>{c.nama_cawangan}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <button
              onClick={handleCari}
              disabled={loading || (!negeri && !selectedCawangan)}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold px-6 py-2 rounded-lg text-sm transition"
            >
              {loading ? "Mencari..." : "Cari"}
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {searched && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <KakitanganList users={users} skip={skip} />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-600">
                Memaparkan {skip + 1} - {Math.min(skip + PAGE_SIZE, total)} daripada {total} rekod
              </p>
              <div className="flex gap-1">
                {currentPage > 1 && (
                  <button onClick={() => fetchUsers(selectedCawangan || `negeri:${negeri}`, currentPage - 1)} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100">
                    Sebelum
                  </button>
                )}
                {currentPage < totalPages && (
                  <button onClick={() => fetchUsers(selectedCawangan || `negeri:${negeri}`, currentPage + 1)} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100">
                    Seterusnya
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
