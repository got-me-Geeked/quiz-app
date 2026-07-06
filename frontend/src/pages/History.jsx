import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { colors, HEADING_FONT, BODY_FONT, pluralQuestions } from "../theme";
import NavBar from "../components/NavBar";
import { dateLabel, timeLabel } from "../components/historyFormat";

function StatsIcon({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 3v18h18" />
      <rect
        x="7"
        y="12"
        width="3"
        height="6"
        fill="currentColor"
        stroke="none"
      />
      <rect
        x="12"
        y="8"
        width="3"
        height="10"
        fill="currentColor"
        stroke="none"
      />
      <rect
        x="17"
        y="4"
        width="3"
        height="14"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

function StatusBadge({ status }) {
  if (status === "cancelled") {
    return (
      <span
        style={{
          display: "inline-block",
          padding: "2px 8px",
          borderRadius: 10,
          fontSize: 11,
          backgroundColor: "rgba(235,87,87,0.8)",
          color: "rgba(255,255,255,0.8)",
          fontFamily: BODY_FONT,
          whiteSpace: "nowrap",
        }}
      >
        Отменён
      </span>
    );
  }
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 10,
        fontSize: 11,
        backgroundColor: "rgba(100,100,100,0.8)",
        color: "#CECECE",
        fontFamily: BODY_FONT,
        whiteSpace: "nowrap",
      }}
    >
      Завершён
    </span>
  );
}

function StatsButton({ onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      title="Посмотреть результаты"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        height: 30,
        minWidth: 46,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 10,
        border: "1px solid rgba(206,206,206,0.8)",
        backgroundColor: hover ? "rgba(206,206,206,0.8)" : "#646464",
        color: colors.white,
        cursor: "pointer",
        transition: "background-color .15s",
      }}
    >
      <StatsIcon />
    </button>
  );
}

function HistoryCard({ quiz, onStats }) {
  return (
    <div
      style={{
        backgroundColor: colors.midPurple,
        height: 160,
        width: 306,
        flex: "1 1 306px",
        maxWidth: 340,
        padding: "15px 12px",
        borderRadius: 12,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        fontFamily: BODY_FONT,
        color: colors.white,
      }}
    >
      <div>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{quiz.title}</div>
        <div
          style={{ fontWeight: 500, fontSize: 13, opacity: 0.8, marginTop: 2 }}
        >
          {pluralQuestions(quiz.questionCount)} – {quiz.secondsPerQuestion}{" "}
          сек/вопрос
        </div>
        <div style={{ fontWeight: 500, fontSize: 13, marginTop: 2 }}>
          Дата: {dateLabel(quiz.startedAt || quiz.createdAt, quiz.finishedAt)}
        </div>
        <div style={{ fontWeight: 500, fontSize: 13, marginTop: 2 }}>
          Время: {timeLabel(quiz.startedAt, quiz.finishedAt)}
        </div>
        <div
          style={{
            fontWeight: 700,
            fontSize: 14,
            color: "#00cc56",
            marginTop: 4,
          }}
        >
          {quiz.role === "organizer" ? "Как организатор" : "Как участник"}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
        }}
      >
        <StatusBadge status={quiz.status} />
        <StatsButton onClick={() => onStats(quiz.quizId)} />
      </div>
    </div>
  );
}

export default function History() {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/api/history")
      .then(({ data }) => {
        if (!cancelled) setQuizzes(data.quizzes || []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: colors.deepPurple,
        color: colors.white,
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          padding: "40px 60px",
          gap: 24,
          flexWrap: "wrap",
        }}
      >
        <h1 style={{ fontFamily: HEADING_FONT, fontSize: 32, margin: 0 }}>
          QUiZ UP!
        </h1>
        <NavBar
          current="history"
          onNavigate={(k) => {
            if (k === "dashboard") navigate("/dashboard");
            if (k === "profile") navigate("/profile");
          }}
        />
      </header>

      <main
        style={{ maxWidth: 1000, margin: "0 auto", padding: "0 24px 60px" }}
      >
        <div
          style={{
            fontFamily: BODY_FONT,
            fontWeight: 700,
            fontSize: 20,
            marginBottom: 4,
          }}
        >
          Пройденные квизы
        </div>
        <div
          style={{
            fontFamily: BODY_FONT,
            fontWeight: 500,
            fontSize: 13,
            opacity: 0.8,
          }}
        >
          Квизы, в которых вы поучаствовали
        </div>
        <div
          style={{
            fontFamily: BODY_FONT,
            fontWeight: 500,
            fontSize: 13,
            opacity: 0.8,
            marginBottom: 20,
          }}
        >
          Здесь можно посмотреть ваши результаты
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
          {loading ? (
            <div style={{ opacity: 0.7, fontFamily: BODY_FONT }}>Загрузка…</div>
          ) : quizzes.length === 0 ? (
            <div style={{ opacity: 0.7, fontFamily: BODY_FONT }}>
              Пока нет пройденных квизов.
            </div>
          ) : (
            quizzes.map((q) => (
              <HistoryCard
                key={`${q.quizId}-${q.role}`}
                quiz={q}
                onStats={(id) => navigate(`/history/${id}/leaderboard`)}
              />
            ))
          )}
        </div>
      </main>
    </div>
  );
}
