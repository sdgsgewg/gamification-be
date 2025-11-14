const path = require("path");
const fs = require("fs");

module.exports = async (req, res) => {
  try {
    const mainFile = path.join(process.cwd(), "api/dist/main.js");

    if (!fs.existsSync(mainFile)) {
      console.error("dist/main.js not found");
      return res.status(500).send("Build not found");
    }

    const nestApp = require(mainFile);
    return nestApp(req, res);
  } catch (err) {
    console.error("Failed to load NestJS app:", err);
    res.status(500).send("Internal Server Error");
  }
};
