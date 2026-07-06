import { useState, useEffect } from "react";
import { colors, BODY_FONT } from "../theme";

//таймер считает от серверного deadline
export default function Timer({ deadline }) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, Math.ceil((deadline - Date.now()) / 1000)),
  );

  useEffect(() => {
    setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    const id = setInterval(() => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) clearInterval(id);
    }, 250); // чаще чем раз в секунду — плавнее и точнее
    return () => clearInterval(id);
  }, [deadline]);

  return (
    <div style={{ textAlign: "center", margin: "4px 0" }}>
      <span
        style={{
          fontFamily: BODY_FONT,
          fontWeight: 500,
          fontSize: 32,
          color: colors.orange,
        }}
      >
        {remaining}
      </span>
      <div
        style={{
          fontFamily: BODY_FONT,
          fontWeight: 500,
          fontSize: 14,
          color: colors.white,
          opacity: 0.8,
        }}
      >
        секунд осталось
      </div>
    </div>
  );
}
