const adminListingList = document.getElementById("admin-listing-list");
const adminRefreshButton = document.getElementById("admin-refresh-btn");
const adminLogoutButton = document.getElementById("admin-logout-btn");

function formatPrice(price) {
  return `¥${price}/月`;
}

function statusText(status) {
  const statusMap = {
    pending: "待审核",
    published: "已发布",
    removed: "已下架",
  };

  return statusMap[status] || status;
}

function renderAdminListings(listings) {
  adminListingList.innerHTML = "";

  if (!listings || listings.length === 0) {
    adminListingList.innerHTML = `<p class="empty-text">暂无房源。</p>`;
    return;
  }

  for (const listing of listings) {
    const card = document.createElement("article");
    card.className = "listing-card";

    card.innerHTML = `
      <div class="listing-card__main">
        <div>
          <h2>${listing.title}</h2>
          <p class="listing-meta">${listing.location} · ${listing.rental_type} · #${listing.id}</p>
        </div>
        <strong class="listing-price">${formatPrice(listing.price)}</strong>
      </div>

      <p class="listing-description">${listing.description}</p>

      <dl class="listing-details">
        <div>
          <dt>状态</dt>
          <dd>${statusText(listing.status)}</dd>
        </div>
        <div>
          <dt>可入住</dt>
          <dd>${listing.available_from}</dd>
        </div>
        <div>
          <dt>租期</dt>
          <dd>${listing.lease_term}</dd>
        </div>
      </dl>

      <p class="listing-contact">联系：${listing.contact_name} · ${listing.contact_method}</p>

      <div class="admin-actions">
        <button data-action="approve" data-id="${listing.id}" ${listing.status === "published" ? "disabled" : ""}>
          通过
        </button>
        <button data-action="remove" data-id="${listing.id}" class="danger-button" ${listing.status === "removed" ? "disabled" : ""}>
          下架
        </button>
      </div>
    `;

    adminListingList.appendChild(card);
  }
}

async function loadAdminListings() {
  adminListingList.innerHTML = `<p class="empty-text">正在加载房源...</p>`;

  try {
    const response = await fetch("/api/admin/listings");

    if (!response.ok) {
      throw new Error("管理员房源加载失败");
    }

    const listings = await response.json();
    renderAdminListings(listings);
  } catch (error) {
    adminListingList.innerHTML = `<p class="empty-text">${error.message}</p>`;
  }
}

async function updateListingStatus(listingId, action) {
  const response = await fetch(`/api/admin/listings/${listingId}/${action}`, {
    method: "POST",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "操作失败");
  }

  return response.json();
}

adminListingList.addEventListener("click", async (event) => {
  const button = event.target.closest("button");

  if (!button) {
    return;
  }

  const listingId = button.dataset.id;
  const action = button.dataset.action;

  if (!listingId || !action) {
    return;
  }

  button.disabled = true;
  button.textContent = "处理中...";

  try {
    await updateListingStatus(listingId, action);
    await loadAdminListings();
  } catch (error) {
    alert(error.message);
    await loadAdminListings();
  }
});

adminRefreshButton.addEventListener("click", loadAdminListings);

adminLogoutButton.addEventListener("click", async () => {
  await fetch("/api/admin/logout", {
    method: "POST",
  });

  window.location.href = "/admin-login";
});

loadAdminListings();
