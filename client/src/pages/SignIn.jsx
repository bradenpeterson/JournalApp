import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { request } from "../api/request";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Ensure CSRF cookie is present for the POST
      await request('/api/csrf/');
      const formData = new FormData();
      formData.append('email', email);
      formData.append('password', password);

      await request('/api/registration/sign_in/', {
        method: 'POST',
        body: formData,
      });

      navigate('/');
    } catch (err) {
      console.error('Sign in failed', err);
      setError('Failed to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sign-in-container">
      <div className="sign-in-card">
        <h1>Sign In</h1>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && <p className="error-text">{error}</p>}

          <button type="submit" disabled={loading} className="sign-in-button">
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="sign-up-link">
          Don't have an account? <a href="/registration/sign_up">Sign up</a>
        </p>
      </div>
    </div>
  );
}
