const detailTitle = document.getElementById("detail-title");
const detailSubtitle = document.getElementById("detail-subtitle");
const detailContent = document.getElementById("detail-content");

function getListingId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function formatPrice(price) {
  return `¥${price}/月`;
}

function hasValue(value) {
  const text = String(value || "").trim();
  return text !== "" && text !== "未注明" && text !== "0";
}

function renderSubtitle(listing) {
  const items = [listing.source, listing.location, listing.rental_type].filter(hasValue);
  return items.join(" · ");
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
    renderDetailItem("房源类型", listing.rental_type),
    renderDetailItem("房源来源", listing.source),
    renderDetailItem("可入住", listing.available_from),
    renderDetailItem("租期", listing.lease_term),
  ].join("");

  return items ? `<dl class="listing-details">${items}</dl>` : "";
}

function renderOptionalBlock(title, value, className = "") {
  if (!hasValue(value)) {
    return "";
  }

  return `
    <section class="detail-block ${className}">
      <h3>${title}</h3>
      <p>${value}</p>
    </section>
  `;
}

function renderContact(listing) {
  if (!hasValue(listing.contact_method)) {
    return "";
  }

  const contactName = hasValue(listing.contact_name) ? `${listing.contact_name} · ` : "";
  return renderOptionalBlock("联系方式", `${contactName}${listing.contact_method}`, "contact-block");
}

function renderImages(imageUrls) {
  if (!imageUrls || imageUrls.length === 0) {
    return "";
  }

  return `
    <div class="detail-images">
      ${imageUrls
        .map((url) => `<img src="${url}" alt="房源图片" />`)
        .join("")}
    </div>
  `;
}

function renderListingDetail(listing) {
  detailTitle.textContent = listing.title;
  detailSubtitle.textContent = renderSubtitle(listing);

  detailContent.innerHTML = `
    ${renderImages(listing.image_urls)}

    <section class="detail-panel">
      <div class="detail-header">
        <div>
          <h2>${listing.title}</h2>
          ${hasValue(listing.address) ? `<p>${listing.address}</p>` : ""}
        </div>
        ${Number(listing.price) > 0 ? `<strong>${formatPrice(listing.price)}</strong>` : ""}
      </div>

      ${renderDetails(listing)}

      ${renderOptionalBlock("房源描述", listing.description)}
      ${renderOptionalBlock("租客要求", listing.requirements)}
      ${renderContact(listing)}
    </section>
  `;
}

async function loadListingDetail() {
  const listingId = getListingId();

  if (!listingId) {
    detailContent.innerHTML = `<p class="empty-text">缺少房源 id。</p>`;
    return;
  }

  try {
    const response = await fetch(`/api/listings/${listingId}`);

    if (!response.ok) {
      throw new Error("房源不存在或尚未发布");
    }

    const listing = await response.json();
    renderListingDetail(listing);
  } catch (error) {
    detailTitle.textContent = "房源不可用";
    detailSubtitle.textContent = "";
    detailContent.innerHTML = `<p class="empty-text">${error.message}</p>`;
  }
}

loadListingDetail();
