// src/routes/index.js
const express = require('express');
const router = express.Router();

// ----- Import route modules -----
const authRoutes = require('./auth');
const studentRoutes = require('./students');
const courseRoutes = require('./courses');
const roomRoutes = require('./rooms');
const enrollmentRoutes = require('./enrollments');
const classRoutes = require('./classes');
const attendanceRoutes = require('./attendance');
const scheduleRoutes = require('./schedules');
const leavePolicyRoutes = require('./leavePolicies');
const changeHistoryRoutes = require('./changeHistory');
const registrationRoutes = require('./registration');
const teacherRoutes = require('./teachers'); // Assuming you have a teachers.js route file
const notificationRoutes = require('./notifications'); // New notification routes

// ----- Register route modules -----
router.use('/auth', authRoutes);
router.use('/students', studentRoutes);
router.use('/courses', courseRoutes);
router.use('/rooms', roomRoutes);
router.use('/enrollments', enrollmentRoutes);
router.use('/classes', classRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/schedules', scheduleRoutes);
router.use('/leave-policies', leavePolicyRoutes);
router.use('/policy', changeHistoryRoutes);
router.use('/registration', registrationRoutes);
router.use('/teachers', teacherRoutes); // Register teachers routes
router.use('/notifications', notificationRoutes); // Register notification routes

// ===== Helpers: scan express routes =====
function cleanRegexPath(rx) {
  if (!rx || !rx.source) return '';
  return rx.source
    .replace('^\\/', '/')
    .replace('\\/?(?=\\/|$)', '')
    .replace(/\\\//g, '/')
    .replace(/\$$/, '');
}

function scanRoutes(stack, base = '') {
  const out = [];
  for (const layer of stack) {
    if (layer.route) {
      const fullPath = base + layer.route.path;
      const methods = Object.keys(layer.route.methods).map(m => m.toUpperCase());
      out.push({ path: fullPath, methods });
    } else if (layer.name === 'router' && layer.handle?.stack) {
      const seg = cleanRegexPath(layer.regexp);
      out.push(...scanRoutes(layer.handle.stack, base + seg));
    }
  }
  // de-dup
  const key = r => `${r.path}|${r.methods.sort().join(',')}`;
  const seen = new Set();
  return out.filter(r => (seen.has(key(r)) ? false : seen.add(key(r))));
}

function groupRoutes(routes) {
  const grouped = {};
  for (const r of routes) {
    const [, base, ...rest] = r.path.split('/'); // ['', 'auth', ...]
    const baseKey = '/' + (base || '');
    const sub = '/' + (rest.join('/') || '');
    for (const m of r.methods) {
      grouped[baseKey] ??= [];
      grouped[baseKey].push({ path: sub, method: m });
    }
  }
  // sort nicely
  for (const k of Object.keys(grouped)) {
    grouped[k] = grouped[k]
      .filter((v, i, a) => a.findIndex(t => t.path === v.path && t.method === v.method) === i)
      .sort((a, b) => (a.path === b.path ? a.method.localeCompare(b.method) : a.path.localeCompare(b.path)));
  }
  return grouped;
}

// ===== 1) Compact API index (pretty, grouped) =====
router.get('/', (req, res) => {
  const routes = scanRoutes(router.stack);
  const endpoints = groupRoutes(routes);

  res.json({
    message: 'English Korat Language School API',
    version: process.env.npm_package_version || '1.0.0',
    basePath: '/api/v1',
    endpoints, // { "/auth": [{path:"/login",method:"POST"}, ...], ... }
    helpful: {
      postmanCollection: '/postman-collection.json',
      note: 'Import collection into Postman, set {{baseUrl}} = http://localhost:3000/api/v1',
    },
    timestamp: new Date().toISOString(),
  });
});

// ===== 2) Auto Postman collection (v2.1) =====
router.get('/postman-collection.json', (req, res) => {
  const routes = scanRoutes(router.stack);
  const grouped = groupRoutes(routes);

  const items = Object.entries(grouped).map(([base, arr]) => ({
    name: base,
    item: arr.map(({ path, method }) => ({
      name: `${method} ${base}${path === '//' ? '/' : path}`, // guard for '//' when base="/"
      request: {
        method,
        header: [{ key: 'Content-Type', value: 'application/json' }],
        url: {
          raw: `{{baseUrl}}${base}${path === '//' ? '/' : path}`,
          host: ['{{baseUrl}}'],
          path: (base + (path === '//' ? '/' : path)).split('/').filter(Boolean),
        },
        body: ['POST', 'PATCH', 'PUT'].includes(method)
          ? { mode: 'raw', raw: '{\n  \n}' }
          : undefined,
      },
    })),
  }));

  const collection = {
    info: {
      name: 'English Korat API',
      description: 'Auto-generated from live Express routes',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      _postman_id: 'ekls-auto',
    },
    item: items,
    variable: [{ key: 'baseUrl', value: 'http://localhost:3000/api/v1' }],
  };

  res.setHeader('Content-Disposition', 'attachment; filename="ekls.postman_collection.json"');
  res.json(collection);
});

module.exports = router;
