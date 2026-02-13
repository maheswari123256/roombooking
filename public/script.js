document.getElementById("forgotPasswordForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const email = document.getElementById("email").value;

  if (!email) {
    document.getElementById("responseMessage").textContent = "Please enter a valid email.";
    document.getElementById("responseMessage").style.color = "red";
    return;
  }

  try {
    const res = await fetch("http://localhost:5000/api/forget/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });

    const data = await res.json();

    document.getElementById("responseMessage").textContent = data.message;
    document.getElementById("responseMessage").style.color = res.ok ? "green" : "red";
  } catch (err) {
    document.getElementById("responseMessage").textContent = "Server error. Please try again later.";
    document.getElementById("responseMessage").style.color = "red";
  }
});
