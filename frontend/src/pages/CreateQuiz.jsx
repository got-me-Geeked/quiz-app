import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api";
import { colors, HEADING_FONT, BODY_FONT, pluralQuestions } from "../theme";
import { BackIcon, SaveIcon } from "../components/quizIcons";
import CreateQuestion from "../components/CreateQuestion";

const MAX_QUESTIONS = 20;

const labelStyle = {
  fontFamily: BODY_FONT,
  fontWeight: 700,
  fontSize: 15,
  color: colors.white,
  marginBottom: 6,
  display: "block",
};

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
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
        fontWeight: "bold",
        fontSize: 32,
        color: colors.white,
        backgroundColor: hover ? "#E07E00" : colors.orange,
        border: "none",
        borderRadius: 6,
        padding: "0px 21px",
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "background-color .15s",
      }}
    >
      {children}
    </button>
  );
}

function ChangeButton({ children, onClick }) {
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
        fontSize: 14,
        color: colors.white,
        border: "none",
        borderRadius: 6,
        padding: "6px 14px",
        cursor: "pointer",
        backgroundColor: hover ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.25)",
        whiteSpace: "nowrap",
        transition: "background-color .15s",
      }}
    >
      {children}
    </button>
  );
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

export default function CreateQuiz() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [minPlayers, setMinPlayers] = useState("1");
  const [maxPlayers, setMaxPlayers] = useState("50");
  const [secondsPerQuestion, setSecondsPerQuestion] = useState("30");
  const [questions, setQuestions] = useState([]);
  const [focused, setFocused] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    api
      .get(`/api/quiz/${id}`)
      .then(({ data }) => {
        if (cancelled) return;
        const q = data.quiz;
        setTitle(q.title || "");
        setCategory(q.category || "");
        setMinPlayers(String(q.minPlayers));
        setMaxPlayers(String(q.maxPlayers));
        setSecondsPerQuestion(String(q.secondsPerQuestion));
        setQuestions(q.questions || []);
      })
      .catch(() => setError("Не удалось загрузить квиз"));
    return () => {
      cancelled = true;
    };
  }, [id]);

  const inputStyle = (key) => ({
    width: "100%",
    boxSizing: "border-box",
    fontFamily: BODY_FONT,
    fontSize: 14,
    padding: "8px 12px",
    borderRadius: 8,
    border: `1px solid ${focused === key ? colors.orange : colors.lightPurple}`,
    backgroundColor: colors.white,
    color: "#303030",
    outline: "none",
  });

  function openNewQuestion() {
    setEditingIndex(null);
    setModalOpen(true);
  }
  function openEditQuestion(index) {
    setEditingIndex(index);
    setModalOpen(true);
  }
  function handleQuestionSave(q) {
    setQuestions((prev) => {
      if (editingIndex === null) return [...prev, q];
      return prev.map((item, i) => (i === editingIndex ? q : item));
    });
    setModalOpen(false);
    setEditingIndex(null);
  }

  async function handleSaveQuiz() {
    setError("");
    if (!title.trim()) {
      setError("Введите название квиза");
      return;
    }
    if (questions.length === 0) {
      setError("Добавьте хотя бы один вопрос");
      return;
    }
    if (questions.length > MAX_QUESTIONS) {
      setError(`Максимум ${MAX_QUESTIONS} вопросов`);
      return;
    }

    setSaving(true);
    const payload = {
      title: title.trim(),
      category: category.trim() || null,
      minPlayers: Number(minPlayers),
      maxPlayers: Number(maxPlayers),
      secondsPerQuestion: Number(secondsPerQuestion),
      questions,
    };
    try {
      if (id) await api.put(`/api/quiz/${id}`, payload);
      else await api.post("/api/quiz", payload);
      navigate("/dashboard"); // назад на дашборд — он перезапросит /mine
    } catch (err) {
      setError(err.response?.data?.error || "Не удалось сохранить квиз");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: colors.deepPurple,
        color: colors.white,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          maxWidth: 1000,
          margin: "auto",
          padding: "0 24px 60px",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "40px 60px",
          }}
        >
          <IconBarButton
            variant="back"
            title="Назад"
            onClick={() => navigate("/dashboard")}
          >
            <BackIcon />
          </IconBarButton>
          <h1
            style={{
              fontFamily: HEADING_FONT,
              fontSize: 32,
              color: colors.white,
              margin: 0,
            }}
          >
            CREATE QUIZ
          </h1>
          <IconBarButton
            variant="save"
            title="Сохранить"
            onClick={handleSaveQuiz}
            disabled={saving}
          >
            <SaveIcon />
          </IconBarButton>
        </header>

        <main
          style={{
            maxWidth: 1000,
            margin: "0 auto",
            padding: "0 24px 60px",
            display: "flex",
            gap: 48,
            flexWrap: "wrap",
            alignItems: "flex-start",
          }}
        >
          <section style={{ flex: "1 1 340px", minWidth: 300 }}>
            <h2
              style={{
                fontFamily: HEADING_FONT,
                fontSize: 20,
                textAlign: "center",
                marginBottom: 20,
              }}
            >
              SETTINGS
            </h2>

            <Field label="Название квиза">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onFocus={() => setFocused("title")}
                onBlur={() => setFocused(null)}
                style={inputStyle("title")}
              />
            </Field>

            <Field label="Категория квиза">
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                onFocus={() => setFocused("category")}
                onBlur={() => setFocused(null)}
                style={inputStyle("category")}
              />
            </Field>

            <div style={{ display: "flex", gap: 16 }}>
              <Field label="Мин. участников">
                <input
                  type="number"
                  min={1}
                  value={minPlayers}
                  onChange={(e) => setMinPlayers(e.target.value)}
                  onFocus={() => setFocused("min")}
                  onBlur={() => setFocused(null)}
                  style={inputStyle("min")}
                />
              </Field>
              <Field label="Макс. участников">
                <input
                  type="number"
                  max={50}
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(e.target.value)}
                  onFocus={() => setFocused("max")}
                  onBlur={() => setFocused(null)}
                  style={inputStyle("max")}
                />
              </Field>
            </div>

            <Field label="Время на вопрос (в секундах)">
              <input
                type="number"
                min={10}
                max={180}
                value={secondsPerQuestion}
                onChange={(e) => setSecondsPerQuestion(e.target.value)}
                onFocus={() => setFocused("spq")}
                onBlur={() => setFocused(null)}
                style={{ ...inputStyle("spq"), width: 160 }}
              />
            </Field>
          </section>

          <section style={{ flex: "1 1 340px", minWidth: 300 }}>
            <h2
              style={{
                fontFamily: HEADING_FONT,
                fontSize: 20,
                textAlign: "center",
                marginBottom: 20,
              }}
            >
              QUESTIONS
            </h2>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 14,
              }}
            >
              <span
                style={{ fontFamily: BODY_FONT, fontWeight: 700, fontSize: 15 }}
              >
                Добавлено вопросов ({questions.length})
              </span>
              {questions.length < MAX_QUESTIONS && (
                <SectionButton onClick={openNewQuestion}>+</SectionButton>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {questions.map((q, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    backgroundColor: colors.midPurple,
                    borderRadius: 8,
                    padding: "10px 14px",
                  }}
                >
                  <span
                    style={{
                      fontFamily: BODY_FONT,
                      fontSize: 15,
                      color: "rgba(255,255,255,0.8)",
                    }}
                  >
                    Вопрос {i + 1}
                  </span>
                  <ChangeButton
                    children={"Изменить"}
                    onClick={() => openEditQuestion(i)}
                  ></ChangeButton>
                </div>
              ))}
              {questions.length === 0 && (
                <div
                  style={{
                    fontFamily: BODY_FONT,
                    fontSize: 13,
                    color: colors.mutedPurple,
                    opacity: 0.8,
                  }}
                >
                  Пока нет вопросов. Нажмите «+», чтобы добавить.
                </div>
              )}
            </div>
          </section>
        </main>

        {error && (
          <div
            style={{
              textAlign: "center",
              color: colors.red,
              fontFamily: BODY_FONT,
              fontSize: 13,
              paddingBottom: 20,
            }}
          >
            {error}
          </div>
        )}

        {modalOpen && (
          <CreateQuestion
            initial={editingIndex !== null ? questions[editingIndex] : null}
            onCancel={() => {
              setModalOpen(false);
              setEditingIndex(null);
            }}
            onSave={handleQuestionSave}
          />
        )}
      </div>
    </div>
  );
}
