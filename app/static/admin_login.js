const adminLoginForm = document.getElementById("admin-login-form");
const adminLoginButton = document.getElementById("admin-login-btn");
const adminLoginMessage = document.getElementById("admin-login-message");

adminLoginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  adminLoginButton.disabled = true;
  adminLoginButton.textContent = "登录中...";
  adminLoginMessage.textContent = "";

  try {
    const formData = new FormData(adminLoginForm);
    const response = await fetch("/api/admin/login", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || "登录失败");
    }

    window.location.href = "/admin";
  } catch (error) {
    adminLoginMessage.textContent = error.message;
  } finally {
    adminLoginButton.disabled = false;
    adminLoginButton.textContent = "登录";
  }
});
