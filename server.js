const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("./database");

const app = express();

const PORT = 3000;

// ==========================================
// MIDDLEWARE
// ==========================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// ==========================================
// HOME
// ==========================================

app.get("/", (req, res) => {
  res.send("AL-QUWWA HOME MARKETPLACE server is running.");
});

// ==========================================
// USER REGISTRATION
// ==========================================

app.post("/api/signup", async (req, res) => {
  try {
    const { name, email, phone, role, password } = req.body;

    if (!name || !email || !phone || !role || !password) {
      return res.status(400).json({
        success: false,
        message: "Please complete all required fields.",
      });
    }

    const existingUser = db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(email);

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = db
      .prepare(
        `
        INSERT INTO users
        (name, email, password, role)
        VALUES (?, ?, ?, ?)
      `,
      )
      .run(name, email, hashedPassword, role.toLowerCase());

    res.status(201).json({
      success: true,
      message: "Account created successfully.",
      userId: result.lastInsertRowid,
    });
  } catch (error) {
    console.error("Signup error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to create account.",
    });
  }
});
// ==========================================
// USER LOGIN
// ==========================================

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please enter your email and password.",
      });
    }

    const user = db
      .prepare(
        `
        SELECT id, name, email, password, role
        FROM users
        WHERE email = ?
      `,
      )
      .get(email);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Incorrect email or password.",
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Incorrect email or password.",
      });
    }

    res.json({
      success: true,
      message: "Login successful.",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to process login.",
    });
  }
});
// ==========================================
// CREATE ASSET
// ==========================================

app.post("/api/assets", (req, res) => {
  try {
    const {
      userId,
      name,
      type,
      status,
      location,
      price,
      contact,
      description,
      investmentHighlight,
      image,
      video,
    } = req.body;

    if (!userId || !name || !type || !location || !price) {
      return res.status(400).json({
        success: false,
        message: "Please complete the required asset fields.",
      });
    }

    const result = db
      .prepare(
        `
        INSERT INTO assets (
          user_id,
          name,
          type,
          status,
          location,
          price,
          contact,
          description,
          investment_highlight,
          image,
          video
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      )
      .run(
        userId,
        name,
        type,
        status,
        location,
        price,
        contact,
        description,
        investmentHighlight,
        image,
        video,
      );

    res.status(201).json({
      success: true,
      message: "Asset submitted successfully.",
      assetId: result.lastInsertRowid,
    });
  } catch (error) {
    console.error("Asset creation error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to save asset.",
    });
  }
});
// ==========================================
// UPDATE ASSET
// ==========================================

app.put("/api/assets/:id", (req, res) => {
  try {
    const assetId = req.params.id;

    const { name, location, price, description } = req.body;

    if (!name || !location || !price) {
      return res.status(400).json({
        success: false,
        message: "Please complete the required fields.",
      });
    }

    const result = db
      .prepare(
        `
        UPDATE assets
        SET
          name = ?,
          location = ?,
          price = ?,
          description = ?
        WHERE id = ?
      `,
      )
      .run(name, location, price, description, assetId);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: "Asset not found.",
      });
    }

    res.json({
      success: true,
      message: "Asset updated successfully.",
    });
  } catch (error) {
    console.error("Asset update error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to update asset.",
    });
  }
});
// ==========================================
// GET ALL ASSETS
// ==========================================

app.get("/api/assets", (req, res) => {
  try {
    const assets = db
      .prepare(
        `
        SELECT
          assets.*,
          users.name AS seller_name
        FROM assets
        LEFT JOIN users
          ON assets.user_id = users.id
        WHERE assets.approved = 1
        ORDER BY assets.id DESC
      `,
      )
      .all();

    res.json({
      success: true,
      assets,
    });
  } catch (error) {
    console.error("Get assets error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to load assets.",
    });
  }
});

// ==========================================
// DELETE ASSET
// ==========================================

app.delete("/api/assets/:id", (req, res) => {
  try {
    const assetId = req.params.id;

    const result = db
      .prepare(
        `
        DELETE FROM assets
        WHERE id = ?
      `,
      )
      .run(assetId);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: "Asset not found.",
      });
    }

    res.json({
      success: true,
      message: "Asset deleted successfully.",
    });
  } catch (error) {
    console.error("Asset deletion error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to delete asset.",
    });
  }
});
// ==========================================
// APPROVE ASSET
// ==========================================

app.put("/api/assets/:id/approve", (req, res) => {
  try {
    const assetId = req.params.id;

    const result = db
      .prepare(
        `
        UPDATE assets
        SET approved = 1
        WHERE id = ?
      `,
      )
      .run(assetId);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: "Asset not found.",
      });
    }

    res.json({
      success: true,
      message: "Asset approved successfully.",
    });
  } catch (error) {
    console.error("Asset approval error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to approve asset.",
    });
  }
});

// ==========================================
// REJECT ASSET
// ==========================================

app.delete("/api/assets/:id/reject", (req, res) => {
  try {
    const assetId = req.params.id;

    const result = db
      .prepare(
        `
        DELETE FROM assets
        WHERE id = ?
      `,
      )
      .run(assetId);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: "Asset not found.",
      });
    }

    res.json({
      success: true,
      message: "Asset rejected successfully.",
    });
  } catch (error) {
    console.error("Asset rejection error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to reject asset.",
    });
  }
});
// ==========================================
// REGISTER PROFESSIONAL
// ==========================================

app.post("/api/professionals", (req, res) => {
  try {
    const { userId, name, type, location, phone, email, description } =
      req.body;

    if (!userId || !name || !type) {
      return res.status(400).json({
        success: false,
        message: "Please complete the required professional fields.",
      });
    }

    const result = db
      .prepare(
        `
        INSERT INTO professionals (
          user_id,
          name,
          type,
          location,
          phone,
          email,
          description
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      )
      .run(userId, name, type, location, phone, email, description);

    res.status(201).json({
      success: true,
      message: "Professional registration submitted successfully.",
      professionalId: result.lastInsertRowid,
    });
  } catch (error) {
    console.error("Professional registration error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to register professional.",
    });
  }
});
// ==========================================
// GET APPROVED PROFESSIONALS
// ==========================================

