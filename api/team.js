const express = require('express');
const auth = require('../model/auth');
const teamController = require('../controller/teamController');
const api = express.Router();
const use = require('../helper/utility').use;

api.patch('/api/team/:id', auth.verify('master'), use(teamController.update));
api.post('/api/team', auth.verify('master'), use(teamController.create));
api.delete('/api/team/:id', auth.verify('master'), use(teamController.delete));
api.get('/api/teams/event/:id', auth.verify('master'), use(teamController.getTeamsByEventId));
api.put('/api/team/cancel/:id', auth.verify('master'), use(teamController.cancel));

module.exports = api;
