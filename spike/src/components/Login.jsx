import { useState } from 'react';
import axios from 'axios';

function Login({ setUsername }) {
  const [inputUsername, setInputUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await axios.post('/api/check-user', { username: inputUsername });
      if (res.data.exists) {
        setUsername(inputUsername);
      } else {
        setShowPassword(true);
      }
    } catch (err) {
      console.error(err);
      setError('Error checking user');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await axios.post('/api/register', { username: inputUsername, password });
      if (res.data.success) {
        setUsername(inputUsername);
      }
    } catch (err) {
      console.error(err);
      setError('Error registering');
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