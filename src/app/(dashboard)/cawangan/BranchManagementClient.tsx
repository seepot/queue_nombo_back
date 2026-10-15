"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import GeofenceMapPicker from "@/components/GeofenceMapPicker";

interface CounterItem {
  id: string;
  counterNo: string;
  name: string | null;
  zone: string | null;
  priorityOrder: string | null;
  status: string;
}

interface CategoryItem {
  id: string;
  name: string;
  prefixCode: string;
  startNumber: number;
  currentSeq: number;
  estimatedMinutes: number;
  nextCategoryId?: string | null;
}

interface DeviceItem {
  id: string;
  deviceName: string;
  deviceType: string;
  isPaired: boolean;
  lastHeartbeat: string | null;
}

interface ManagerInfo {
  id: string;
  name: string | null;
  username: string;
  role: string;
  status: string;
}

interface UserItem {
  id: string;
  name: string | null;
  username: string;
  role: string;
  status: string;
  email?: string | null;
  phone?: string | null;
  branchId?: string | null;
}

interface OperatingHours {
  openTime: string;
  closeTime: string;
  days: string[];
}

interface BranchData {
  id: string;
  name: string;
  code: string;
  address: string | null;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  qrRadiusMeters: number;
  operatingHours: OperatingHours;
  manager: ManagerInfo | null;
  counters: CounterItem[];
  categories: CategoryItem[];
  devices: DeviceItem[];
  users: UserItem[];
  todayTicketsCount: number;
}

interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  planType: string;
  maxBranches: number;
  usedBranches: number;
}

