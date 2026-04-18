export function validateEnv(): void {
  const required = ['DATABASE_URL', 'FRONTEND_URL'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error(
      `[startup] Missing required environment variables: ${missing.join(', ')}. ` +
        'Please set them in your .env file or environment.'
    );
    process.exit(1);
  }
}
