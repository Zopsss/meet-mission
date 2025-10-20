const express = require('express');
const auth = require('../model/auth');
const eventManagementController = require('../controller/eventManagementController');
const api = express.Router();
const use = require('../helper/utility').use;

api.get('/api/event-management', auth.verify('master'), use(eventManagementController.get));

api.get('/api/event-management/need-attention', auth.verify('master'), use(eventManagementController.getLocationNeedAttention));

api.get('/api/event-management/locations/:id', auth.verify('master'), use(eventManagementController.getLocations));

api.get('/api/event-management/:id', auth.verify('master'), use(eventManagementController.getById));

api.delete('/api/event-management/:id', auth.verify('master'), use(eventManagementController.delete));

api.put('/api/event-management/cancel/:id', auth.verify('master'), use(eventManagementController.cancel));

api.post('/api/event-management', auth.verify('master'), use(eventManagementController.create));

api.patch('/api/event-management/:id', auth.verify('master'), use(eventManagementController.update));

api.get('/api/event-management/:id/teams', auth.verify('master'), use(eventManagementController.getTeamsByEventId));

api.get('/api/event-management/team/:id', auth.verify('master'), use(eventManagementController.getTeam));

api.get('/api/event-management/participant-messages/:eventId', auth.verify('master'), use(eventManagementController.getEventChats));

api.put('/api/event-management/archive-chat/:chatId', auth.verify('master'), use(eventManagementController.archiveChat));

module.exports = api;
