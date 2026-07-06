import { useState, useEffect } from "react";
import api from "../api";
import { styles, colors, HEADING_FONT, BODY_FONT } from "../theme";
import NavBar from "../components/NavBar";
import QuizCard from "../components/QuizCard";
import { useNavigate } from "react-router-dom";

function SectionButton({ children, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        fontFamily: BODY_FONT,
        fontWeight: 700,
        fontSize: 16,
        color: colors.white,
        backgroundColor: hover ? "#E07E00" : colors.orange,
        border: "none",
        borderRadius: 6,
        padding: "6px 14px",
        cursor: "pointer",
        boxShadow: "5px 5px 1px rgba(0,0,0,0.25)",
        whiteSpace: "nowrap",
        transition: "background-color .15s",
      }}
    >
      {children}
    </button>
  );
}

function SectionHeader({ title, subtitle, children }) {
  // children = кнопка (и опц. поле ввода), выровненная справа
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      <div>
        <div
          style={{
            fontFamily: BODY_FONT,
            fontWeight: 700,
            fontSize: 20,
            color: colors.white,
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            style={{
              fontFamily: BODY_FONT,
              fontWeight: 500,
              fontSize: 13,
              color: colors.white,
              opacity: 0.8,
              marginTop: 4,
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Divider() {
  return (
    <div
      style={{
        height: 3,
        backgroundColor: colors.white,
        opacity: 0.8,
        borderRadius: 75,
        margin: "24px 0",
      }}
    />
  );
}

export default function Dashboard() {
  const [quizzes, setQuizzes] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [roomCode, setRoomCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [mine, session] = await Promise.all([
          api.get("/api/quiz/mine"),
          api.get("/api/quiz/active-session"),
        ]);
        if (!cancelled) {
          setQuizzes(mine.data.quizzes || []);
          setActiveSession(session.data.activeSession || null);
        }
      } catch {
        //игнорируем
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  //если есть активный квиз у организатора, то на черновиках прячем кнопку активации
  const hasActiveOrWaiting = quizzes.some(
    (q) => q.status === "active" || q.status === "waiting",
  );

  async function handleCardAction(action, quiz) {
    if (action === "edit") {
      navigate(`/quiz/${quiz.id}/edit`);
      return;
    }
    if (action === "delete") {
      try {
        await api.delete(`/api/quiz/${quiz.id}`).catch(() => {});
        setQuizzes((prev) => prev.filter((q) => q.id !== quiz.id));
      } catch (err) {
        console.error(
          "delete failed:",
          err.response?.status,
          err.response?.data,
        );
        alert(err.response?.data?.error || "Не удалось удалить квиз");
      }
      return;
    }
    if (
      action === "activate" ||
      action === "open-room" ||
      action === "return"
    ) {
      const { data } = await api.post(`/api/quiz/${quiz.id}/${action}`);
      navigate(`/room/${data.roomCode}`);
      return;
    }
  }

  async function handleJoin() {
    setJoinError("");
    if (!roomCode.trim()) {
      setJoinError("Введите код комнаты");
      return;
    }
    try {
      const { data } = await api.post("/api/quiz/join", {
        roomCode: roomCode.trim(),
      });
      navigate(`/room/${data.roomCode}`);
    } catch (err) {
      setJoinError(err.response?.data?.error || "Не удалось подключиться");
    }
  }

  const quizzesForRender = quizzes.map((q) =>
    q.status === "draft" && hasActiveOrWaiting
      ? { ...q, _hideActivate: true }
      : q,
  );

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
        <h1
          style={{
            fontFamily: HEADING_FONT,
            fontSize: 32,
            color: colors.white,
            margin: 0,
          }}
        >
          QUiZ UP!
        </h1>
        <NavBar current="dashboard" />
      </header>

      <main
        style={{
          maxWidth: 1000,
          margin: "0 auto",
          padding: "0 24px 60px",
        }}
      >
        <div
          style={{
            backgroundColor: colors.deepPurple,
            borderRadius: 15,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <section>
            <div
              style={{
                fontFamily: HEADING_FONT,
                fontSize: 20,
                color: colors.white,
                marginBottom: 12,
              }}
            >
              ORGANIZER
            </div>
            <SectionHeader
              title="Мои квизы"
              subtitle="Квизы, которые вы создали"
            >
              <SectionButton onClick={() => navigate("/quiz/new")}>
                + Создать квиз
              </SectionButton>
            </SectionHeader>
            <div
              style={{
                fontFamily: BODY_FONT,
                fontWeight: 500,
                fontSize: 13,
                color: colors.white,
                opacity: 0.8,
                marginTop: 8,
              }}
            >
              Завершённые квизы можно посмотреть в истории
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 20,
                marginTop: 20,
              }}
            >
              {loading ? (
                <div style={{ opacity: 0.7, fontFamily: BODY_FONT }}>
                  Загрузка…
                </div>
              ) : quizzesForRender.length === 0 ? (
                <div style={{ opacity: 0.7, fontFamily: BODY_FONT }}>
                  Пока нет квизов. Создайте первый.
                </div>
              ) : (
                quizzesForRender.map((q) => (
                  <QuizCard key={q.id} quiz={q} onAction={handleCardAction} />
                ))
              )}
            </div>
          </section>

          <Divider />

          <section>
            <div
              style={{
                fontFamily: HEADING_FONT,
                fontSize: 20,
                color: colors.white,
                marginBottom: 12,
              }}
            >
              PARTICIPANT
            </div>

            {activeSession ? (
              <SectionHeader
                title={`Вы участвуете в квизе «${activeSession.title}»`}
                subtitle="Вернитесь в комнату, чтобы продолжить участие"
              >
                <SectionButton
                  onClick={() => navigate(`/room/${activeSession.roomCode}`)}
                >
                  Вернуться
                </SectionButton>
              </SectionHeader>
            ) : (
              <>
                <SectionHeader
                  title="Присоединиться к квизу"
                  subtitle="Введите код комнаты, чтобы войти в активный квиз"
                >
                  <input
                    value={roomCode}
                    onChange={(e) => {
                      setRoomCode(e.target.value);
                      setJoinError("");
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                    placeholder="Код комнаты"
                    style={{
                      ...styles.input,
                      fontFamily: BODY_FONT,
                      width: 200,
                      fontSize: 13,
                      padding: "8px 7px",
                    }}
                  />
                  <SectionButton onClick={handleJoin}>Войти</SectionButton>
                </SectionHeader>
                <div
                  style={{
                    fontFamily: BODY_FONT,
                    fontWeight: 500,
                    fontSize: 13,
                    color: colors.white,
                    opacity: 0.8,
                    marginTop: 8,
                  }}
                >
                  Код выдает организатор перед началом квиза
                </div>
              </>
            )}
            {joinError && (
              <div
                style={{
                  color: colors.red,
                  fontSize: 12,
                  fontFamily: BODY_FONT,
                  marginTop: 8,
                }}
              >
                {joinError}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
