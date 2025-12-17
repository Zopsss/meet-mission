const express = require("express");
const auth = require("../model/auth");
const waitlistController = require("../controller/waitlistController");
const api = express.Router();
const use = require("../helper/utility").use;

api.get(
  "/api/event-management/:id/waitlist",
  auth.verify("master"),
  use(waitlistController.getByEventId)
);

module.exports = api;
