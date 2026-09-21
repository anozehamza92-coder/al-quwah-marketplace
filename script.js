// ==========================================
// AL-QUWWA HOME MARKETPLACE
// MAIN JAVASCRIPT
// ==========================================

// ==========================================
// ASSET LISTING FORM
// ==========================================

const assetForm = document.getElementById("assetForm");

console.log("assetForm:", assetForm);

if (assetForm) {
  assetForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    // ==========================================
    // CHECK LOGIN
    // ==========================================

    const currentUser = JSON.parse(localStorage.getItem("loggedInUser"));

    if (!currentUser) {
      alert("Please login before submitting an asset.");
      window.location.href = "login.html";
      return;
    }

    // ==========================================
    // GET FORM VALUES
    // ==========================================

    const assetName = document.getElementById("assetName").value.trim();

    const assetType = document.getElementById("assetType").value;

    const assetStatus = document.getElementById("assetStatus").value;

    const assetLocation = document.getElementById("assetLocation").value.trim();

    const assetPrice = document.getElementById("assetPrice").value.trim();

    const contactMethod = document.getElementById("contactMethod").value;

    const assetDescription = document
      .getElementById("assetDescription")
      .value.trim();

    const investmentHighlight = document
      .getElementById("investmentHighlight")
      .value.trim();

    // ==========================================
    // GET IMAGE AND VIDEO
    // ==========================================

    const imageInput = document.getElementById("assetImage");

    const videoInput = document.getElementById("assetVideo");

    const imageFile = imageInput ? imageInput.files[0] : null;

    const videoFile = videoInput ? videoInput.files[0] : null;

    // ==========================================
    // READ FILE
    // ==========================================

    function readFile(file) {
      return new Promise(function (resolve, reject) {
        if (!file) {
          resolve("");
          return;
        }

        const reader = new FileReader();

        reader.onload = function () {
          resolve(reader.result);
        };

        reader.onerror = function () {
          reject(reader.error);
        };

        reader.readAsDataURL(file);
      });
    }

    try {
      // ==========================================
      // READ IMAGE AND VIDEO
      // ==========================================

      const results = await Promise.all([
        readFile(imageFile),
        readFile(videoFile),
      ]);

      const imageData = results[0];
      const videoData = results[1];

      // ==========================================
      // SAVE ASSET TO DATABASE
      // ==========================================

      const response = await fetch("/api/assets", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          userId: currentUser.id,

          name: assetName,

          type: assetType,

          status: assetStatus,

          location: assetLocation,

          price: assetPrice,

          contact: contactMethod,

          description: assetDescription,

          investmentHighlight: investmentHighlight,

          image: imageData,

          video: videoData,
        }),
      });

      const result = await response.json();

      // ==========================================
      // CHECK SERVER RESPONSE
      // ==========================================

      if (!response.ok) {
        alert(result.message || "Unable to save asset.");

        return;
      }

      // ==========================================
      // SUCCESS
      // ==========================================

      alert("Asset submitted successfully!");

      assetForm.reset();

      await displayAssets();

      await displayInvestmentListings();
    } catch (error) {
      console.error("Asset save error:", error);

      alert(
        "Unable to connect to the server. Please make sure the marketplace server is running.",
      );
    }
  });
}

// ==========================================
// DISPLAY SAVED ASSETS
// ==========================================

