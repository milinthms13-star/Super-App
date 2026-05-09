import React, { useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../utils/api";

const MPINLogin = ({ onSuccess, onError }) => {
  const [identifier, setIdentifier] = useState("");
  const [mpin, setMpin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!identifier.trim()) {
      setError("Enter your email or phone number.");
      return;
    }

    if (!/^\d{4,6}$/.test(mpin)) {
      setError("Enter a 4 to 6 digit MPIN.");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/mpin/login`, {
        identifier: identifier.trim(),
        mpin,
      });

      if (!response.data?.success) {
        const message = response.data?.message || "MPIN login failed.";
        setError(message);
        onError?.(message);
        return;
      }

      onSuccess?.(response.data);
    } catch (requestError) {
      const message =
        requestError.response?.data?.message ||
        requestError.response?.data?.error ||
        "Unable to login with MPIN.";
      setError(message);
      onError?.(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-card mpin-login-card">
      <div className="login-header">
        <img src="/logo.svg" alt="NilaHub" className="login-logo" />
        <p className="login-kicker">SECURE LOGIN</p>
        <h1>NilaHub</h1>
        <p className="login-subtitle">Login using your MPIN</p>
      </div>

      <form className="login-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="mpin-identifier">
            <span>Email or Phone</span>
          </label>
          <input
            id="mpin-identifier"
            type="text"
            className="form-input"
            placeholder="Enter email or phone number"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            disabled={loading}
            autoComplete="username"
          />
        </div>

        <div className="form-group">
          <label htmlFor="mpin-input">
            <span>MPIN</span>
          </label>
          <input
            id="mpin-input"
            type="password"
            inputMode="numeric"
            maxLength={6}
            className="form-input"
            placeholder="Enter 4-6 digit MPIN"
            value={mpin}
            onChange={(event) => setMpin(event.target.value.replace(/\D/g, "").slice(0, 6))}
            disabled={loading}
            autoComplete="one-time-code"
          />
        </div>

        {error ? <div className="error-message">{error}</div> : null}

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Signing in..." : "Login with MPIN"}
        </button>
      </form>
    </div>
  );
};

export default MPINLogin;
