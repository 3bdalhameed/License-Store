"use client";
import { useRouter } from "next/navigation";
import { LogOut, ShoppingCart, Heart } from "lucide-react";

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
    <nav style={{
      background: "linear-gradient(135deg, #702dff 0%, #9044ff 100%)",
      padding: "0 2rem",
      height: 64,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      position: "sticky",
      top: 0,
      zIndex: 50,
      boxShadow: "0 2px 20px rgba(112,45,255,0.35)",
      gap: "1.5rem",
    }}>
      {/* Logo - right side (RTL style) */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexShrink: 0 }}>
        <img src="/logo.png" alt="logo" style={{ width: 200, height: 150, borderRadius: 10, objectFit: "contain" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        <div style={{ lineHeight: 1.1 }}>
        </div>
      </div>

      {/* Right side actions */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
        {isAdmin && (
          <span style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", fontSize: "0.7rem", fontWeight: 700, padding: "0.25rem 0.75rem", borderRadius: 20, letterSpacing: "0.05em" }}>
            ADMIN
          </span>
        )}
        {credits !== undefined && (
          <div style={{
            background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.3)",
            borderRadius: 20, padding: "0.3rem 0.9rem",
            display: "flex", alignItems: "center", gap: "0.4rem",
          }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#fff" }} />
            <span style={{ color: "#fff", fontSize: "0.8rem", fontWeight: 700 }}>{credits} رصيد</span>
          </div>
        )}
        <span style={{ color: "rgba(255,255,255,0.85)", fontSize: "0.85rem", fontWeight: 500 }}>{userName}</span>
        <button onClick={handleLogout} style={{
          display: "flex", alignItems: "center", gap: "0.4rem",
          background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.25)",
          borderRadius: 8, padding: "0.4rem 0.75rem",
          color: "#fff", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600,
          transition: "background 0.2s",
        }}>
          <LogOut style={{ width: 14, height: 14 }} />
          تسجيل الخروج
        </button>
      </div>
    </nav>
  );
}