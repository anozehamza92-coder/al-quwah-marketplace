"use strict";

/* =========================================
   USER LOGIN STATE
   ========================================= */

function getLoggedInUser() {
  try {
    const user = localStorage.getItem("loggedInUser");

    if (!user) {
      return null;
    }

    return JSON.parse(user);
  } catch (error) {
    console.error("Unable to read logged-in user:", error);
    localStorage.removeItem("loggedInUser");
    return null;
  }
}

/* =========================================
   UPDATE NAVIGATION
   ========================================= */

function updateUserNavigation() {
  const userWelcome = document.getElementById("userWelcome");
  const loginLink = document.getElementById("loginLink");
  const signupLink = document.getElementById("signupLink");
  const logoutBtn = document.getElementById("logoutBtn");

  const user = getLoggedInUser();

  if (user) {
    const displayName = user.name || user.fullName || user.email || "User";

    if (userWelcome) {
      userWelcome.textContent = `Welcome, ${displayName}`;
      userWelcome.style.display = "inline";
    }

    if (loginLink) {
      loginLink.style.display = "none";
    }

    if (signupLink) {
      signupLink.style.display = "none";
    }

    if (logoutBtn) {
      logoutBtn.style.display = "inline-block";
    }
  } else {
    if (userWelcome) {
      userWelcome.textContent = "";
      userWelcome.style.display = "none";
    }

    if (loginLink) {
      loginLink.style.display = "inline-block";
    }

    if (signupLink) {
      signupLink.style.display = "inline-block";
    }

    if (logoutBtn) {
      logoutBtn.style.display = "none";
    }
  }
}

/* =========================================
   LOGOUT
   ========================================= */

async function logoutUser() {
  try {
    await fetch("/api/logout", {
      method: "POST",
      credentials: "include",
    });
  } catch (error) {
    console.error("Logout request failed:", error);
  }

  localStorage.removeItem("loggedInUser");
  updateUserNavigation();

  alert("You have been logged out successfully.");

  window.location.href = "login.html";
}

/* =========================================
   INITIALIZE
   ========================================= */

document.addEventListener("DOMContentLoaded", function () {
  updateUserNavigation();
  loadAssets();
  loadProfessionals();
  loadUserDashboard();

  const logoutBtn = document.getElementById("logoutBtn");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", logoutUser);
  }
});
/* =========================================
   ASSET MARKETPLACE
   ========================================= */

let assets = [];

/* Load assets from server */
async function loadAssets() {
  try {
    const response = await fetch("/api/assets");

    if (!response.ok) {
      throw new Error("Failed to load assets");
    }

    const data = await response.json();

    assets = data.assets || [];

    displayAssets(assets);
    displayInvestmentListings(assets);
  } catch (error) {
    console.error("Error loading assets:", error);

    const container = document.getElementById("assetListings");

    if (container) {
      container.innerHTML = `
        <p class="empty-message">
          Unable to load marketplace listings.
        </p>
      `;
    }
  }
}
/* Display normal asset listings */
function displayAssets(assetList) {
  const container = document.getElementById("assetListings");

  if (!container) return;

  if (!assetList || assetList.length === 0) {
    container.innerHTML = `
      <p class="empty-message">
        No assets are currently available.
      </p>
    `;
    return;
  }

  container.innerHTML = "";

  assetList.forEach((asset) => {
    const card = document.createElement("div");

    card.className = "asset-card";

    const imageHTML = asset.image
      ? `
        <div class="asset-card-media">
          <img
            src="${escapeHTML(asset.image)}"
            alt="${escapeHTML(asset.name || "Property Image")}"
            loading="lazy"
          />
        </div>
      `
      : `
        <div class="asset-card-media asset-no-image">
          <span>No Image Available</span>
        </div>
      `;

    const videoHTML = asset.video
      ? `
        <div class="asset-card-video">
          <span>🎥 Video Available</span>
        </div>
      `
      : "";

    card.innerHTML = `
      ${imageHTML}

      <div class="asset-card-content">

        <h3>
          ${escapeHTML(asset.name || asset.assetName || "Unnamed Asset")}
        </h3>

        <p>
          <strong>Type:</strong>
          ${escapeHTML(asset.type || asset.assetType || "N/A")}
        </p>

        <p>
          <strong>Location:</strong>
          ${escapeHTML(asset.location || asset.assetLocation || "N/A")}
        </p>

        <p>
          <strong>Price:</strong>
          ₦${Number(asset.price || asset.assetPrice || 0).toLocaleString()}
        </p>

        <p>
          <strong>Status:</strong>
          ${escapeHTML(asset.status || asset.assetStatus || "N/A")}
        </p>

        ${videoHTML}

        <button
          type="button"
          class="primary-btn"
          onclick="viewAsset(${asset.id})"
        >
          View Details
        </button>

      </div>
    `;

    container.appendChild(card);
  });
}

