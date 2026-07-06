export const colors = {
  deepPurple: "#2D1B69",
  midPurple: "#4A2FAD",
  lightPurple: "#6B47D6",
  mutedPurple: "#C4B5F4",
  white: "#FFFFFF",
  inputText: "#303030",
  red: "#EB5757",
  orange: "#FF8C00",
  lightOrange: "#FFB347",
  black: "#000000",
  draftBg: "#646464",
  draftText: "#CECECE",
  green: "#00CC56",
  greenText: "#00FF6C",
};

export const HEADING_FONT = "'Holtwood One SC', serif";
export const DEFAULT_FONT = "Sans Serif";
export const BODY_FONT = "'PT Serif', 'Pridi', serif";

export const styles = {
  page: {
    minHeight: "100vh",
    width: "100%",
    backgroundColor: colors.deepPurple,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    boxSizing: "border-box",
    fontFamily: "system-ui, Arial, sans-serif",
  },
  card: {
    width: "100%",
    maxWidth: "440px",
    backgroundColor: colors.lightPurple,
    borderRadius: "15px",
    boxShadow: "13px 17px 4px rgba(0,0,0,0.25)",
    padding: "20px 18px",
    boxSizing: "border-box",
  },
  heading: {
    fontFamily: HEADING_FONT,
    fontSize: "32px",
    color: colors.white,
    textAlign: "center",
    lineHeight: 1.2,
  },
  underheading: {
    fontFamily: "system-ui, Arial, sans-serif",
    fontSize: "18px",
    color: colors.white,
    textAlign: "center",
    opacity: 0.7,
    margin: "5px 0 0 0",
  },
  label: {
    fontFamily: HEADING_FONT,
    fontSize: "16px",
    color: colors.white,
    display: "block",
    marginBottom: "2px",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "6px 7px",
    fontSize: "16px",
    color: colors.inputText,
    backgroundColor: colors.white,
    border: "1px solid transparent",
    borderRadius: "8px",
    outline: "none",
    boxShadow: "4px 4px 4px rgba(0,0,0,0.25)",
    fontFamily: HEADING_FONT,
  },
  field: {
    marginBottom: "18px",
  },
  error: {
    color: colors.red,
    fontSize: "12px",
    marginTop: "6px",
  },
  formError: {
    color: colors.red,
    fontSize: "12px",
    textAlign: "center",
    marginBottom: "14px",
  },
  button: {
    width: "100%",
    padding: "14px",
    fontSize: "20px",
    fontFamily: HEADING_FONT,
    color: colors.white,
    backgroundColor: colors.orange,
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    marginTop: "6px",
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  bottomText: {
    fontSize: "16px",
    color: colors.white,
    textAlign: "center",
    marginTop: "22px",
    fontFamily: "system-ui, Arial, sans-serif",
  },
  link: {
    color: colors.lightOrange,
    textDecoration: "none",
    fontWeight: 600,
  },
};

export function inputBorder({ value, error }) {
  if (error) return colors.red;
  if (value && value.length > 0) return colors.lightOrange;
  return "transparent";
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const USERNAME_RE = /^[\p{L}\p{N}_]+$/u;

export function validateEmail(email) {
  if (!email) return "Введите email";
  if (!EMAIL_RE.test(email)) return "Некорректный формат email";
  return "";
}

export function validateUsername(username) {
  if (!username) return "Введите имя пользователя";
  if (username.length < 3) return "Минимум 3 символа";
  if (!USERNAME_RE.test(username)) return "Только буквы, цифры и _";
  return "";
}

export function validatePassword(password) {
  if (!password) return "Введите пароль";
  if (password.length < 8) return "Минимум 8 символов";
  if (!/\p{Lu}/u.test(password)) return "Нужна заглавная буква";
  if (!/[0-9]/.test(password)) return "Нужна цифра";
  return "";
}

export function passwordStrength(password) {
  if (!password) return null;
  let score = 0;
  if (password.length >= 8) score++;
  if (/\p{Lu}/u.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^\p{L}\p{N}]/u.test(password)) score++;
  if (score <= 1)
    return { level: "weak", label: "Слабый", color: colors.red, pct: 33 };
  if (score === 2 || score === 3)
    return { level: "medium", label: "Средний", color: colors.orange, pct: 66 };
  return {
    level: "strong",
    label: "Надёжный",
    color: colors.lightOrange,
    pct: 100,
  };
}

//склонение вопросов
export function pluralQuestions(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  let word;
  if (mod10 === 1 && mod100 !== 11) word = "вопрос";
  else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14))
    word = "вопроса";
  else word = "вопросов";
  return `${n} ${word}`;
}

//склонение игроков
export function pluralPlayers(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  let word;
  if (mod10 === 1 && mod100 !== 11) word = "игрок";
  else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14))
    word = "игрока";
  else word = "игроков";
  return `${n} ${word}`;
}
