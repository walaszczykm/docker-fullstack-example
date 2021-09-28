const mysql = require("mysql2/promise");
const redis = require("redis");
const express = require("express");
const morgan = require("morgan");
const { v4: uuid } = require("uuid");

const db = mysql.createPool("mysql://user:foobar@mysql:3306/db");
const redisClient = redis.createClient({ host: "redis" });

const app = express();
app.use(express.json());
app.use(morgan("short"));

app.get("/api/status", (_, res) => res.status(200).send());
app.get("/api/posts/:id", async (req, res) => {
  const id = req.params.id;
  if (typeof id === "undefined") {
    res.status(400).send({ error: "The 'id' path param is required" });
    return;
  }

  const cachedPost = await new Promise((resolve) =>
    redisClient.get(id, (value) => resolve(JSON.parse(value)))
  );

  if (cachedPost) {
    res.status(200).send(cachedPost);
    return;
  }

  try {
    const results = await db.query("SELECT * FROM Posts WHERE ?", { id });
    const post = results[0][0];
    await new Promise((resolve) =>
      redisClient.set(id, JSON.stringify(post), resolve)
    );
    res.status(200).send(post);
  } catch {
    res.status(404).send();
  }
});
app.post("/api/posts", async (req, res) => {
  const post = req.body;
  if (
    typeof post.author === "undefined" ||
    typeof post.title === "undefined" ||
    typeof post.content === "undefined"
  ) {
    res.status(400).send({ error: "Missing required fields" });
    return;
  }
  const id = uuid();
  try {
    await db.query(
      "INSERT INTO `Posts` (`id`, `author`, `title`, `content`) VALUES (?, ?, ?, ?)",
      [id, post.author, post.title, post.content]
    );
    res.status(201).send({ id, ...post });
  } catch {
    res.status(500).send();
  }
});

app.listen(process.env.PORT, () => {
  console.log("Server is running on port", process.env.PORT);
});
