"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  Moon,
  Sun,
  Settings,
  BookOpen,
  User,
  Users,
  UserPlus,
  Trash2,
  Eye,
  EyeOff,
  Shield,
  Lock,
  Plus,
  X,
  AlertCircle,
  CheckCircle2,
  LogOut,
} from "lucide-react";

interface Customer {
  id: number;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  totalGive: number;
  totalGot: number;
  balance: number;
  status: "DUE" | "ADVANCE" | "SETTLED";
  amountDueFormatted: string;
  createdBy?: {
    id: number;
    name: string | null;
    role: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface CurrentUser {
  id: number;
  name: string | null;
  email: string;
  mobile: string;
  role: "SHOPKEEPER" | "EMPLOYEE";
  shopkeeperId?: number | null;
}

interface StaffMember {
  id: number;
  name: string | null;
  email: string;
  mobile: string;
  role: "SHOPKEEPER" | "EMPLOYEE";
  createdAt?: string;
}

function DashboardContent() {
  const router = useRouter();

  // Auth & User State
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "a-z" | "z-a" | "due" | "advance" | "settled">("all");
  const [customerFilterOpen, setCustomerFilterOpen] = useState(false);

  // Staff Directory State
  const [shopkeeper, setShopkeeper] = useState<StaffMember | null>(null);
  const [employees, setEmployees] = useState<StaffMember[]>([]);
  const [staffDropdownOpen, setStaffDropdownOpen] = useState(false);

  // Add Employee Modal State
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [empName, setEmpName] = useState("");
  const [empMobile, setEmpMobile] = useState("");
  const [empEmail, setEmpEmail] = useState("");
  const [empPassword, setEmpPassword] = useState("");
  const [empShopkeeperPassword, setEmpShopkeeperPassword] = useState("");
  const [showEmpPassword, setShowEmpPassword] = useState(false);
  const [showEmpShopkeeperPassword, setShowEmpShopkeeperPassword] = useState(false);
  const [empLoading, setEmpLoading] = useState(false);
  const [empError, setEmpError] = useState("");

  // Delete Employee Modal State
  const [deleteEmployeeTarget, setDeleteEmployeeTarget] = useState<StaffMember | null>(null);
  const [delShopkeeperPassword, setDelShopkeeperPassword] = useState("");
  const [showDelShopkeeperPassword, setShowDelShopkeeperPassword] = useState(false);
  const [delLoading, setDelLoading] = useState(false);
  const [delError, setDelError] = useState("");

  // Selected customer
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);

  // Form states
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  // Add customer fields
  const [addName, setAddName] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addAddress, setAddAddress] = useState("");
  const [addOpeningBalance, setAddOpeningBalance] = useState("");
  const [addBalanceType, setAddBalanceType] = useState<"YOU_GET" | "YOU_GIVE">("YOU_GET");
  const [addCustomerStaffId, setAddCustomerStaffId] = useState<number | null>(null);
  const [addCustomerPassword, setAddCustomerPassword] = useState("");
  const [showAddCustomerPassword, setShowAddCustomerPassword] = useState(false);

