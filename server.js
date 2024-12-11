const mongoose = require('mongoose');
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const cors = require('cors');

mongoose.connect('mongodb://localhost:27017/yourDatabaseName', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('Could not connect to MongoDB. Ensure MongoDB is running and accessible.', err);
    process.exit(1);
  });

const app = express();
const PORT = 3020;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' }
});

const User = mongoose.model('User', userSchema);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/user_dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'user_dashboard.html'));
});


app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    console.log('Login attempt:', { username, password });

    const user = await User.findOne({ username });
    if (!user) {
      console.log('User not found:', username);
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    console.log('User found:', user);

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('Password mismatch for user:', username);
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    console.log('User logged in successfully:', username);
    const redirectUrl = user.role === 'admin' ? '/dashboard.html' : '/user_dashboard.html';
    res.json({ role: user.role, redirectUrl, username: user.username });

  } catch (err) {
    console.error('Error logging in user:', err);
    res.status(500).json({ error: 'Error logging in user' });
  }
});

app.post('/register', async (req, res) => {
  const { username, email, phone, password, confirmPassword, role } = req.body;

  console.log('Received data:', req.body);

  if (!username || !email || !phone || !password || !confirmPassword || !role) {
    return res.status(400).send('All fields are required');
  }

  if (password !== confirmPassword) {
    return res.status(400).send('Passwords do not match');
  }

  try {
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).send('Email already exists');
      }
      if (existingUser.phone === phone) {
        return res.status(400).send('Phone number already exists');
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({ 
      username, 
      email, 
      phone, 
      password: hashedPassword,
      role 
    });

    await user.save();
    console.log('User registered successfully:', username);
    res.redirect('/login.html');
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).send('Error registering user');
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});