/* Display investment listings */
function displayInvestmentListings(assetList) {
  const container = document.getElementById("investmentListings");

  if (!container) return;

  const investments = assetList.filter((asset) => {
    const type = asset.type || asset.assetType;

    return type === "Investment";
  });

  if (investments.length === 0) {
    container.innerHTML = `
      <p class="empty-message">
        No investment opportunities are currently available.
      </p>
    `;
    return;
  }

  container.innerHTML = "";

  investments.forEach((asset) => {
    const card = document.createElement("div");

    card.className = "asset-card";

    const imageHTML = asset.image
      ? `
        <div class="asset-card-media">
          <img
            src="${escapeHTML(asset.image)}"
            alt="${escapeHTML(asset.name || "Investment")}"
            loading="lazy"
          />
        </div>
      `
      : "";

    const videoHTML = asset.video
      ? `
        <div class="asset-card-video">
          <span>🎥 Video Available</span>
        </div>
      `
      : "";

    const investmentHighlight =
      asset.investment_highlight || asset.investmentHighlight || "";

    card.innerHTML = `
      ${imageHTML}

      <div class="asset-card-content">

        <h3>
          ${escapeHTML(asset.name || asset.assetName || "Investment")}
        </h3>

        <p>
          <strong>Location:</strong>
          ${escapeHTML(asset.location || asset.assetLocation || "N/A")}
        </p>

        <p>
          <strong>Price:</strong>
          ₦${Number(asset.price || asset.assetPrice || 0).toLocaleString()}
        </p>

        ${
          investmentHighlight
            ? `
              <p>
                <strong>Investment Highlight:</strong>
                ${escapeHTML(investmentHighlight)}
              </p>
            `
            : ""
        }

        ${videoHTML}

        <button
          type="button"
          class="primary-btn"
          onclick="viewAsset(${asset.id})"
        >
          View Opportunity
        </button>

      </div>
    `;

    container.appendChild(card);
  });
}
function viewAsset(assetId) {
  const asset = assets.find(
    (item) => Number(item.id) === Number(assetId)
  );

  if (!asset) {
    alert("Asset details could not be found.");
    return;
  }

  const modal = document.getElementById("assetModal");

  if (!modal) return;

  const setText = (id, value) => {
    const element = document.getElementById(id);

    if (element) {
      element.textContent = value || "N/A";
    }
  };

  /* -----------------------------------------
     ASSET INFORMATION
     ----------------------------------------- */

  setText(
    "modalAssetName",
    asset.name || asset.assetName || "Unnamed Asset"
  );

  setText(
    "modalAssetType",
    asset.type || asset.assetType || "N/A"
  );

  setText(
    "modalAssetLocation",
    asset.location || asset.assetLocation || "N/A"
  );

  setText(
    "modalAssetPrice",
    Number(
      asset.price || asset.assetPrice || 0
    ).toLocaleString()
  );

  setText(
    "modalAssetStatus",
    asset.status || asset.assetStatus || "N/A"
  );

  setText(
    "modalAssetContact",
    asset.contact || "N/A"
  );

  setText(
    "modalAssetDescription",
    asset.description ||
      asset.assetDescription ||
      "No description provided."
  );

  setText(
    "modalInvestmentHighlight",
    asset.investment_highlight ||
      asset.investmentHighlight ||
      "No investment highlight provided."
  );

    /* -----------------------------------------
     DISPLAY ASSET IMAGE
     ----------------------------------------- */

  const imageContainer = document.getElementById(
    "modalAssetImageContainer"
  );

  const modalImage = document.getElementById(
    "modalAssetImage"
  );

  if (imageContainer && modalImage) {
    if (asset.image) {
      modalImage.src = asset.image;

      modalImage.alt =
        asset.name || "AL-QUWAH PROPERTY Asset";

      imageContainer.style.display = "block";
    } else {
      modalImage.removeAttribute("src");

      imageContainer.style.display = "none";
    }
  }

  /* -----------------------------------------
     DISPLAY ASSET VIDEO
     ----------------------------------------- */

  const videoContainer = document.getElementById(
    "modalAssetVideoContainer"
  );

  const modalVideo = document.getElementById(
    "modalAssetVideo"
  );

  if (videoContainer && modalVideo) {
    if (asset.video) {
      modalVideo.src = asset.video;

      videoContainer.style.display = "block";
    } else {
      modalVideo.pause();

      modalVideo.removeAttribute("src");

      modalVideo.load();

      videoContainer.style.display = "none";
    }
  }

  /* -----------------------------------------
     SHOW MODAL
     ----------------------------------------- */

  modal.style.display = "flex";
}

