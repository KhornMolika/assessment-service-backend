const jwt = require("jsonwebtoken");
const token = jwt.sign({ sub: "123" }, "change-me-to-32-plus-random-chars-1234567890");
fetch("http://localhost:3001/api/v1/questions?page=1&limit=1", {
  headers: { "Authorization": "Bearer " + token }
}).then(r => r.json()).then(console.log);
