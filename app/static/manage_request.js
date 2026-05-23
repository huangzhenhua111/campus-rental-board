const ownerRequestPanel = document.getElementById("owner-request-panel");
const params = new URLSearchParams(window.location.search);
const requestId = params.get("id");
const ownerToken = params.get("token");

function statusText(status) {
  const statusMap = {
    published: "已发布",
    removed: "已下架",
  };

  return statusMap[status] || status;
}

function formatBudget(budget) {
  return `预算 ¥${budget}/月`;
}

function renderOwnerRequest(rentalRequest) {
  ownerRequestPanel.innerHTML = `
    <section class="detail-panel">
      <div class="detail-header">
        <div>
          <h2>求租信息</h2>
          <p>${rentalRequest.location || "地点可沟通"}</p>
        </div>
        ${Number(rentalRequest.budget) > 0 ? `<strong>${formatBudget(rentalRequest.budget)}</strong>` : ""}
      </div>

      <p class="listing-description listing-description--featured">${rentalRequest.description}</p>
      ${rentalRequest.requirements ? `<section class="detail-block"><h3>特殊要求</h3><p>${rentalRequest.requirements}</p></section>` : ""}
      <section class="detail-block contact-block"><h3>联系方式</h3><p>${rentalRequest.contact_method}</p></section>
      <p class="form-message">当前状态：${statusText(rentalRequest.status)}</p>

      <div class="admin-actions">
        <button data-action="remove" class="danger-button" ${rentalRequest.status === "removed" ? "disabled" : ""}>下架求租</button>
      </div>
    </section>
  `;
}

async function loadOwnerRequest() {
  if (!requestId || !ownerToken) {
    ownerRequestPanel.innerHTML = `<p class="empty-text">管理链接不完整。</p>`;
    return;
  }

  try {
    const response = await fetch(`/api/rental-requests/${requestId}/owner?token=${ownerToken}`);

    if (!response.ok) {
      throw new Error("无法加载求租信息，请检查管理链接。");
    }

    const rentalRequest = await response.json();
    renderOwnerRequest(rentalRequest);
  } catch (error) {
    ownerRequestPanel.innerHTML = `<p class="empty-text">${error.message}</p>`;
  }
}

async function updateOwnerRequest(action) {
  const response = await fetch(`/api/rental-requests/${requestId}/owner/${action}?token=${ownerToken}`, {
    method: "POST",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "操作失败");
  }

  return response.json();
}

ownerRequestPanel.addEventListener("click", async (event) => {
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
    await updateOwnerRequest(action);
    await loadOwnerRequest();
  } catch (error) {
    alert(error.message);
    await loadOwnerRequest();
  }
});

loadOwnerRequest();
