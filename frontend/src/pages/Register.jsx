import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  styles,
  colors,
  inputBorder,
  validateEmail,
  validateUsername,
  validatePassword,
  passwordStrength,
} from "../theme";

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const strength = passwordStrength(password);

  function validateAll() {
    return {
      username: validateUsername(username),
      email: validateEmail(email),
      password: validatePassword(password),
    };
  }

  async function handleSubmit() {
    const fieldErrors = validateAll();
    setErrors(fieldErrors);
    setFormError("");
    if (fieldErrors.username || fieldErrors.email || fieldErrors.password)
      return;

    setSubmitting(true);
    try {
      await register(email, password, username);
      navigate("/dashboard");
    } catch (err) {
      setFormError(
        err.response?.data?.error || "Ошибка сервера. Попробуйте позже",
      );
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

        <div style={styles.underheading}>Создайте аккаунт</div>
        <div style={styles.formError}>{formError}</div>

        <div style={styles.field}>
          <label style={styles.label}>NAME</label>
          <input
            style={{
              ...styles.input,
              borderColor: inputBorder({
                value: username,
                error: errors.username,
              }),
            }}
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={onKeyDown}
            autoComplete="username"
          />
          <div style={styles.error}>{errors.username}</div>
        </div>

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
          <label style={styles.label}>Password</label>
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
            autoComplete="new-password"
          />
          {strength && (
            <div style={{ marginTop: "8px" }}>
              <div
                style={{
                  height: "6px",
                  borderRadius: "3px",
                  backgroundColor: "rgba(255,255,255,0.25)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${strength.pct}%`,
                    height: "100%",
                    backgroundColor: strength.color,
                    transition: "width .2s",
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: strength.color,
                  marginTop: "4px",
                }}
              >
                Надёжность пароля: {strength.label}
              </div>
            </div>
          )}
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
          {submitting ? "signing up..." : "SIGN UP"}
        </button>

        <p style={styles.bottomText}>
          Уже есть аккаунт?{" "}
          <Link to="/login" style={styles.link}>
            Войти
          </Link>
        </p>
      </div>
    </div>
  );
}
