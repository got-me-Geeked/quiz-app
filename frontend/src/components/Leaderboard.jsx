import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { colors, HEADING_FONT, BODY_FONT } from "../theme";

function rankColor(i) {
  if (i === 0) return "#FFD700";
  if (i === 1) return "#C4C4C4";
  if (i === 2) return "#DAA06D";
  return colors.white;
}

//склонение места
function placeLabel(n) {
  if (n === 1) return "1-ое";
  if (n === 2) return "2-ое";
  if (n === 3) return "3-ье";
  return `${n}-ое`;
}

function pluralPoints(n) {
  const a = n % 10,
    b = n % 100;
  if (a === 1 && b !== 11) return "очко";
  if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return "очка";
  return "очков";
}

export default function Leaderboard({
  leaderboard,
  meUserId,
  buttonLabel = "На главную",
  onButton,
}) {
  const navigate = useNavigate();
  const [btnHover, setBtnHover] = useState(false);
  const myIndex = leaderboard.findIndex((p) => p.userId === meUserId);
  const me = myIndex >= 0 ? leaderboard[myIndex] : null;

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
        style={{ maxWidth: 640, margin: "0 auto", padding: "20px 24px 60px" }}
      >
        <h2
          style={{
            fontFamily: HEADING_FONT,
            fontSize: 32,
            textAlign: "center",
            margin: "10px 0 24px",
          }}
        >
          LEADERBOARD
        </h2>

        <div
          style={{
            backgroundColor: colors.midPurple,
            borderRadius: 15,
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

          <div style={{ marginBottom: 16 }}>
            {leaderboard.map((p, i) => (
              <div
                key={p.userId}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "10px 4px",
                  borderBottom:
                    i < leaderboard.length - 1
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
                  {p.userId === meUserId && " (вы)"}
                </span>
                <span>{p.score}</span>
              </div>
            ))}
          </div>

          {me && (
            <div
              style={{
                backgroundColor: colors.lightPurple,
                borderRadius: 12,
                padding: "16px 20px",
                textAlign: "center",
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  fontFamily: BODY_FONT,
                  fontWeight: 500,
                  fontSize: 20,
                  color: colors.white,
                }}
              >
                Вы заняли
              </div>
              <div
                style={{
                  fontFamily: BODY_FONT,
                  fontWeight: 700,
                  fontSize: 32,
                  color: colors.white,
                  margin: "4px 0",
                }}
              >
                {placeLabel(myIndex + 1)} место
              </div>
              <div
                style={{
                  fontFamily: BODY_FONT,
                  fontWeight: 500,
                  fontSize: 20,
                  color: colors.white,
                }}
              >
                {me.score} {pluralPoints(me.score)}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={onButton || (() => navigate("/dashboard"))}
            onMouseEnter={() => setBtnHover(true)}
            onMouseLeave={() => setBtnHover(false)}
            style={{
              width: "100%",
              backgroundColor: btnHover ? "#E07E00" : colors.orange,
              color: colors.white,
              border: "none",
              borderRadius: 8,
              padding: "12px",
              fontFamily: BODY_FONT,
              fontWeight: 700,
              fontSize: 20,
              cursor: "pointer",
            }}
          >
            {buttonLabel}
          </button>
        </div>
      </main>
    </div>
  );
}