/* =========================================
   CLOSE ASSET MODAL
   ========================================= */

function closeAssetModal() {
  const modal = document.getElementById("assetModal");

  if (modal) {
    modal.style.display = "none";
  }
}

/* =========================================
   SEARCH ASSETS
   ========================================= */

function searchAssets() {
  const keyword =
    document.getElementById("searchKeyword")?.value.trim().toLowerCase() || "";

  const location =
    document.getElementById("searchLocation")?.value.trim().toLowerCase() || "";

  const type = document.getElementById("searchAssetType")?.value || "";

  const filteredAssets = assets.filter((asset) => {
    const name = (asset.name || asset.assetName || "").toLowerCase();

    const assetLocation = (
      asset.location ||
      asset.assetLocation ||
      ""
    ).toLowerCase();

    const assetType = asset.type || asset.assetType || "";

    const description = (
      asset.description ||
      asset.assetDescription ||
      ""
    ).toLowerCase();

    const matchesKeyword =
      !keyword || name.includes(keyword) || description.includes(keyword);

    const matchesLocation = !location || assetLocation.includes(location);

    const matchesType = !type || assetType === type;

    return matchesKeyword && matchesLocation && matchesType;
  });

  displayAssets(filteredAssets);
}

/* =========================================
   BASIC HTML SAFETY
   ========================================= */

function escapeHTML(value) {
  const div = document.createElement("div");

  div.textContent = value ?? "";

  return div.innerHTML;
}
/* =========================================
   ASSET SUBMISSION
   IMAGE + VIDEO UPLOAD
   ========================================= */

const assetForm = document.getElementById("assetForm");

if (assetForm) {
  assetForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const user = getLoggedInUser();

    if (!user) {
      alert("Please login before listing an asset.");
      window.location.href = "login.html";
      return;
    }

    const submitButton = assetForm.querySelector('button[type="submit"]');

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Uploading...";
    }

    try {
      const formData = new FormData();

      /* -----------------------------------------
         BASIC ASSET INFORMATION
         ----------------------------------------- */

      formData.append(
        "assetName",
        document.getElementById("assetName")?.value.trim() || "",
      );

      formData.append(
        "assetType",
        document.getElementById("assetType")?.value || "",
      );

      formData.append(
        "assetStatus",
        document.getElementById("assetStatus")?.value || "",
      );

      formData.append(
        "assetLocation",
        document.getElementById("assetLocation")?.value.trim() || "",
      );

      formData.append(
        "assetPrice",
        document.getElementById("assetPrice")?.value.trim() || "",
      );

      formData.append(
        "contactMethod",
        document.getElementById("contactMethod")?.value || "",
      );

      formData.append(
        "assetDescription",
        document.getElementById("assetDescription")?.value.trim() || "",
      );

      formData.append(
        "investmentHighlight",
        document.getElementById("investmentHighlight")?.value.trim() || "",
      );

      /* -----------------------------------------
         ASSET IMAGE
         ----------------------------------------- */

      const imageInput = document.getElementById("assetImage");

      if (imageInput && imageInput.files.length > 0) {
        formData.append("assetImage", imageInput.files[0]);
      }

      /* -----------------------------------------
         ASSET VIDEO
         ----------------------------------------- */

      const videoInput = document.getElementById("assetVideo");

      if (videoInput && videoInput.files.length > 0) {
        formData.append("assetVideo", videoInput.files[0]);
      }

      /* -----------------------------------------
         SEND TO SERVER
         ----------------------------------------- */

      const response = await fetch("/api/assets", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to submit asset.");
      }

      /* -----------------------------------------
         SUCCESS
         ----------------------------------------- */

      alert("Asset submitted successfully and is awaiting admin approval.");

      assetForm.reset();

      await loadAssets();
      await loadUserDashboard();
    } catch (error) {
      console.error("Asset submission error:", error);

      alert(
        error.message || "Something went wrong while submitting your asset.",
      );
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Submit Asset";
      }
    }
  });
}