async function displayAssets() {
  const assetListings = document.getElementById("assetListings");

  if (!assetListings) {
    console.error("assetListings element was not found.");
    return;
  }

  console.log("Loading approved assets...");

  try {
    const response = await fetch("/api/assets", {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Server returned status " + response.status);
    }

    const data = await response.json();

    console.log("Assets received from server:", data);

    if (!data.success) {
      throw new Error(data.message || "Unable to load assets.");
    }

    const savedAssets = Array.isArray(data.assets) ? data.assets : [];

    // Clear current listings
    assetListings.innerHTML = "";

    // ==========================================
    // NO ASSETS
    // ==========================================

    if (savedAssets.length === 0) {
      assetListings.innerHTML = `
        <p class="no-assets">
          No approved assets have been listed yet.
        </p>
      `;

      return;
    }

    // ==========================================
    // DISPLAY APPROVED ASSETS
    // ==========================================

    savedAssets.forEach(function (asset) {
      console.log("Displaying asset:", asset);

      const card = document.createElement("div");

      card.className = "asset-card";

      // Force the card to be visible
      card.style.display = "block";

      // ==========================================
      // IMAGE
      // ==========================================

      let imageHTML = "";

      if (asset.image && asset.image.trim() !== "") {
        imageHTML = `
          <img
            src="${asset.image}"
            alt="${asset.name || "Asset"}"
            class="asset-card-image"
          >
        `;
      } else {
        imageHTML = `
          <div class="asset-no-image">
            No Image Available
          </div>
        `;
      }

      // ==========================================
      // VIDEO
      // ==========================================

      let videoHTML = "";

      if (asset.video && asset.video.trim() !== "") {
        videoHTML = `
          <video
            src="${asset.video}"
            class="asset-card-video"
            controls>
          </video>
        `;
      }

      // ==========================================
      // INVESTMENT HIGHLIGHT
      // ==========================================

      const investmentHighlight =
        asset.investment_highlight || asset.investmentHighlight || "";

      // ==========================================
      // ASSET CARD
      // ==========================================

      card.innerHTML = `
        ${imageHTML}

        <div class="asset-card-content">

          <h3>
            ${asset.name || "Unnamed Asset"}
          </h3>

          <p>
            <strong>Type:</strong>
            ${asset.type || "Not specified"}
          </p>

          <p>
            <strong>Location:</strong>
            ${asset.location || "Not specified"}
          </p>

          <p>
            <strong>Price:</strong>
            ₦${asset.price || "0"}
          </p>

          <p>
            <strong>Status:</strong>
            ${asset.status || "Not specified"}
          </p>

          <p>
            ${asset.description || "No description provided."}
          </p>

          ${
            investmentHighlight
              ? `
                <p>
                  <strong>Investment Highlight:</strong>
                  ${investmentHighlight}
                </p>
              `
              : ""
          }

          ${videoHTML}

          <div class="asset-actions">

            <button
              type="button"
              onclick="viewAsset(${asset.id})">
              View Details
            </button>

            <button
              type="button"
              onclick="editAsset(${asset.id})">
              Edit Asset
            </button>

            <button
              type="button"
              onclick="deleteAsset(${asset.id})">
              Delete Asset
            </button>

          </div>

        </div>
      `;

      assetListings.appendChild(card);
    });

    console.log(
      "Successfully displayed",
      savedAssets.length,
      "approved asset(s).",
    );
  } catch (error) {
    console.error("Error loading assets:", error);

    assetListings.innerHTML = `
      <p class="no-assets">
        Unable to load assets at the moment.
      </p>
    `;
  }
}
// ==========================================
// SEARCH ASSETS
// ==========================================

function searchAssets() {
  const keyword =
    document.getElementById("searchKeyword")?.value.toLowerCase().trim() || "";

  const location =
    document.getElementById("searchLocation")?.value.toLowerCase().trim() || "";

  const type = document.getElementById("searchAssetType")?.value || "";

  const cards = document.querySelectorAll(".asset-card");

  cards.forEach(function (card) {
    const cardText = card.textContent.toLowerCase();

    const matchesKeyword = !keyword || cardText.includes(keyword);

    const matchesLocation = !location || cardText.includes(location);

    const matchesType = !type || cardText.includes(type.toLowerCase());

    if (matchesKeyword && matchesLocation && matchesType) {
      card.style.display = "";
    } else {
      card.style.display = "none";
    }
  });
}

async function searchProfessionals() {
  const searchInput = document.getElementById("professionalSearch");
  const categorySelect = document.getElementById("professionalCategory");
  const listings = document.getElementById("professionalListings");

  if (!listings) return;

  const keyword = searchInput ? searchInput.value.toLowerCase().trim() : "";

  const category = categorySelect
    ? categorySelect.value.toLowerCase().trim()
    : "";

  try {
    const response = await fetch("/api/professionals");
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || "Unable to load professionals.");
    }

    const professionals = data.professionals || [];

    const filtered = professionals.filter((professional) => {
      const text = `
        ${professional.name || ""}
        ${professional.type || ""}
        ${professional.location || ""}
        ${professional.description || ""}
      `.toLowerCase();

      const matchesKeyword = !keyword || text.includes(keyword);

      const matchesCategory =
        !category || (professional.type || "").toLowerCase() === category;

      return matchesKeyword && matchesCategory;
    });

    // Remove previously registered professional cards
    const registeredCards = listings.querySelectorAll(
      ".registered-professional-card",
    );

    registeredCards.forEach((card) => card.remove());

    // Display registered professionals
    filtered.forEach((professional) => {
      const card = document.createElement("div");

      card.className = "professional-card registered-professional-card";

      card.innerHTML = `
        <div class="professional-icon">
          <i class="fas fa-user-tie"></i>
        </div>

        <h3>${professional.name || "Professional"}</h3>

        <span class="verified-badge">
          Registered Professional
        </span>

        <p>
          <strong>Service:</strong>
          ${professional.type || "Professional Service"}
        </p>

        <p>
          <strong>Location:</strong>
          ${professional.location || "Not provided"}
        </p>

        <p>
          ${professional.description || ""}
        </p>

        ${
          professional.phone
            ? `<p><strong>Phone:</strong> ${professional.phone}</p>`
            : ""
        }

        ${
          professional.email
            ? `<p><strong>Email:</strong> ${professional.email}</p>`
            : ""
        }
      `;

      listings.appendChild(card);
    });

    if (filtered.length === 0) {
      const message = document.createElement("p");

      message.className = "registered-professional-card";

      message.innerHTML =
        "No registered professionals found matching your search.";

      listings.appendChild(message);
    }
  } catch (error) {
    console.error("Professional search error:", error);
  }
}
// ==========================================
// REGISTER AS A PROFESSIONAL
// OPEN REGISTRATION FORM
// ==========================================

