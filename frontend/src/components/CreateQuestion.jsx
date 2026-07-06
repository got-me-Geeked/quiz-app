import { useState, useRef } from "react";
import { colors, HEADING_FONT, BODY_FONT } from "../theme";
import { CheckIcon } from "./quizIcons";
import api from "../api";

const LETTERS = "ABCDEFGH".split("");
const MAX_OPTIONS = 8;
const MAX_IMAGE_MB = 5;

let optionSeq = 0;
function newOption() {
  optionSeq += 1;
  return { id: `o${Date.now()}_${optionSeq}`, text: "" };
}

const selectStyle = {
  fontFamily: BODY_FONT,
  fontSize: 14,
  padding: "8px 10px",
  borderRadius: 8,
  border: `1px solid ${colors.lightPurple}`,
  backgroundColor: colors.midPurple,
  color: colors.white,
  outline: "none",
  cursor: "pointer",
  width: "100%",
  boxSizing: "border-box",
};

const labelStyle = {
  fontFamily: BODY_FONT,
  fontWeight: 500,
  fontSize: 13,
  color: colors.mutedPurple,
  marginBottom: 6,
  display: "block",
};

function FocusField({ children }) {
  return children;
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
        borderRadius: 8,
        padding: "8px 20px",
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
        color: colors.white,
        backgroundColor: hover ? "#E07E00" : colors.orange,
        border: "none",
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "background-color .15s",
        fontWeight: 700,
        fontSize: 14,
        borderRadius: 8,
        padding: "8px 20px",
      }}
    >
      {children}
    </button>
  );
}

