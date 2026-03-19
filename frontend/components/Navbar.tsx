"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";

interface NavbarProps {
  userName: string;
  credits?: number;
  isAdmin?: boolean;
}

export default function Navbar({ userName, credits, isAdmin }: NavbarProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  return (
    <>
      <nav style={{
        background: "linear-gradient(135deg, #702dff 0%, #9044ff 100%)",
        padding: "0 1.25rem",
        height: 64,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 50,
        boxShadow: "0 2px 20px rgba(112,45,255,0.35)",
        gap: "1rem",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
          <img src="/logo.png" alt="Digital Plus"
            style={{ height: 56, width: "auto", objectFit: "contain" }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
              const next = (e.target as HTMLImageElement).nextSibling as HTMLElement;
              if (next) next.style.display = "flex";
            }}
          />
          {/* Fallback text logo */}
          <div style={{ display: "none", lineHeight: 1.1 }}>
            <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "0.95rem", color: "#fff" }}>DIGITAL PLU+</div>
            <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.7)" }}>ديجيتال بلس</div>
          </div>
        </div>


        {/* ── DESKTOP: right side ── */}
        <div id="desktop-actions" style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
          {isAdmin && (
            <span style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", fontSize: "0.7rem", fontWeight: 700, padding: "0.25rem 0.75rem", borderRadius: 20 }}>
              ADMIN
            </span>
          )}
          {credits !== undefined && (
            <div style={{ background: credits < 0 ? "rgba(255,60,60,0.25)" : "rgba(255,255,255,0.15)", border: `1.5px solid ${credits < 0 ? "rgba(255,100,100,0.5)" : "rgba(255,255,255,0.3)"}`, borderRadius: 20, padding: "0.3rem 0.9rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: credits < 0 ? "#fca5a5" : "#fff" }} />
              <span style={{ color: credits < 0 ? "#fca5a5" : "#fff", fontSize: "0.8rem", fontWeight: 700 }}>${credits} رصيد {credits < 0 ? "⚠️" : ""}</span>
            </div>
          )}
          <span style={{ color: "rgba(255,255,255,0.85)", fontSize: "0.85rem", fontWeight: 500 }}>{userName}</span>
          <button onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.25)", borderRadius: 8, padding: "0.4rem 0.75rem", color: "#fff", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }}>
            <LogOut style={{ width: 14, height: 14 }} />
            تسجيل الخروج
          </button>
        </div>

        {/* ── MOBILE: credits + hamburger ── */}
        <div id="mobile-actions" style={{ display: "none", alignItems: "center", gap: "0.5rem" }}>
          {credits !== undefined && (
            <div style={{ background: credits < 0 ? "rgba(255,60,60,0.25)" : "rgba(255,255,255,0.15)", border: `1.5px solid ${credits < 0 ? "rgba(255,100,100,0.5)" : "rgba(255,255,255,0.3)"}`, borderRadius: 20, padding: "0.25rem 0.75rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: credits < 0 ? "#fca5a5" : "#fff" }} />
              <span style={{ color: credits < 0 ? "#fca5a5" : "#fff", fontSize: "0.75rem", fontWeight: 700 }}>${credits} {credits < 0 ? "⚠️" : ""}</span>
            </div>
          )}
          <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.25)", borderRadius: 8, padding: "0.4rem", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center" }}>
            {menuOpen ? <X style={{ width: 18, height: 18 }} /> : <Menu style={{ width: 18, height: 18 }} />}
          </button>
        </div>
      </nav>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div style={{
          position: "fixed", top: 64, left: 0, right: 0, zIndex: 49,
          background: "linear-gradient(135deg, #702dff, #9044ff)",
          padding: "1rem 1.25rem",
          boxShadow: "0 8px 24px rgba(112,45,255,0.4)",
          display: "flex", flexDirection: "column", gap: "0.75rem",
          borderTop: "1px solid rgba(255,255,255,0.15)",
        }}>
          <div style={{ color: "rgba(255,255,255,0.9)", fontWeight: 700, fontSize: "0.9rem", paddingBottom: "0.5rem", borderBottom: "1px solid rgba(255,255,255,0.15)" }}>
            👤 {userName} {isAdmin && <span style={{ fontSize: "0.7rem", background: "rgba(255,255,255,0.2)", padding: "0.1rem 0.5rem", borderRadius: 10, marginRight: "0.4rem" }}>ADMIN</span>}
          </div>
          {credits !== undefined && (
            <div style={{ color: "rgba(255,255,255,0.85)", fontSize: "0.875rem" }}>
              💰 رصيدك: <strong style={{ color: credits < 0 ? '#fca5a5' : 'inherit' }}>${credits} رصيد {credits < 0 ? '⚠️ رصيد سلبي' : ''}</strong>
            </div>
          )}
          <button onClick={() => { handleLogout(); setMenuOpen(false); }} style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.3)",
            borderRadius: 10, padding: "0.75rem 1rem", color: "#fff",
            cursor: "pointer", fontSize: "0.875rem", fontWeight: 700,
            fontFamily: "Tajawal, sans-serif",
          }}>
            <LogOut style={{ width: 16, height: 16 }} />
            تسجيل الخروج
          </button>
        </div>
      )}

      <style>{`
        @media (max-width: 640px) {
          #desktop-search { display: none !important; }
          #desktop-actions { display: none !important; }
          #mobile-actions { display: flex !important; }
        }
        @media (min-width: 641px) {
          #desktop-search { display: flex !important; }
          #desktop-actions { display: flex !important; }
          #mobile-actions { display: none !important; }
        }
      `}</style>
    </>
  );
}