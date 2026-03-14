"use client";
import { useRouter } from "next/navigation";
import { KeyRound, LogOut } from "lucide-react";

interface NavbarProps {
  userName: string;
  credits?: number;
  isAdmin?: boolean;
}

export default function Navbar({ userName, credits, isAdmin }: NavbarProps) {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  return (
    <nav className="bg-white border-b border-gray-100 px-6 py-3.5 flex items-center justify-between sticky top-0 z-10 shadow-sm">
      <div className="flex items-center gap-2.5">
        <div className="bg-indigo-500 p-1.5 rounded-lg">
          <KeyRound className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-gray-900 text-sm">License Store</span>
        {isAdmin && (
          <span className="bg-indigo-100 text-indigo-700 text-xs font-medium px-2 py-0.5 rounded-full">
            Admin
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        {credits !== undefined && (
          <div className="bg-amber-50 text-amber-700 text-sm font-semibold px-3 py-1 rounded-full border border-amber-200">
            {credits} credits
          </div>
        )}
        <span className="text-gray-500 text-sm hidden sm:block">{userName}</span>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-gray-400 hover:text-gray-700 text-sm transition"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:block">Logout</span>
        </button>
      </div>
    </nav>
  );
}
