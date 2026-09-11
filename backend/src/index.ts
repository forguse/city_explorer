import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import { Server } from 'socket.io';
import http from 'http';
import jwt from 'jsonwebtoken';
import mongoSanitize from 'express-mongo-sanitize';
import path from 'path';
import { setSocketIO } from './socket';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Trust proxy - required when behind Nginx/Cloudflare
app.set('trust proxy', true);

// Socket.io CORS Configuration: Only allow requests from frontend
const socketOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',')
    : ['http://localhost:5173'];

// 添加 Capacitor 支持
socketOrigins.push('capacitor://localhost', 'https://localhost', 'http://localhost');

const io = new Server(server, {
    path: '/api/socket.io', // 匹配前端的路径
    cors: {
        origin: socketOrigins,
        methods: ["GET", "POST"],
        credentials: true
    },
    // 增加超时时间，适应 Cloudflare 的长连接
    pingTimeout: 60000, // 60秒
    pingInterval: 25000, // 25秒发送一次心跳
    // 允许所有传输方式，优先使用 websocket
    transports: ['websocket', 'polling'],
    // 允许升级
    allowUpgrades: true,
    // 增加最大 HTTP 缓冲区大小
    maxHttpBufferSize: 1e8, // 100MB
    // 连接超时
    connectTimeout: 45000 // 45秒
});

// Initialize socket.io for use in controllers
setSocketIO(io);

const PORT = Number(process.env.PORT) || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/city_explorer';

// Middleware
// Security Headers with Helmet
app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for now (can be configured later)
    crossOriginEmbedderPolicy: false // Allow embedding for uploads
}));

// Request Logging (only in development)
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev')); // Colored output for development
} else {
    app.use(morgan('combined')); // Apache-style logs for production
}

// CORS Configuration: Only allow requests from frontend
const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',')
    : ['http://localhost:5173'];

const isProduction = process.env.NODE_ENV === 'production';

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // In production: strict origin checking
        if (isProduction) {
            if (allowedOrigins.indexOf(origin) !== -1 ||
                origin.startsWith('capacitor://') ||
                origin === 'https://localhost' ||
                origin === 'http://localhost') {
                callback(null, true);
            } else {
                console.error('CORS Blocked Origin:', origin);
                callback(new Error('Not allowed by CORS'));
            }
        } else {
            // In development: allow local network IPs for testing
            if (allowedOrigins.indexOf(origin) !== -1 ||
                origin.startsWith('capacitor://') ||
                origin.startsWith('http://localhost') ||
                origin.startsWith('https://localhost') ||
                origin.startsWith('http://192.168.')) {
                callback(null, true);
            } else {
                console.error('CORS Blocked Origin:', origin);
                callback(new Error('Not allowed by CORS'));
            }
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '15mb' })); // 增加限制以支持 base64 图片上传

// Sanitize data (NoSQL Injection Prevention)
app.use(mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
        console.warn(`[Security] Sanitized NoSQL injection attempt in ${key}`);
    }
}));

// Database Connection
mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ MongoDB connected successfully'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
import authRoutes from './routes/authRoutes';
import taskRoutes from './routes/taskRoutes';
import executionRoutes from './routes/executionRoutes';
import clubRoutes from './routes/clubRoutes';
import postRoutes from './routes/postRoutes';
import rewardRoutes from './routes/rewardRoutes';
import encounterRoutes from './routes/encounterRoutes';
import utilRoutes from './routes/utilRoutes';
// import messageRoutes from './routes/messageRoutes'; // 功能已禁用
import userRoutes from './routes/userRoutes';
import proverbRoutes from './routes/proverbRoutes';
import notificationRoutes from './routes/notificationRoutes';
import feedbackRoutes from './routes/feedbackRoutes';
import teamRoutes from './routes/teamRoutes';
import uploadRoutes from './routes/uploadRoutes';
import searchRoutes from './routes/searchRoutes';
import reportRoutes from './routes/reportRoutes';

app.get('/api', (req, res) => {
    res.send('City Explorer API is running 🚀');
});

// Static files with CORS headers for html2canvas
// 限制为允许的前端域名，防止资源盗链
app.use('/api/uploads', (req, res, next) => {
    const origin = req.headers.origin;
    // 使用与主 CORS 相同的允许列表
    if (!origin || allowedOrigins.includes(origin) ||
        origin.startsWith('capacitor://') ||
        (!isProduction && (origin.startsWith('http://localhost') || origin.startsWith('http://192.168.')))) {
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
    }
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
}, express.static('uploads'));

// Rate Limiters
import { globalLimiter, creationLimiter } from './middleware/rateLimiter';

// Apply Global Limiter
app.use(globalLimiter);

app.use('/api/auth', authRoutes); // Rate limiters applied per-route in authRoutes
app.use('/api/tasks', creationLimiter, taskRoutes); // Limit for creating/joining
app.use('/api/executions', executionRoutes);
app.use('/api/clubs', creationLimiter, clubRoutes); // Limit for club creation
app.use('/api/posts', creationLimiter, postRoutes); // Limit for posting
app.use('/api/encounters', encounterRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/utils', utilRoutes);
// app.use('/api/messages', messageRoutes); // 功能已禁用
app.use('/api/users', userRoutes);
app.use('/api/proverbs', creationLimiter, proverbRoutes); // Limit proverbs
app.use('/api/notifications', notificationRoutes);
app.use('/api/feedback', creationLimiter, feedbackRoutes); // Limit feedback
app.use('/api/teams', creationLimiter, teamRoutes); // Limit team creation
app.use('/api/upload', uploadRoutes); // Rate limiter applied inside uploadRoutes
app.use('/api/search', searchRoutes);
app.use('/api/reports', reportRoutes);

// Serve frontend static files (production)
const frontendPath = path.join(__dirname, '../../dist');
app.use(express.static(frontendPath));

// SPA fallback: serve index.html for all non-API routes
app.get('*', (req, res) => {
    // Don't serve index.html for API routes or uploads
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'Not found' });
    }
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// JWT Secret for Socket.io authentication
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('FATAL: JWT_SECRET is not set in environment variables.');
}

// Socket.io Authentication Middleware
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        return next(new Error('Authentication required'));
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
        socket.data.userId = decoded.userId;
        next();
    } catch (err) {
        next(new Error('Invalid token'));
    }
});

// Socket.io Connection
io.on('connection', (socket) => {
    console.log('[Socket] Client connected:', socket.id, 'User:', socket.data.userId);

    // Join execution room (with authorization check)
    socket.on('join-execution', (executionId: string) => {
        // Note: For full security, you should verify the user has access to this execution
        // by checking the database. For now, we at least require authentication.
        socket.join(`execution:${executionId}`);
        console.log(`[Socket] Client ${socket.id} joined execution room: ${executionId}`);
    });

    // Leave execution room
    socket.on('leave-execution', (executionId: string) => {
        socket.leave(`execution:${executionId}`);
        console.log(`[Socket] Client ${socket.id} left execution room: ${executionId}`);
    });

    socket.on('disconnect', () => {
        console.log('[Socket] Client disconnected:', socket.id);
    });
});

// Start Server
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT} and accessible from network`);
});