export default function CreateQuestion({ initial, onCancel, onSave }) {
  const [format, setFormat] = useState(initial?.format || "text");
  const [answerType, setAnswerType] = useState(initial?.answerType || "single");
  const [content, setContent] = useState(initial?.content || "");
  const [imageName, setImageName] = useState(initial?.imageUrl || null);
  const [imageInfo, setImageInfo] = useState(null); // {size, dims} для показа
  const [options, setOptions] = useState(
    initial?.options?.length
      ? initial.options.map((o) => ({ ...o }))
      : [newOption(), newOption()],
  );
  const [correct, setCorrect] = useState(new Set(initial?.correctAnswer || []));
  const [error, setError] = useState("");
  const [focused, setFocused] = useState(null); // какой элемент в фокусе (для border)
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  function toggleCorrect(id) {
    setError("");
    setCorrect((prev) => {
      const next = new Set(prev);
      if (answerType === "single") {
        // одиночный: только один правильный — заменяем
        next.clear();
        if (!prev.has(id)) next.add(id);
      } else {
        if (next.has(id)) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }

  function updateOption(id, text) {
    setError("");
    setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, text } : o)));
  }

  function addOption() {
    if (options.length >= MAX_OPTIONS) return;
    setOptions((prev) => [...prev, newOption()]);
  }

  function removeOption(id) {
    setOptions((prev) => prev.filter((o) => o.id !== id));
    setCorrect((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  async function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");

    // клиентская проверка
    const okType = ["image/png", "image/jpeg", "image/jpg"].includes(file.type);
    if (!okType) {
      setError("Только PNG, JPG, JPEG");
      return;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setError(`Картинка больше ${MAX_IMAGE_MB} МБ`);
      return;
    }

    // отправка файла на сервер через FormData
    const form = new FormData();
    form.append("image", file);

    setUploading(true);
    try {
      const { data } = await api.post("/api/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setImageName(data.imageUrl);
      setImageInfo(`${(file.size / (1024 * 1024)).toFixed(1)} МБ`);
    } catch (err) {
      setError(err.response?.data?.error || "Не удалось загрузить картинку");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function handleSave() {
    if (format === "text" && !content.trim()) {
      setError("Введите текст вопроса");
      return;
    }
    if (format === "image" && !imageName) {
      setError("Добавьте картинку");
      return;
    }
    const filled = options.filter((o) => o.text.trim());
    if (filled.length < 2) {
      setError("Нужно минимум 2 заполненных варианта");
      return;
    }
    const filledIds = new Set(filled.map((o) => o.id));
    const correctFilled = [...correct].filter((id) => filledIds.has(id));
    if (answerType === "single" && correctFilled.length !== 1) {
      setError("Отметьте ровно один правильный вариант");
      return;
    }
    if (answerType === "multiple" && correctFilled.length < 2) {
      setError("Отметьте минимум два правильных варианта");
      return;
    }

    onSave({
      format,
      answerType,
      content: format === "text" ? content.trim() : content.trim() || null,
      imageUrl: format === "image" ? imageName : null,
      options: filled.map((o) => ({ id: o.id, text: o.text.trim() })),
      correctAnswer: correctFilled,
    });
  }

  const fieldBorder = (key) =>
    `1px solid ${focused === key ? colors.orange : colors.lightPurple}`;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: 20,
      }}
    >
      <div
        style={{
          backgroundColor: colors.lightPurple,
          borderRadius: 15,
          width: "min(450px, 100%)",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "24px 28px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
        }}
      >
        <h2
          style={{
            fontFamily: HEADING_FONT,
            fontSize: 24,
            color: colors.white,
            textAlign: "center",
            margin: "0 0 20px",
          }}
        >
          CREATE QUESTION
        </h2>

        <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Тип вопроса</label>
            <select
              value={format}
              onChange={(e) => {
                setFormat(e.target.value);
                setError("");
              }}
              style={selectStyle}
            >
              <option value="text">Текст</option>
              <option value="image">Картинка</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Тип ответа</label>
            <select
              value={answerType}
              onChange={(e) => {
                const v = e.target.value;
                setAnswerType(v);
                setError("");
                if (v === "single") {
                  setCorrect((prev) => {
                    const first = [...prev][0];
                    return new Set(first ? [first] : []);
                  });
                }
              }}
              style={selectStyle}
            >
              <option value="single">Один вариант</option>
              <option value="multiple">Несколько вариантов</option>
            </select>
          </div>
        </div>

        {format === "text" ? (
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Текст вопроса</label>
            <textarea
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setError("");
              }}
              onFocus={() => setFocused("content")}
              onBlur={() => setFocused(null)}
              rows={3}
              style={{
                width: "100%",
                boxSizing: "border-box",
                resize: "vertical",
                fontFamily: BODY_FONT,
                fontSize: 14,
                padding: "10px 12px",
                borderRadius: 8,
                border: fieldBorder("content"),
                backgroundColor: colors.midPurple,
                color: colors.white,
                outline: "none",
              }}
            />
          </div>
        ) : (
          <div style={{ marginBottom: 16 }}>
            <input
              ref={fileRef}
              type="file"
              accept=".png,.jpg,.jpeg"
              onChange={onFile}
              style={{ display: "none" }}
            />

            {!imageName ? (
              <div
                onClick={() => !uploading && fileRef.current?.click()}
                onFocus={() => setFocused("image")}
                onBlur={() => setFocused(null)}
                tabIndex={0}
                style={{
                  border: `2px dashed ${focused === "image" ? colors.orange : colors.mutedPurple}`,
                  borderRadius: 10,
                  padding: "28px 16px",
                  textAlign: "center",
                  cursor: uploading ? "wait" : "pointer",
                  fontFamily: BODY_FONT,
                  fontSize: 13,
                  color: colors.mutedPurple,
                  background: colors.midPurple,
                }}
              >
                {uploading ? (
                  "Загрузка…"
                ) : (
                  <>
                    Перетащите изображение или нажмите для загрузки
                    <br />
                    <span
                      style={{
                        fontSize: 11,
                        opacity: 0.8,
                        color: colors.mutedPurple,
                      }}
                    >
                      PNG, JPG до {MAX_IMAGE_MB} МБ
                    </span>
                  </>
                )}
              </div>
            ) : (
              <div
                style={{
                  backgroundColor: colors.midPurple,
                  borderRadius: 10,
                  padding: 12,
                }}
              >
                <img
                  src={`${api.defaults.baseURL}${imageName}`}
                  alt="Загруженная картинка"
                  style={{
                    width: "100%",
                    maxHeight: 200,
                    objectFit: "contain",
                    borderRadius: 8,
                    display: "block",
                    marginBottom: 10,
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => !uploading && fileRef.current?.click()}
                    style={{
                      background: "none",
                      color: colors.lightOrange,
                      fontFamily: BODY_FONT,
                      fontSize: 13,
                      borderRadius: 6,
                      padding: "4px 12px",
                      cursor: uploading ? "wait" : "pointer",
                      border: "none",
                    }}
                  >
                    {uploading ? "Загрузка…" : "Заменить"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setImageName(null);
                      setImageInfo(null);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: colors.lightOrange,
                      fontFamily: BODY_FONT,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    Удалить
                  </button>
                </div>
              </div>
            )}

            <label
              style={{
                ...labelStyle,
                marginTop: 14,
              }}
            >
              Подпись к картинке (вопросу)
            </label>
            <textarea
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setError("");
              }}
              onFocus={() => setFocused("caption")}
              onBlur={() => setFocused(null)}
              rows={2}
              style={{
                width: "100%",
                boxSizing: "border-box",
                resize: "vertical",
                fontFamily: BODY_FONT,
                fontSize: 14,
                padding: "10px 12px",
                borderRadius: 8,
                border: fieldBorder("caption"),
                color: colors.white,
                outline: "none",
                background: colors.midPurple,
              }}
            />
          </div>
        )}

        <div
          style={{
            height: 1,
            backgroundColor: colors.white,
            opacity: 0.8,
            margin: "18px 0",
          }}
        />

        <label
          style={{
            ...labelStyle,
            fontWeight: 500,
            fontSize: 13,
            color: colors.white,
            opacity: 0.7,
          }}
        >
          Варианты ответа
        </label>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            marginTop: 8,
          }}
        >
          {options.map((o, i) => {
            const isCorrect = correct.has(o.id);
            return (
              <div
                key={o.id}
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    flexShrink: 0,
                    backgroundColor: colors.midPurple,
                    color: colors.white,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: BODY_FONT,
                    fontWeight: 700,
                    fontSize: 12,
                  }}
                >
                  {LETTERS[i] || "?"}
                </div>
                <input
                  value={o.text}
                  onChange={(e) => updateOption(o.id, e.target.value)}
                  onFocus={() => setFocused(`opt-${o.id}`)}
                  onBlur={() => setFocused(null)}
                  placeholder={`Вариант ${LETTERS[i] || ""}`}
                  style={{
                    flex: 1,
                    boxSizing: "border-box",
                    fontFamily: BODY_FONT,
                    fontSize: 14,
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: `1px solid ${
                      isCorrect
                        ? "#00ff6c"
                        : focused === `opt-${o.id}`
                          ? colors.orange
                          : colors.lightPurple
                    }`,
                    backgroundColor: colors.midPurple,
                    color: colors.white,
                    outline: "none",
                  }}
                />
                <button
                  type="button"
                  onClick={() => toggleCorrect(o.id)}
                  title="Правильный ответ"
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    flexShrink: 0,
                    border: `1px solid ${isCorrect ? "#00ff6c" : "rgba(0,255,108,0.5)"}`,
                    backgroundColor: isCorrect
                      ? "#00ff6c"
                      : "rgba(39,174,96,0.4)",
                    color: colors.white,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "background-color .15s",
                  }}
                >
                  <CheckIcon size={15} />
                </button>
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(o.id)}
                    title="Убрать вариант"
                    style={{
                      background: "none",
                      border: "none",
                      color: colors.mutedPurple,
                      cursor: "pointer",
                      fontSize: 18,
                      lineHeight: 1,
                      padding: "0 4px",
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {options.length < MAX_OPTIONS && (
          <button
            type="button"
            onClick={addOption}
            style={{
              background: "none",
              border: "none",
              fontFamily: BODY_FONT,
              fontWeight: 500,
              fontSize: 13,
              cursor: "pointer",
              marginTop: 10,
              padding: 0,
              color: colors.white,
              opacity: 0.7,
            }}
          >
            + Добавить вариант ответа
          </button>
        )}

        {error && (
          <div
            style={{
              color: colors.red,
              fontFamily: BODY_FONT,
              fontSize: 12,
              marginTop: 12,
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 20,
          }}
        >
          <ChangeButton children={"Отмена"} onClick={onCancel}></ChangeButton>
          <SectionButton onClick={handleSave}>Сохранить вопрос</SectionButton>
        </div>
      </div>
    </div>
  );
}