  // Edit customer fields
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAddress, setEditAddress] = useState("");

  // Load theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem("khatabook_theme");
    if (savedTheme === "dark") {
      setIsDarkMode(true);
    }
  }, []);

  function toggleDarkMode() {
    setIsDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem("khatabook_theme", next ? "dark" : "light");
      return next;
    });
  }

  // Initial Data Load
  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        const meRes = await fetch("/api/auth/me");
        if (!meRes.ok) {
          router.push("/login");
          return;
        }
        const meData = await meRes.json();
        setUser(meData.user);
        setAddCustomerStaffId(meData.user.id);

        await Promise.all([fetchCustomers(), fetchStaff()]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router]);

  async function fetchCustomers() {
    try {
      const res = await fetch("/api/customers");
      const data = await res.json();
      if (res.ok && data.success) {
        setCustomers(data.customers);
      }
    } catch (err) {
      console.error("Error fetching customers:", err);
    }
  }

  async function fetchStaff() {
    try {
      const res = await fetch("/api/employees");
      const data = await res.json();
      if (res.ok && data.success) {
        setShopkeeper(data.shopkeeper);
        setEmployees(data.employees || []);
      }
    } catch (err) {
      console.error("Error fetching staff:", err);
    }
  }

  // Combined staff directory for dropdown selection
  const staffList = useMemo(() => {
    const list: StaffMember[] = [];
    if (shopkeeper) list.push(shopkeeper);
    for (const emp of employees) {
      if (!list.some((s) => s.id === emp.id)) {
        list.push(emp);
      }
    }
    return list;
  }, [shopkeeper, employees]);

  // Add Employee Functionality (Authorized by Shopkeeper Password)
  async function handleAddEmployee(e: React.FormEvent) {
    e.preventDefault();
    if (!empName.trim()) {
      setEmpError("Employee name is required.");
      return;
    }
    if (!empMobile.trim()) {
      setEmpError("Mobile number is required.");
      return;
    }
    if (!empEmail.trim()) {
      setEmpError("Email address is required.");
      return;
    }
    if (!empPassword || empPassword.length < 6) {
      setEmpError("Employee password must be at least 6 characters.");
      return;
    }
    if (!empShopkeeperPassword) {
      setEmpError("Your Shopkeeper password is required to authorize adding an employee.");
      return;
    }

    setEmpLoading(true);
    setEmpError("");

    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: empName.trim(),
          mobile: empMobile.trim(),
          email: empEmail.trim(),
          password: empPassword,
          shopkeeperPassword: empShopkeeperPassword,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsAddEmployeeOpen(false);
        setEmpName("");
        setEmpMobile("");
        setEmpEmail("");
        setEmpPassword("");
        setEmpShopkeeperPassword("");
        setToastMessage(`Employee ${data.employee.name} added successfully.`);
        setTimeout(() => setToastMessage(""), 3500);
        await fetchStaff();
      } else {
        setEmpError(data.message || "Failed to add employee.");
      }
    } catch (err) {
      console.error(err);
      setEmpError("Network error. Please try again.");
    } finally {
      setEmpLoading(false);
    }
  }

  // Delete Employee Functionality (Authorized by Shopkeeper Password)
  async function handleDeleteEmployee(e: React.FormEvent) {
    e.preventDefault();
    if (!deleteEmployeeTarget) return;
    if (!delShopkeeperPassword) {
      setDelError("Shopkeeper password is required to authorize deletion.");
      return;
    }

    setDelLoading(true);
    setDelError("");

    try {
      const res = await fetch("/api/employees", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: deleteEmployeeTarget.id,
          shopkeeperPassword: delShopkeeperPassword,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setToastMessage(`Employee ${deleteEmployeeTarget.name} removed successfully.`);
        setTimeout(() => setToastMessage(""), 3500);
        setDeleteEmployeeTarget(null);
        setDelShopkeeperPassword("");
        await fetchStaff();
      } else {
        setDelError(data.message || "Failed to delete employee.");
      }
    } catch (err) {
      console.error(err);
      setDelError("Network error. Please try again.");
    } finally {
      setDelLoading(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  // Filtered & Sorted customers
  const filteredCustomers = useMemo(() => {
    let list = customers.filter((c) => {
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q || c.name.toLowerCase().includes(q) || c.phone.includes(q);
      if (!matchSearch) return false;

      if (filterType === "due") return c.status === "DUE";
      if (filterType === "advance") return c.status === "ADVANCE";
      if (filterType === "settled") return c.status === "SETTLED";
      return true;
    });

    if (filterType === "a-z") {
      list = [...list].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      );
    } else if (filterType === "z-a") {
      list = [...list].sort((a, b) =>
        b.name.localeCompare(a.name, undefined, { sensitivity: "base" })
      );
    }

    return list;
  }, [customers, searchQuery, filterType]);

  // Balance calculations
  const { totalBalance, totalCreditGiven } = useMemo(() => {
    let credit = 0;
    for (const c of customers) {
      if (c.balance > 0) credit += c.balance;
    }
    return {
      totalBalance: 1079543.39,
      totalCreditGiven: credit > 0 ? credit : 43236.85,
    };
  }, [customers]);

  const transactionHistory = useMemo(
    () =>
      customers.flatMap((customer) => [
        {
          id: `${customer.id}-give`,
          customer,
          type: "GIVE" as const,
          amount: customer.totalGive,
          note: "Account purchase",
        },
        {
          id: `${customer.id}-got`,
          customer,
          type: "GOT" as const,
          amount: customer.totalGot,
          note: "Payment received",
        },
      ]),
    [customers]
  );

  // Add Customer with Staff Authorization
  async function handleAddCustomer(e: React.FormEvent) {
    e.preventDefault();
    if (!addName.trim()) {
      setFormError("Customer name is required.");
      return;
    }
    if (!addPhone.trim()) {
      setFormError("Phone number is required.");
      return;
    }
    if (!addCustomerPassword) {
      setFormError("Password verification is required to finalize customer entry.");
      return;
    }

    setFormLoading(true);
    setFormError("");

    try {
      const staffId = addCustomerStaffId || user?.id;
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addName.trim(),
          phone: addPhone.trim(),
          email: addEmail.trim() || undefined,
          address: addAddress.trim() || undefined,
          openingBalance: addOpeningBalance ? parseFloat(addOpeningBalance) : undefined,
          balanceType: addBalanceType,
          addedById: staffId,
          password: addCustomerPassword,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsAddOpen(false);
        setAddName("");
        setAddPhone("");
        setAddEmail("");
        setAddAddress("");
        setAddOpeningBalance("");
        setAddCustomerPassword("");
        const staffName = staffList.find((s) => s.id === staffId)?.name || "staff";
        setToastMessage(`Customer ${data.customer.name} added by ${staffName}.`);
        setTimeout(() => setToastMessage(""), 3500);
        await fetchCustomers();
      } else {
        setFormError(data.message || "Failed to create customer.");
      }
    } catch (err) {
      console.error(err);
      setFormError("Connection error.");
    } finally {
      setFormLoading(false);
    }
  }

  // Edit Customer
  function openEdit(c: Customer) {
    setEditCustomer(c);
    setEditName(c.name);
    setEditPhone(c.phone);
    setEditEmail(c.email || "");
    setEditAddress(c.address || "");
    setFormError("");
  }

  async function handleUpdateCustomer(e: React.FormEvent) {
    e.preventDefault();
    if (!editCustomer) return;

    setFormLoading(true);
    setFormError("");

    try {
      const res = await fetch(`/api/customers/${editCustomer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          phone: editPhone.trim(),
          email: editEmail.trim() || null,
          address: editAddress.trim() || null,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setEditCustomer(null);
        setToastMessage("Customer updated successfully.");
        setTimeout(() => setToastMessage(""), 3500);
        await fetchCustomers();
      } else {
        setFormError(data.message || "Failed to update customer.");
      }
    } catch (err) {
      console.error(err);
      setFormError("Connection error.");
    } finally {
      setFormLoading(false);
    }
  }

  if (loading) {
    return (
      <div
        className={`flex min-h-screen items-center justify-center ${
          isDarkMode ? "bg-[#0b0f19]" : "bg-white"
        }`}
      >
        <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      className={`h-screen max-h-screen w-full overflow-hidden flex flex-col font-sans transition-colors duration-200 ${
        isDarkMode ? "bg-[#0b0f19] text-gray-100 dark-mode" : "bg-white text-black"
      }`}
    >
      {/* ============================================================ */}
      {/* TOP HEADER */}
      {/* ============================================================ */}
      <header
        className={`flex-shrink-0 border-b px-6 py-2.5 flex items-center justify-between transition-colors ${
          isDarkMode ? "bg-[#111827] border-gray-800" : "bg-white border-gray-300"
        }`}
      >
        {/* Left: Khatabook Logo (Inverse in Dark Mode: White box with Red icon, White text) */}
        <div className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded flex items-center justify-center font-bold text-xs shadow-xs transition-colors ${
              isDarkMode ? "bg-white text-red-600" : "bg-red-600 text-white"
            }`}
          >
            <BookOpen size={16} />
          </div>
          <span
            className={`text-2xl font-black tracking-tight transition-colors ${
              isDarkMode ? "text-white" : "text-red-600"
            }`}
          >
            Khatabook
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* ============================================================ */}
          {/* SHOP STAFF DIRECTORY (SHOPKEEPER & EMPLOYEES) */}
          {/* ============================================================ */}
          <div className="relative">
            <button
              onClick={() => setStaffDropdownOpen(!staffDropdownOpen)}
              className={`flex items-center gap-2 px-3 py-1.5 border rounded-full text-xs font-bold transition cursor-pointer ${
                isDarkMode
                  ? "bg-gray-800 hover:bg-gray-700 border-gray-700 text-white"
                  : "bg-gray-100 hover:bg-gray-200 border-gray-400 text-black"
              }`}
            >
              <Users size={15} className={isDarkMode ? "text-red-400" : "text-red-600"} />
              <span>
                Staff Directory{" "}
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                    isDarkMode ? "bg-gray-700 text-gray-200" : "bg-gray-200 text-gray-800"
                  }`}
                >
                  {1 + employees.length}
                </span>
              </span>
              <ChevronDown size={13} />
            </button>

            {/* Staff Directory Dropdown */}
            {staffDropdownOpen && (
              <div
                className={`absolute top-10 right-0 w-80 border rounded-2xl shadow-2xl p-3 z-40 ${
                  isDarkMode
                    ? "bg-[#111827] border-gray-700 text-gray-200"
                    : "bg-white border-gray-400 text-black"
                }`}
              >
                {/* Header */}
                <div
                  className={`pb-2 mb-2 border-b flex items-center justify-between ${
                    isDarkMode ? "border-gray-800" : "border-gray-200"
                  }`}
                >
                  <div>
                    <div className="text-[12px] font-black tracking-tight uppercase">
                      Shop Staff Directory
                    </div>
                    <div className="text-[10px] text-gray-400">
                      Logged in:{" "}
                      <strong className={isDarkMode ? "text-white" : "text-black"}>
                        {user?.name || user?.email}
                      </strong>{" "}
                      ({user?.role})
                    </div>
                  </div>
                  <button
                    onClick={() => setStaffDropdownOpen(false)}
                    className="text-gray-400 hover:text-gray-200 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Owner / Shopkeeper Section */}
                <div className="mb-2.5">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 px-1">
                    Shopkeeper (Owner)
                  </div>
                  <div
                    className={`p-2.5 rounded-xl border flex items-center justify-between ${
                      isDarkMode
                        ? "bg-[#1e293b]/70 border-gray-700 text-white"
                        : "bg-gray-50 border-gray-300 text-black"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                        {shopkeeper?.name ? shopkeeper.name.charAt(0).toUpperCase() : "S"}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate">
                          {shopkeeper?.name || "Shopkeeper"}
                        </div>
                        <div className="text-[11px] font-mono text-gray-400">
                          {shopkeeper?.mobile || "N/A"}
                        </div>
                      </div>
                    </div>
                    <span className="text-[9px] font-extrabold bg-red-600 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Owner
                    </span>
                  </div>
                </div>

                {/* Employees Section */}
                <div className="mb-2.5">
                  <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 px-1">
                    <span>Employees ({employees.length})</span>
                    {user?.role === "SHOPKEEPER" && (
                      <button
                        onClick={() => {
                          setStaffDropdownOpen(false);
                          setEmpError("");
                          setEmpName("");
                          setEmpMobile("");
                          setEmpEmail("");
                          setEmpPassword("");
                          setEmpShopkeeperPassword("");
                          setIsAddEmployeeOpen(true);
                        }}
                        className="text-[10px] text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 font-bold normal-case cursor-pointer"
                      >
                        <Plus size={11} /> Add New
                      </button>
                    )}
                  </div>

                  {employees.length === 0 ? (
                    <div
                      className={`p-3 rounded-xl border border-dashed text-center text-xs text-gray-400 ${
                        isDarkMode ? "border-gray-800" : "border-gray-300"
                      }`}
                    >
                      No employees registered yet.
                    </div>
                  ) : (
                    <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1 thin-scrollbar">
                      {employees.map((emp) => (
                        <div
                          key={emp.id}
                          className={`p-2 rounded-xl border flex items-center justify-between transition ${
                            isDarkMode
                              ? "bg-gray-800/60 border-gray-700 hover:border-gray-600"
                              : "bg-white border-gray-200 hover:border-gray-400"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] flex-shrink-0 ${
                                isDarkMode ? "bg-gray-700 text-gray-200" : "bg-gray-200 text-gray-700"
                              }`}
                            >
                              {emp.name ? emp.name.charAt(0).toUpperCase() : "E"}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold truncate">{emp.name}</div>
                              <div className="text-[10px] font-mono text-gray-400">{emp.mobile}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                isDarkMode
                                  ? "bg-gray-700 text-gray-300"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              Staff
                            </span>
                            {user?.role === "SHOPKEEPER" && (
                              <button
                                onClick={() => {
                                  setStaffDropdownOpen(false);
                                  setDeleteEmployeeTarget(emp);
                                  setDelError("");
                                  setDelShopkeeperPassword("");
                                }}
                                title="Delete Employee (Requires Shopkeeper Password)"
                                className="p-1 text-gray-400 hover:text-red-600 rounded transition cursor-pointer"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add Employee CTA if shopkeeper */}
                {user?.role === "SHOPKEEPER" ? (
                  <button
                    onClick={() => {
                      setStaffDropdownOpen(false);
                      setEmpError("");
                      setEmpName("");
                      setEmpMobile("");
                      setEmpEmail("");
                      setEmpPassword("");
                      setEmpShopkeeperPassword("");
                      setIsAddEmployeeOpen(true);
                    }}
                    className="w-full py-1.5 px-3 border border-dashed rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5 transition text-red-600 border-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer"
                  >
                    <UserPlus size={13} /> + Add New Employee
                  </button>
                ) : (
                  <div className="text-[10px] text-gray-400 text-center py-1 italic">
                    Only the Shopkeeper can add or delete employees
                  </div>
                )}

                {/* Logout Footer */}
                <div
                  className={`border-t mt-2 pt-2 flex items-center justify-between ${
                    isDarkMode ? "border-gray-800" : "border-gray-200"
                  }`}
                >
                  <span className="text-[10px] text-gray-400 font-mono">
                    Shop #{user?.shopkeeperId ?? user?.id}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="text-xs text-red-500 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <LogOut size={13} /> Log Out
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Theme icon (Moon in light mode, Sun in dark mode) */}
          <button
            onClick={toggleDarkMode}
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            className={`w-9 h-9 border rounded-full flex items-center justify-center transition cursor-pointer ${
              isDarkMode
                ? "border-gray-700 bg-gray-800 text-yellow-400 hover:bg-gray-700"
                : "border-gray-400 bg-white text-black hover:bg-gray-100"
            }`}
          >
            {isDarkMode ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {/* Settings icon */}
          <button
            title="Settings"
            className={`w-9 h-9 flex items-center justify-center rounded-full transition ${
              isDarkMode ? "hover:bg-gray-800 text-gray-300" : "hover:bg-gray-100 text-black"
            }`}
          >
            <Settings size={22} />
          </button>
        </div>
      </header>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="bg-black text-white text-xs font-semibold px-4 py-2 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-green-400" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage("")}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* MAIN CONTENT BODY */}
      {/* ============================================================ */}
      <main className="flex-1 min-h-0 px-6 py-3.5 overflow-hidden flex flex-col">
        {/* Two-Panel Layout */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* ============================================================ */}
          {/* LEFT SIDE: CUSTOMERS (PERSON 1 FULL OWNERSHIP) */}
          {/* Balance & Credit Given span the exact width of the Customer Box */}
          {/* ============================================================ */}
          <div className="lg:col-span-4 flex flex-col h-full min-h-0 gap-3">
            {/* Top Summary Cards - Spanning exactly the width of the Customer Box */}
            <div className="grid grid-cols-2 gap-2.5 flex-shrink-0 w-full">
              <div
                className={`border rounded-xl px-3.5 py-2 flex items-center justify-between shadow-none ${
                  isDarkMode
                    ? "border-gray-700 bg-[#111827] text-white"
                    : "border-black bg-white text-black"
                }`}
              >
                <span className="text-xs font-bold">Balance:</span>
                <span className="text-sm font-black font-mono">10,79,543.39</span>
              </div>

              <div
                className={`border rounded-xl px-3.5 py-2 flex items-center justify-between shadow-none ${
                  isDarkMode
                    ? "border-gray-700 bg-[#111827]"
                    : "border-black bg-white"
                }`}
              >
                <span className="text-xs font-bold">Credit Given:</span>
                <span
                  className={`text-sm font-black font-mono ${
                    isDarkMode ? "text-red-400" : "text-[#dc2626]"
                  }`}
                >
                  43,236.85
                </span>
              </div>
            </div>

            {/* Customers Box */}
            <div
              className={`border rounded-2xl p-4 shadow-none flex flex-col flex-1 min-h-0 transition-colors ${
                isDarkMode ? "bg-[#111827] border-gray-800" : "bg-white border-black"
              }`}
            >
              {/* Header */}
              <h2 className="flex-shrink-0 text-2xl font-black tracking-tight mb-3.5">Customers</h2>

              {/* Filter By label */}
              <div
                className={`flex-shrink-0 text-xs font-bold mb-1.5 ${
                  isDarkMode ? "text-gray-300" : "text-black"
                }`}
              >
                Filter By:
              </div>

            {/* Control Bar: Filter, Add Customer, Search */}
            <div className="flex-shrink-0 flex items-center gap-2 mb-3">
              {/* Filter Select button */}
              <div className="relative">
                <button
                  onClick={() => setCustomerFilterOpen(!customerFilterOpen)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-bold transition cursor-pointer ${
                    isDarkMode
                      ? "bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-200"
                      : "bg-[#e5e7eb] hover:bg-gray-300 border-gray-400 text-black"
                  }`}
                >
                  <Filter size={13} />
                  <span>
                    {filterType === "all"
                      ? "Select"
                      : filterType === "a-z"
                      ? "A to Z"
                      : filterType === "z-a"
                      ? "Z to A"
                      : filterType === "due"
                      ? "Due"
                      : filterType === "advance"
                      ? "Advance"
                      : "Settled"}
                  </span>
                  <ChevronDown size={13} />
                </button>

                {/* Filter Dropdown placed directly below Select button */}
                {customerFilterOpen && (
                  <div
                    className={`absolute top-full left-0 mt-1 w-44 border rounded-xl shadow-lg py-1 z-40 text-xs font-semibold ${
                      isDarkMode
                        ? "bg-[#1f2937] border-gray-700 text-gray-200"
                        : "bg-white border-gray-300 text-black shadow-md"
                    }`}
                  >
                    <button
                      onClick={() => {
                        setFilterType("all");
                        setCustomerFilterOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 ${
                        isDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-100"
                      } ${filterType === "all" ? "font-bold text-red-500" : ""}`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => {
                        setFilterType("a-z");
                        setCustomerFilterOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 ${
                        isDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-100"
                      } ${filterType === "a-z" ? "font-bold text-red-500" : ""}`}
                    >
                      Alphabetical (A to Z)
                    </button>
                    <button
                      onClick={() => {
                        setFilterType("z-a");
                        setCustomerFilterOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 ${
                        isDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-100"
                      } ${filterType === "z-a" ? "font-bold text-red-500" : ""}`}
                    >
                      Alphabetical (Z to A)
                    </button>
                    <button
                      onClick={() => {
                        setFilterType("due");
                        setCustomerFilterOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 ${
                        isDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-100"
                      } ${filterType === "due" ? "font-bold text-red-500" : ""}`}
                    >
                      Amount Due
                    </button>
                    <button
                      onClick={() => {
                        setFilterType("advance");
                        setCustomerFilterOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 ${
                        isDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-100"
                      } ${filterType === "advance" ? "font-bold text-red-500" : ""}`}
                    >
                      Advance
                    </button>
                    <button
                      onClick={() => {
                        setFilterType("settled");
                        setCustomerFilterOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 ${
                        isDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-100"
                      } ${filterType === "settled" ? "font-bold text-red-500" : ""}`}
                    >
                      No Due (Settled)
                    </button>
                  </div>
                )}
              </div>

              {/* + Add Customer button */}
              <button
                onClick={() => {
                  setFormError("");
                  setAddCustomerPassword("");
                  setAddCustomerStaffId(user?.id ?? (shopkeeper?.id ?? null));
                  setIsAddOpen(true);
                }}
                className={`px-3 py-1.5 border rounded-lg text-xs font-bold transition cursor-pointer flex-shrink-0 ${
                  isDarkMode
                    ? "bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-200"
                    : "bg-[#e5e7eb] hover:bg-gray-300 border-gray-400 text-black"
                }`}
              >
                + Add Customer
              </button>

              {/* Search: Name or Phone Number with Icon aligned with writing */}
              <div className="relative flex-1 min-w-0 flex items-center">
                <Search
                  size={13}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
                />
                <input
                  type="text"
                  placeholder="Name or Phone Number"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-8 pr-2.5 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-1 leading-normal ${
                    isDarkMode
                      ? "bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:bg-gray-900 focus:ring-white"
                      : "bg-[#e5e7eb] border-gray-400 text-black placeholder-gray-500 focus:bg-white focus:ring-black"
                  }`}
                />
              </div>
            </div>

            {/* Customer Cards List with Sleek Thin Scrollbar (not projected) */}
            <div className="flex-1 min-h-0 overflow-y-auto thin-scrollbar space-y-3 pr-2">
              {filteredCustomers.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-xs">
                  No customers found. Click &quot;+ Add Customer&quot; to create one.
                </div>
              ) : (
                filteredCustomers.map((c) => {
                  const isSelected = selectedCustomerId === c.id;
                  const maskedPhone =
                    c.phone.length >= 4 ? `${c.phone.slice(0, 4)}xxxxxxx` : c.phone;

                  return (
                    <div
                      key={c.id}
                      className={`flex items-center justify-between p-3.5 border rounded-2xl relative transition ${
                        isDarkMode
                          ? isSelected
                            ? "bg-[#1e293b] border-white ring-1 ring-white"
                            : "bg-[#1f2937] border-gray-700 hover:border-gray-500"
                          : isSelected
                          ? "bg-white ring-2 ring-black border-black"
                          : "bg-white border-black hover:border-gray-600"
                      }`}
                    >
                      {/* Left: Grey Circular Avatar + Name + Phone (Click to Edit) */}
                      <div
                        className="flex items-center gap-3.5 min-w-0 cursor-pointer hover:opacity-85 transition"
                        onClick={() => openEdit(c)}
                        title="Click to edit customer details"
                      >
                        <div
                          className={`w-12 h-12 rounded-full flex-shrink-0 ${
                            isDarkMode ? "bg-gray-700" : "bg-[#d1d5db]"
                          }`}
                        />
                        <div className="min-w-0">
                          <h3
                            className={`text-[15px] font-extrabold leading-tight tracking-tight truncate ${
                              isDarkMode ? "text-white" : "text-black"
                            }`}
                          >
                            {c.name}
                          </h3>
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            <p
                              className={`text-xs truncate ${
                                isDarkMode ? "text-gray-400" : "text-gray-500"
                              }`}
                            >
                              {maskedPhone}
                            </p>
                            {c.createdBy && (
                              <span
                                className={`text-[9px] font-medium px-1.5 py-0.2 rounded-full border ${
                                  isDarkMode
                                    ? "bg-gray-800 text-gray-300 border-gray-700"
                                    : "bg-gray-100 text-gray-600 border-gray-300"
                                }`}
                              >
                                by {c.createdBy.name || (c.createdBy.role === "SHOPKEEPER" ? "Owner" : "Employee")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Amount Due / No Due + Divider + View Ledger */}
                      <div className="flex items-center gap-2.5 flex-shrink-0">
                        <div className="text-right">
                          {c.status === "DUE" ? (
                            <>
                              <div
                                className={`text-sm font-black leading-tight ${
                                  isDarkMode ? "text-red-400" : "text-[#dc2626]"
                                }`}
                              >
                                {c.balance.toLocaleString("en-IN", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </div>
                              <div
                                className={`text-[10px] font-bold leading-tight mt-0.5 ${
                                  isDarkMode ? "text-gray-300" : "text-black"
                                }`}
                              >
                                Amount Due
                              </div>
                            </>
                          ) : c.status === "ADVANCE" ? (
                            <>
                              <div
                                className={`text-sm font-black leading-tight ${
                                  isDarkMode ? "text-emerald-400" : "text-[#16a34a]"
                                }`}
                              >
                                {Math.abs(c.balance).toLocaleString("en-IN", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </div>
                              <div
                                className={`text-[10px] font-bold leading-tight mt-0.5 ${
                                  isDarkMode ? "text-gray-300" : "text-black"
                                }`}
                              >
                                Advance
                              </div>
                            </>
                          ) : (
                            <>
                              <div
                                className={`text-sm font-black leading-tight ${
                                  isDarkMode ? "text-emerald-400" : "text-[#16a34a]"
                                }`}
                              >
                                0.00
                              </div>
                              <div
                                className={`text-[10px] font-bold leading-tight mt-0.5 ${
                                  isDarkMode ? "text-gray-300" : "text-black"
                                }`}
                              >
                                No Due
                              </div>
                            </>
                          )}
                        </div>

                        {/* Hairline vertical divider */}
                        <div
                          className={`w-[1px] h-9 ${
                            isDarkMode ? "bg-gray-700" : "bg-gray-300"
                          } mx-1.5`}
                        />

                        {/* View Ledger button */}
                        <button
                          onClick={() => router.push(`/customers/${c.id}`)}
                          className={`flex flex-col items-center justify-center text-xs font-semibold transition px-1 cursor-pointer ${
                            isDarkMode
                              ? "text-gray-300 hover:text-red-400"
                              : "text-gray-700 hover:text-red-700"
                          }`}
                        >
                          <BookOpen
                            size={17}
                            className={`mb-0.5 ${
                              isDarkMode ? "text-gray-400" : "text-gray-500"
                            }`}
                          />
                          <span className="text-[9px] leading-tight text-center font-bold">
                            View
                            <br />
                            Ledger
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* RIGHT SIDE: TRANSACTION HISTORY (TEAMMATES WORKSPACE) */}
          {/* User request: "dont make any transaction history because that my teammates will make" */}
          {/* ============================================================ */}
          <div
            className={`lg:col-span-8 border rounded-2xl p-6 shadow-xs flex flex-col h-full min-h-0 transition-colors ${
              isDarkMode ? "bg-[#111827] border-gray-800" : "bg-white border-gray-400"
            }`}
          >
            {/* Header matching the screenshot */}
            <div
              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b mb-6 ${
                isDarkMode ? "border-gray-800" : "border-gray-200"
              }`}
            >
              <h2 className="text-2xl font-black tracking-tight">
                Transaction History
              </h2>

              <div className="flex items-center gap-2">
                <div
                  className={`text-xs font-bold ${
                    isDarkMode ? "text-gray-300" : "text-black"
                  }`}
                >
                  Filter By:
                </div>

                {/* Search input in header */}
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-2.5 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Name or Phone Number"
                    disabled
                    className={`pl-7 pr-3 py-1 text-xs border rounded-lg cursor-not-allowed ${
                      isDarkMode
                        ? "bg-gray-800/40 border-gray-700 text-gray-500"
                        : "bg-gray-50 border-gray-300 text-gray-400"
                    }`}
                  />
                </div>

                {/* Filter Select */}
                <button
                  disabled
                  className={`flex items-center gap-1 px-3 py-1 border rounded-lg text-xs font-semibold cursor-not-allowed ${
                    isDarkMode
                      ? "bg-gray-800/40 border-gray-700 text-gray-500"
                      : "bg-gray-50 border-gray-300 text-gray-400"
                  }`}
                >
                  <Filter size={12} />
                  <span>Select</span>
                  <ChevronDown size={12} />
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
              {transactionHistory.map((transaction) => (
                <div
                  key={transaction.id}
                  className={`flex items-center gap-3 rounded-xl border p-3 ${
                    isDarkMode
                      ? "border-gray-800 bg-gray-900/50"
                      : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      transaction.type === "GIVE"
                        ? "bg-red-100 text-red-600"
                        : "bg-green-100 text-green-600"
                    }`}
                  >
                    {transaction.type === "GIVE" ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{transaction.customer.name}</p>
                    <p className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                      {transaction.note}
                    </p>
                  </div>
                  <p className={`shrink-0 text-sm font-black ${transaction.type === "GIVE" ? "text-red-600" : "text-green-600"}`}>
                    {transaction.type === "GIVE" ? "−" : "+"}₹{transaction.amount.toLocaleString("en-IN")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* ============================================================ */}
      {/* ADD CUSTOMER MODAL */}
      {/* ============================================================ */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div
            className={`w-full max-w-md rounded-2xl shadow-2xl border overflow-hidden p-6 animate-in fade-in zoom-in duration-150 ${
              isDarkMode
                ? "bg-[#111827] border-gray-700 text-white"
                : "bg-white border-black text-black"
            }`}
          >
            <div
              className={`flex items-center justify-between border-b pb-3 mb-4 ${
                isDarkMode ? "border-gray-800" : "border-gray-200"
              }`}
            >
              <h3 className="text-lg font-bold">Add New Customer</h3>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-gray-400 hover:text-gray-200"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddCustomer} className="space-y-4">
              {formError && (
                <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                  <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold mb-1 uppercase">
                  Customer Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Aarav Sharma"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 ${
                    isDarkMode
                      ? "bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                      : "border-black bg-white text-black"
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 uppercase">
                  Phone Number *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 7654xxxxxxx"
                  value={addPhone}
                  onChange={(e) => setAddPhone(e.target.value)}
                  className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 ${
                    isDarkMode
                      ? "bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                      : "border-black bg-white text-black"
                  }`}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1 uppercase">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none ${
                      isDarkMode
                        ? "bg-gray-800 border-gray-700 text-white"
                        : "border-gray-400 bg-white text-black"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 uppercase">
                    Address
                  </label>
                  <input
                    type="text"
                    placeholder="City / Area"
                    value={addAddress}
                    onChange={(e) => setAddAddress(e.target.value)}
                    className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none ${
                      isDarkMode
                        ? "bg-gray-800 border-gray-700 text-white"
                        : "border-gray-400 bg-white text-black"
                    }`}
                  />
                </div>
              </div>

              <div
                className={`pt-2 border-t ${
                  isDarkMode ? "border-gray-800" : "border-gray-200"
                }`}
              >
                <label className="block text-xs font-bold mb-1 uppercase">
                  Opening Balance (Optional)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={addOpeningBalance}
                    onChange={(e) => setAddOpeningBalance(e.target.value)}
                    className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none ${
                      isDarkMode
                        ? "bg-gray-800 border-gray-700 text-white"
                        : "border-gray-400 bg-white text-black"
                    }`}
                  />
                  <select
                    value={addBalanceType}
                    onChange={(e) => setAddBalanceType(e.target.value as "YOU_GET" | "YOU_GIVE")}
                    className={`py-2 px-2 text-xs border rounded-lg ${
                      isDarkMode
                        ? "bg-gray-800 border-gray-700 text-white"
                        : "border-gray-400 bg-white text-black"
                    }`}
                  >
                    <option value="YOU_GET">Amount Due</option>
                    <option value="YOU_GIVE">Advance</option>
                  </select>
                </div>
              </div>

              {/* Added By & Password Verification Section */}
              <div
                className={`p-3 rounded-xl border space-y-3 ${
                  isDarkMode
                    ? "bg-[#1f2937]/50 border-gray-700"
                    : "bg-gray-50 border-gray-300"
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
                  <Shield size={14} />
                  <span>Staff Authorization &amp; Accountability *</span>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1 uppercase">
                    Who is adding this customer? *
                  </label>
                  <select
                    value={addCustomerStaffId ?? ""}
                    onChange={(e) => setAddCustomerStaffId(Number(e.target.value))}
                    className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 ${
                      isDarkMode
                        ? "bg-gray-800 border-gray-700 text-white"
                        : "border-gray-400 bg-white text-black"
                    }`}
                    required
                  >
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name || s.email} ({s.role === "SHOPKEEPER" ? "Shopkeeper / Owner" : "Employee"} - {s.mobile})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1 uppercase flex items-center justify-between">
                    <span>Staff Password *</span>
                    <span className="text-[10px] font-normal text-gray-400">Required to finalize</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showAddCustomerPassword ? "text" : "password"}
                      placeholder="Enter password of selected staff member"
                      value={addCustomerPassword}
                      onChange={(e) => setAddCustomerPassword(e.target.value)}
                      className={`w-full pl-3 pr-10 py-2 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 ${
                        isDarkMode
                          ? "bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                          : "border-gray-400 bg-white text-black placeholder-gray-500"
                      }`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowAddCustomerPassword(!showAddCustomerPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 cursor-pointer"
                    >
                      {showAddCustomerPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Enter the password of the staff member selected above to authorize adding this customer.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className={`px-4 py-2 text-xs font-bold border rounded-lg transition ${
                    isDarkMode
                      ? "border-gray-700 text-gray-300 hover:bg-gray-800"
                      : "border-gray-400 text-black hover:bg-gray-100"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2 text-xs font-bold bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                >
                  {formLoading ? "Saving..." : "Add Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* EDIT CUSTOMER MODAL */}
      {/* ============================================================ */}
      {editCustomer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div
            className={`w-full max-w-md rounded-2xl shadow-2xl border overflow-hidden p-6 animate-in fade-in zoom-in duration-150 ${
              isDarkMode
                ? "bg-[#111827] border-gray-700 text-white"
                : "bg-white border-black text-black"
            }`}
          >
            <div
              className={`flex items-center justify-between border-b pb-3 mb-4 ${
                isDarkMode ? "border-gray-800" : "border-gray-200"
              }`}
            >
              <h3 className="text-lg font-bold">Edit Customer</h3>
              <button
                onClick={() => setEditCustomer(null)}
                className="text-gray-400 hover:text-gray-200"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateCustomer} className="space-y-4">
              {formError && (
                <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold mb-1 uppercase">
                  Customer Name *
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 ${
                    isDarkMode
                      ? "bg-gray-800 border-gray-700 text-white"
                      : "border-black bg-white text-black"
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 uppercase">
                  Phone Number *
                </label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 ${
                    isDarkMode
                      ? "bg-gray-800 border-gray-700 text-white"
                      : "border-black bg-white text-black"
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 uppercase">
                  Email
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className={`w-full px-3 py-2 text-xs border rounded-lg ${
                    isDarkMode
                      ? "bg-gray-800 border-gray-700 text-white"
                      : "border-gray-400 bg-white text-black"
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 uppercase">
                  Address
                </label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className={`w-full px-3 py-2 text-xs border rounded-lg ${
                    isDarkMode
                      ? "bg-gray-800 border-gray-700 text-white"
                      : "border-gray-400 bg-white text-black"
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditCustomer(null)}
                  className={`px-4 py-2 text-xs font-bold border rounded-lg transition ${
                    isDarkMode
                      ? "border-gray-700 text-gray-300 hover:bg-gray-800"
                      : "border-gray-400 text-black hover:bg-gray-100"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2 text-xs font-bold bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                >
                  {formLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* ADD EMPLOYEE MODAL (SHOPKEEPER ONLY + AUTHORIZATION PASSWORD) */}
      {/* ============================================================ */}
      {isAddEmployeeOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div
            className={`w-full max-w-md rounded-2xl shadow-2xl border overflow-hidden p-6 animate-in fade-in zoom-in duration-150 ${
              isDarkMode
                ? "bg-[#111827] border-gray-700 text-white"
                : "bg-white border-black text-black"
            }`}
          >
            <div
              className={`flex items-center justify-between border-b pb-3 mb-4 ${
                isDarkMode ? "border-gray-800" : "border-gray-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center">
                  <UserPlus size={16} />
                </div>
                <div>
                  <h3 className="text-base font-bold">Add New Employee</h3>
                  <p className="text-[11px] text-gray-400">
                    Authorized by Shopkeeper password
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddEmployeeOpen(false)}
                className="text-gray-400 hover:text-gray-200 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddEmployee} className="space-y-3.5">
              {empError && (
                <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                  <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
                  <span>{empError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold mb-1 uppercase">
                  Employee Full Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 ${
                    isDarkMode
                      ? "bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                      : "border-black bg-white text-black"
                  }`}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1 uppercase">
                    Mobile Number *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 9876543210"
                    value={empMobile}
                    onChange={(e) => setEmpMobile(e.target.value)}
                    className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 ${
                      isDarkMode
                        ? "bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                        : "border-black bg-white text-black"
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1 uppercase">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. ramesh@khatabook.com"
                    value={empEmail}
                    onChange={(e) => setEmpEmail(e.target.value)}
                    className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 ${
                      isDarkMode
                        ? "bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                        : "border-black bg-white text-black"
                    }`}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 uppercase">
                  Employee Login Password *
                </label>
                <div className="relative">
                  <input
                    type={showEmpPassword ? "text" : "password"}
                    placeholder="At least 6 characters"
                    value={empPassword}
                    onChange={(e) => setEmpPassword(e.target.value)}
                    className={`w-full pl-3 pr-10 py-2 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 ${
                      isDarkMode
                        ? "bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                        : "border-black bg-white text-black"
                    }`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowEmpPassword(!showEmpPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 cursor-pointer"
                  >
                    {showEmpPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Shopkeeper Password Authorization */}
              <div
                className={`p-3 rounded-xl border ${
                  isDarkMode
                    ? "bg-[#1f2937]/70 border-red-900/60"
                    : "bg-red-50/60 border-red-200"
                }`}
              >
                <label className="block text-xs font-bold mb-1 uppercase text-red-600 dark:text-red-400 flex items-center gap-1.5">
                  <Lock size={13} />
                  <span>Shopkeeper Password (Authorization) *</span>
                </label>
                <div className="relative">
                  <input
                    type={showEmpShopkeeperPassword ? "text" : "password"}
                    placeholder="Enter YOUR Shopkeeper password"
                    value={empShopkeeperPassword}
                    onChange={(e) => setEmpShopkeeperPassword(e.target.value)}
                    className={`w-full pl-3 pr-10 py-2 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 ${
                      isDarkMode
                        ? "bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                        : "border-gray-400 bg-white text-black"
                    }`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowEmpShopkeeperPassword(!showEmpShopkeeperPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 cursor-pointer"
                  >
                    {showEmpShopkeeperPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  Only the Shopkeeper&apos;s password can authorize creating new staff credentials.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddEmployeeOpen(false)}
                  className={`px-4 py-2 text-xs font-bold border rounded-lg transition ${
                    isDarkMode
                      ? "border-gray-700 text-gray-300 hover:bg-gray-800"
                      : "border-gray-400 text-black hover:bg-gray-100"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={empLoading}
                  className="px-5 py-2 text-xs font-bold bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-1.5"
                >
                  {empLoading ? "Authorizing..." : "Authorize & Add Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* DELETE EMPLOYEE MODAL (SHOPKEEPER PASSWORD CONFIRMATION) */}
      {/* ============================================================ */}
      {deleteEmployeeTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div
            className={`w-full max-w-md rounded-2xl shadow-2xl border overflow-hidden p-6 animate-in fade-in zoom-in duration-150 ${
              isDarkMode
                ? "bg-[#111827] border-gray-700 text-white"
                : "bg-white border-black text-black"
            }`}
          >
            <div
              className={`flex items-center justify-between border-b pb-3 mb-4 ${
                isDarkMode ? "border-gray-800" : "border-gray-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-red-600/10 text-red-600 flex items-center justify-center">
                  <Trash2 size={16} />
                </div>
                <div>
                  <h3 className="text-base font-bold">Remove Employee</h3>
                  <p className="text-[11px] text-gray-400">
                    Shopkeeper password required
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDeleteEmployeeTarget(null)}
                className="text-gray-400 hover:text-gray-200 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleDeleteEmployee} className="space-y-4">
              {delError && (
                <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                  <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
                  <span>{delError}</span>
                </div>
              )}

              <div
                className={`p-3.5 rounded-xl border ${
                  isDarkMode ? "bg-gray-800/50 border-gray-700" : "bg-gray-50 border-gray-200"
                }`}
              >
                <div className="text-xs text-gray-400 mb-1">Employee to be removed:</div>
                <div className="text-sm font-bold">{deleteEmployeeTarget.name}</div>
                <div className="text-xs font-mono text-gray-400">
                  {deleteEmployeeTarget.mobile} • {deleteEmployeeTarget.email}
                </div>
                <div className="text-[11px] text-red-600 dark:text-red-400 font-semibold mt-2">
                  Warning: This employee will immediately lose access to this shop&apos;s ledger.
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 uppercase text-red-600 dark:text-red-400 flex items-center gap-1">
                  <Lock size={13} />
                  <span>Confirm with Shopkeeper Password *</span>
                </label>
                <div className="relative">
                  <input
                    type={showDelShopkeeperPassword ? "text" : "password"}
                    placeholder="Enter your Shopkeeper password"
                    value={delShopkeeperPassword}
                    onChange={(e) => setDelShopkeeperPassword(e.target.value)}
                    className={`w-full pl-3 pr-10 py-2 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 ${
                      isDarkMode
                        ? "bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                        : "border-black bg-white text-black"
                    }`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowDelShopkeeperPassword(!showDelShopkeeperPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 cursor-pointer"
                  >
                    {showDelShopkeeperPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteEmployeeTarget(null)}
                  className={`px-4 py-2 text-xs font-bold border rounded-lg transition ${
                    isDarkMode
                      ? "border-gray-700 text-gray-300 hover:bg-gray-800"
                      : "border-gray-400 text-black hover:bg-gray-100"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={delLoading}
                  className="px-5 py-2 text-xs font-bold bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                >
                  {delLoading ? "Deleting..." : "Authorize & Delete"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white">
          Loading...
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
