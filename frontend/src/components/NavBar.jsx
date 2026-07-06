import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { colors, HEADING_FONT } from "../theme";

const LINKS = [
  { key: "dashboard", label: "Dashboard", path: "/dashboard" },
  { key: "history", label: "History", path: "/history" },
  { key: "profile", label: "Profile", path: "/profile" },
];

function NavLink({ label, active, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        fontFamily: HEADING_FONT,
        fontSize: 16,
        color: active || hover ? colors.orange : colors.white,
        padding: 0,
        transition: "color .15s",
      }}
    >
      {label}
    </button>
  );
}

export default function NavBar({ current = "dashboard" }) {
  const navigate = useNavigate();
  return (
    <nav
      style={{
        display: "flex",
        gap: 30,
        alignItems: "center",
        backgroundColor: colors.lightPurple,
        padding: "20px 30px",
        borderRadius: 15,
        boxShadow: "13px 17px 4px rgba(0,0,0,0.25)",
      }}
    >
      {LINKS.map((l) => (
        <NavLink
          key={l.key}
          label={l.label}
          active={current === l.key}
          onClick={() => navigate(l.path)}
        />
      ))}
    </nav>
  );
}
