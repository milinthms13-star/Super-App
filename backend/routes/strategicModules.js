const express = require('express');

const auth = require('../middleware/auth');

const router = express.Router();
const authenticate = auth.authenticate || auth;

const MODULE_META = {
  aibusinessos: {
    title: 'AI Business Operating System',
    priority: 'highest',
    monetization: ['SaaS plans', 'AI credits', 'Monthly subscriptions'],
  },
  gulfservices: {
    title: 'Gulf Services + Jobs Migration',
    priority: 'high',
    monetization: ['Service commissions', 'Candidate premium', 'Recruiter plans', 'Verification fees'],
  },
};

router.get('/meta', authenticate, (_req, res) => {
  res.json({
    success: true,
    modules: MODULE_META,
  });
});

router.get('/meta/:moduleId', authenticate, (req, res) => {
  const requestedModuleId = String(req.params.moduleId || '').trim().toLowerCase();
  const moduleId =
    requestedModuleId === 'gulfjobsmigration' ||
    requestedModuleId === 'gulfjobmigration' ||
    requestedModuleId === 'kerala-gulf-jobs-migration'
      ? 'gulfservices'
      : requestedModuleId;
  const moduleMeta = MODULE_META[moduleId];

  if (!moduleMeta) {
    return res.status(404).json({
      success: false,
      message: 'Module metadata not found.',
    });
  }

  return res.json({
    success: true,
    moduleId,
    module: moduleMeta,
  });
});

module.exports = router;
