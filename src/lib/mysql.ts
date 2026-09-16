import mysql from 'mysql2/promise';

declare global {
  var payrollDbPool: mysql.Pool | undefined;
}

export const getPayrollDb = () => {
  if (globalThis.payrollDbPool) {
    return globalThis.payrollDbPool;
  }

  const newPool = mysql.createPool({
    host: process.env.PAYROLL_DB_HOST || 'localhost',
    user: process.env.PAYROLL_DB_USER || 'root',
    password: process.env.PAYROLL_DB_PASSWORD || '',
    database: process.env.PAYROLL_DB_NAME || 'payroll',
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    connectTimeout: 5000, // fail fast after 5s instead of 30s+
  });

  if (process.env.NODE_ENV !== 'production') {
    globalThis.payrollDbPool = newPool;
  }

  return newPool;
};

export const payrollDb = new Proxy({} as mysql.Pool, {
  get: (_, prop) => {
    const pool = getPayrollDb();
    const value = (pool as any)[prop];
    return typeof value === 'function' ? value.bind(pool) : value;
  }
});
