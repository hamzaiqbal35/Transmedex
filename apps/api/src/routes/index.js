import { Router } from 'express';
import healthCheck from './health-check.js';
import contactRouter from './contact.js';

export default () => {
    const router = Router();
    router.get('/health', healthCheck);
    router.get('/', healthCheck);
    router.use('/contact', contactRouter);

    // Dynamically load seoRouter if present (for local dev SEO Studio)
    // Prevents production crashes when seo.js is excluded from git
    import('./seo.js')
        .then((module) => {
            if (module && module.default) {
                router.use('/seo', module.default);
            }
        })
        .catch(() => {
            // seo.js is omitted in production (safe to ignore)
        });

    return router;
};