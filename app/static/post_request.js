const requestForm = document.getElementById("request-form");
const submitRequestButton = document.getElementById("submit-request-btn");
const requestFormMessage = document.getElementById("request-form-message");
const successModal = document.getElementById("success-modal");
const closeSuccessModalButton = document.getElementById("close-success-modal");
const manageUrlInput = document.getElementById("manage-url-input");
const copyManageUrlButton = document.getElementById("copy-manage-url");
const openManageUrlLink = document.getElementById("open-manage-url");
const copyMessage = document.getElementById("copy-message");

function getRequestData() {
  const formData = new FormData(requestForm);

  return {
    description: String(formData.get("description") || "").trim(),
    contact_method: String(formData.get("contact_method") || "").trim(),
    location: String(formData.get("location") || "").trim(),
    budget: Number(formData.get("budget")) || 0,
    requirements: String(formData.get("requirements") || "").trim(),
  };
}

async function createRentalRequest(requestData) {
  const response = await fetch("/api/rental-requests", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestData),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "提交失败");
  }

  return response.json();
}

function showSuccessModal(manageUrl) {
  manageUrlInput.value = manageUrl;
  openManageUrlLink.href = manageUrl;
  copyMessage.textContent = "建议复制到 QQ 收藏、微信收藏或备忘录。";
  successModal.hidden = false;
  copyManageUrlButton.focus();
}

function closeSuccessModal() {
  successModal.hidden = true;
}

async function copyManageUrl() {
  const manageUrl = manageUrlInput.value;

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(manageUrl);
    } else {
      manageUrlInput.select();
      document.execCommand("copy");
      manageUrlInput.blur();
    }

    copyMessage.textContent = "已复制，请保存好这个链接。";
  } catch (error) {
    copyMessage.textContent = "复制失败，可以长按或手动选中链接复制。";
  }
}

requestForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  submitRequestButton.disabled = true;
  submitRequestButton.textContent = "提交中...";
  requestFormMessage.textContent = "";

  try {
    const requestData = getRequestData();
    const createdRequest = await createRentalRequest(requestData);

    requestFormMessage.textContent = "提交成功，求租信息已发布。";
    showSuccessModal(createdRequest.manage_url);
    requestForm.reset();
  } catch (error) {
    requestFormMessage.textContent = `提交失败：${error.message}`;
  } finally {
    submitRequestButton.disabled = false;
    submitRequestButton.textContent = "提交求租";
  }
});

copyManageUrlButton.addEventListener("click", copyManageUrl);
closeSuccessModalButton.addEventListener("click", closeSuccessModal);

successModal.addEventListener("click", (event) => {
  if (event.target === successModal) {
    closeSuccessModal();
  }
});
