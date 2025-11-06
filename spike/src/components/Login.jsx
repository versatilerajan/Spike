import { useState } from 'react';
import axios from 'axios';

function Login({ setUsername }) {
  const [inputUsername, setInputUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Base URL from environment variable
  const API_BASE = import.meta.env.VITE_API_URL;

  // Check if user exists
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await axios.post(`${API_BASE}/check-user`, { username: inputUsername });
      if (res.data.exists) {
        // User exists, proceed to chat
        setUsername(inputUsername);
      } else {
        // User not found, show password input for registration
        setShowPassword(true);
      }
    } catch (err) {
      console.error(err);
      setError('Error checking user. Please try again.');
    }
  };

  // Register new user
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await axios.post(`${API_BASE}/register`, {
        username: inputUsername,
        password,
      });
      if (res.data.success) {
        setUsername(inputUsername);
      } else if (res.data.error) {
        setError(res.data.error);
      }
    } catch (err) {
      console.error(err);
      setError('Error registering user. Please try again.');
    }
  };

  return (
    <div className="login-container">
      <h1>Create or Join Chat</h1>
      <form onSubmit={showPassword ? handleRegister : handleSubmit}>
        <input
          type="text"
          placeholder="Enter username"
          value={inputUsername}
          onChange={(e) => setInputUsername(e.target.value)}
          required
        />
        {showPassword && (
          <input
            type="password"
            placeholder="Set password (for new account)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        )}
        <button type="submit">{showPassword ? 'Register' : 'Next'}</button>
      </form>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

export default Login;
