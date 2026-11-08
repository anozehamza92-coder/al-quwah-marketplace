const { test } = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { mkdtemp, rm } = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

test("marketplace health, signup, normalized login and protected listings", async (t) => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "alquwah-test-"));
  const port = 3100 + (process.pid % 1000);
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], {
    env: {
      ...process.env,
      PORT: String(port),
      DATA_DIR: dataDir,
      UPLOADS_DIR: path.join(dataDir, "uploads"),
      AUTH_SECRET: "automated-test-secret",
      NODE_ENV: "test",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk.toString(); });
  child.stderr.on("data", (chunk) => { output += chunk.toString(); });

  t.after(async () => {
    child.kill("SIGTERM");
    await new Promise((resolve) => {
      if (child.exitCode !== null) return resolve();
      child.once("exit", resolve);
      setTimeout(resolve, 2000);
    });
    await rm(dataDir, { recursive: true, force: true });
  });

  let ready = false;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (child.exitCode !== null) break;
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) { ready = true; break; }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  assert.equal(ready, true, `server did not become ready. Output: ${output}`);

  const health = await fetch(`${baseUrl}/api/health`).then((r) => r.json());
  assert.equal(health.success, true);
  assert.equal(health.status, "ok");

  const signup = await fetch(`${baseUrl}/api/signup`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Marketplace Test User",
      email: "Test.User@Example.com",
      phone: "08000000000",
      role: "Buyer",
      password: "TestPassword123!",
    }),
  });
  assert.equal(signup.status, 201);

  const login = await fetch(`${baseUrl}/api/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "  TEST.USER@example.com ", password: "TestPassword123!" }),
  });
  assert.equal(login.status, 200, await login.clone().text());
  const loginBody = await login.json();
  assert.equal(loginBody.success, true);
  assert.equal(loginBody.user.email, "test.user@example.com");

  const cookie = login.headers.get("set-cookie");
  assert.ok(cookie && cookie.includes("alquwah_auth="));

  const mine = await fetch(`${baseUrl}/api/my-assets`, {
    headers: { cookie: cookie.split(";")[0] },
  });
  assert.equal(mine.status, 200, await mine.clone().text());
  const mineBody = await mine.json();
  assert.equal(mineBody.success, true);
  assert.deepEqual(mineBody.assets, []);

  const blockedAdminPage = await fetch(`${baseUrl}/admin.html`, { redirect: "manual" });
  assert.equal(blockedAdminPage.status, 401);
});