app.get("/api/professionals", (req, res) => {
  try {
    const professionals = db
      .prepare(
        `
        SELECT
          professionals.*,
          users.name AS registered_by
        FROM professionals
        LEFT JOIN users
          ON professionals.user_id = users.id
        WHERE professionals.verified = 1
        ORDER BY professionals.id DESC
      `,
      )
      .all();

    res.json({
      success: true,
      professionals,
    });
  } catch (error) {
    console.error("Get approved professionals error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to load approved professionals.",
    });
  }
});
// ==========================================
// GET ALL PROFESSIONALS FOR ADMIN
// ==========================================

app.get("/api/admin/professionals", (req, res) => {
  try {
    const professionals = db
      .prepare(
        `
        SELECT
          professionals.*,
          users.name AS registered_by,
          users.email AS registered_email
        FROM professionals
        LEFT JOIN users
          ON professionals.user_id = users.id
        ORDER BY professionals.id DESC
      `,
      )
      .all();

    res.json({
      success: true,
      professionals,
    });
  } catch (error) {
    console.error("Admin professional error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to load professional applications.",
    });
  }
});
// ==========================================
// ADMIN DASHBOARD STATISTICS
// ==========================================

app.get("/api/admin/stats", (req, res) => {
  try {
    const totalUsers = db
      .prepare("SELECT COUNT(*) AS count FROM users")
      .get().count;

    const totalAssets = db
      .prepare("SELECT COUNT(*) AS count FROM assets")
      .get().count;

    const approvedAssets = db
      .prepare("SELECT COUNT(*) AS count FROM assets WHERE approved = 1")
      .get().count;

    const pendingAssets = db
      .prepare("SELECT COUNT(*) AS count FROM assets WHERE approved = 0")
      .get().count;

    const totalProfessionals = db
      .prepare("SELECT COUNT(*) AS count FROM professionals")
      .get().count;

    const verifiedProfessionals = db
      .prepare("SELECT COUNT(*) AS count FROM professionals WHERE verified = 1")
      .get().count;

    const pendingProfessionals = db
      .prepare("SELECT COUNT(*) AS count FROM professionals WHERE verified = 0")
      .get().count;

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalAssets,
        approvedAssets,
        pendingAssets,
        totalProfessionals,
        verifiedProfessionals,
        pendingProfessionals,
      },
    });
  } catch (error) {
    console.error("Admin statistics error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to load admin statistics.",
    });
  }
});
// ==========================================
// GET ALL ASSETS FOR ADMIN
// ==========================================

app.get("/api/admin/assets", (req, res) => {
  try {
    const assets = db
      .prepare(
        `
        SELECT
          assets.*,
          users.name AS seller_name,
          users.email AS seller_email
        FROM assets
        LEFT JOIN users
          ON assets.user_id = users.id
        ORDER BY assets.id DESC
      `,
      )
      .all();

    res.json({
      success: true,
      assets,
    });
  } catch (error) {
    console.error("Admin assets error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to load admin assets.",
    });
  }
});
// ==========================================
// SERVER
// ==========================================

app.listen(PORT, () => {
  console.log(`AL-QUWWA HOME MARKETPLACE running at http://localhost:${PORT}`);
});
// ==========================================
// APPROVE PROFESSIONAL
// ==========================================

app.put("/api/professionals/:id/approve", (req, res) => {
  try {
    const professionalId = req.params.id;

    const result = db
      .prepare(
        `
        UPDATE professionals
        SET verified = 1
        WHERE id = ?
      `,
      )
      .run(professionalId);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: "Professional not found.",
      });
    }

    res.json({
      success: true,
      message: "Professional approved successfully.",
    });
  } catch (error) {
    console.error("Professional approval error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to approve professional.",
    });
  }
});

// ==========================================
// REJECT PROFESSIONAL
// ==========================================

app.delete("/api/professionals/:id", (req, res) => {
  try {
    const professionalId = req.params.id;

    const result = db
      .prepare(
        `
        DELETE FROM professionals
        WHERE id = ?
      `,
      )
      .run(professionalId);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: "Professional not found.",
      });
    }

    res.json({
      success: true,
      message: "Professional application rejected.",
    });
  } catch (error) {
    console.error("Professional rejection error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to reject professional.",
    });
  }
});
