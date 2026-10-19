import './env.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import routes from './routes/index.js';
import { errorMiddleware } from './middleware/error.js';
import { globalRateLimit } from './middleware/global-rate-limit.js';
import logger from './utils/logger.js';
import { BodyLimit } from './constants/common.js';
import { verifyMailer } from './utils/mailer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Candidate paths for frontend build output
const candidateDistPaths = [
	path.resolve(__dirname, '../../../dist/apps/web'),
	path.resolve(__dirname, '../../web/dist'),
	path.resolve(__dirname, '../../../dist'),
];
const distPath = candidateDistPaths.find(p => fs.existsSync(p)) || candidateDistPaths[0];
const hasDist = fs.existsSync(distPath);

const app = express();

app.set('trust proxy', true);

process.on('uncaughtException', (error) => {
	logger.error('Uncaught exception:', error);
});
  
process.on('unhandledRejection', (reason, promise) => {
	logger.error('Unhandled rejection at:', promise, 'reason:', reason);
});

process.on('SIGINT', async () => {
	logger.info('Interrupted');
	process.exit(0);
});

process.on('SIGTERM', async () => {
	logger.info('SIGTERM signal received');
	await new Promise(resolve => setTimeout(resolve, 3000));
	logger.info('Exiting');
	process.exit(0);
});

// Configure Helmet with Content Security Policy permitting Google Analytics, Fonts, and Media
const cspDirectives = {
	defaultSrc: ["'self'"],
	scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://www.googletagmanager.com", "https://www.google-analytics.com"],
	styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
	fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
	imgSrc: ["'self'", 'data:', 'https:', 'http:'],
	connectSrc: ["'self'", "https://www.google-analytics.com", "https://analytics.google.com", "https://*.googletagmanager.com", 'http://localhost:3000', 'ws://localhost:3000'],
	frameAncestors: ["'none'"],
	baseUri: ["'self'"],
	formAction: ["'self'"],
};

app.disable('x-powered-by');

app.use(helmet({
	contentSecurityPolicy: {
		directives: cspDirectives,
	},
	crossOriginOpenerPolicy: { policy: 'same-origin' },
	crossOriginResourcePolicy: { policy: 'same-site' },
}));

// HSTS in production
app.use((req, res, next) => {
	if (process.env.NODE_ENV === 'production') {
		res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
	}
	next();
});

app.use(cors({
	origin: process.env.CORS_ORIGIN || true,
	credentials: true,
}));
app.use(morgan('combined'));
app.use(express.json({
	limit: BodyLimit,
}));
app.use(express.urlencoded({ 
	extended: true,
	limit: BodyLimit,
}));

// API Routes with rate limiting
app.use('/hcgi/api', globalRateLimit, routes());

// Health check route
app.get('/health', (req, res) => {
	res.json({ status: 'ok', uptime: process.uptime() });
});

// Dev proxy to Vite dev server on port 3000 ONLY in development
if (process.env.NODE_ENV !== 'production') {
	app.use(async (req, res, next) => {
		if (req.path.startsWith('/hcgi/api') || req.path === '/health') {
			return next();
		}
		try {
			const targetUrl = `http://localhost:3000${req.originalUrl}`;
			const controller = new AbortController();
			const id = setTimeout(() => controller.abort(), 1000);
			
			const response = await fetch(targetUrl, {
				method: req.method,
				headers: req.headers,
				signal: controller.signal,
				duplex: req.body ? 'half' : undefined
			});
			clearTimeout(id);
			
			res.status(response.status);
			response.headers.forEach((value, key) => {
				if (key.toLowerCase() !== 'content-security-policy') {
					res.setHeader(key, value);
				}
			});
			const body = await response.arrayBuffer();
			return res.send(Buffer.from(body));
		} catch (e) {
			next();
		}
	});
}

// Serve static assets from dist folder if it exists
if (hasDist) {
	logger.info(`Serving static files from ${distPath}`);
	app.use(express.static(distPath, {
		index: 'index.html',
		maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
	}));

	// Catch-all fallback for React Router SPA (matches any GET requesting HTML)
	app.use((req, res, next) => {
		if (req.method === 'GET' && req.accepts('html') && !req.path.startsWith('/hcgi/api')) {
			const indexPath = path.join(distPath, 'index.html');
			if (fs.existsSync(indexPath)) {
				return res.sendFile(indexPath);
			}
		}
		next();
	});
} else {
	logger.warn(`⚠️ Static files not found at ${distPath}. Run 'npm run build' to build the client.`);
	app.get('/', (req, res) => {
		res.send('Transmedex API is running. (Note: Run "npm run build" to serve the web interface)');
	});
}

app.use(errorMiddleware);

app.use((req, res) => {
	res.status(404).json({ error: 'Route not found' });
});

const rawPort = process.env.PORT || 3001;
const isSocket = isNaN(Number(rawPort));

if (isSocket) {
	app.listen(rawPort, () => {
		logger.info(`🚀 API Server running on socket ${rawPort}`);
		verifyMailer();
	});
} else {
	const port = parseInt(rawPort, 10);
	app.listen(port, '0.0.0.0', () => {
		logger.info(`🚀 API Server running on http://0.0.0.0:${port}`);
		verifyMailer();
	});
}

export default app;