/* =========================================
   PROFESSIONAL REGISTRATION
   ========================================= */

function registerProfessional() {
  const user = getLoggedInUser();

  if (!user) {
    alert("Please login before registering as a professional.");
    window.location.href = "login.html";
    return;
  }

  const registrationBox = document.getElementById("professionalRegistration");

  if (!registrationBox) {
    console.error("Professional registration form not found.");
    return;
  }

  registrationBox.style.display = "block";

  registrationBox.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
}

/* =========================================
   CLOSE PROFESSIONAL REGISTRATION
   ========================================= */

function closeProfessionalRegistration() {
  const registrationBox = document.getElementById("professionalRegistration");

  if (registrationBox) {
    registrationBox.style.display = "none";
  }
}
/* =========================================
   PROFESSIONAL FORM SUBMISSION
   ========================================= */

const professionalForm = document.getElementById("professionalForm");

if (professionalForm) {
  professionalForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const user = getLoggedInUser();

    if (!user) {
      alert("Please login before registering as a professional.");
      window.location.href = "login.html";
      return;
    }

    const name =
      document.getElementById("professionalName")?.value.trim() || "";

    const type = document.getElementById("professionalType")?.value || "";

    const location =
      document.getElementById("professionalLocation")?.value.trim() || "";

    const phone =
      document.getElementById("professionalPhone")?.value.trim() || "";

    const email =
      document.getElementById("professionalEmail")?.value.trim() || "";

    const description =
      document.getElementById("professionalDescription")?.value.trim() || "";

    if (!name || !type || !location || !phone || !email || !description) {
      alert("Please complete all professional registration fields.");
      return;
    }

    const submitButton = professionalForm.querySelector(
      'button[type="submit"]',
    );

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Submitting...";
    }

    try {
      const response = await fetch("/api/professionals", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          type,
          location,
          phone,
          email,
          description,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Professional registration failed.");
      }

      alert(
        "Professional registration submitted successfully. Your application is now awaiting verification.",
      );

      professionalForm.reset();

      closeProfessionalRegistration();
    } catch (error) {
      console.error("Professional registration error:", error);

      alert(
        error.message ||
          "Something went wrong while submitting your professional registration.",
      );
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Submit Professional Registration";
      }
    }
  });
}
/* =========================================
   PROFESSIONAL SEARCH / FILTER
   ========================================= */

function searchProfessionals() {
  const searchInput = document.getElementById("professionalSearch");

  const categorySelect = document.getElementById("professionalCategory");

  const listings = document.getElementById("professionalListings");

  if (!listings) return;

  const keyword = searchInput?.value.trim().toLowerCase() || "";

  const category = categorySelect?.value || "";

  const cards = listings.querySelectorAll(".professional-card");

  let visibleCount = 0;

  cards.forEach((card) => {
    const cardCategory = card.dataset.category || "";

    const text = card.textContent.toLowerCase();

    const matchesKeyword = !keyword || text.includes(keyword);

    const matchesCategory = !category || cardCategory === category;

    if (matchesKeyword && matchesCategory) {
      card.style.display = "";
      visibleCount++;
    } else {
      card.style.display = "none";
    }
  });

  let noResults = listings.querySelector(".professional-no-results");

  if (visibleCount === 0) {
    if (!noResults) {
      noResults = document.createElement("p");
      noResults.className = "professional-no-results";
      noResults.textContent = "No professional service matches your search.";

      listings.appendChild(noResults);
    }
  } else if (noResults) {
    noResults.remove();
  }
}

/* Search while typing */
const professionalSearch = document.getElementById("professionalSearch");

