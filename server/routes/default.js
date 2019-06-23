const express = require("express");
const router = express.Router();

// Root routes

router.get("/", (req, res) => {
  res.render("app.generated.ejs", { title: "Infoscreen" });
});

module.exports = router;
