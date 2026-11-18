// Environment for the integration suite. Runs before any app module is imported.
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://homecare:homecare_dev@localhost:5433/homecare_test?schema=public";
process.env.JWT_ACCESS_SECRET = "test-access-secret-0123456789abcdef0123456789";
process.env.OTP_PEPPER = "test-otp-pepper-0123456789abcdef0123456789abcd";
process.env.OTP_PROVIDER = "none"; // replaced by a capturing fake in the tests
process.env.LOG_LEVEL = "silent";
process.env.TRUST_PROXY = "true"; // lets each test use its own client IP via X-Forwarded-For
process.env.RATE_LIMIT_PER_MINUTE = "1000";
process.env.SCHEDULER_ENABLED = "false";