function registerProfessional() {
  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));

  // CHECK LOGIN
  if (!loggedInUser) {
    alert(
      "Please create an account or login before registering as a professional.",
    );

    window.location.href = "login.html";
    return;
  }

  const registrationForm = document.getElementById("professionalRegistration");

  if (!registrationForm) {
    alert("Professional registration form was not found.");

    console.error(
      "professionalRegistration element was not found in index.html",
    );

    return;
  }

  registrationForm.style.display = "flex";

  registrationForm.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
}
// ==========================================
// PROFESSIONAL REGISTRATION
// SAVE PROFESSIONAL TO DATABASE
// ==========================================

const professionalForm = document.getElementById("professionalForm");

if (professionalForm) {
  professionalForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    // ==========================================
    // CHECK LOGIN
    // ==========================================

    const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));

    if (!loggedInUser) {
      alert("Please login before registering as a professional.");

      window.location.href = "login.html";

      return;
    }

    // ==========================================
    // GET FORM INFORMATION
    // ==========================================

    const professional = {
      userId: loggedInUser.id,

      name: document.getElementById("professionalName").value.trim(),

      type: document.getElementById("professionalType").value,

      location: document.getElementById("professionalLocation").value.trim(),

      phone: document.getElementById("professionalPhone").value.trim(),

      email: document.getElementById("professionalEmail").value.trim(),

      description: document
        .getElementById("professionalDescription")
        .value.trim(),
    };

    // ==========================================
    // SEND TO DATABASE
    // ==========================================

    try {
      const response = await fetch("/api/professionals", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(professional),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.message || "Unable to register professional.");

        return;
      }

      professionalForm.reset();

      closeProfessionalRegistration();

      await displayRegisteredProfessionals();

      alert("Professional registration submitted successfully!");
    } catch (error) {
      console.error("Professional registration error:", error);

      alert(
        "Unable to connect to the server. Please make sure the marketplace server is running.",
      );
    }
  });
}

// ==========================================
// CLOSE PROFESSIONAL REGISTRATION
// ==========================================

function closeProfessionalRegistration() {
  const registrationForm = document.getElementById("professionalRegistration");

  if (registrationForm) {
    registrationForm.style.display = "none";
  }
}
// ==========================================
// DISPLAY REGISTERED PROFESSIONALS
// ==========================================

async function displayRegisteredProfessionals() {
  const professionalListings = document.getElementById("professionalListings");

  if (!professionalListings) return;

  try {
    const response = await fetch("/api/professionals");
    const data = await response.json();

    if (!data.success) {
      console.error("Unable to load professionals.");
      return;
    }

    // Remove previously loaded registered professionals
    document
      .querySelectorAll(".registered-professional-card")
      .forEach((card) => card.remove());

    data.professionals.forEach((professional) => {
      const card = document.createElement("div");

      card.className = "professional-card registered-professional-card";

      card.setAttribute("data-category", professional.type || "");

      const phone = professional.phone || "";
      const email = professional.email || "";

      const whatsappNumber = phone.replace(/\D/g, "");

      card.innerHTML = `
        <div class="professional-icon">👤</div>

        <div class="professional-content">

          <span class="verified-badge">
            ✓ Registered Professional
          </span>

          <h3>${professional.name || ""}</h3>

          <p>
            <strong>Service:</strong>
            ${professional.type || ""}
          </p>

          <p>
            <strong>Location:</strong>
            ${professional.location || ""}
          </p>

          <p>
            ${professional.description || ""}
          </p>

          <p>
            <strong>Phone:</strong>
            ${phone}
          </p>

          <p>
            <strong>Email:</strong>
            ${email}
          </p>

          <div class="professional-contact-buttons">

            ${
              phone
                ? `
                  <a
                    href="tel:${phone}"
                    class="professional-contact-btn"
                  >
                    📞 Call
                  </a>
                `
                : ""
            }

            ${
              whatsappNumber
                ? `
                  <a
                    href="https://wa.me/${whatsappNumber}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="professional-contact-btn"
                  >
                    💬 WhatsApp
                  </a>
                `
                : ""
            }

            ${
              email
                ? `
                  <a
                    href="mailto:${email}"
                    class="professional-contact-btn"
                  >
                    ✉️ Email
                  </a>
                `
                : ""
            }

          </div>

        </div>
      `;

      professionalListings.appendChild(card);
    });
  } catch (error) {
    console.error("Error loading registered professionals:", error);
  }
}

