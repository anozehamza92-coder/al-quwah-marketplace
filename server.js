const express = require("express");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const fs = require("fs");
const db = require("./database");

const app = express();

const PORT = process.env.PORT || 3000;
// ==========================================
// FILE UPLOAD CONFIGURATION
// ==========================================

const uploadDirectory = path.join(__dirname, "uploads");
console.log("AL-QUWAH UPLOAD DIRECTORY:", uploadDirectory);

// Create uploads folder automatically if it does not exist
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

// Store uploaded files safely with unique filenames
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDirectory);
  },

  filename: function (req, file, cb) {
    const extension = path.extname(file.originalname).toLowerCase();

    const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${extension}`;

    cb(null, uniqueName);
  },
});

// ==========================================
// MULTER UPLOAD CONFIGURATION
// IMAGE + VIDEO
// ==========================================

const upload = multer({
  storage: storage,

  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB maximum per file
  },

  fileFilter: function (req, file, cb) {
    const allowedImages = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];

    const allowedVideos = ["video/mp4", "video/webm", "video/quicktime"];

    if (
      allowedImages.includes(file.mimetype) ||
      allowedVideos.includes(file.mimetype)
    ) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Only JPG, PNG, WEBP, GIF, MP4, WEBM and MOV videos are allowed.",
        ),
      );
    }
  },
});

const AUTH_SECRET =
  process.env.AUTH_SECRET ||
  "AL-QUWAH-PROPERTY-CHANGE-THIS-SECRET-IN-PRODUCTION";

const AUTH_COOKIE = "alquwah_auth";

function createAuthToken(user) {
  const payload = {
    id: user.id,
    role: user.role,
    exp: Date.now() + 2 * 60 * 60 * 1000,
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url",
  );

  const signature = crypto
    .createHmac("sha256", AUTH_SECRET)
    .update(encodedPayload)
    .digest("base64url");

  return `${encodedPayload}.${signature}`;
}

function verifyAuthToken(token) {
  try {
    if (!token) {
      return null;
    }

    const parts = token.split(".");

    if (parts.length !== 2) {
      return null;
    }

    const [encodedPayload, signature] = parts;

    const expectedSignature = crypto
      .createHmac("sha256", AUTH_SECRET)
      .update(encodedPayload)
      .digest("base64url");

    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      return null;
    }

    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    );

    if (!payload.exp || Date.now() > payload.exp) {
      return null;
    }

    return payload;
  } catch (error) {
    return null;
  }
}

function getAuthToken(req) {
  const cookieHeader = req.headers.cookie || "";

  const cookies = {};

  cookieHeader.split(";").forEach((cookie) => {
    const [name, ...value] = cookie.trim().split("=");

    if (name) {
      cookies[name] = value.join("=");
    }
  });

  return cookies[AUTH_COOKIE];
}

function requireLogin(req, res, next) {
  const token = getAuthToken(req);
  const user = verifyAuthToken(token);

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
  }

  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  const token = getAuthToken(req);
  const user = verifyAuthToken(token);

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Administrator authentication required.",
    });
  }

  if (user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Administrator access required.",
    });
  }

  req.user = user;
  next();
}

// ==========================================
// MIDDLEWARE
// ==========================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==========================================
// HOME
// ==========================================

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ==========================================
// PROTECTED ADMIN PAGE
// ==========================================

app.get("/admin.html", requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

app.use(express.static(__dirname));
app.use("/uploads", express.static(uploadDirectory));

// ==========================================
// USER REGISTRATION
// ==========================================

app.post("/api/signup", async (req, res) => {
  try {
    const { name, email, phone, role, password } = req.body;
    const requestedRole = String(role || "").toLowerCase();

    const allowedRoles = ["buyer", "seller", "investor", "professional"];

    if (!allowedRoles.includes(requestedRole)) {
      return res.status(400).json({
        success: false,
        message: "Invalid account role.",
      });
    }

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
      .run(name, email, hashedPassword, requestedRole);

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

    const authToken = createAuthToken(user);

    res.setHeader(
      "Set-Cookie",
      `${AUTH_COOKIE}=${authToken}; HttpOnly; Path=/; Max-Age=7200; SameSite=Lax`,
    );

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
// IMAGE + VIDEO UPLOAD
// ==========================================

app.post(
  "/api/assets",
  requireLogin,
  upload.fields([
    { name: "assetImage", maxCount: 1 },
    { name: "assetVideo", maxCount: 1 },
  ]),
  (req, res) => {
    try {
      const {
        assetName,
        assetType,
        assetStatus,
        assetLocation,
        assetPrice,
        contactMethod,
        assetDescription,
        investmentHighlight,
      } = req.body;

      // ------------------------------------------
      // GET UPLOADED IMAGE
      // ------------------------------------------

      const assetImage =
        req.files && req.files.assetImage && req.files.assetImage[0]
          ? `/uploads/${req.files.assetImage[0].filename}`
          : "";

      // ------------------------------------------
      // GET UPLOADED VIDEO
      // ------------------------------------------

      const assetVideo =
        req.files && req.files.assetVideo && req.files.assetVideo[0]
          ? `/uploads/${req.files.assetVideo[0].filename}`
          : "";
      // ==========================================
      // DEBUG UPLOADED FILES
      // ==========================================

      console.log("AL-QUWAH UPLOAD DEBUG:");
      console.log("req.files:", req.files);
      console.log("Saved image path:", assetImage);
      console.log("Saved video path:", assetVideo);
      // ------------------------------------------
      // VALIDATE REQUIRED FIELDS
      // ------------------------------------------

      if (
        !assetName ||
        !assetType ||
        !assetStatus ||
        !assetLocation ||
        !assetPrice ||
        !assetDescription
      ) {
        return res.status(400).json({
          success: false,
          message: "Please fill in all required asset fields.",
        });
      }

      // ------------------------------------------
      // SAVE ASSET TO DATABASE
      // ------------------------------------------

      const stmt = db.prepare(`
        INSERT INTO assets (
          user_id,
          name,
          type,
          status,
          location,
          price,
          contact,
          description,
          image,
          video,
          investment_highlight,
          approved
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
      `);

      const result = stmt.run(
        req.user.id,
        assetName.trim(),
        assetType.trim(),
        assetStatus.trim(),
        assetLocation.trim(),
        assetPrice.trim(),
        contactMethod ? contactMethod.trim() : "",
        assetDescription.trim(),
        assetImage,
        assetVideo,
        investmentHighlight ? investmentHighlight.trim() : "",
      );

      // ------------------------------------------
      // SUCCESS RESPONSE
      // ------------------------------------------

      res.status(201).json({
        success: true,
        message: "Asset submitted successfully and is awaiting approval.",
        assetId: result.lastInsertRowid,
        image: assetImage,
        video: assetVideo,
      });
    } catch (error) {
      console.error("Asset creation error:", error);

      res.status(500).json({
        success: false,
        message: error.message || "Unable to submit asset.",
      });
    }
  },
);

// ==========================================
// UPDATE ASSET
// ==========================================

app.put("/api/assets/:id", requireLogin, (req, res) => {
  try {
    const assetId = req.params.id;
    const { name, location, price, description } = req.body;

    if (!name || !location || !price || !description) {
      return res.status(400).json({
        success: false,
        message: "Please fill in all required asset fields.",
      });
    }

    const existingAsset = db
      .prepare(
        `
        SELECT id, user_id
        FROM assets
        WHERE id = ?
      `,
      )
      .get(assetId);

    if (!existingAsset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found.",
      });
    }

    if (existingAsset.user_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You can only edit your own assets.",
      });
    }

    db.prepare(
      `
      UPDATE assets
      SET name = ?, location = ?, price = ?, description = ?
      WHERE id = ?
    `,
    ).run(
      name.trim(),
      location.trim(),
      price.trim(),
      description.trim(),
      assetId,
    );

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
// GET MY ASSETS
// ==========================================

app.get("/api/my-assets", requireLogin, (req, res) => {
  try {
    const assets = db
      .prepare(
        `
        SELECT *
        FROM assets
        WHERE user_id = ?
        ORDER BY id DESC
      `,
      )
      .all(req.user.id);

    res.json({
      success: true,
      assets,
    });
  } catch (error) {
    console.error("Get my assets error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to load your listings.",
    });
  }
});

// ==========================================
// GET MY PROFESSIONAL APPLICATION
// ==========================================

app.get("/api/my-professional", requireLogin, (req, res) => {
  try {
    const professional = db
      .prepare(
        `
        SELECT *
        FROM professionals
        WHERE user_id = ?
        ORDER BY id DESC
        LIMIT 1
      `,
      )
      .get(req.user.id);

    res.json({
      success: true,
      professional: professional || null,
    });
  } catch (error) {
    console.error("Get my professional error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to load your professional registration.",
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

app.delete("/api/assets/:id", requireLogin, (req, res) => {
  try {
    const assetId = req.params.id;

    const existingAsset = db
      .prepare(
        `
        SELECT id, user_id
        FROM assets
        WHERE id = ?
      `,
      )
      .get(assetId);

    if (!existingAsset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found.",
      });
    }

    if (existingAsset.user_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own assets.",
      });
    }

    db.prepare(
      `
      DELETE FROM assets
      WHERE id = ?
    `,
    ).run(assetId);

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

app.put("/api/assets/:id/approve", requireAdmin, (req, res) => {
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

app.delete("/api/assets/:id/reject", requireAdmin, (req, res) => {
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

app.post("/api/professionals", requireLogin, (req, res) => {
  try {
    const { name, type, location, phone, email, description } = req.body;

    if (!name || !type) {
      return res.status(400).json({
        success: false,
        message: "Please complete the required professional fields.",
      });
    }
    const existingProfessional = db
      .prepare(
        `
    SELECT id
    FROM professionals
    WHERE user_id = ?
      AND email = ?
  `,
      )
      .get(req.user.id, email);

    if (existingProfessional) {
      return res.status(409).json({
        success: false,
        message: "You already have a professional registration.",
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
      .run(
        req.user.id,
        name.trim(),
        type.trim(),
        location ? location.trim() : "",
        phone ? phone.trim() : "",
        email ? email.trim() : "",
        description ? description.trim() : "",
      );

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

app.get("/api/admin/professionals", requireAdmin, (req, res) => {
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

app.get("/api/admin/stats", requireAdmin, (req, res) => {
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

app.get("/api/admin/assets", requireAdmin, (req, res) => {
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
// APPROVE PROFESSIONAL
// ==========================================

app.put("/api/professionals/:id/approve", requireAdmin, (req, res) => {
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

app.delete("/api/professionals/:id", requireAdmin, (req, res) => {
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
// ==========================================
// LOGOUT
// ==========================================

app.post("/api/logout", (req, res) => {
  res.setHeader(
    "Set-Cookie",
    `${AUTH_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`,
  );

  res.json({
    success: true,
    message: "Logged out successfully.",
  });
});

// ==========================================
// SERVER
// ==========================================

app.listen(PORT, () => {
  console.log(`AL-QUWAH PROPERTY running at http://localhost:${PORT}`);
});
