import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { colors, HEADING_FONT, BODY_FONT } from "../theme";
import { BackIcon } from "../components/quizIcons";
import { connectSocket, getSocket } from "../socket";
import QuizPlay from "../components/QuizPlay";
import Leaderboard from "../components/Leaderboard";

function pluralQ(n) {
  const a = n % 10,
    b = n % 100;
  if (a === 1 && b !== 11) return "Вопрос";
  if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return "Вопроса";
  return "Вопросов";
}

function StatCard({ label, value }) {
  return (
    <div
      style={{
        flex: "1 1 auto",
        backgroundColor: colors.lightPurple,
        borderRadius: 8,
        padding: "10px 12px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: BODY_FONT,
          fontWeight: 700,
          fontSize: 10,
          color: colors.white,
          opacity: 0.8,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: BODY_FONT,
          fontWeight: 700,
          fontSize: 15,
          color: colors.white,
          marginTop: 2,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function Divider() {
  return (
    <div
      style={{
        height: 1,
        backgroundColor: colors.white,
        opacity: 0.8,
        margin: "16px 0",
      }}
    />
  );
}

function rankColor(index) {
  if (index === 0) return "#FFD700";
  if (index === 1) return "#C4C4C4";
  if (index === 2) return "#DAA06D";
  return colors.white;
}

function IconBarButton({ variant, title, onClick, disabled, children }) {
  const [hover, setHover] = useState(false);

  const base = {
    save: {
      bg: "rgba(39,174,96,0.9)",
      bgHover: "#00FF6C",
      border: "#00FF6C",
      color: colors.white,
    },
    back: {
      bg: "#646464",
      bgHover: "rgba(206,206,206,0.8)",
      border: "rgba(206,206,206,0.8)",
      color: colors.white,
    },
  }[variant];

  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 46,
        height: 34,
        borderRadius: 10,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        color: base.color,
        backgroundColor: hover && !disabled ? base.border : base.bg,
        border: `1px solid ${base.border}`,
        opacity: disabled ? 0.6 : 1,
        transition: "background-color .15s",
      }}
    >
      {children}
    </button>
  );
}

function IconButton({ variant, title, onClick, children }) {
  const [hover, setHover] = useState(false);
  const variants = {
    delete: { bg: "rgba(235,87,87,0.6)", border: "#EB5757" },
    edit: { bg: "#646464", border: "rgba(206,206,206,0.8)" },
    activate: { bg: "rgba(39,174,96,0.6)", border: "#00FF6C" },
    openRoom: { bg: "rgba(39,174,96,0.6)", border: "#00FF6C" },
    returnRoom: { bg: "rgba(39,174,96,0.6)", border: "#00FF6C" },
  };
  const v = variants[variant];
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        border: `1px solid ${v.border}`,
        backgroundColor: hover ? v.border : v.bg,
        transition: "background-color .15s",
        fontFamily: BODY_FONT,
        fontWeight: 400,
        fontSize: 20,
        color: colors.white,
        borderRadius: 10,
        padding: "6px 16px",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

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
        color: colors.white,
        backgroundColor: hover ? "#E07E00" : colors.orange,
        border: "none",
        whiteSpace: "nowrap",
        transition: "background-color .15s",
        width: "100%",
        fontSize: 20,
        borderRadius: 8,
        padding: "12px",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

export default function Room() {
  const navigate = useNavigate();
  const { roomCode } = useParams();

  const [quiz, setQuiz] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [me, setMe] = useState(null);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const socketRef = useRef(null);
  const [notice, setNotice] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [phase, setPhase] = useState("lobby"); //lobby | playing | finished
  const [question, setQuestion] = useState(null); //текущий вопрос
  const [deadline, setDeadline] = useState(0); //серверный дедлайн вопроса
  const [reveal, setReveal] = useState(null); //подсветка в конце вопроса
  const [finalBoard, setFinalBoard] = useState([]); //финальны лидерборд

  useEffect(() => {
    const socket = connectSocket();
    socketRef.current = socket;

    socket.emit("room:join", { roomCode }, (resp) => {
      if (resp?.error) {
        setError(resp.error);
        return;
      }
      setMe(resp.you);
      setQuiz(resp.quiz);
      setParticipants(resp.participants || []);

      socket.emit("game:rejoin", { roomCode }, (state) => {
        if (state?.inProgress) {
          setQuestion(state.question);
          setDeadline(state.deadline);
          setParticipants(state.leaderboard || resp.participants);
          setPhase("playing");
          if (state.alreadyAnswered) {
            setReveal(state.alreadyAnswered);
          }
        }
      });
    });

    const onParticipants = (list) => setParticipants(list);

    const onCancelled = () => {
      setNotice("Квиз отменён организатором");
    };
    const onStarted = () => setPhase("playing");

    const onQuestion = ({ question, deadline }) => {
      setQuestion(question);
      setDeadline(deadline);
      setReveal(null); //сброс подсветки на новом вопросе
    };

    const onQuestionEnd = ({ index, correctAnswer }) => {
      setReveal((prev) => prev || { correctAnswer, yourSelected: [] });
    };

    const onLeaderboard = (list) => {
      setParticipants(list);
    };

    const onFinished = ({ leaderboard }) => {
      setFinalBoard(leaderboard);
      setPhase("finished");
    };

    socket.on("room:participants", onParticipants);
    socket.on("room:started", onStarted);
    socket.on("room:cancelled", onCancelled);
    socket.on("connect_error", (e) =>
      setError(e.message || "Ошибка соединения"),
    );
    socket.on("room:started", onStarted);
    socket.on("game:question", onQuestion);
    socket.on("game:questionEnd", onQuestionEnd);
    socket.on("game:leaderboard", onLeaderboard);
    socket.on("game:finished", onFinished);

    return () => {
      socket.emit("room:leave", { roomCode });
      socket.off("room:participants", onParticipants);
      socket.off("room:started", onStarted);
      socket.off("room:cancelled", onCancelled);
      socket.off("game:question", onQuestion);
      socket.off("game:questionEnd", onQuestionEnd);
      socket.off("game:leaderboard", onLeaderboard);
      socket.off("game:finished", onFinished);
    };
  }, [roomCode, navigate]);

  const isOrg = me?.isOrganizer;
  const totalTimeLabel = quiz
    ? (() => {
        const totalSec = quiz.questionCount * quiz.secondsPerQuestion;
        const m = Math.floor(totalSec / 60);
        const s = totalSec % 60;
        return m > 0 ? `${m} мин${s ? ` ${s} с` : ""}` : `${s} сек`;
      })()
    : "—";

  function handleStart() {
    setStarting(true);
    socketRef.current?.emit("room:start", { roomCode }, (resp) => {
      setStarting(false);
      if (resp?.error) setError(resp.error);
    });
  }

  function handleAnswer(selected) {
    return new Promise((resolve) => {
      socketRef.current?.emit("game:answer", { roomCode, selected }, (resp) => {
        resolve(resp || {});
      });
    });
  }

  function handleCancel() {
    setConfirmCancel(true);
  }
  function doCancel() {
    setConfirmCancel(false);
    socketRef.current?.emit("room:cancel", { roomCode }, (resp) => {
      if (resp?.error) {
        setError(resp.error);
        return;
      }
      navigate("/dashboard");
    });
  }

  if (notice) {
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
        <div style={{ fontFamily: BODY_FONT, fontSize: 18 }}>{notice}</div>
        <button
          onClick={() => navigate("/dashboard")}
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
          На дашборд
        </button>
      </div>
    );
  }

  if (phase === "finished") {
    return <Leaderboard leaderboard={finalBoard} meUserId={me?.userId} />;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: colors.deepPurple,
        color: colors.white,
      }}
    >
      <div style={{ padding: "40px 60px 0" }}>
        <h1 style={{ fontFamily: HEADING_FONT, fontSize: 32, margin: 0 }}>
          QUiZ UP!
        </h1>
      </div>

      <main
        style={{ maxWidth: 1000, margin: "0 auto", padding: "20px 24px 60px" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              width: "300px",
            }}
          >
            <IconBarButton
              variant="back"
              title="Назад"
              onClick={() => navigate("/dashboard")}
            >
              <BackIcon />
            </IconBarButton>
          </div>
          <div
            style={{
              width: "300px",
              alignItems: "center",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <h2
              style={{
                fontFamily: HEADING_FONT,
                fontSize: 32,
              }}
            >
              QUIZ ROOM
            </h2>
          </div>

          {isOrg ? (
            <div
              style={{
                width: "300px",
                alignItems: "right",
                display: "flex",
                justifyContent: "right",
              }}
            >
              <IconButton
                variant="delete"
                title="Отменить квиз"
                onClick={handleCancel}
                children="Отменить квиз"
              ></IconButton>
            </div>
          ) : (
            <div
              style={{
                width: "300px",
                alignItems: "right",
                display: "flex",
                justifyContent: "right",
              }}
            />
          )}
        </div>

        <div
          style={{
            display: "flex",
            gap: 24,
            flexWrap: "wrap",
            alignItems: "flex-start",
          }}
        >
          <section
            style={{
              flex: "1 1 380px",
              minWidth: 300,
              backgroundColor: colors.midPurple,
              borderRadius: 12,
              padding: 20,
            }}
          >
            {phase === "playing" && question ? (
              <QuizPlay
                question={question}
                deadline={deadline}
                quizTitle={quiz?.title}
                myPosition={
                  participants.findIndex((p) => p.userId === me?.userId) + 1
                }
                onAnswer={handleAnswer}
                revealed={reveal}
              />
            ) : (
              <>
                <div
                  style={{
                    fontFamily: BODY_FONT,
                    fontWeight: 700,
                    fontSize: 20,
                    color: colors.white,
                    textAlign: "center",
                  }}
                >
                  {quiz?.title || "Загрузка…"}
                </div>

                {isOrg && (
                  <>
                    <Divider />
                    <div style={{ textAlign: "center" }}>
                      <div
                        style={{
                          fontFamily: BODY_FONT,
                          fontWeight: 700,
                          fontSize: 20,
                          color: colors.white,
                        }}
                      >
                        Код комнаты
                      </div>
                      <div
                        style={{
                          fontFamily: BODY_FONT,
                          fontWeight: 700,
                          fontSize: 32,
                          color: "#00ff6c",
                          margin: "6px 0",
                        }}
                      >
                        {quiz?.roomCode || roomCode}
                      </div>
                      <div
                        style={{
                          fontFamily: BODY_FONT,
                          fontWeight: 700,
                          fontSize: 16,
                          color: colors.white,
                          opacity: 0.8,
                        }}
                      >
                        Поделитесь кодом с участниками
                      </div>
                    </div>
                  </>
                )}

                <Divider />

                <div style={{ display: "flex", gap: 10 }}>
                  {isOrg ? (
                    <>
                      <StatCard
                        label="Подключились"
                        value={participants.length}
                      />
                      <StatCard
                        label={pluralQ(quiz?.questionCount || 0)}
                        value={quiz?.questionCount ?? "—"}
                      />
                      <StatCard label="Время на квиз" value={totalTimeLabel} />
                    </>
                  ) : (
                    <>
                      <StatCard label="Игроков" value={participants.length} />
                      <StatCard
                        label="Вопросов"
                        value={quiz?.questionCount ?? "—"}
                      />
                      <StatCard
                        label="Время на вопрос"
                        value={quiz ? `${quiz.secondsPerQuestion} сек` : "—"}
                      />
                    </>
                  )}
                </div>

                <Divider />

                {isOrg ? (
                  <SectionButton
                    onClick={handleStart}
                    disabled={starting}
                    style={{ cursor: starting ? "wait" : "pointer" }}
                  >
                    {starting ? "Запуск…" : "Запустить квиз"}
                  </SectionButton>
                ) : (
                  <div
                    style={{
                      textAlign: "center",
                      fontFamily: BODY_FONT,
                      fontWeight: 700,
                      fontSize: 20,
                      color: colors.white,
                      opacity: 0.8,
                    }}
                  >
                    Ожидайте запуска квиза…
                  </div>
                )}
              </>
            )}
          </section>
          <section
            style={{
              flex: "1 1 380px",
              minWidth: 300,
              backgroundColor: colors.midPurple,
              borderRadius: 12,
              padding: 20,
            }}
          >
            <div
              style={{
                fontFamily: BODY_FONT,
                fontWeight: 700,
                fontSize: 20,
                textAlign: "center",
                marginBottom: 12,
              }}
            >
              Участники
            </div>
            <div style={{ maxHeight: 10 * 44, overflowY: "auto" }}>
              {participants.map((p, i) => (
                <div
                  key={p.userId}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 4px",
                    borderBottom:
                      i < participants.length - 1
                        ? "1px solid rgba(255,255,255,0.25)"
                        : "none",
                    fontFamily: BODY_FONT,
                    fontWeight: 500,
                    fontSize: 20,
                    color: rankColor(i),
                  }}
                >
                  <span>
                    {i + 1} {p.username}
                    {p.isOrganizer && " (орг)"}
                    {me && p.userId === me.userId && " (вы)"}
                  </span>
                  <span>{p.score}</span>
                </div>
              ))}
              {participants.length === 0 && (
                <div
                  style={{
                    fontFamily: BODY_FONT,
                    fontSize: 14,
                    opacity: 0.7,
                    textAlign: "center",
                  }}
                >
                  Пока никого нет
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
      {confirmCancel && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
        >
          <div
            style={{
              backgroundColor: colors.lightPurple,
              borderRadius: 15,
              padding: "24px 28px",
              width: "min(400px, 90%)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontFamily: BODY_FONT,
                fontWeight: 700,
                fontSize: 18,
                color: colors.white,
                marginBottom: 20,
              }}
            >
              Отменить квиз для всех участников?
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <IconButton
                variant="edit"
                title="Отказ"
                onClick={() => setConfirmCancel(false)}
                children="Нет"
                style={{
                  fontFamily: BODY_FONT,
                  fontWeight: 700,
                  fontSize: 14,
                  borderRadius: 8,
                  padding: "8px 20px",
                }}
              ></IconButton>
              <IconButton
                variant="delete"
                title="Отменить квиз"
                onClick={doCancel}
                children="Да, отменить"
                style={{
                  fontFamily: BODY_FONT,
                  fontWeight: 700,
                  fontSize: 14,
                  borderRadius: 8,
                  padding: "8px 20px",
                }}
              ></IconButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
