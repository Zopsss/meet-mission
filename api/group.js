const express = require('express');
const auth = require('../model/auth');
const groupController = require('../controller/groupController');
const api = express.Router();
const use = require('../helper/utility').use;

api.get('/api/group/event/:id', auth.verify('master'), use(groupController.getGroupsByEventId));
api.get('/api/group/:id', auth.verify('master'), use(groupController.getById));
api.patch('/api/group/:id', auth.verify('master'), use(groupController.update));
api.post('/api/group', auth.verify('master'), use(groupController.create));
api.delete('/api/group/:id', auth.verify('master'), use(groupController.delete));
api.put('/api/group/cancel/:id', auth.verify('master'), use(groupController.cancel));


module.exports = api;
