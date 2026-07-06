import { useState, useEffect, useMemo } from "react";
import { colors, BODY_FONT } from "../theme";
import Timer from "./Timer";
import api from "../api";

//на всякий, чтобы текст был нормальный по размеру
function answerFontSize(text) {
  const len = (text || "").length;
  if (len > 40) return 13;
  if (len > 20) return 16;
  return 20;
}

//карточка ответа
function AnswerCard({ option, state, onClick, disabled }) {
  const [hover, setHover] = useState(false);
  let bg = colors.lightPurple;
  if (state === "selected") bg = colors.deepPurple;
  else if (state === "correct") bg = "#00cc56";
  else if (state === "wrong") bg = colors.red;
  else if (hover && !disabled) bg = colors.deepPurple;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        flex: "1 1 45%",
        minWidth: 120,
        backgroundColor: bg,
        color: colors.white,
        border: "none",
        borderRadius: 6,
        padding: "14px 12px",
        fontFamily: BODY_FONT,
        fontWeight: 700,
        fontSize: answerFontSize(option.text),
        cursor: disabled ? "default" : "pointer",
        transition: "background-color .2s",
      }}
    >
      {option.text}
    </button>
  );
}

export default function QuizPlay({
  question,
  deadline,
  quizTitle,
  myPosition,
  onAnswer,
  revealed,
}) {
  const [selected, setSelected] = useState([]);
  const [answered, setAnswered] = useState(false);
  const [reveal, setReveal] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const isMultiple = question.answerType === "multiple";

  useEffect(() => {
    setSelected([]);
    setAnswered(false);
    setReveal(null);
    setSubmitting(false);
  }, [question.index]);

  useEffect(() => {
    if (revealed && !reveal) setReveal(revealed);
  }, [revealed, reveal]);

  async function handleSingleClick(optionId) {
    if (answered || submitting) return;
    setSubmitting(true);
    const resp = await onAnswer([optionId]);
    setSubmitting(false);
    if (resp?.error) return;
    setAnswered(true);
    setReveal({
      correctAnswer: resp.correctAnswer,
      yourSelected: resp.yourSelected,
    });
  }

  function toggleSelect(optionId) {
    if (answered || submitting) return;
    setSelected((prev) =>
      prev.includes(optionId)
        ? prev.filter((id) => id !== optionId)
        : [...prev, optionId],
    );
  }

  async function handleSubmit() {
    if (answered || submitting) return;
    setSubmitting(true);
    const resp = await onAnswer(selected);
    setSubmitting(false);
    if (resp?.error) return;
    setAnswered(true);
    setReveal({
      correctAnswer: resp.correctAnswer,
      yourSelected: resp.yourSelected,
    });
  }

  function cardState(optionId) {
    if (reveal) {
      const isCorrect = reveal.correctAnswer?.includes(optionId);
      const iChose = reveal.yourSelected?.includes(optionId);
      if (isCorrect) return "correct";
      if (iChose && !isCorrect) return "wrong";
      return "idle";
    }
    if (isMultiple && selected.includes(optionId)) return "selected";
    return "idle";
  }

  const locked = answered || !!reveal;

  return (
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
        {quizTitle}
      </div>
      <div
        style={{
          height: 1,
          backgroundColor: colors.white,
          opacity: 0.8,
          margin: "14px 0",
        }}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontFamily: BODY_FONT,
          fontWeight: 500,
          fontSize: 16,
          color: colors.white,
          opacity: 0.8,
        }}
      >
        <span>
          Вопрос {question.index + 1}/{question.total}
        </span>
        <span>Ваша позиция: {myPosition}-ый</span>
      </div>
      <Timer deadline={deadline} />
      <div
        style={{
          border: `2px solid ${colors.orange}`,
          borderRadius: 10,
          padding: 16,
          margin: "8px 0 16px",
          textAlign: "center",
        }}
      >
        {question.format === "image" && question.imageUrl && (
          <img
            src={`${api.defaults.baseURL}${question.imageUrl}`}
            alt="Вопрос"
            style={{
              maxWidth: "100%",
              maxHeight: 200,
              objectFit: "contain",
              borderRadius: 8,
              display: "block",
              margin: "0 auto 10px",
            }}
          />
        )}
        {question.content && (
          <div
            style={{
              fontFamily: BODY_FONT,
              fontWeight: 700,
              fontSize: 18,
              color: colors.white,
            }}
          >
            {question.content}
          </div>
        )}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {question.options.map((o) => (
          <AnswerCard
            key={o.id}
            option={o}
            state={cardState(o.id)}
            disabled={locked}
            onClick={() =>
              isMultiple ? toggleSelect(o.id) : handleSingleClick(o.id)
            }
          />
        ))}
      </div>
      {isMultiple && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={locked}
          style={{
            width: "100%",
            marginTop: 12,
            backgroundColor: locked ? "#646464" : colors.orange,
            color: colors.white,
            border: "none",
            borderRadius: 6,
            padding: "12px",
            fontFamily: BODY_FONT,
            fontWeight: 700,
            fontSize: 16,
            cursor: locked ? "default" : "pointer",
          }}
        >
          Ответить
        </button>
      )}
      <div
        style={{
          fontFamily: BODY_FONT,
          fontWeight: 500,
          fontSize: 14,
          color: colors.white,
          opacity: 0.8,
          marginTop: 12,
          textAlign: "center",
        }}
      >
        {isMultiple
          ? "Выберите несколько ответов – ответ нельзя отменить"
          : "Выберите один ответ – ответ нельзя отменить"}
      </div>
    </>
  );
}
