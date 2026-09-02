require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const express = require('express');
const cors = require('cors');

const chatRoutes = require('./src/routes/chat');
const sessionRoutes = require('./src/routes/session');
const authRoutes = require('./src/routes/auth');
const merchantRoutes = require('./src/routes/merchant');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/chat', chatRoutes);
app.use('/session', sessionRoutes);
app.use('/auth', authRoutes);
app.use('/merchant', merchantRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