// ==========================================
// LOGIN DISPLAY
// ==========================================

function updateLoginDisplay() {
  const currentUser = JSON.parse(localStorage.getItem("loggedInUser"));

  const userWelcome = document.getElementById("userWelcome");

  const loginLink = document.getElementById("loginLink");

  const signupLink = document.getElementById("signupLink");

  const logoutBtn = document.getElementById("logoutBtn");

  // ==========================================
  // USER IS LOGGED IN
  // ==========================================

  if (currentUser) {
    if (userWelcome) {
      userWelcome.innerHTML =
        "Welcome, <strong>" + (currentUser.name || "User") + "</strong>";

      userWelcome.style.display = "inline-block";
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
    // ==========================================
    // USER IS NOT LOGGED IN
    // ==========================================

    if (userWelcome) {
      userWelcome.style.display = "none";
    }

    if (loginLink) {
      loginLink.style.display = "";
    }

    if (signupLink) {
      signupLink.style.display = "";
    }

    if (logoutBtn) {
      logoutBtn.style.display = "none";
    }
  }
}

// ==========================================
// LOGOUT
// ==========================================

function setupLogout() {
  const logoutButton = document.getElementById("logoutBtn");

  if (!logoutButton) {
    return;
  }

  logoutButton.addEventListener("click", function () {
    localStorage.removeItem("loggedInUser");

    window.location.href = "login.html";
  });
}

// ==========================================
// VIEW ASSET DETAILS
// ==========================================

async function viewAsset(assetId) {
  try {
    const response = await fetch("/api/assets");

    const data = await response.json();

    if (!data.success) {
      alert(data.message || "Unable to load asset.");

      return;
    }

    const asset = data.assets.find(function (item) {
      return Number(item.id) === Number(assetId);
    });

    if (!asset) {
      alert("Asset not found.");

      return;
    }

    const modalAssetName = document.getElementById("modalAssetName");

    const modalAssetType = document.getElementById("modalAssetType");

    const modalAssetLocation = document.getElementById("modalAssetLocation");

    const modalAssetPrice = document.getElementById("modalAssetPrice");

    const modalAssetStatus = document.getElementById("modalAssetStatus");

    const modalAssetContact = document.getElementById("modalAssetContact");

    const modalAssetDescription = document.getElementById(
      "modalAssetDescription",
    );

    const modalInvestmentHighlight = document.getElementById(
      "modalInvestmentHighlight",
    );

    if (modalAssetName) {
      modalAssetName.textContent = asset.name || "";
    }

    if (modalAssetType) {
      modalAssetType.textContent = asset.type || "";
    }

    if (modalAssetLocation) {
      modalAssetLocation.textContent = asset.location || "";
    }

    if (modalAssetPrice) {
      modalAssetPrice.textContent = asset.price || "";
    }

    if (modalAssetStatus) {
      modalAssetStatus.textContent = asset.status || "";
    }

    if (modalAssetContact) {
      modalAssetContact.textContent = asset.contact || "";
    }

    if (modalAssetDescription) {
      modalAssetDescription.textContent =
        asset.description || "No description provided.";
    }

    if (modalInvestmentHighlight) {
      modalInvestmentHighlight.textContent =
        asset.investment_highlight ||
        asset.investmentHighlight ||
        "No investment highlight provided.";
    }

    const contactButton = document.querySelector(".contact-seller-btn");

    if (contactButton) {
      contactButton.onclick = function () {
        alert("Seller contact method: " + (asset.contact || "Not provided"));
      };
    }

    const assetModal = document.getElementById("assetModal");

    if (assetModal) {
      assetModal.style.display = "flex";
    }
  } catch (error) {
    console.error("View asset error:", error);

    alert("Unable to load asset details.");
  }
}

// ==========================================
// CLOSE ASSET MODAL
// ==========================================

function closeAssetModal() {
  const assetModal = document.getElementById("assetModal");

  if (assetModal) {
    assetModal.style.display = "none";
  }
}

// ==========================================
// EDIT ASSET
// ==========================================

async function editAsset(assetId) {
  try {
    const response = await fetch("/api/assets");

    const data = await response.json();

    if (!data.success) {
      alert(data.message || "Unable to load asset.");

      return;
    }

    const asset = data.assets.find(function (item) {
      return Number(item.id) === Number(assetId);
    });

    if (!asset) {
      alert("Asset not found.");

      return;
    }

    const newName = prompt("Asset Name:", asset.name || "");

    if (newName === null) {
      return;
    }

    const newLocation = prompt("Location:", asset.location || "");

    if (newLocation === null) {
      return;
    }

    const newPrice = prompt("Price (₦):", asset.price || "");

    if (newPrice === null) {
      return;
    }

    const newDescription = prompt("Description:", asset.description || "");

    if (newDescription === null) {
      return;
    }

    // ==========================================
    // UPDATE DATABASE
    // ==========================================

    const updateResponse = await fetch("/api/assets/" + assetId, {
      method: "PUT",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        name: newName,

        location: newLocation,

        price: newPrice,

        description: newDescription,
      }),
    });

    const result = await updateResponse.json();

    if (!updateResponse.ok) {
      alert(result.message || "Unable to update asset.");

      return;
    }

    alert("Asset updated successfully!");

    await displayAssets();

    await displayInvestmentListings();
  } catch (error) {
    console.error("Edit asset error:", error);

    alert("Unable to connect to the server.");
  }
}

