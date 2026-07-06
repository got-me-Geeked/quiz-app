import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";
import { colors, BODY_FONT } from "../theme";
import Leaderboard from "../components/Leaderboard";

export default function HistoryLeaderboard() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [board, setBoard] = useState(null);
  const [error, setError] = useState("");

  const meUserId = (() => {
    try {
      const t = localStorage.getItem("token");
      return t ? JSON.parse(atob(t.split(".")[1])).userId : null;
    } catch {
      return null;
    }
  })();

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/api/history/${quizId}/leaderboard`)
      .then(({ data }) => {
        if (!cancelled) setBoard(data.leaderboard || []);
      })
      .catch((e) => {
        if (!cancelled) setError(e.response?.data?.error || "Ошибка загрузки");
      });
    return () => {
      cancelled = true;
    };
  }, [quizId]);

  if (error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: colors.deepPurple,
          color: colors.white,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ fontFamily: BODY_FONT, fontSize: 18 }}>{error}</div>
        <button
          onClick={() => navigate("/history")}
          style={{
            fontFamily: BODY_FONT,
            fontWeight: 700,
            backgroundColor: colors.orange,
            color: colors.white,
            border: "none",
            borderRadius: 8,
            padding: "8px 20px",
            cursor: "pointer",
          }}
        >
          К истории
        </button>
      </div>
    );
  }

  if (!board) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: colors.deepPurple,
          color: colors.white,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ fontFamily: BODY_FONT, fontSize: 18 }}>Загрузка…</div>
      </div>
    );
  }

  return (
    <Leaderboard
      leaderboard={board}
      meUserId={meUserId}
      buttonLabel="К истории"
      onButton={() => navigate("/history")}
    />
  );
}