if (professionalSearch) {
  professionalSearch.addEventListener("input", searchProfessionals);
}

/* Filter immediately when category changes */
const professionalCategory = document.getElementById("professionalCategory");

if (professionalCategory) {
  professionalCategory.addEventListener("change", searchProfessionals);
}
/* =========================================
   LOAD REGISTERED PROFESSIONALS
   ========================================= */

let registeredProfessionals = [];

async function loadProfessionals() {
  try {
    const response = await fetch("/api/professionals");

    if (!response.ok) {
      throw new Error("Failed to load professionals.");
    }

    const data = await response.json();

    registeredProfessionals = data.professionals || [];

    displayRegisteredProfessionals();
  } catch (error) {
    console.error("Error loading professionals:", error);
  }
}

/* =========================================
   DISPLAY REGISTERED PROFESSIONALS
   ========================================= */

function displayRegisteredProfessionals() {
  const container = document.getElementById("professionalListings");

  if (!container) return;

  /*
    Keep the existing category cards.
    Registered professionals will be added after them.
  */

  // Remove previously added database professionals
  container
    .querySelectorAll(".registered-professional-card")
    .forEach((card) => card.remove());

  if (registeredProfessionals.length === 0) {
    return;
  }

  registeredProfessionals.forEach((professional) => {
    // Only display approved professionals
    if (
      professional.approved !== undefined &&
      Number(professional.approved) !== 1
    ) {
      return;
    }

    const card = document.createElement("div");

    card.className = "professional-card registered-professional-card";

    card.dataset.category = professional.type || "";

    card.innerHTML = `
  <div class="professional-card-content">

    <div class="professional-card-top">
      <span class="verified-badge">
        ✓ Verified Professional
      </span>
    </div>

    <h3 class="professional-name">
      ${escapeHTML(professional.name || "Professional")}
    </h3>

    <p class="professional-specialty">
      ${escapeHTML(professional.type || "Professional Service")}
    </p>

    <div class="professional-info">

      <div class="professional-info-item">
        <span>📍</span>
        <span>
          ${escapeHTML(professional.location || "Location not provided")}
        </span>
      </div>

      <div class="professional-info-item">
        <span>📞</span>
        <span>
          ${escapeHTML(professional.phone || "Phone not provided")}
        </span>
      </div>

      <div class="professional-info-item">
        <span>✉️</span>
        <span>
          ${escapeHTML(professional.email || "Email not provided")}
        </span>
      </div>

    </div>

    <div class="professional-description">
      <h4>About this professional</h4>

      <p>
        ${escapeHTML(
          professional.description ||
            "This professional provides reliable services to clients through the AL-QUWAH marketplace.",
        )}
      </p>
    </div>

    <div class="professional-card-actions">

        <button
            type="button"
            class="primary-btn"
            onclick="viewProfessionalProfile(${professional.id})"
        >
            View Profile
        </button>

    </div>

  </div>
`;

    container.appendChild(card);
  });

  // Re-apply current search/filter
  searchProfessionals();
}
function contactProfessional(phone) {
  if (!phone) {
    alert("This professional has not provided a contact number yet.");
    return;
  }

  const cleanPhone = phone.replace(/[^\d+]/g, "");

  window.open(`https://wa.me/${cleanPhone.replace("+", "")}`, "_blank");
}
/* =========================================
   PROFESSIONAL PROFILE
   ========================================= */

function viewProfessionalProfile(professionalId) {
  const professional = registeredProfessionals.find(
    (item) => Number(item.id) === Number(professionalId),
  );

  if (!professional) {
    alert("Professional profile could not be found.");
    return;
  }

  const modal = document.getElementById("professionalProfileModal");

  if (!modal) return;

  const setText = (id, value) => {
    const element = document.getElementById(id);

    if (element) {
      element.textContent = value || "N/A";
    }
  };

  setText("profileProfessionalName", professional.name || "Professional");

  setText(
    "profileProfessionalType",
    professional.type || "Professional Service",
  );

  setText(
    "profileProfessionalLocation",
    professional.location || "Location not provided",
  );

  setText(
    "profileProfessionalPhone",
    professional.phone || "Phone not provided",
  );

  setText(
    "profileProfessionalEmail",
    professional.email || "Email not provided",
  );

  setText(
    "profileProfessionalDescription",
    professional.description ||
      "This professional provides services through the AL-QUWAH marketplace.",
  );

  const whatsappButton = document.getElementById("profileWhatsAppButton");

  const callButton = document.getElementById("profileCallButton");

  const phone = professional.phone || "";

  if (whatsappButton) {
    whatsappButton.onclick = function () {
      contactProfessional(phone);
    };
  }

  if (callButton) {
    callButton.onclick = function () {
      if (!phone) {
        alert("This professional has not provided a phone number.");
        return;
      }

      window.location.href = `tel:${phone.replace(/[^\d+]/g, "")}`;
    };
  }

  modal.style.display = "flex";
}

