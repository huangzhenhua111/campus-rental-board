const listingList = document.getElementById("listing-list");
const requestList = document.getElementById("request-list");
const filterForm = document.getElementById("filter-form");
const clearFilterButton = document.getElementById("clear-filter-btn");
const filterToolbar = document.getElementById("filter-toolbar");
const listingBoard = document.getElementById("listing-board");
const requestBoard = document.getElementById("request-board");
const entryCards = document.querySelectorAll("[data-view]");

let activeView = "";

function formatPrice(price) {
  return `¥${price}/月`;
}

function formatBudget(budget) {
  return `预算 ¥${budget}/月`;
}

function hasValue(value) {
  const text = String(value || "").trim();
  return text !== "" && text !== "未注明" && text !== "0";
}

function cleanTitle(listing) {
  const title = String(listing.title || "").trim();

  if (
    title &&
    title !== "未注明位置房源" &&
    title !== String(listing.description || "").trim().replace(/\s+/g, " ").slice(0, 24)
  ) {
    return title;
  }

  return "";
}

function renderMeta(listing) {
  const items = [listing.location, listing.rental_type].filter(hasValue);
  return items.length > 0 ? `<p class="listing-meta">${items.join(" · ")}</p>` : "";
}

function renderDetailItem(label, value) {
  if (!hasValue(value)) {
    return "";
  }

  return `
    <div>
      <dt>${label}</dt>
      <dd>${value}</dd>
    </div>
  `;
}

function renderDetails(listing) {
  const items = [
    renderDetailItem("可入住", listing.available_from),
    renderDetailItem("租期", listing.lease_term),
  ].join("");

  return items ? `<dl class="listing-details">${items}</dl>` : "";
}

function renderContact(listing) {
  if (!hasValue(listing.contact_method)) {
    return "";
  }

  const contactName = hasValue(listing.contact_name) ? `${listing.contact_name} · ` : "";
  return `<p class="listing-contact">${contactName}${listing.contact_method}</p>`;
}

function renderPrice(price, className = "listing-price") {
  if (Number(price) <= 0) {
    return "";
  }

  return `<strong class="${className}">${formatPrice(price)}</strong>`;
}

function renderBudget(budget) {
  if (Number(budget) <= 0) {
    return "";
  }

  return `<strong class="listing-price request-price">${formatBudget(budget)}</strong>`;
}

function renderImage(listing) {
  const imageUrl = listing.image_urls && listing.image_urls[0];

  if (!imageUrl) {
    return "";
  }

  return `
    <a class="listing-card__media" href="/listing?id=${listing.id}">
      <img class="listing-image" src="${imageUrl}" alt="${listing.title}" />
    </a>
  `;
}

function renderListings(listings) {
  listingList.innerHTML = "";

  if (!listings || listings.length === 0) {
    listingList.innerHTML = `<p class="empty-text">暂时还没有房源。</p>`;
    return;
  }

  for (const listing of listings) {
    const hasImage = listing.image_urls && listing.image_urls[0];
    const title = cleanTitle(listing);
    const card = document.createElement("article");
    card.className = hasImage
      ? "listing-card listing-card--with-image"
      : "listing-card listing-card--message";

    card.innerHTML = `
      ${renderImage(listing)}

      <div class="listing-card__body">
        <div class="listing-card__main">
          <div>
            <span class="listing-badge">房源</span>
            ${title ? `<h2>${title}</h2>` : ""}
            ${renderMeta(listing)}
          </div>
          ${renderPrice(listing.price)}
        </div>

        <p class="listing-description listing-description--featured">${listing.description}</p>

        ${renderDetails(listing)}
        <div class="listing-card__footer">
          ${renderContact(listing)}
          <a class="detail-link" href="/listing?id=${listing.id}">查看详情</a>
        </div>
      </div>
    `;

    listingList.appendChild(card);
  }
}

function renderRequestMeta(rentalRequest) {
  const items = [rentalRequest.location, rentalRequest.requirements].filter(hasValue);
  return items.length > 0 ? `<p class="listing-meta">${items.join(" · ")}</p>` : "";
}

function renderRentalRequests(rentalRequests) {
  requestList.innerHTML = "";

  if (!rentalRequests || rentalRequests.length === 0) {
    requestList.innerHTML = `<p class="empty-text">暂时还没有求租信息。</p>`;
    return;
  }

  for (const rentalRequest of rentalRequests) {
    const card = document.createElement("article");
    card.className = "listing-card request-card";

    card.innerHTML = `
      <div class="listing-card__body">
        <div class="listing-card__main">
          <div>
            <span class="request-badge">求租</span>
            ${renderRequestMeta(rentalRequest)}
          </div>
          ${renderBudget(rentalRequest.budget)}
        </div>

        <p class="listing-description listing-description--featured">${rentalRequest.description}</p>

        <div class="listing-card__footer">
          <p class="listing-contact">${rentalRequest.contact_method}</p>
        </div>
      </div>
    `;

    requestList.appendChild(card);
  }
}

function getFilterQuery() {
  const formData = new FormData(filterForm);
  const params = new URLSearchParams();

  for (const [key, value] of formData.entries()) {
    const trimmedValue = String(value).trim();

    if (trimmedValue) {
      params.set(key, trimmedValue);
    }
  }

  const queryString = params.toString();

  return queryString ? `?${queryString}` : "";
}

async function loadListings() {
  listingList.innerHTML = `<p class="empty-text">正在加载房源...</p>`;

  try {
    const queryString = getFilterQuery();
    const response = await fetch(`/api/listings${queryString}`);

    if (!response.ok) {
      throw new Error("房源加载失败");
    }

    const listings = await response.json();
    renderListings(listings);
  } catch (error) {
    listingList.innerHTML = `<p class="empty-text">${error.message}</p>`;
  }
}

async function loadRentalRequests() {
  requestList.innerHTML = `<p class="empty-text">正在加载求租信息...</p>`;

  try {
    const queryString = getFilterQuery();
    const response = await fetch(`/api/rental-requests${queryString}`);

    if (!response.ok) {
      throw new Error("求租信息加载失败");
    }

    const rentalRequests = await response.json();
    renderRentalRequests(rentalRequests);
  } catch (error) {
    requestList.innerHTML = `<p class="empty-text">${error.message}</p>`;
  }
}

function loadBoard() {
  if (activeView === "listings") {
    loadListings();
  }

  if (activeView === "requests") {
    loadRentalRequests();
  }
}

function showView(view) {
  activeView = view;
  filterToolbar.hidden = false;
  listingBoard.hidden = view !== "listings";
  requestBoard.hidden = view !== "requests";

  for (const entryCard of entryCards) {
    entryCard.classList.toggle("entry-card--active", entryCard.dataset.view === view);
  }

  loadBoard();

  const targetBoard = view === "listings" ? listingBoard : requestBoard;
  targetBoard.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

filterForm.addEventListener("submit", (event) => {
  event.preventDefault();
  loadBoard();
});

clearFilterButton.addEventListener("click", () => {
  filterForm.reset();
  loadBoard();
});

for (const entryCard of entryCards) {
  entryCard.addEventListener("click", () => {
    showView(entryCard.dataset.view);
  });
}
