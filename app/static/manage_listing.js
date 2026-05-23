const ownerListingPanel = document.getElementById("owner-listing-panel");
const params = new URLSearchParams(window.location.search);
const listingId = params.get("id");
const ownerToken = params.get("token");

function statusText(status) {
  const statusMap = {
    pending: "待审核",
    published: "已发布",
    removed: "已下架",
  };

  return statusMap[status] || status;
}

function formatPrice(price) {
  return Number(price) > 0 ? `¥${price}/月` : "价格面议";
}

function renderOwnerListing(listing) {
  ownerListingPanel.innerHTML = `
    <section class="detail-panel">
      <div class="detail-header">
        <div>
          <h2>${listing.title}</h2>
          <p>${listing.location} · ${listing.rental_type}</p>
        </div>
        <strong>${formatPrice(listing.price)}</strong>
      </div>

      <p class="listing-description">${listing.description}</p>
      <p class="listing-contact">联系：${listing.contact_name} · ${listing.contact_method}</p>
      <p class="form-message">当前状态：${statusText(listing.status)}</p>

      <div class="admin-actions">
        <button data-action="remove" class="danger-button" ${listing.status === "removed" ? "disabled" : ""}>下架房源</button>
      </div>
    </section>
  `;
}

async function loadOwnerListing() {
  if (!listingId || !ownerToken) {
    ownerListingPanel.innerHTML = `<p class="empty-text">管理链接不完整。</p>`;
    return;
  }

  try {
    const response = await fetch(`/api/listings/${listingId}/owner?token=${ownerToken}`);

    if (!response.ok) {
      throw new Error("无法加载房源，请检查管理链接。");
    }

    const listing = await response.json();
    renderOwnerListing(listing);
  } catch (error) {
    ownerListingPanel.innerHTML = `<p class="empty-text">${error.message}</p>`;
  }
}

async function updateOwnerListing(action) {
  const response = await fetch(`/api/listings/${listingId}/owner/${action}?token=${ownerToken}`, {
    method: "POST",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "操作失败");
  }

  return response.json();
}

ownerListingPanel.addEventListener("click", async (event) => {
  const button = event.target.closest("button");

  if (!button) {
    return;
  }

  const action = button.dataset.action;

  if (!action) {
    return;
  }

  button.disabled = true;
  button.textContent = "处理中...";

  try {
    await updateOwnerListing(action);
    await loadOwnerListing();
  } catch (error) {
    alert(error.message);
    await loadOwnerListing();
  }
});

loadOwnerListing();
