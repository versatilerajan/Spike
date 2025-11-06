import { useState } from 'react';
import Login from './components/login.jsx';
import Chat from './components/chat.jsx';

function App() {
  const [username, setUsername] = useState(null);

  return (
    <div className="app">
      {username ? <Chat username={username} /> : <Login setUsername={setUsername} />}
    </div>
  );
}

export default App;