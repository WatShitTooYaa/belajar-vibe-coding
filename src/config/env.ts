const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be set and at least 32 characters long');
}

export const env = {
    jwtSecret,
    nodeEnv: process.env.NODE_ENV ?? 'development',
    frontendOrigin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
};