// ==========================================
// DELETE ASSET
// ==========================================

async function deleteAsset(assetId) {
  try {
    const response = await fetch("/api/assets");

    const data = await response.json();

    if (!data.success) {
      alert(data.message || "Unable to load asset.");

      return;
    }

    const asset = data.assets.find(function (item) {
      return Number(item.id) === Number(assetId);
    });

    if (!asset) {
      alert("Asset not found.");

      return;
    }

    const confirmDelete = confirm(
      "Are you sure you want to delete " + asset.name + "?",
    );

    if (!confirmDelete) {
      return;
    }

    const deleteResponse = await fetch("/api/assets/" + assetId, {
      method: "DELETE",
    });

    const result = await deleteResponse.json();

    if (!deleteResponse.ok) {
      alert(result.message || "Unable to delete asset.");

      return;
    }

    alert("Asset deleted successfully!");

    await displayAssets();

    await displayInvestmentListings();
  } catch (error) {
    console.error("Delete asset error:", error);

    alert("Unable to connect to the server.");
  }
}

// ==========================================
// DISPLAY INVESTMENT LISTINGS
// ==========================================

async function displayInvestmentListings() {
  const investmentListings = document.getElementById("investmentListings");

  if (!investmentListings) {
    return;
  }

  try {
    const response = await fetch("/api/assets");

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || "Unable to load investments.");
    }

    const savedAssets = data.assets || [];

    const investmentAssets = savedAssets.filter(function (asset) {
      return asset.type && asset.type.toLowerCase() === "investment";
    });

    investmentListings.innerHTML = "";

    if (investmentAssets.length === 0) {
      investmentListings.innerHTML = `
        <p class="no-investments">
          No investment opportunities available yet.
        </p>
      `;

      return;
    }

    investmentAssets.forEach(function (asset) {
      investmentListings.innerHTML += `

          <div class="asset-card">

            ${
              asset.image
                ? `
                  <img
                    src="${asset.image}"
                    alt="${asset.name || "Investment"}"
                    class="asset-card-image"
                  >
                `
                : ""
            }

            <div class="asset-card-content">

              <h3>
                ${asset.name || "Investment Opportunity"}
              </h3>

              <p>
                <strong>Location:</strong>
                ${asset.location || "Not specified"}
              </p>

              <p>
                <strong>Investment:</strong>
                ₦${asset.price || "0"}
              </p>

              <p>
                <strong>Status:</strong>
                ${asset.status || "Not specified"}
              </p>

              <p>
                ${asset.description || "No description provided."}
              </p>

              <button
                type="button"
                onclick="viewAsset(${asset.id})">
                View Details
              </button>

            </div>

          </div>

        `;
    });
  } catch (error) {
    console.error("Investment listings error:", error);

    investmentListings.innerHTML = `
      <p class="no-investments">
        Unable to load investment opportunities.
      </p>
    `;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  updateLoginDisplay();
  setupLogout();

  await displayAssets();
  await displayInvestmentListings();
  await displayRegisteredProfessionals();
});
