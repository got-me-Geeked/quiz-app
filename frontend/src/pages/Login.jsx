import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { styles, inputBorder, validateEmail, validatePassword } from "../theme";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const fieldErrors = {
      email: validateEmail(email),
      password: password ? "" : "Введите пароль",
    };
    setErrors(fieldErrors);
    setFormError("");
    if (fieldErrors.email || fieldErrors.password) return;

    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      if (err.response?.status === 401) {
        setFormError("Неверный email или пароль");
      } else {
        setFormError(
          err.response?.data?.error || "Ошибка сервера. Попробуйте позже",
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter") handleSubmit();
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.heading}>QUiZ UP!</h1>
        <div style={styles.underheading}>Войдите в аккаунт</div>
        <div style={styles.formError}>{formError}</div>

        <div style={styles.field}>
          <label style={styles.label}>Email</label>
          <input
            style={{
              ...styles.input,
              borderColor: inputBorder({ value: email, error: errors.email }),
            }}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={onKeyDown}
            autoComplete="email"
          />
          <div style={styles.error}>{errors.email}</div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>PASSWORD</label>
          <input
            style={{
              ...styles.input,
              borderColor: inputBorder({
                value: password,
                error: errors.password,
              }),
            }}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={onKeyDown}
            autoComplete="current-password"
          />
          <div style={styles.error}>{errors.password}</div>
        </div>

        <button
          style={{
            ...styles.button,
            ...(submitting ? styles.buttonDisabled : {}),
          }}
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? "LOGGING IN..." : "LOG IN"}
        </button>

        <p style={styles.bottomText}>
          Нет аккаунта?{" "}
          <Link to="/register" style={styles.link}>
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </div>
  );
}
