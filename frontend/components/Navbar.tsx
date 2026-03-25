"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";

const WhatsAppIcon = ({ size = 14 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: size, height: size, flexShrink: 0 }}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

// Update these to your contact details
const WHATSAPP_NUMBER = "966500000000";
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;
const TELEGRAM_USERNAME = "yourusername"; // Update to your Telegram username
const TELEGRAM_URL = `https://t.me/${TELEGRAM_USERNAME}`;

const TelegramIcon = ({ size = 14 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: size, height: size, flexShrink: 0 }}>
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-1.97 9.29c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.931z"/>
  </svg>
);

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
          <div style={{ display: "none", lineHeight: 1.1 }}>
            <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "0.95rem", color: "#fff" }}>DIGITAL PLU+</div>
            <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.7)" }}>ديجيتال بلس</div>
          </div>
        </div>

        {/* ── DESKTOP: right side ── */}
        <div id="desktop-actions" style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
          {/* WhatsApp button */}
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" style={{
            display: "flex", alignItems: "center", gap: "0.4rem",
            background: "rgb(95, 167, 121)", border: "1.5px solid rgba(107, 158, 126, 0.5)",
            borderRadius: 8, padding: "0.4rem 0.75rem", color: "#fff",
            textDecoration: "none", fontSize: "0.8rem", fontWeight: 600,
          }}>
            <WhatsAppIcon size={14} />
            واتساب
          </a>
          {/* Telegram button */}
          <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" style={{
            display: "flex", alignItems: "center", gap: "0.4rem",
            background: "rgba(41,182,246)", border: "1.5px solid rgba(41,182,246,0.5)",
            borderRadius: 8, padding: "0.4rem 0.75rem", color: "#fff",
            textDecoration: "none", fontSize: "0.8rem", fontWeight: 600,
          }}>
            <TelegramIcon size={14} />
            تيليجرام
          </a>

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
          {/* WhatsApp button mobile */}
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(37,211,102,0.2)", border: "1.5px solid rgba(37,211,102,0.5)",
            borderRadius: 8, padding: "0.4rem 0.5rem", color: "#fff",
          }}>
            <WhatsAppIcon size={16} />
          </a>
          {/* Telegram button mobile */}
          <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(41,182,246,0.2)", border: "1.5px solid rgba(41,182,246,0.5)",
            borderRadius: 8, padding: "0.4rem 0.5rem", color: "#fff",
          }}>
            <TelegramIcon size={16} />
          </a>

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
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            background: "rgba(37,211,102,0.2)", border: "1.5px solid rgba(37,211,102,0.4)",
            borderRadius: 10, padding: "0.75rem 1rem", color: "#fff",
            textDecoration: "none", fontSize: "0.875rem", fontWeight: 700,
            fontFamily: "Tajawal, sans-serif",
          }}>
            <WhatsAppIcon size={16} />
            تواصل عبر واتساب
          </a>
          <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            background: "rgba(41,182,246,0.2)", border: "1.5px solid rgba(41,182,246,0.4)",
            borderRadius: 10, padding: "0.75rem 1rem", color: "#fff",
            textDecoration: "none", fontSize: "0.875rem", fontWeight: 700,
            fontFamily: "Tajawal, sans-serif",
          }}>
            <TelegramIcon size={16} />
            تواصل عبر تيليجرام
          </a>
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
