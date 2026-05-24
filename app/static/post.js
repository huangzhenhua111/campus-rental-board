const listingForm = document.getElementById("listing-form");
const submitButton = document.getElementById("submit-btn");
const formMessage = document.getElementById("form-message");
const imageFilesInput = document.getElementById("image-files");
const imagePreviewList = document.getElementById("image-preview-list");
const successModal = document.getElementById("success-modal");
const closeSuccessModalButton = document.getElementById("close-success-modal");
const manageUrlInput = document.getElementById("manage-url-input");
const copyManageUrlButton = document.getElementById("copy-manage-url");
const openManageUrlLink = document.getElementById("open-manage-url");
const copyMessage = document.getElementById("copy-message");

function renderImagePreviews() {
  imagePreviewList.innerHTML = "";

  const files = Array.from(imageFilesInput.files || []);

  for (const file of files) {
    const preview = document.createElement("div");
    preview.className = "image-preview";

    const image = document.createElement("img");
    image.src = URL.createObjectURL(file);
    image.alt = file.name;

    const name = document.createElement("span");
    name.textContent = file.name;

    preview.appendChild(image);
    preview.appendChild(name);
    imagePreviewList.appendChild(preview);
  }
}

async function uploadImages() {
  const files = Array.from(imageFilesInput.files || []);

  if (files.length === 0) {
    return [];
  }

  const formData = new FormData();

  for (const file of files) {
    formData.append("files", file);
  }

  const response = await fetch("/api/uploads/images", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "图片上传失败");
  }

  const data = await response.json();
  return data.urls || [];
}

function getFormData(imageUrls) {
  const formData = new FormData(listingForm);
  const description = String(formData.get("description") || "").trim();
  const location = String(formData.get("location") || "").trim();
  const price = Number(formData.get("price")) || 0;
  const rentalType = String(formData.get("rental_type") || "").trim();
  const title = String(formData.get("title") || "").trim();

  return {
    title,
    source: String(formData.get("source") || "").trim(),
    location: location || "未注明",
    address: String(formData.get("address") || "").trim() || "未注明",
    price,
    rental_type: rentalType || "未注明",
    available_from: formData.get("available_from") || "未注明",
    lease_term: String(formData.get("lease_term") || "").trim() || "未注明",
    description,
    requirements: String(formData.get("requirements") || "").trim() || "未注明",
    contact_name: String(formData.get("contact_name") || "").trim() || "未注明",
    contact_method: String(formData.get("contact_method") || "").trim(),
    image_urls: imageUrls,
  };
}

async function createListing(listingData) {
  const response = await fetch("/api/listings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(listingData),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "提交失败");
  }

  return response.json();
}

function showSuccessModal(manageUrl) {
  if (!successModal || !manageUrlInput || !copyManageUrlButton || !openManageUrlLink) {
    formMessage.innerHTML = `
      提交成功，房源已发布。请保存管理链接：<br />
      <a href="${manageUrl}">${manageUrl}</a>
    `;
    return;
  }

  manageUrlInput.value = manageUrl;
  openManageUrlLink.href = manageUrl;
  copyMessage.textContent = "建议复制到 QQ 收藏、微信收藏或备忘录。";
  successModal.hidden = false;
  copyManageUrlButton.focus();
}

function closeSuccessModal() {
  if (!successModal) {
    return;
  }

  successModal.hidden = true;
}

async function copyManageUrl() {
  if (!manageUrlInput) {
    return;
  }

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

listingForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  submitButton.disabled = true;
  submitButton.textContent = "提交中...";
  formMessage.textContent = "";

  try {
    formMessage.textContent = "正在上传图片...";
    const imageUrls = await uploadImages();

    formMessage.textContent = "正在提交房源...";
    const listingData = getFormData(imageUrls);
    const createdListing = await createListing(listingData);

    formMessage.innerHTML = `
      提交成功，房源已发布。请保存管理链接，之后下架房源会用到。
    `;
    showSuccessModal(createdListing.manage_url);
    listingForm.reset();
    imagePreviewList.innerHTML = "";
  } catch (error) {
    formMessage.textContent = `提交失败：${error.message}`;
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "提交房源";
  }
});

imageFilesInput.addEventListener("change", renderImagePreviews);

if (copyManageUrlButton) {
  copyManageUrlButton.addEventListener("click", copyManageUrl);
}

if (closeSuccessModalButton) {
  closeSuccessModalButton.addEventListener("click", closeSuccessModal);
}

if (successModal) {
  successModal.addEventListener("click", (event) => {
    if (event.target === successModal) {
      closeSuccessModal();
    }
  });
}