/* =========================================
   CLOSE PROFESSIONAL PROFILE
   ========================================= */

function closeProfessionalProfile() {
  const modal = document.getElementById("professionalProfileModal");

  if (modal) {
    modal.style.display = "none";
  }
}

/* Close when clicking outside the profile box */

document.addEventListener("click", function (event) {
  const modal = document.getElementById("professionalProfileModal");

  if (modal && event.target === modal) {
    closeProfessionalProfile();
  }
});
// ==========================================
// USER DASHBOARD
// ==========================================

async function loadUserDashboard() {
  const dashboardLoginMessage = document.getElementById(
    "dashboardLoginMessage",
  );

  const dashboardContent = document.getElementById("dashboardContent");

  const user = getLoggedInUser();

  if (!user) {
    if (dashboardLoginMessage) {
      dashboardLoginMessage.style.display = "block";
    }

    if (dashboardContent) {
      dashboardContent.style.display = "none";
    }

    return;
  }

  if (dashboardLoginMessage) {
    dashboardLoginMessage.style.display = "none";
  }

  if (dashboardContent) {
    dashboardContent.style.display = "block";
  }

  const nameElement = document.getElementById("dashboardUserName");

  const emailElement = document.getElementById("dashboardUserEmail");

  const roleElement = document.getElementById("dashboardUserRole");

  if (nameElement) {
    nameElement.textContent = `Welcome, ${user.name || user.email || "User"}`;
  }

  if (emailElement) {
    emailElement.textContent = user.email || "";
  }

  if (roleElement) {
    roleElement.textContent = user.role || "User";
  }

  await Promise.all([loadMyAssets(), loadMyProfessional()]);
}

// ==========================================
// LOAD MY ASSETS
// ==========================================