export default function BranchManagementClient({
  tenant,
  branches: initialBranches,
  allStaff,
}: {
  tenant: TenantInfo;
  branches: BranchData[];
  allStaff: UserItem[];
}) {
  const router = useRouter();
  const [branches, setBranches] = useState<BranchData[]>(initialBranches);
  const [selectedBranch, setSelectedBranch] = useState<BranchData | null>(null);
  const [activeSettingsTab, setActiveSettingsTab] = useState<
    "profile" | "manager" | "staff" | "schedule" | "counters" | "categories" | "devices"
  >("profile");

  // Segerakkan state apabila initialBranches berubah dari pelayan. Corak "simpan prop sebelumnya"
  // daripada panduan React (setState semasa render) digunakan, bukan setState di dalam effect.
  const [syncedBranches, setSyncedBranches] = useState(initialBranches);
  if (initialBranches !== syncedBranches) {
    setSyncedBranches(initialBranches);
    setBranches(initialBranches);
    if (selectedBranch) {
      const updated = initialBranches.find((b) => b.id === selectedBranch.id);
      if (updated) {
        setSelectedBranch(updated);
      }
    }
  }

  // Add Branch Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBranch, setNewBranch] = useState({
    name: "",
    code: "",
    address: "",
    phone: "",
    qrRadiusMeters: "500",
    openTime: "08:30",
    closeTime: "17:00",
  });

  // Edit Branch Form State
  const [editProfile, setEditProfile] = useState({
    name: "",
    code: "",
    address: "",
    phone: "",
    latitude: null as number | null,
    longitude: null as number | null,
    qrRadiusMeters: 500,
    openTime: "08:30",
    closeTime: "17:00",
  });

  // Assign / Create Manager State
  const [selectedStaffIdToAssign, setSelectedStaffIdToAssign] = useState("");
  const [newManagerForm, setNewManagerForm] = useState({
    name: "",
    username: "",
    email: "",
    phone: "",
    password: "",
  });
  const [generatedManagerPass, setGeneratedManagerPass] = useState<string | null>(null);

  // Branch Staff State
  const [newStaffForm, setNewStaffForm] = useState({
    name: "",
    username: "",
    email: "",
    phone: "",
    password: "",
  });
  const [selectedStaffToTransfer, setSelectedStaffToTransfer] = useState("");
  const [generatedStaffPass, setGeneratedStaffPass] = useState<string | null>(null);

  // Add Counter / Category Form State
  const [newCounterNo, setNewCounterNo] = useState("");
  const [newCounterName, setNewCounterName] = useState("");
  const [newCounterZone, setNewCounterZone] = useState("Zon Utama");
  const [newCatName, setNewCatName] = useState("");
  const [newCatPrefix, setNewCatPrefix] = useState("C");
  const [newCatStartNo] = useState("3001");
  const [newCatMinutes, setNewCatMinutes] = useState("5");
  const [newCatNextId, setNewCatNextId] = useState("");

  // Inline Edit State
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatForm, setEditCatForm] = useState({
    name: "",
    prefixCode: "",
    startNumber: "",
    estimatedMinutes: "",
    nextCategoryId: "",
  });

  const [editingCounterId, setEditingCounterId] = useState<string | null>(null);
  const [editCounterForm, setEditCounterForm] = useState({
    counterNo: "",
    name: "",
    zone: "",
    status: "OPEN",
    priorityOrder: "A",
  });

  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const openSettings = (branch: BranchData, defaultTab: typeof activeSettingsTab = "profile") => {
    setSelectedBranch(branch);
    setEditProfile({
      name: branch.name,
      code: branch.code,
      address: branch.address || "",
      phone: branch.phone || "",
      latitude: branch.latitude || null,
      longitude: branch.longitude || null,
      qrRadiusMeters: branch.qrRadiusMeters || 500,
      openTime: branch.operatingHours?.openTime || "08:30",
      closeTime: branch.operatingHours?.closeTime || "17:00",
    });
    setGeneratedManagerPass(null);
    setGeneratedStaffPass(null);
    setEditingCatId(null);
    setEditingCounterId(null);
    setActiveSettingsTab(defaultTab);
  };

  const handleSetActiveBranch = async (branchId: string, branchName: string) => {
    setLoading(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/branches/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId }),
      });

      const data = await res.json();
      if (data.success) {
        setStatusMessage(`Cawangan aktif telah diselaraskan ke '${branchName}'.`);
        router.refresh();
      } else {
        setStatusMessage(data.message || "Gagal menukar cawangan.");
      }
    } catch {
      setStatusMessage("Ralat sambungan.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/branches/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newBranch.name,
          code: newBranch.code,
          address: newBranch.address,
          phone: newBranch.phone,
          qrRadiusMeters: newBranch.qrRadiusMeters,
          operatingHours: {
            openTime: newBranch.openTime,
            closeTime: newBranch.closeTime,
            days: ["ISNIN", "SELASA", "RABU", "KHAMIS", "JUMAAT"],
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        const createdB: BranchData = {
          ...data.branch,
          manager: null,
          counters: [{ id: `c-${Date.now()}`, counterNo: "1", name: "Kaunter 1", zone: "Zon Utama", priorityOrder: "A", status: "OPEN" }],
          categories: [{ id: `cat-${Date.now()}`, name: "Pertanyaan & Pendaftaran", prefixCode: "A", startNumber: 1001, currentSeq: 1000, estimatedMinutes: 5 }],
          devices: [],
          users: [],
          todayTicketsCount: 0,
        };
        setBranches((prev) => [...prev, createdB]);
        setStatusMessage(data.message);
        setShowAddModal(false);
        setNewBranch({
          name: "",
          code: "",
          address: "",
          phone: "",
          qrRadiusMeters: "500",
          openTime: "08:30",
          closeTime: "17:00",
        });
        router.refresh();
      } else {
        setStatusMessage(data.message || "Gagal mencipta cawangan.");
      }
    } catch {
      setStatusMessage("Ralat sambungan pelayan.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBranchProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch) return;
    setLoading(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/branches/manage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId: selectedBranch.id,
          name: editProfile.name,
          code: editProfile.code,
          address: editProfile.address,
          phone: editProfile.phone,
          latitude: editProfile.latitude,
          longitude: editProfile.longitude,
          qrRadiusMeters: editProfile.qrRadiusMeters,
          operatingHours: {
            openTime: editProfile.openTime,
            closeTime: editProfile.closeTime,
            days: selectedBranch.operatingHours?.days || ["ISNIN", "SELASA", "RABU", "KHAMIS", "JUMAAT"],
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSelectedBranch((prev) =>
          prev
            ? {
                ...prev,
                name: editProfile.name,
                code: editProfile.code,
                address: editProfile.address,
                phone: editProfile.phone,
                latitude: editProfile.latitude,
                longitude: editProfile.longitude,
                qrRadiusMeters: editProfile.qrRadiusMeters,
                operatingHours: {
                  openTime: editProfile.openTime,
                  closeTime: editProfile.closeTime,
                  days: prev.operatingHours?.days || ["ISNIN", "SELASA", "RABU", "KHAMIS", "JUMAAT"],
                },
              }
            : null
        );
        setBranches((prev) =>
          prev.map((b) =>
            b.id === selectedBranch.id
              ? {
                  ...b,
                  name: editProfile.name,
                  code: editProfile.code,
                  address: editProfile.address,
                  phone: editProfile.phone,
                  latitude: editProfile.latitude,
                  longitude: editProfile.longitude,
                  qrRadiusMeters: editProfile.qrRadiusMeters,
                }
              : b
          )
        );
        setStatusMessage(data.message);
        router.refresh();
      } else {
        setStatusMessage(data.message || "Gagal mengemas kini cawangan.");
      }
    } catch {
      setStatusMessage("Ralat sambungan.");
    } finally {
      setLoading(false);
    }
  };

  // Assign Existing Staff as Branch Manager
  const handleAssignExistingManager = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch || !selectedStaffIdToAssign) return;
    setLoading(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/branches/manage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ASSIGN_BRANCH_MANAGER",
          branchId: selectedBranch.id,
          userId: selectedStaffIdToAssign,
        }),
      });

      const data = await res.json();
      if (data.success) {
        const assigned = allStaff.find((s) => s.id === selectedStaffIdToAssign);
        const newMgr: ManagerInfo | null = assigned
          ? {
              id: assigned.id,
              name: assigned.name,
              username: assigned.username,
              role: "BRANCH_MANAGER",
              status: assigned.status,
            }
          : null;

        setSelectedBranch((prev) => (prev ? { ...prev, manager: newMgr } : null));
        setBranches((prev) =>
          prev.map((b) => (b.id === selectedBranch.id ? { ...b, manager: newMgr } : b))
        );
        setStatusMessage(data.message);
        setSelectedStaffIdToAssign("");
        router.refresh();
      } else {
        setStatusMessage(data.message || "Gagal melantik Ketua Cawangan.");
      }
    } catch {
      setStatusMessage("Ralat sambungan.");
    } finally {
      setLoading(false);
    }
  };

  // Register New Branch Manager Account
  const handleCreateNewManager = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch || !newManagerForm.username || !newManagerForm.name) return;
    setLoading(true);
    setStatusMessage(null);
    setGeneratedManagerPass(null);

    try {
      const res = await fetch("/api/branches/manage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_BRANCH_MANAGER",
          branchId: selectedBranch.id,
          ...newManagerForm,
        }),
      });

      const data = await res.json();
      if (data.success) {
        const createdMgr: ManagerInfo = {
          id: data.manager?.id || `mgr-${Date.now()}`,
          name: newManagerForm.name,
          username: newManagerForm.username,
          role: "BRANCH_MANAGER",
          status: "ACTIVE",
        };

        setSelectedBranch((prev) => (prev ? { ...prev, manager: createdMgr } : null));
        setBranches((prev) =>
          prev.map((b) => (b.id === selectedBranch.id ? { ...b, manager: createdMgr } : b))
        );
        setStatusMessage(data.message);
        setGeneratedManagerPass(data.generatedPassword);
        setNewManagerForm({ name: "", username: "", email: "", phone: "", password: "" });
        router.refresh();
      } else {
        setStatusMessage(data.message || "Gagal mendaftarkan Ketua Cawangan.");
      }
    } catch {
      setStatusMessage("Ralat sambungan.");
    } finally {
      setLoading(false);
    }
  };

  // Remove Branch Manager Appointment
  const handleRemoveManager = async (userId: string) => {
    if (!selectedBranch) return;
    setLoading(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/branches/manage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REMOVE_BRANCH_MANAGER",
          branchId: selectedBranch.id,
          userId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSelectedBranch((prev) => (prev ? { ...prev, manager: null } : null));
        setBranches((prev) =>
          prev.map((b) => (b.id === selectedBranch.id ? { ...b, manager: null } : b))
        );
        setStatusMessage(data.message);
        router.refresh();
      }
    } catch {
      setStatusMessage("Ralat membatalkan perlantikan.");
    } finally {
      setLoading(false);
    }
  };

  // Branch Staff Operations
  const handleCreateBranchStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch || !newStaffForm.username || !newStaffForm.name) return;
    setLoading(true);
    setStatusMessage(null);
    setGeneratedStaffPass(null);

    try {
      const res = await fetch("/api/branches/manage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_BRANCH_STAFF",
          branchId: selectedBranch.id,
          ...newStaffForm,
        }),
      });

      const data = await res.json();
      if (data.success) {
        const addedStaff: UserItem = data.staff || {
          id: `u-${Date.now()}`,
          name: newStaffForm.name,
          username: newStaffForm.username,
          role: "COUNTER_STAFF",
          status: "ACTIVE",
          email: newStaffForm.email,
          phone: newStaffForm.phone,
          branchId: selectedBranch.id,
        };

        setSelectedBranch((prev) =>
          prev ? { ...prev, users: [...prev.users, addedStaff] } : null
        );
        setBranches((prev) =>
          prev.map((b) =>
            b.id === selectedBranch.id ? { ...b, users: [...b.users, addedStaff] } : b
          )
        );
        setStatusMessage(data.message);
        setGeneratedStaffPass(data.generatedPassword);
        setNewStaffForm({ name: "", username: "", email: "", phone: "", password: "" });
        router.refresh();
      } else {
        setStatusMessage(data.message || "Gagal mendaftarkan staf.");
      }
    } catch {
      setStatusMessage("Ralat sambungan.");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignExistingStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch || !selectedStaffToTransfer) return;
    setLoading(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/branches/manage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ASSIGN_EXISTING_STAFF",
          branchId: selectedBranch.id,
          userId: selectedStaffToTransfer,
        }),
      });

      const data = await res.json();
      if (data.success) {
        const found = allStaff.find((s) => s.id === selectedStaffToTransfer);
        if (found) {
          const updatedStaff: UserItem = { ...found, branchId: selectedBranch.id };
          setSelectedBranch((prev) =>
            prev ? { ...prev, users: [...prev.users.filter((u) => u.id !== found.id), updatedStaff] } : null
          );
          setBranches((prev) =>
            prev.map((b) =>
              b.id === selectedBranch.id
                ? { ...b, users: [...b.users.filter((u) => u.id !== found.id), updatedStaff] }
                : b
            )
          );
        }
        setStatusMessage(data.message);
        setSelectedStaffToTransfer("");
        router.refresh();
      } else {
        setStatusMessage(data.message || "Gagal menugaskan staf.");
      }
    } catch {
      setStatusMessage("Ralat sambungan.");
    } finally {
      setLoading(false);
    }
  };

  const handleUnassignStaff = async (userId: string) => {
    if (!selectedBranch) return;
    setLoading(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/branches/manage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UNASSIGN_BRANCH_STAFF",
          branchId: selectedBranch.id,
          userId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSelectedBranch((prev) =>
          prev ? { ...prev, users: prev.users.filter((u) => u.id !== userId) } : null
        );
        setBranches((prev) =>
          prev.map((b) =>
            b.id === selectedBranch.id
              ? { ...b, users: b.users.filter((u) => u.id !== userId) }
              : b
          )
        );
        setStatusMessage(data.message);
        router.refresh();
      }
    } catch {
      setStatusMessage("Ralat memindahkan staf.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetStaffPassword = async (userId: string, staffName: string) => {
    if (!selectedBranch) return;
    setLoading(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/branches/manage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RESET_BRANCH_STAFF_PASSWORD",
          branchId: selectedBranch.id,
          userId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStatusMessage(`Kata laluan bagi '${staffName}' telah diset kepada: ${data.generatedPassword}`);
      } else {
        setStatusMessage(data.message || "Gagal reset kata laluan.");
      }
    } catch {
      setStatusMessage("Ralat sambungan.");
    } finally {
      setLoading(false);
    }
  };

  // Counter Operations
  const handleAddCounter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch || !newCounterNo) return;
    setLoading(true);

    try {
      const res = await fetch("/api/branches/manage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ADD_COUNTER",
          branchId: selectedBranch.id,
          counterNo: newCounterNo,
          counterName: newCounterName || `Kaunter ${newCounterNo}`,
          zone: newCounterZone,
        }),
      });

      const data = await res.json();
      if (data.success) {
        const addedCounter: CounterItem = data.counter || {
          id: `c-${Date.now()}`,
          counterNo: newCounterNo,
          name: newCounterName || `Kaunter ${newCounterNo}`,
          zone: newCounterZone,
          priorityOrder: "A",
          status: "OPEN",
        };

        setSelectedBranch((prev) =>
          prev ? { ...prev, counters: [...prev.counters, addedCounter] } : null
        );
        setBranches((prev) =>
          prev.map((b) =>
            b.id === selectedBranch.id ? { ...b, counters: [...b.counters, addedCounter] } : b
          )
        );
        setNewCounterNo("");
        setNewCounterName("");
        setStatusMessage(data.message);
        router.refresh();
      }
    } catch {
      setStatusMessage("Ralat menambah kaunter.");
    } finally {
      setLoading(false);
    }
  };

  const startEditCounter = (c: CounterItem) => {
    setEditingCounterId(c.id);
    setEditCounterForm({
      counterNo: c.counterNo,
      name: c.name || `Kaunter ${c.counterNo}`,
      zone: c.zone || "Zon Utama",
      status: c.status || "OPEN",
      priorityOrder: c.priorityOrder || "A",
    });
  };

  const handleUpdateCounter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch || !editingCounterId) return;
    setLoading(true);

    try {
      const res = await fetch("/api/branches/manage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_COUNTER",
          branchId: selectedBranch.id,
          counterId: editingCounterId,
          counterNo: editCounterForm.counterNo,
          counterName: editCounterForm.name,
          zone: editCounterForm.zone,
          status: editCounterForm.status,
          priorityOrder: editCounterForm.priorityOrder,
        }),
      });

      const data = await res.json();
      if (data.success) {
        const updated = data.counter;
        setSelectedBranch((prev) =>
          prev
            ? {
                ...prev,
                counters: prev.counters.map((c) => (c.id === editingCounterId ? updated : c)),
              }
            : null
        );
        setBranches((prev) =>
          prev.map((b) =>
            b.id === selectedBranch.id
              ? {
                  ...b,
                  counters: b.counters.map((c) => (c.id === editingCounterId ? updated : c)),
                }
              : b
          )
        );
        setEditingCounterId(null);
        setStatusMessage(data.message);
        router.refresh();
      }
    } catch {
      setStatusMessage("Ralat mengemas kini kaunter.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCounter = async (counterId: string) => {
    if (!selectedBranch) return;
    setLoading(true);

    try {
      const res = await fetch("/api/branches/manage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DELETE_COUNTER",
          branchId: selectedBranch.id,
          counterId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSelectedBranch((prev) =>
          prev ? { ...prev, counters: prev.counters.filter((c) => c.id !== counterId) } : null
        );
        setBranches((prev) =>
          prev.map((b) =>
            b.id === selectedBranch.id
              ? { ...b, counters: b.counters.filter((c) => c.id !== counterId) }
              : b
          )
        );
        setStatusMessage(data.message);
        router.refresh();
      }
    } catch {
      setStatusMessage("Ralat memadam kaunter.");
    } finally {
      setLoading(false);
    }
  };

  // Category Operations
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch || !newCatName) return;
    setLoading(true);

    try {
      const res = await fetch("/api/branches/manage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ADD_CATEGORY",
          branchId: selectedBranch.id,
          catName: newCatName,
          prefixCode: newCatPrefix,
          startNumber: newCatStartNo,
          estimatedMinutes: newCatMinutes,
          nextCategoryId: newCatNextId || null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        const addedCat: CategoryItem = data.category || {
          id: `cat-${Date.now()}`,
          name: newCatName,
          prefixCode: newCatPrefix.toUpperCase(),
          startNumber: parseInt(newCatStartNo) || 1001,
          currentSeq: (parseInt(newCatStartNo) || 1001) - 1,
          estimatedMinutes: parseInt(newCatMinutes) || 5,
          nextCategoryId: newCatNextId || null,
        };

        setSelectedBranch((prev) =>
          prev ? { ...prev, categories: [...prev.categories, addedCat] } : null
        );
        setBranches((prev) =>
          prev.map((b) =>
            b.id === selectedBranch.id ? { ...b, categories: [...b.categories, addedCat] } : b
          )
        );
        setNewCatName("");
        setNewCatNextId("");
        setStatusMessage(data.message);
        router.refresh();
      } else {
        setStatusMessage(data.message || "Gagal menambah kategori.");
      }
    } catch {
      setStatusMessage("Ralat rangkaian semasa menambah kategori.");
    } finally {
      setLoading(false);
    }
  };

  const startEditCategory = (cat: CategoryItem) => {
    setEditingCatId(cat.id);
    setEditCatForm({
      name: cat.name,
      prefixCode: cat.prefixCode,
      startNumber: `${cat.startNumber}`,
      estimatedMinutes: `${cat.estimatedMinutes}`,
      nextCategoryId: cat.nextCategoryId || "",
    });
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch || !editingCatId) return;
    setLoading(true);

    try {
      const res = await fetch("/api/branches/manage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_CATEGORY",
          branchId: selectedBranch.id,
          categoryId: editingCatId,
          catName: editCatForm.name,
          prefixCode: editCatForm.prefixCode,
          startNumber: editCatForm.startNumber,
          estimatedMinutes: editCatForm.estimatedMinutes,
          nextCategoryId: editCatForm.nextCategoryId || null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        const updated = data.category;
        setSelectedBranch((prev) =>
          prev
            ? {
                ...prev,
                categories: prev.categories.map((c) => (c.id === editingCatId ? updated : c)),
              }
            : null
        );
        setBranches((prev) =>
          prev.map((b) =>
            b.id === selectedBranch.id
              ? {
                  ...b,
                  categories: b.categories.map((c) => (c.id === editingCatId ? updated : c)),
                }
              : b
          )
        );
        setEditingCatId(null);
        setStatusMessage(data.message);
        router.refresh();
      } else {
        setStatusMessage(data.message || "Gagal mengemas kini kategori.");
      }
    } catch {
      setStatusMessage("Ralat rangkaian semasa mengemas kini kategori.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!selectedBranch) return;
    setLoading(true);

    try {
      const res = await fetch("/api/branches/manage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DELETE_CATEGORY",
          branchId: selectedBranch.id,
          categoryId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSelectedBranch((prev) =>
          prev ? { ...prev, categories: prev.categories.filter((c) => c.id !== categoryId) } : null
        );
        setBranches((prev) =>
          prev.map((b) =>
            b.id === selectedBranch.id
              ? { ...b, categories: b.categories.filter((c) => c.id !== categoryId) }
              : b
          )
        );
        setStatusMessage(data.message);
        router.refresh();
      }
    } catch {
      setStatusMessage("Ralat memadam kategori.");
    } finally {
      setLoading(false);
    }
  };

  const quotaPercent = Math.min(100, Math.round((tenant.usedBranches / tenant.maxBranches) * 100));
  const isQuotaFull = tenant.usedBranches >= tenant.maxBranches;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 font-sans select-none">
      {/* Executive Branch Hub Header */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-400/30 text-xs font-black rounded-full uppercase tracking-wider">
              Pelan {tenant.planType}
            </span>
            <span className="text-xs font-mono text-slate-400">/{tenant.slug}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Pusat Pengurusan Cawangan &amp; Kaunter
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Kawal profil cawangan, Ketua Cawangan, staf kaunter, waktu operasi, had geofence GPS, dan susun atur kaunter bagi {tenant.name}.
          </p>
        </div>

        {/* Quota Meter & Add Branch Action */}
        <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 space-y-3 shrink-0">
          <div className="flex items-center justify-between gap-4 text-xs font-bold">
            <span className="text-slate-400">Penggunaan Kuota Cawangan:</span>
            <span className="font-mono text-cyan-300 font-black">
              {tenant.usedBranches} / {tenant.maxBranches} Cawangan
            </span>
          </div>

          <div className="w-48 bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                quotaPercent >= 100 ? "bg-amber-500" : "bg-blue-500"
              }`}
              style={{ width: `${quotaPercent}%` }}
            />
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            disabled={isQuotaFull}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer ${
              isQuotaFull
                ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
            }`}
          >
            <span>+ Tambah Cawangan Baharu</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-4 bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold rounded-2xl flex items-center justify-between shadow-xs animate-in fade-in">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage(null)} className="text-base font-bold cursor-pointer">&times;</button>
        </div>
      )}

      {/* Branches Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {branches.map((b) => (
          <div
            key={b.id}
            className="bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition p-6 space-y-5 flex flex-col justify-between"
          >
            <div className="space-y-3">
              {/* Card Top */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900">{b.name}</h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-blue-50 text-blue-700 font-black rounded-md border border-blue-200">
                      {b.code}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-1">{b.address || "Tiada alamat fizikal"}</p>
                </div>
              </div>

              {/* BRANCH MANAGER PILL IN CARD */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    👔
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ketua Cawangan</p>
                    {b.manager ? (
                      <p className="text-xs font-black text-slate-900 truncate">
                        {b.manager.name || b.manager.username}{" "}
                        <span className="text-[10px] font-mono text-slate-400 font-normal">(@{b.manager.username})</span>
                      </p>
                    ) : (
                      <p className="text-xs font-bold text-amber-600">Belum Dilantik</p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => openSettings(b, "manager")}
                  className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-[11px] font-bold rounded-lg transition shrink-0 cursor-pointer shadow-2xs"
                >
                  {b.manager ? "Tukar" : "+ Lantik"}
                </button>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-center">
                <div className="bg-slate-50 p-2 rounded-xl">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Kaunter</p>
                  <p className="text-sm font-black text-slate-900 mt-0.5">{b.counters.length}</p>
                </div>

                <div className="bg-slate-50 p-2 rounded-xl">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Kategori</p>
                  <p className="text-sm font-black text-blue-600 mt-0.5">{b.categories.length}</p>
                </div>

                <div className="bg-slate-50 p-2 rounded-xl">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Staf</p>
                  <p className="text-sm font-black text-indigo-600 mt-0.5">{b.users.length}</p>
                </div>

                <div className="bg-slate-50 p-2 rounded-xl">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Tiket Hari Ini</p>
                  <p className="text-sm font-black text-emerald-600 mt-0.5">{b.todayTicketsCount}</p>
                </div>
              </div>

              {/* Operating Hours & Geofence Tag */}
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                <span className="px-2.5 py-1 bg-gray-100 rounded-lg font-medium">
                  ⏱️ {b.operatingHours?.openTime || "08:30"} - {b.operatingHours?.closeTime || "17:00"}
                </span>
                <span className="px-2.5 py-1 bg-gray-100 rounded-lg font-medium">
                  🎯 Radius QR: {b.qrRadiusMeters}m
                </span>
              </div>
            </div>

            {/* Actions Strip */}
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => handleSetActiveBranch(b.id, b.name)}
                  disabled={loading}
                  className="py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1"
                >
                  <span>🔄 Jadikan Aktif</span>
                </button>

                <button
                  onClick={() => openSettings(b)}
                  className="py-2 px-3 bg-slate-900 hover:bg-black text-white font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1"
                >
                  <span>⚙️ Tetapan Penuh</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <Link
                  href={`/qrcode/print/${b.id}`}
                  target="_blank"
                  className="py-1.5 px-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium rounded-lg text-center transition"
                >
                  🖨️ Poster QR A4 ↗
                </Link>

                <Link
                  href={`/kiosk/${tenant.slug}`}
                  target="_blank"
                  className="py-1.5 px-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium rounded-lg text-center transition"
                >
                  📱 Buka Kiosk ↗
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL 1: ADD NEW BRANCH */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in zoom-in-95">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl font-sans">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <p className="text-xs font-mono font-bold text-blue-600">Pendaftaran Cawangan Baharu</p>
                <h3 className="text-base font-black text-gray-900 mt-0.5">Tambah Cawangan Operasi</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateBranch} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1 uppercase tracking-wider">Nama Cawangan</label>
                <input
                  type="text"
                  required
                  placeholder="Cth: Cawangan Bangi Sentral"
                  value={newBranch.name}
                  onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-2xl bg-gray-50 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1 uppercase tracking-wider">Kod Cawangan</label>
                  <input
                    type="text"
                    required
                    placeholder="Cth: BNG01"
                    value={newBranch.code}
                    onChange={(e) => setNewBranch({ ...newBranch, code: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-2xl bg-gray-50 font-mono font-bold uppercase"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1 uppercase tracking-wider">No. Telefon Premis</label>
                  <input
                    type="text"
                    placeholder="Cth: 03-89221144"
                    value={newBranch.phone}
                    onChange={(e) => setNewBranch({ ...newBranch, phone: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-2xl bg-gray-50 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1 uppercase tracking-wider">Alamat Penuh Cawangan</label>
                <textarea
                  rows={2}
                  placeholder="No. 45, Jalan Medan Pusat 2D, Seksyen 9, 43650 Bandar Baru Bangi"
                  value={newBranch.address}
                  onChange={(e) => setNewBranch({ ...newBranch, address: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-2xl bg-gray-50"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1 uppercase tracking-wider">Jam Buka</label>
                  <input
                    type="time"
                    value={newBranch.openTime}
                    onChange={(e) => setNewBranch({ ...newBranch, openTime: e.target.value })}
                    className="w-full p-2.5 border border-gray-300 rounded-xl bg-gray-50 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1 uppercase tracking-wider">Jam Tutup</label>
                  <input
                    type="time"
                    value={newBranch.closeTime}
                    onChange={(e) => setNewBranch({ ...newBranch, closeTime: e.target.value })}
                    className="w-full p-2.5 border border-gray-300 rounded-xl bg-gray-50 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1 uppercase tracking-wider">Radius QR (M)</label>
                  <input
                    type="number"
                    min="50"
                    step="50"
                    value={newBranch.qrRadiusMeters}
                    onChange={(e) => setNewBranch({ ...newBranch, qrRadiusMeters: e.target.value })}
                    className="w-full p-2.5 border border-gray-300 rounded-xl bg-gray-50 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                >
                  {loading ? "Mencipta..." : "Cipta Cawangan ➔"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULLSCREEN BRANCH MANAGEMENT HUB */}
      {selectedBranch && (
        <div className="fixed inset-0 z-50 bg-slate-50 text-slate-900 flex flex-col min-h-screen overflow-y-auto animate-in fade-in duration-150 font-sans select-none">
          {/* Executive Top Sticky Command Header */}
          <div className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-lg border-b border-slate-800 text-white px-4 sm:px-8 py-3.5 shadow-xl">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedBranch(null)}
                  className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded-xl transition cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-xs"
                >
                  <span>←</span>
                  <span>Kembali</span>
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-black px-2.5 py-0.5 bg-blue-500/20 text-cyan-300 border border-blue-400/30 rounded-md">
                      {selectedBranch.code}
                    </span>
                    <h2 className="text-base sm:text-xl font-black text-white">{selectedBranch.name}</h2>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">
                    Pusat Kawalan Tetapan Cawangan Penuh: Profil, Ketua Cawangan, Staf, Kaunter, Kategori &amp; Peranti
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <Link
                  href={`/qrcode/print/${selectedBranch.id}`}
                  target="_blank"
                  className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-xl transition font-medium"
                >
                  🖨️ Poster QR A4 ↗
                </Link>
                <Link
                  href={`/kiosk/${tenant.slug}`}
                  target="_blank"
                  className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-xl transition font-medium"
                >
                  📱 Buka Kiosk ↗
                </Link>
                <button
                  onClick={() => setSelectedBranch(null)}
                  className="px-4 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-xl transition font-bold cursor-pointer"
                >
                  ✖ Tutup
                </button>
              </div>
            </div>
          </div>

          {/* Main Fullscreen Workspace Container */}
          <div className="max-w-7xl mx-auto w-full p-4 sm:p-8 space-y-6 flex-1">
            {/* 7-Tab Navigation Ribbon */}
            <div className="bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-2 overflow-x-auto">
              <button
                onClick={() => setActiveSettingsTab("profile")}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
                  activeSettingsTab === "profile" ? "bg-slate-900 text-white shadow-xs" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <span>📍</span>
                <span>Profil &amp; Lokasi</span>
              </button>

              <button
                onClick={() => setActiveSettingsTab("manager")}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
                  activeSettingsTab === "manager" ? "bg-slate-900 text-white shadow-xs" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <span>👔</span>
                <span>Ketua Cawangan</span>
              </button>

              <button
                onClick={() => setActiveSettingsTab("staff")}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
                  activeSettingsTab === "staff" ? "bg-slate-900 text-white shadow-xs" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <span>👥</span>
                <span>Staf Cawangan ({selectedBranch.users.length})</span>
              </button>

              <button
                onClick={() => setActiveSettingsTab("schedule")}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
                  activeSettingsTab === "schedule" ? "bg-slate-900 text-white shadow-xs" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <span>⏱️</span>
                <span>Waktu &amp; Geofence</span>
              </button>

              <button
                onClick={() => setActiveSettingsTab("counters")}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
                  activeSettingsTab === "counters" ? "bg-slate-900 text-white shadow-xs" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <span>🏢</span>
                <span>Kaunter Fizikal ({selectedBranch.counters.length})</span>
              </button>

              <button
                onClick={() => setActiveSettingsTab("categories")}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
                  activeSettingsTab === "categories" ? "bg-slate-900 text-white shadow-xs" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <span>🏷️</span>
                <span>Kategori Servis ({selectedBranch.categories.length})</span>
              </button>

              <button
                onClick={() => setActiveSettingsTab("devices")}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
                  activeSettingsTab === "devices" ? "bg-slate-900 text-white shadow-xs" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <span>📺</span>
                <span>Peranti Skrin ({selectedBranch.devices.length})</span>
              </button>
            </div>

            {/* Main Panel Content Card */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-8 space-y-6">
              {/* TAB 1: PROFILE FORM */}
            {activeSettingsTab === "profile" && (
              <form onSubmit={handleSaveBranchProfile} className="space-y-4 text-xs">
                <div className="space-y-4">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1 uppercase tracking-wider">Nama Cawangan</label>
                    <input
                      type="text"
                      required
                      value={editProfile.name}
                      onChange={(e) => setEditProfile({ ...editProfile, name: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-2xl bg-gray-50 font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1 uppercase tracking-wider">Kod Cawangan</label>
                      <input
                        type="text"
                        required
                        value={editProfile.code}
                        onChange={(e) => setEditProfile({ ...editProfile, code: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-2xl bg-gray-50 font-mono font-bold uppercase"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1 uppercase tracking-wider">No. Telefon</label>
                      <input
                        type="text"
                        value={editProfile.phone}
                        onChange={(e) => setEditProfile({ ...editProfile, phone: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-2xl bg-gray-50 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1 uppercase tracking-wider">Alamat Lengkap</label>
                    <textarea
                      rows={3}
                      value={editProfile.address}
                      onChange={(e) => setEditProfile({ ...editProfile, address: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-2xl bg-gray-50"
                    />
                  </div>
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="py-3 px-6 bg-slate-900 hover:bg-black text-white font-bold rounded-2xl shadow-md transition cursor-pointer disabled:opacity-50"
                  >
                    {loading ? "Menyimpan..." : "Simpan Profil Cawangan 💾"}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: BRANCH MANAGER MANAGEMENT */}
            {activeSettingsTab === "manager" && (
              <div className="space-y-6 text-xs">
                <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-3xl flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Ketua Cawangan Semasa</p>
                    {selectedBranch.manager ? (
                      <div className="mt-1">
                        <p className="text-base font-black text-slate-900">
                          {selectedBranch.manager.name || selectedBranch.manager.username}
                        </p>
                        <p className="text-xs font-mono text-slate-500">
                          Username: @{selectedBranch.manager.username} • Status: {selectedBranch.manager.status}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm font-bold text-amber-700 mt-1">
                        ⚠️ Cawangan ini belum mempunyai Ketua Cawangan yang dilantik.
                      </p>
                    )}
                  </div>

                  {selectedBranch.manager && (
                    <button
                      onClick={() => handleRemoveManager(selectedBranch.manager!.id)}
                      disabled={loading}
                      className="px-3.5 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 font-bold rounded-xl transition cursor-pointer"
                    >
                      Gugurkan Jawatan
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Option 1: Assign from existing staff */}
                  <form onSubmit={handleAssignExistingManager} className="p-5 bg-gray-50 rounded-3xl border border-gray-200 space-y-4">
                    <div>
                      <h4 className="font-black text-gray-900 text-sm">Pilihan 1: Lantik Staf Sedia Ada</h4>
                      <p className="text-[11px] text-gray-500 mt-0.5">Pilih staf organisasi ini dan naikkan ke peranan BRANCH_MANAGER.</p>
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1.5">Pilih Staf:</label>
                      <select
                        value={selectedStaffIdToAssign}
                        onChange={(e) => setSelectedStaffIdToAssign(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-xl bg-white font-bold"
                      >
                        <option value="">-- Pilih Staf --</option>
                        {allStaff.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name || s.username} (@{s.username}) - {s.role}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !selectedStaffIdToAssign}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
                    >
                      Lantik Sebagai Ketua Cawangan ➔
                    </button>
                  </form>

                  {/* Option 2: Register New Manager */}
                  <form onSubmit={handleCreateNewManager} className="p-5 bg-gray-50 rounded-3xl border border-gray-200 space-y-3">
                    <div>
                      <h4 className="font-black text-gray-900 text-sm">Pilihan 2: Daftar Ketua Baharu</h4>
                      <p className="text-[11px] text-gray-500 mt-0.5">Cipta akaun Ketua Cawangan baharu secara terus.</p>
                    </div>

                    <input
                      type="text"
                      required
                      placeholder="Nama Penuh (cth: En. Razak)"
                      value={newManagerForm.name}
                      onChange={(e) => setNewManagerForm({ ...newManagerForm, name: e.target.value })}
                      className="w-full p-2.5 border border-gray-300 rounded-xl bg-white"
                    />

                    <input
                      type="text"
                      required
                      placeholder="Username (cth: manager_bangi)"
                      value={newManagerForm.username}
                      onChange={(e) => setNewManagerForm({ ...newManagerForm, username: e.target.value })}
                      className="w-full p-2.5 border border-gray-300 rounded-xl bg-white font-mono"
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="email"
                        placeholder="Emel"
                        value={newManagerForm.email}
                        onChange={(e) => setNewManagerForm({ ...newManagerForm, email: e.target.value })}
                        className="w-full p-2.5 border border-gray-300 rounded-xl bg-white"
                      />
                      <input
                        type="text"
                        placeholder="No. Telefon"
                        value={newManagerForm.phone}
                        onChange={(e) => setNewManagerForm({ ...newManagerForm, phone: e.target.value })}
                        className="w-full p-2.5 border border-gray-300 rounded-xl bg-white font-mono"
                      />
                    </div>

                    <input
                      type="text"
                      placeholder="Kata Laluan (Default: admin123)"
                      value={newManagerForm.password}
                      onChange={(e) => setNewManagerForm({ ...newManagerForm, password: e.target.value })}
                      className="w-full p-2.5 border border-gray-300 rounded-xl bg-white font-mono"
                    />

                    <button
                      type="submit"
                      disabled={loading || !newManagerForm.username || !newManagerForm.name}
                      className="w-full py-2.5 bg-slate-900 hover:bg-black text-white font-bold rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
                    >
                      Daftar &amp; Lantik Ketua Cawangan ➔
                    </button>
                  </form>
                </div>

                {generatedManagerPass && (
                  <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2 animate-in zoom-in-95">
                    <p className="text-xs text-gray-300">Akaun Ketua Cawangan berjaya dicipta:</p>
                    <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <span className="font-mono text-emerald-400 font-bold">Kata Laluan: {generatedManagerPass}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: BRANCH STAFF MANAGEMENT */}
            {activeSettingsTab === "staff" && (
              <div className="space-y-6 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Register New Counter Staff */}
                  <form onSubmit={handleCreateBranchStaff} className="p-5 bg-gray-50 rounded-3xl border border-gray-200 space-y-3">
                    <div>
                      <h4 className="font-black text-gray-900 text-sm">+ Daftar Staf Kaunter Baharu</h4>
                      <p className="text-[11px] text-gray-500 mt-0.5">Daftar akaun staf baharu khusus untuk cawangan ini.</p>
                    </div>

                    <input
                      type="text"
                      required
                      placeholder="Nama Staf (cth: Siti Nurhaliza)"
                      value={newStaffForm.name}
                      onChange={(e) => setNewStaffForm({ ...newStaffForm, name: e.target.value })}
                      className="w-full p-2.5 border border-gray-300 rounded-xl bg-white"
                    />

                    <input
                      type="text"
                      required
                      placeholder="Username (cth: siti_bangi)"
                      value={newStaffForm.username}
                      onChange={(e) => setNewStaffForm({ ...newStaffForm, username: e.target.value })}
                      className="w-full p-2.5 border border-gray-300 rounded-xl bg-white font-mono"
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="email"
                        placeholder="Emel Staf"
                        value={newStaffForm.email}
                        onChange={(e) => setNewStaffForm({ ...newStaffForm, email: e.target.value })}
                        className="w-full p-2.5 border border-gray-300 rounded-xl bg-white"
                      />
                      <input
                        type="text"
                        placeholder="No. Telefon"
                        value={newStaffForm.phone}
                        onChange={(e) => setNewStaffForm({ ...newStaffForm, phone: e.target.value })}
                        className="w-full p-2.5 border border-gray-300 rounded-xl bg-white font-mono"
                      />
                    </div>

                    <input
                      type="text"
                      placeholder="Kata Laluan Sementara (Default: admin123)"
                      value={newStaffForm.password}
                      onChange={(e) => setNewStaffForm({ ...newStaffForm, password: e.target.value })}
                      className="w-full p-2.5 border border-gray-300 rounded-xl bg-white font-mono"
                    />

                    <button
                      type="submit"
                      disabled={loading || !newStaffForm.username || !newStaffForm.name}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
                    >
                      Daftar Staf Kaunter ➔
                    </button>
                  </form>

                  {/* Transfer / Assign Existing Staff */}
                  <form onSubmit={handleAssignExistingStaff} className="p-5 bg-gray-50 rounded-3xl border border-gray-200 space-y-4">
                    <div>
                      <h4 className="font-black text-gray-900 text-sm">🔄 Tugaskan Staf Sedia Ada</h4>
                      <p className="text-[11px] text-gray-500 mt-0.5">Pindahkan staf daripada cawangan lain ke cawangan ini.</p>
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1.5">Pilih Staf:</label>
                      <select
                        value={selectedStaffToTransfer}
                        onChange={(e) => setSelectedStaffToTransfer(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-xl bg-white font-bold"
                      >
                        <option value="">-- Pilih Staf Organisasi --</option>
                        {allStaff
                          .filter((s) => s.branchId !== selectedBranch.id)
                          .map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name || s.username} (@{s.username}) - {s.role}
                            </option>
                          ))}
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !selectedStaffToTransfer}
                      className="w-full py-2.5 bg-slate-900 hover:bg-black text-white font-bold rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
                    >
                      Pindahkan ke Cawangan Ini ➔
                    </button>
                  </form>
                </div>

                {generatedStaffPass && (
                  <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2 animate-in zoom-in-95">
                    <p className="text-xs text-gray-300">Akaun Staf berjaya didaftarkan:</p>
                    <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <span className="font-mono text-emerald-400 font-bold">Kata Laluan: {generatedStaffPass}</span>
                    </div>
                  </div>
                )}

                {/* Branch Staff Table */}
                <div className="space-y-2">
                  <h4 className="font-bold text-gray-900 uppercase tracking-wider">Senarai Staf Bertugas di Cawangan Ini:</h4>
                  <div className="overflow-x-auto border border-gray-200 rounded-2xl">
                    <table className="w-full text-left text-xs text-gray-600">
                      <thead className="bg-gray-50 text-[11px] font-bold text-gray-500 border-b border-gray-200 uppercase">
                        <tr>
                          <th className="px-4 py-3">Nama &amp; Username</th>
                          <th className="px-4 py-3">Peranan</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 text-right">Tindakan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {selectedBranch.users.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                              Tiada staf berdaftar di cawangan ini lagi.
                            </td>
                          </tr>
                        ) : (
                          selectedBranch.users.map((u) => (
                            <tr key={u.id}>
                              <td className="px-4 py-3">
                                <p className="font-bold text-gray-900">{u.name || u.username}</p>
                                <p className="text-[10px] font-mono text-gray-400">@{u.username}</p>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                                  u.role === "BRANCH_MANAGER"
                                    ? "bg-purple-50 text-purple-700 border border-purple-200"
                                    : "bg-blue-50 text-blue-700 border border-blue-200"
                                }`}>
                                  {u.role}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-black uppercase">
                                  {u.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right space-x-1.5">
                                <button
                                  onClick={() => handleResetStaffPassword(u.id, u.name || u.username)}
                                  disabled={loading}
                                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded-lg transition cursor-pointer"
                                  title="Reset Kata Laluan"
                                >
                                  🔑 Reset Pass
                                </button>

                                <button
                                  onClick={() => handleUnassignStaff(u.id)}
                                  disabled={loading}
                                  className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-lg transition cursor-pointer"
                                  title="Keluarkan dari Cawangan"
                                >
                                  Keluarkan
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: SCHEDULE & GEOFENCE */}
            {activeSettingsTab === "schedule" && (
              <form onSubmit={handleSaveBranchProfile} className="space-y-6 text-xs">
                <div className="space-y-5">
                  {/* Operating Hours Section */}
                  <div className="p-5 bg-gray-50 rounded-2xl border border-gray-200 space-y-4">
                    <p className="font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 text-xs">
                      <span>⏱️</span>
                      <span>Waktu Operasi Cawangan</span>
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-gray-700 mb-1">Waktu Mula Operasi</label>
                        <input
                          type="time"
                          value={editProfile.openTime}
                          onChange={(e) => setEditProfile({ ...editProfile, openTime: e.target.value })}
                          className="w-full p-3 border border-gray-300 rounded-xl bg-white font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-gray-700 mb-1">Waktu Tamat Operasi</label>
                        <input
                          type="time"
                          value={editProfile.closeTime}
                          onChange={(e) => setEditProfile({ ...editProfile, closeTime: e.target.value })}
                          className="w-full p-3 border border-gray-300 rounded-xl bg-white font-mono font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* OpenStreetMap Geofence Picker Section */}
                  <div className="p-5 bg-gray-50 rounded-2xl border border-gray-200 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <p className="font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 text-xs">
                          <span>📍</span>
                          <span>Tetapan Lokasi GPS &amp; Radius Geofence (OpenStreetMap)</span>
                        </p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          Tentukan titik koordinat tepat premis anda untuk mengawal had radius imbasan QR tiket pelanggan.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="font-bold text-gray-700 text-xs shrink-0">Radius (Meter):</label>
                        <select
                          value={editProfile.qrRadiusMeters}
                          onChange={(e) =>
                            setEditProfile({ ...editProfile, qrRadiusMeters: parseInt(e.target.value) || 500 })
                          }
                          className="p-2 border border-gray-300 rounded-xl bg-white font-mono font-bold text-xs"
                        >
                          <option value="100">100 Meter (Sangat Ketat / Dalam Bangunan)</option>
                          <option value="300">300 Meter (Kawasan Premis &amp; Tempat Letak Kereta)</option>
                          <option value="500">500 Meter (Standard Premis)</option>
                          <option value="1000">1,000 Meter / 1 KM (Kawasan Sekitar)</option>
                          <option value="3000">3,000 Meter / 3 KM (Satu Pekan)</option>
                          <option value="10000">10,000 Meter / 10 KM (Tiada Had Ketat)</option>
                        </select>
                      </div>
                    </div>

                    {/* Leaflet & OpenStreetMap Interactive Picker Component */}
                    <GeofenceMapPicker
                      latitude={editProfile.latitude}
                      longitude={editProfile.longitude}
                      radiusMeters={editProfile.qrRadiusMeters}
                      onLocationChange={(lat, lng) => {
                        setEditProfile((prev) => ({
                          ...prev,
                          latitude: lat,
                          longitude: lng,
                        }));
                      }}
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="py-3 px-8 bg-slate-900 hover:bg-black text-white font-bold rounded-2xl shadow-lg transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  >
                    <span>💾</span>
                    <span>{loading ? "Menyimpan..." : "Simpan Waktu & Lokasi Geofence"}</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB 5: COUNTERS MANAGEMENT (WITH EDIT & DELETE) */}
            {activeSettingsTab === "counters" && (
              <div className="space-y-6 text-xs">
                {/* Edit Counter Subform */}
                {editingCounterId ? (
                  <form onSubmit={handleUpdateCounter} className="p-4 bg-blue-50/80 rounded-2xl border border-blue-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-black text-blue-900 uppercase tracking-wider">✏️ Kemas Kini Kaunter {editCounterForm.counterNo}:</p>
                      <button
                        type="button"
                        onClick={() => setEditingCounterId(null)}
                        className="text-xs font-bold text-blue-700 hover:underline cursor-pointer"
                      >
                        Batal
                      </button>
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                      <div>
                        <label className="block font-bold text-gray-700 mb-1">No. Kaunter</label>
                        <input
                          type="text"
                          required
                          value={editCounterForm.counterNo}
                          onChange={(e) => setEditCounterForm({ ...editCounterForm, counterNo: e.target.value })}
                          className="p-2.5 border border-blue-300 rounded-xl bg-white font-mono font-bold w-full"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-gray-700 mb-1">Nama Paparan</label>
                        <input
                          type="text"
                          required
                          value={editCounterForm.name}
                          onChange={(e) => setEditCounterForm({ ...editCounterForm, name: e.target.value })}
                          className="p-2.5 border border-blue-300 rounded-xl bg-white w-full font-bold"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-gray-700 mb-1">Zon Kaunter</label>
                        <input
                          type="text"
                          value={editCounterForm.zone}
                          onChange={(e) => setEditCounterForm({ ...editCounterForm, zone: e.target.value })}
                          className="p-2.5 border border-blue-300 rounded-xl bg-white w-full"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-gray-700 mb-1">Status Kaunter</label>
                        <select
                          value={editCounterForm.status}
                          onChange={(e) => setEditCounterForm({ ...editCounterForm, status: e.target.value })}
                          className="p-2.5 border border-blue-300 rounded-xl bg-white w-full font-bold"
                        >
                          <option value="OPEN">OPEN (Aktif)</option>
                          <option value="CLOSED">CLOSED (Tutup)</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl cursor-pointer shadow-xs"
                      >
                        Simpan Perubahan Kaunter 💾
                      </button>
                    </div>
                  </form>
                ) : (
                  /* Add Counter Form */
                  <form onSubmit={handleAddCounter} className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                    <p className="font-bold text-gray-900 uppercase tracking-wider">+ Tambah Kaunter Fizikal Baharu:</p>
                    <div className="grid grid-cols-3 gap-3">
                      <input
                        type="text"
                        required
                        placeholder="No. Kaunter (cth: 3)"
                        value={newCounterNo}
                        onChange={(e) => setNewCounterNo(e.target.value)}
                        className="p-2.5 border border-gray-300 rounded-xl bg-white font-mono font-bold"
                      />
                      <input
                        type="text"
                        placeholder="Nama (cth: Kaunter 3)"
                        value={newCounterName}
                        onChange={(e) => setNewCounterName(e.target.value)}
                        className="p-2.5 border border-gray-300 rounded-xl bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Zon (cth: Farmasi)"
                        value={newCounterZone}
                        onChange={(e) => setNewCounterZone(e.target.value)}
                        className="p-2.5 border border-gray-300 rounded-xl bg-white"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl cursor-pointer"
                    >
                      + Tambah Kaunter
                    </button>
                  </form>
                )}

                {/* Counters Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-600">
                    <thead className="bg-gray-50 text-[11px] font-bold text-gray-500 border-b border-gray-200 uppercase">
                      <tr>
                        <th className="px-4 py-3">No. Kaunter</th>
                        <th className="px-4 py-3">Nama Paparan</th>
                        <th className="px-4 py-3">Zon</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Tindakan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedBranch.counters.map((c) => (
                        <tr key={c.id}>
                          <td className="px-4 py-3 font-mono font-black text-gray-900 text-sm">{c.counterNo}</td>
                          <td className="px-4 py-3 font-bold text-gray-900">{c.name || `Kaunter ${c.counterNo}`}</td>
                          <td className="px-4 py-3">{c.zone || "Zon Utama"}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                              c.status === "OPEN"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-gray-100 text-gray-600 border border-gray-200"
                            }`}>
                              {c.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right space-x-1.5">
                            <button
                              onClick={() => startEditCounter(c)}
                              disabled={loading}
                              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg transition cursor-pointer"
                            >
                              ✏️ Kemaskini
                            </button>

                            <button
                              onClick={() => handleDeleteCounter(c.id)}
                              disabled={loading || selectedBranch.counters.length <= 1}
                              className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-lg transition disabled:opacity-30 cursor-pointer"
                            >
                              Padam
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 6: CATEGORIES MANAGEMENT (WITH EDIT & DELETE) */}
            {activeSettingsTab === "categories" && (
              <div className="space-y-6 text-xs">
                {/* Edit Category Subform */}
                {editingCatId ? (
                  <form onSubmit={handleUpdateCategory} className="p-4 bg-blue-50/80 rounded-2xl border border-blue-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-black text-blue-900 uppercase tracking-wider">✏️ Kemas Kini Kategori ({editCatForm.prefixCode}):</p>
                      <button
                        type="button"
                        onClick={() => setEditingCatId(null)}
                        className="text-xs font-bold text-blue-700 hover:underline cursor-pointer"
                      >
                        Batal
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block font-bold text-gray-700 mb-1">Nama Urusan</label>
                        <input
                          type="text"
                          required
                          value={editCatForm.name}
                          onChange={(e) => setEditCatForm({ ...editCatForm, name: e.target.value })}
                          className="p-2.5 border border-blue-300 rounded-xl bg-white w-full font-bold"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-gray-700 mb-1">Kod Prefix</label>
                        <input
                          type="text"
                          maxLength={2}
                          required
                          value={editCatForm.prefixCode}
                          onChange={(e) => setEditCatForm({ ...editCatForm, prefixCode: e.target.value.toUpperCase() })}
                          className="p-2.5 border border-blue-300 rounded-xl bg-white font-mono font-bold text-center w-full"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-gray-700 mb-1">No. Mula</label>
                        <input
                          type="number"
                          value={editCatForm.startNumber}
                          onChange={(e) => setEditCatForm({ ...editCatForm, startNumber: e.target.value })}
                          className="p-2.5 border border-blue-300 rounded-xl bg-white font-mono w-full"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-gray-700 mb-1">Anggaran Minit</label>
                        <input
                          type="number"
                          value={editCatForm.estimatedMinutes}
                          onChange={(e) => setEditCatForm({ ...editCatForm, estimatedMinutes: e.target.value })}
                          className="p-2.5 border border-blue-300 rounded-xl bg-white font-mono w-full"
                        />
                      </div>

                      <div className="sm:col-span-5">
                        <label className="block font-bold text-gray-700 mb-1">
                          Aliran Peringkat Seterusnya (Next Stage Pipeline)
                        </label>
                        <select
                          value={editCatForm.nextCategoryId}
                          onChange={(e) => setEditCatForm({ ...editCatForm, nextCategoryId: e.target.value })}
                          className="p-2.5 border border-blue-300 rounded-xl bg-white w-full font-medium"
                        >
                          <option value="">-- Tiada (Tamat / Urusan 1 Panggilan Sahaja) --</option>
                          {selectedBranch.categories
                            .filter((c) => c.id !== editingCatId)
                            .map((c) => (
                              <option key={c.id} value={c.id}>
                                ➔ Hantar ke: {c.name} ({c.prefixCode})
                              </option>
                            ))}
                        </select>
                        <p className="text-[11px] text-gray-400 mt-1">
                          Sesuai untuk aliran berbilang bilik (cth: Pendaftaran ➔ Bilik Rawatan ➔ Farmasi &amp; Bayaran).
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl cursor-pointer shadow-xs"
                      >
                        Simpan Perubahan Kategori 💾
                      </button>
                    </div>
                  </form>
                ) : (
                  /* Add Category Form */
                  <form onSubmit={handleAddCategory} className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                    <p className="font-bold text-gray-900 uppercase tracking-wider">+ Tambah Kategori Urusan Tiket:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <input
                        type="text"
                        required
                        placeholder="Nama (cth: Farmasi & Ubat)"
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        className="p-2.5 border border-gray-300 rounded-xl bg-white sm:col-span-2"
                      />
                      <input
                        type="text"
                        maxLength={2}
                        placeholder="Kod (A/B/C)"
                        value={newCatPrefix}
                        onChange={(e) => setNewCatPrefix(e.target.value.toUpperCase())}
                        className="p-2.5 border border-gray-300 rounded-xl bg-white font-mono font-bold text-center"
                      />
                      <input
                        type="number"
                        placeholder="Anggaran Minit"
                        value={newCatMinutes}
                        onChange={(e) => setNewCatMinutes(e.target.value)}
                        className="p-2.5 border border-gray-300 rounded-xl bg-white font-mono"
                      />
                      <div className="sm:col-span-4">
                        <select
                          value={newCatNextId}
                          onChange={(e) => setNewCatNextId(e.target.value)}
                          className="p-2.5 border border-gray-300 rounded-xl bg-white w-full text-xs"
                        >
                          <option value="">-- Aliran Seterusnya: Tiada (Tamat 1 Panggilan) --</option>
                          {selectedBranch.categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              ➔ Hantar ke: {c.name} ({c.prefixCode})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl cursor-pointer"
                    >
                      + Tambah Kategori
                    </button>
                  </form>
                )}

                {/* Categories Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-600">
                    <thead className="bg-gray-50 text-[11px] font-bold text-gray-500 border-b border-gray-200 uppercase">
                      <tr>
                        <th className="px-4 py-3">Kod Prefix</th>
                        <th className="px-4 py-3">Nama Urusan</th>
                        <th className="px-4 py-3">Aliran Seterusnya</th>
                        <th className="px-4 py-3">Nombor Mula</th>
                        <th className="px-4 py-3">Anggaran Masa</th>
                        <th className="px-4 py-3 text-right">Tindakan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedBranch.categories.map((cat) => {
                        const nextCat = selectedBranch.categories.find((c) => c.id === cat.nextCategoryId);
                        return (
                          <tr key={cat.id}>
                            <td className="px-4 py-3 font-mono font-black text-blue-700 text-base">{cat.prefixCode}</td>
                            <td className="px-4 py-3 font-bold text-gray-900">{cat.name}</td>
                            <td className="px-4 py-3">
                              {nextCat ? (
                                <span className="px-2.5 py-1 bg-teal-50 text-teal-700 border border-teal-200 rounded-lg font-bold text-[11px] flex items-center gap-1 w-fit">
                                  <span>➔</span>
                                  <span>{nextCat.name}</span>
                                </span>
                              ) : (
                                <span className="text-gray-400 font-mono text-[11px]">🏁 Tamat (1 Panggilan)</span>
                              )}
                            </td>
                            <td className="px-4 py-3 font-mono">{cat.startNumber}</td>
                            <td className="px-4 py-3">{cat.estimatedMinutes} Minit</td>
                            <td className="px-4 py-3 text-right space-x-1.5">
                              <button
                                onClick={() => startEditCategory(cat)}
                                disabled={loading}
                                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg transition cursor-pointer"
                              >
                                ✏️ Kemaskini
                              </button>

                              <button
                                onClick={() => handleDeleteCategory(cat.id)}
                                disabled={loading || selectedBranch.categories.length <= 1}
                                className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-lg transition disabled:opacity-30 cursor-pointer"
                              >
                                Padam
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 7: DEVICES FLEET */}
            {activeSettingsTab === "devices" && (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <p className="text-gray-500">Peranti skrin TV dan tablet yang beroperasi di cawangan ini.</p>
                  <Link
                    href="/peranti"
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition cursor-pointer"
                  >
                    + Paut Peranti Baharu ↗
                  </Link>
                </div>

                {selectedBranch.devices.length === 0 ? (
                  <div className="p-8 text-center bg-gray-50 rounded-2xl text-gray-400">
                    Tiada peranti TV atau kiosk terpaut ke cawangan ini lagi.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedBranch.devices.map((d) => (
                      <div key={d.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-200 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-gray-900">{d.deviceName}</p>
                          <p className="text-[10px] text-gray-400 font-mono uppercase">{d.deviceType}</p>
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black rounded-md">
                          TERPAUT
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="border-t border-gray-100 pt-4 flex justify-end">
              <button
                onClick={() => setSelectedBranch(null)}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl cursor-pointer"
              >
                Tutup Skrin Penuh
              </button>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
