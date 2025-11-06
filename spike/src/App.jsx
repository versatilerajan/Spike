import { useState } from 'react';
import Login from './components/Login.jsx';
import Chat from './components/Chat.jsx';

function App() {
  const [username, setUsername] = useState(null);

  return (
    <div className="app">
      {username ? <Chat username={username} /> : <Login setUsername={setUsername} />}
    </div>
  );
}

export default App;
