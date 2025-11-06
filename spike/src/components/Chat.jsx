import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';

function Chat({ username }) {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [pastUsers, setPastUsers] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const backendHost = import.meta.env.VITE_BACKEND_HOST || 'localhost';
    const backendUrl = `http://${backendHost}:3000`;
    
    const newSocket = io(backendUrl, { transports: ['websocket'] });
    newSocket.on('connect', () => {
      newSocket.emit('join', username);
    });
    newSocket.on('user list', (userList) => {
      setOnlineUsers(userList.filter((u) => u !== username));
    });
    newSocket.on('private message', ({ from, message }) => {
      if (currentChat === from) {
        setMessages((prev) => ([...prev, { from, message }]));
      }
    });
    newSocket.on('error', (msg) => {
      alert(msg);
    });
    setSocket(newSocket);

    return () => newSocket.disconnect();
  }, [username, currentChat]);

  useEffect(() => {
    const fetchPastUsers = async () => {
      try {
        const res = await axios.get('/api/past-users', { params: { username } });
        setPastUsers(res.data);
      } catch (err) {
        console.error('Error fetching past users:', err);
      }
    };
    fetchPastUsers();
  }, [username]);

  useEffect(() => {
    if (currentChat) {
      const fetchMessages = async () => {
        try {
          const res = await axios.get('/api/messages', { params: { username, otherUser: currentChat } });
          setMessages(res.data);
        } catch (err) {
          console.error('Error fetching messages:', err);
        }
      };
      fetchMessages();
    }
  }, [currentChat, username]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (currentChat && inputMessage.trim()) {
      socket.emit('private message', { to: currentChat, message: inputMessage });
      setMessages((prev) => [...prev, { from: username, message: inputMessage }]);
      setInputMessage('');
    }
  };

  const handleSearch = async (e) => {
    setSearchQuery(e.target.value);
    if (e.target.value) {
      try {
        const res = await axios.get('/api/search-users', { params: { query: e.target.value, username } });
        setSearchResults(res.data);
      } catch (err) {
        console.error('Error searching users:', err);
      }
    } else {
      setSearchResults([]);
    }
  };

  const selectSearchResult = (selectedUser) => {
    setCurrentChat(selectedUser);
    setSearchQuery('');
    setSearchResults([]);
    if (!pastUsers.includes(selectedUser)) {
      setPastUsers([...pastUsers, selectedUser]);
    }
  };

  return (
    <div className="chat-container">
      <div className="sidebar">
        <input
          type="text"
          placeholder="Search users..."
          value={searchQuery}
          onChange={handleSearch}
        />
        {searchResults.length > 0 && (
          <ul className="search-results">
            {searchResults.map((user) => (
              <li key={user} onClick={() => selectSearchResult(user)}>
                {user}
              </li>
            ))}
          </ul>
        )}
        <h2>Online Users</h2>
        <ul>
          {onlineUsers.map((user) => (
            <li
              key={user}
              onClick={() => setCurrentChat(user)}
              className={currentChat === user ? 'active' : ''}
            >
              {user}
            </li>
          ))}
        </ul>
        <h2>Past Chats</h2>
        <ul>
          {pastUsers.map((user) => (
            <li
              key={user}
              onClick={() => setCurrentChat(user)}
              className={currentChat === user ? 'active' : ''}
            >
              {user}
            </li>
          ))}
        </ul>
      </div>
      <div className="chat-window">
        {currentChat ? (
          <>
            <h2>Chatting with {currentChat}</h2>
            <div className="messages">
              {messages.map((msg, idx) => (
                <div key={idx} className={`message ${msg.from === username ? 'sent' : 'received'}`}>
                  <strong>{msg.from}:</strong> {msg.message}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="input-area">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type your message..."
              />
              <button onClick={sendMessage}>Send</button>
            </div>
          </>
        ) : (
          <p className="select-user">Select a user to start chatting</p>
        )}
      </div>
    </div>
  );
}

export default Chat;