async function loadMyAssets() {
  try {
    const response = await fetch("/api/my-assets", {
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Unable to load your listings.");
    }

    const assets = data.assets || [];

    const totalElement = document.getElementById("myAssetCount");

    const pendingElement = document.getElementById("myPendingCount");

    const approvedElement = document.getElementById("myApprovedCount");

    const listingsContainer = document.getElementById("myListings");

    if (totalElement) {
      totalElement.textContent = assets.length;
    }

    const pendingAssets = assets.filter(
      (asset) => Number(asset.approved) === 0,
    );

    const approvedAssets = assets.filter(
      (asset) => Number(asset.approved) === 1,
    );

    if (pendingElement) {
      pendingElement.textContent = pendingAssets.length;
    }

    if (approvedElement) {
      approvedElement.textContent = approvedAssets.length;
    }

    if (!listingsContainer) {
      return;
    }

    if (assets.length === 0) {
      listingsContainer.innerHTML = `
        <p class="empty-message">
          You have not listed any assets yet.
        </p>
      `;

      return;
    }

    listingsContainer.innerHTML = "";

    assets.forEach((asset) => {
      const status =
        Number(asset.approved) === 1 ? "Approved" : "Pending Approval";

      const statusClass = Number(asset.approved) === 1 ? "approved" : "pending";

      const card = document.createElement("div");

      card.className = "my-listing-card";

      card.innerHTML = `
        <h4>${escapeHtml(asset.name || "Unnamed Asset")}</h4>

        <div class="my-listing-details">
          <span>
            <strong>Type:</strong>
            ${escapeHtml(asset.type || "—")}
          </span>

          <span>
            <strong>Location:</strong>
            ${escapeHtml(asset.location || "—")}
          </span>

          <span>
            <strong>Price:</strong>
            ${escapeHtml(asset.price || "—")}
          </span>

          <span>
            <strong>Status:</strong>
            ${escapeHtml(asset.status || "—")}
          </span>

          <span class="listing-status ${statusClass}">
            ${status}
          </span>
        </div>

        <div class="dashboard-actions">
          <button
            type="button"
            onclick="editAsset(${asset.id})"
          >
            Edit
          </button>

          <button
            type="button"
            onclick="deleteAsset(${asset.id})"
          >
            Delete
          </button>
        </div>
      `;

      listingsContainer.appendChild(card);
    });
  } catch (error) {
    console.error("Load my assets error:", error);

    const listingsContainer = document.getElementById("myListings");

    if (listingsContainer) {
      listingsContainer.innerHTML = `
        <p class="empty-message">
          Unable to load your listings.
        </p>
      `;
    }
  }
}

// ==========================================
// LOAD MY PROFESSIONAL APPLICATION
// ==========================================

async function loadMyProfessional() {
  try {
    const response = await fetch("/api/my-professional", {
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.message || "Unable to load professional registration.",
      );
    }

    const professional = data.professional || null;

    const statusElement = document.getElementById("myProfessionalStatus");

    const container = document.getElementById("myProfessionalApplication");

    if (!professional) {
      if (statusElement) {
        statusElement.textContent = "None";
      }

      if (container) {
        container.innerHTML = `
          <p class="empty-message">
            No professional registration found.
          </p>
        `;
      }

      return;
    }

    const verified = Number(professional.verified) === 1;

    if (statusElement) {
      statusElement.textContent = verified ? "Verified" : "Pending";
    }

    if (container) {
      container.innerHTML = `
        <div class="my-listing-card">

          <h4>
            ${escapeHtml(professional.name || "Professional Registration")}
          </h4>

          <div class="my-listing-details">

            <span>
              <strong>Profession:</strong>
              ${escapeHtml(professional.type || "—")}
            </span>

            <span>
              <strong>Location:</strong>
              ${escapeHtml(professional.location || "—")}
            </span>

            <span>
              <strong>Phone:</strong>
              ${escapeHtml(professional.phone || "—")}
            </span>

            <span>
              <strong>Email:</strong>
              ${escapeHtml(professional.email || "—")}
            </span>

            <span class="listing-status ${verified ? "approved" : "pending"}">
              ${verified ? "Verified Professional" : "Pending Verification"}
            </span>

          </div>

        </div>
      `;
    }
  } catch (error) {
    console.error("Load my professional error:", error);
  }
}

// ==========================================
// SAFE HTML OUTPUT
// ==========================================

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
// ==========================================
// DELETE MY ASSET
// ==========================================

async function deleteAsset(assetId) {
  const confirmed = confirm(
    "Are you sure you want to delete this listing? This action cannot be undone.",
  );

  if (!confirmed) {
    return;
  }

  try {
    const response = await fetch(`/api/assets/${assetId}`, {
      method: "DELETE",
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Unable to delete listing.");
    }

    alert("Listing deleted successfully.");

    await loadUserDashboard();
  } catch (error) {
    console.error("Delete asset error:", error);

    alert(error.message || "Something went wrong while deleting the listing.");
  }
}
// ==========================================
// EDIT MY ASSET
// ==========================================

async function editAsset(assetId) {
  const name = prompt("Enter the new asset name:");

  if (name === null) {
    return;
  }

  const location = prompt("Enter the new location:");

  if (location === null) {
    return;
  }

  const price = prompt("Enter the new price:");

  if (price === null) {
    return;
  }

  const description = prompt("Enter the new description:");

  if (description === null) {
    return;
  }

  if (
    !name.trim() ||
    !location.trim() ||
    !price.trim() ||
    !description.trim()
  ) {
    alert("All fields are required.");
    return;
  }

  try {
    const response = await fetch(`/api/assets/${assetId}`, {
      method: "PUT",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: name.trim(),
        location: location.trim(),
        price: price.trim(),
        description: description.trim(),
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Unable to update listing.");
    }

    alert("Listing updated successfully.");

    await loadUserDashboard();
    await loadAssets();
  } catch (error) {
    console.error("Edit asset error:", error);

    alert(error.message || "Something went wrong while updating the listing.");
  }
}
