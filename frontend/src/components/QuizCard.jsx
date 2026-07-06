import { useState } from "react";
import { colors, BODY_FONT, pluralQuestions, pluralPlayers } from "../theme";
import { TrashIcon, EditIcon, PlayIcon, OpenIcon, EnterIcon } from "./icons";

function statusBadge(status, playerCount) {
  switch (status) {
    case "draft":
      return {
        label: "Черновик",
        bg: colors.draftBg,
        fg: colors.draftText,
        bgOpacity: 0.8,
      };
    case "waiting":
      return {
        label: `Ожидает игроков – ${pluralPlayers(playerCount)}`,
        bg: colors.orange,
        fg: colors.lightOrange,
        bgOpacity: 0.6,
      };
    case "active":
      return {
        label: `Идет квиз – ${pluralPlayers(playerCount)}`,
        bg: colors.green,
        fg: colors.greenText,
        bgOpacity: 0.6,
      };
    default:
      return {
        label: status,
        bg: colors.draftBg,
        fg: colors.draftText,
        bgOpacity: 0.8,
      };
  }
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
        height: 30,
        minWidth: 46,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 10,
        border: `1px solid ${v.border}`,
        backgroundColor: hover ? v.border : v.bg,
        color: colors.white,
        cursor: "pointer",
        transition: "background-color .15s",
        flex: "1 1 auto",
      }}
    >
      {children}
    </button>
  );
}

export default function QuizCard({ quiz, onAction }) {
  const badge = statusBadge(quiz.status, quiz.playerCount);

  return (
    <div
      style={{
        backgroundColor: colors.midPurple,
        height: 120,
        width: 306,
        flex: "1 1 306px",
        maxWidth: 340,
        padding: "10px 15px",
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
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 6,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 15 }}>{quiz.title}</span>
          {quiz.category && (
            <span style={{ fontWeight: 500, fontSize: 13, opacity: 0.8 }}>
              ({quiz.category})
            </span>
          )}
        </div>
        <div
          style={{ fontWeight: 500, fontSize: 13, opacity: 0.8, marginTop: 2 }}
        >
          {pluralQuestions(quiz.questionCount)} – {quiz.secondsPerQuestion}{" "}
          сек/вопрос
        </div>
        {quiz.roomCode && (
          <div style={{ fontWeight: 500, fontSize: 13, marginTop: 2 }}>
            Код комнаты: <b>{quiz.roomCode}</b>
          </div>
        )}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <span
          style={{
            position: "relative",
            display: "inline-block",
            padding: "2px 6px",
            borderRadius: 10,
            fontSize: 11,
            fontWeight: 400,
            color: badge.fg,
            whiteSpace: "nowrap",
          }}
        >
          <span
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 10,
              backgroundColor: badge.bg,
              opacity: badge.bgOpacity,
            }}
          />
          <span style={{ position: "relative" }}>{badge.label}</span>
        </span>

        <div style={{ display: "flex", gap: 6, flex: "0 1 auto" }}>
          {quiz.status === "draft" && (
            <>
              <IconButton
                variant="delete"
                title="Удалить"
                onClick={() => onAction("delete", quiz)}
              >
                <TrashIcon />
              </IconButton>
              <IconButton
                variant="edit"
                title="Редактировать"
                onClick={() => onAction("edit", quiz)}
              >
                <EditIcon />
              </IconButton>
              {!quiz._hideActivate && (
                <IconButton
                  variant="activate"
                  title="Активировать"
                  onClick={() => onAction("activate", quiz)}
                >
                  <PlayIcon />
                </IconButton>
              )}
            </>
          )}
          {quiz.status === "waiting" && (
            <IconButton
              variant="openRoom"
              title="Открыть комнату"
              onClick={() => onAction("open-room", quiz)}
            >
              <OpenIcon />
            </IconButton>
          )}
          {quiz.status === "active" && (
            <IconButton
              variant="returnRoom"
              title="Вернуться в комнату"
              onClick={() => onAction("return", quiz)}
            >
              <EnterIcon />
            </IconButton>
          )}
        </div>
      </div>
    </div>
  );
}
