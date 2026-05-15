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
  gulfjobsmigration: {
    title: 'Kerala + Gulf Jobs Migration',
    priority: 'high',
    monetization: ['Candidate premium', 'Recruiter plans', 'Verification fees'],
  },
  womensafetyfamily: {
    title: 'Women Safety + Family Protection',
    priority: 'high',
    monetization: ['Family plans', 'Institution safety plans', 'Partner services'],
  },
  devotionalecosystem: {
    title: 'Devotional Ecosystem',
    priority: 'high',
    monetization: ['Service fees', 'Temple SaaS', 'Pilgrimage partnerships'],
  },
  hyperlocalaicommerce: {
    title: 'Hyperlocal AI Commerce',
    priority: 'highest',
    monetization: ['Seller AI subscription', 'Promotion placements', 'Automation fees'],
  },
  nilaaistudio: {
    title: 'Nila AI Studio',
    priority: 'highest',
    monetization: ['Creator plans', 'Render credits', 'Template marketplace'],
  },
  trustlayer: {
    title: 'Trust Layer',
    priority: 'highest',
    monetization: ['Verification tiers', 'Trust badges', 'Risk APIs'],
  },
};

router.get('/meta', authenticate, (_req, res) => {
  res.json({
    success: true,
    modules: MODULE_META,
  });
});

router.get('/meta/:moduleId', authenticate, (req, res) => {
  const moduleId = String(req.params.moduleId || '').trim().toLowerCase();
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
