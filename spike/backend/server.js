import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*', // Allow all for now — will restrict after Vercel deployment
  },
});

// Use Render assigned port OR fallback for local development
const port = process.env.PORT || 3000;

// MongoDB connection
const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  console.error('MONGODB_URI is not defined in .env file');
  process.exit(1);
}
const client = new MongoClient(mongoUri);

let db;

async function connectToMongo() {
  try {
    await client.connect();
    db = client.db('spike');
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.error('❌ Failed to connect to MongoDB:', err);
    process.exit(1);
  }
}

connectToMongo();

app.use(express.json());
app.use(cors());

// Track online users
const onlineUsers = {};

// ✅ Routes
app.post('/check-user', async (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Username required' });
  }

  try {
    const user = await db.collection('users').findOne({ username });
    res.json({ exists: !!user });
  } catch (err) {
    console.error('Error checking user:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const existingUser = await db.collection('users').findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username taken' });
    }

    await db.collection('users').insertOne({ username, password });
    res.json({ success: true });
  } catch (err) {
    console.error('Error registering user:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/search-users', async (req, res) => {
  const { query, username } = req.query;
  if (!query) {
    return res.status(400).json({ error: 'Query required' });
  }

  try {
    const users = await db.collection('users').find({
      username: { $regex: query, $options: 'i' },
      username: { $ne: username }
    }).toArray();

    res.json(users.map(u => u.username));
  } catch (err) {
    console.error('Error searching users:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/past-users', async (req, res) => {
  const { username } = req.query;
  if (!username) {
    return res.status(400).json({ error: 'Username required' });
  }

  try {
    const pastUsers = await db.collection('messages').aggregate([
      { $match: { $or: [{ from: username }, { to: username }] } },
      {
        $group: {
          _id: null,
          users: {
            $addToSet: {
              $cond: [
                { $eq: ["$from", username] }, "$to", "$from"
              ]
            }
          }
        }
      }
    ]).toArray();

    res.json(pastUsers[0] ? pastUsers[0].users : []);
  } catch (err) {
    console.error('Error fetching past users:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/messages', async (req, res) => {
  const { username, otherUser } = req.query;
  if (!username || !otherUser) {
    return res.status(400).json({ error: 'Username and otherUser required' });
  }

  try {
    const messages = await db.collection('messages')
      .find({
        $or: [
          { from: username, to: otherUser },
          { from: otherUser, to: username }
        ]
      })
      .sort({ timestamp: 1 })
      .toArray();

    res.json(messages);
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ Health check route for Render uptime monitoring
app.get('/health', (req, res) => {
  res.json({ status: 'Backend is running ✅' });
});

// ✅ Socket.IO events
io.on('connection', (socket) => {
  socket.on('join', async (username) => {
    if (onlineUsers[username]) {
      socket.emit('error', 'Username already online');
      return;
    }

    onlineUsers[username] = socket.id;
    socket.username = username;
    io.emit('user list', Object.keys(onlineUsers));
  });

  socket.on('private message', async ({ to, message }) => {
    const toSocketId = onlineUsers[to];
    const from = socket.username;

    if (toSocketId) {
      io.to(toSocketId).emit('private message', { from, message });
    }

    try {
      await db.collection('messages').insertOne({
        from,
        to,
        message,
        timestamp: new Date()
      });
    } catch (err) {
      console.error('Error saving message:', err);
    }
  });

  socket.on('disconnect', () => {
    if (socket.username) {
      delete onlineUsers[socket.username];
      io.emit('user list', Object.keys(onlineUsers));
    }
  });
});

// ✅ Start server
server.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
