const bcrypt = require("bcryptjs");
const readline = require("readline");
const db = require("./database");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function createAdmin() {
  try {
    console.log("\n====================================");
    console.log("   AL-QUWAH PROPERTY ADMIN SETUP");
    console.log("====================================\n");

    const name = (await ask("Admin name: ")).trim();
    const email = (await ask("Admin email: ")).trim().toLowerCase();
    const phone = (await ask("Admin phone: ")).trim();
    const password = await ask("Admin password: ");

    if (!name || !email || !phone || !password) {
      console.log("\nAll fields are required.");
      rl.close();
      return;
    }

    const existingUser = db
      .prepare("SELECT id, role FROM users WHERE email = ?")
      .get(email);

    if (existingUser) {
      if (existingUser.role === "admin") {
        console.log("\nThis email is already an admin.");
        rl.close();
        return;
      }

      const confirm = (
        await ask(
          `\nThis account currently has the role "${existingUser.role}".\nPromote this account to ADMIN? (yes/no): `,
        )
      )
        .trim()
        .toLowerCase();

      if (confirm !== "yes") {
        console.log("\nAdmin promotion cancelled.");
        rl.close();
        return;
      }

      db.prepare(
        `
    UPDATE users
    SET role = 'admin'
    WHERE id = ?
  `,
      ).run(existingUser.id);

      console.log("\n====================================");
      console.log("EXISTING ACCOUNT PROMOTED TO ADMIN");
      console.log("====================================");
      console.log(`Admin ID: ${existingUser.id}`);
      console.log(`Email: ${email}`);
      console.log("Role: admin");
      console.log("====================================\n");

      rl.close();
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const result = db
      .prepare(
        `
        INSERT INTO users
        (name, email, password, role)
        VALUES (?, ?, ?, ?)
      `,
      )
      .run(name, email, hashedPassword, "admin");

    console.log("\n====================================");
    console.log("ADMIN ACCOUNT CREATED SUCCESSFULLY");
    console.log("====================================");
    console.log(`Admin ID: ${result.lastInsertRowid}`);
    console.log(`Name: ${name}`);
    console.log(`Email: ${email}`);
    console.log("Role: admin");
    console.log("====================================\n");

    console.log("You can now use these credentials on the normal login page.");
  } catch (error) {
    console.error("\nUnable to create admin:", error);
  } finally {
    rl.close();
  }
}

createAdmin();
