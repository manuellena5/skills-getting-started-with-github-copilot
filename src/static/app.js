document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Reset activity select to avoid duplicate options on refresh
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build participants list (bulleted), with a friendly empty state
        const participantItems =
          Array.isArray(details.participants) && details.participants.length
            ? details.participants
                .map(
                  (p) => `
                  <li class="participant-item" title="${p}">
                    <span class="participant-email">${p}</span>
                    <button
                      class="delete-btn"
                      title="Unregister ${p}"
                      aria-label="Unregister ${p} from ${name}"
                      data-activity="${name}"
                      data-email="${p}"
                    >🗑</button>
                  </li>`
                )
                .join("")
            : '<li class="participants-empty">No participants yet.</li>';

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-section">
            <h5>Participants (${details.participants.length || 0})</h5>
            <ul class="participants-list">
              ${participantItems}
            </ul>
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Refresh activities list so the UI updates without a page reload
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Handle participant delete clicks via event delegation
  activitiesList.addEventListener("click", async (e) => {
    const target = e.target;
    if (target && target.matches(".delete-btn")) {
      const email = target.getAttribute("data-email");
      const activity = target.getAttribute("data-activity");
      if (!email || !activity) return;

      // Optional: confirm prompt
      const ok = confirm(`Unregister ${email} from ${activity}?`);
      if (!ok) return;

      try {
        const response = await fetch(
          `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
          { method: "DELETE" }
        );
        const result = await response.json();

        if (response.ok) {
          messageDiv.textContent = result.message || "Participant removed";
          messageDiv.className = "success";
          messageDiv.classList.remove("hidden");
          // Refresh activities to update counts and lists
          await fetchActivities();
        } else {
          messageDiv.textContent = result.detail || "Failed to unregister participant";
          messageDiv.className = "error";
          messageDiv.classList.remove("hidden");
        }

        setTimeout(() => messageDiv.classList.add("hidden"), 5000);
      } catch (error) {
        console.error("Error unregistering:", error);
        messageDiv.textContent = "Failed to unregister. Please try again.";
        messageDiv.className = "error";
        messageDiv.classList.remove("hidden");
      }
    }
  });

  // Initialize app
  fetchActivities();
});
