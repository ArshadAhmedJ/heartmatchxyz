// Profile Module
const profileModule = (() => {
  // Firebase services
  let firebase, auth, db, storage

  // DOM elements
  let profileContent
  let currentUserId = null
  let isCurrentUser = false
  let isEditing = false

  // Initialize profile module
  const init = () => {
    console.log("Initializing profile module")

    // Get Firebase services
    if (window.firebase) {
      firebase = window.firebase
      auth = firebase.auth()
      db = firebase.firestore()
      storage = firebase.storage ? firebase.storage() : null
    } else {
      console.error("Firebase not initialized in profile module")
      return
    }

    // Get DOM elements
    profileContent = document.getElementById("profile-content")

    if (!profileContent) {
      console.error("Profile content element not found")
      return
    }

    // Load current user's profile by default
    loadProfile()

    console.log("Profile module initialized")
  }

  // Load profile from Firestore
  const loadProfile = async (userId = null) => {
    console.log("Loading profile", userId ? `for user: ${userId}` : "for current user")

    try {
      showLoadingState()

      const user = auth.currentUser
      if (!user) {
        console.error("No user logged in")
        showErrorState("Please log in to view profiles")
        return
      }

      // Determine which profile to load
      currentUserId = userId || user.uid
      isCurrentUser = currentUserId === user.uid

      // Get user profile from Firestore
      const userDoc = await db.collection("users").doc(currentUserId).get()

      if (!userDoc.exists) {
        console.error("User document not found")
        showErrorState("Profile not found")
        return
      }

      const userData = userDoc.data()

      // Render profile
      renderProfile(userData)
    } catch (error) {
      console.error("Error loading profile:", error)
      showErrorState("Error loading profile. Please try again.")
    }
  }

  // Show loading state
  const showLoadingState = () => {
    if (!profileContent) return

    profileContent.innerHTML = `
      <div class="loading-state">
        <div class="loading-spinner">
          <i class="fas fa-spinner fa-spin fa-2x"></i>
        </div>
        <p>Loading profile...</p>
      </div>
    `
  }

  // Show error state
  const showErrorState = (message) => {
    console.log("Showing error state:", message)

    if (!profileContent) {
      console.error("Profile content element not found")
      return
    }

    profileContent.innerHTML = `
      <div class="error-state">
        <div class="error-icon">
          <i class="fas fa-exclamation-circle fa-3x"></i>
        </div>
        <h3>Error</h3>
        <p>${message}</p>
        <button id="retry-profile-btn" class="btn primary-btn">
          <i class="fas fa-sync-alt"></i> Try Again
        </button>
      </div>
    `

    // Add event listener to retry button
    const retryBtn = profileContent.querySelector("#retry-profile-btn")
    if (retryBtn) {
      retryBtn.addEventListener("click", () => loadProfile(currentUserId))
    }
  }

  // Render profile
  const renderProfile = (userData) => {
    console.log("Rendering profile:", userData)

    if (!profileContent) {
      console.error("Profile content element not found")
      return
    }

    // Calculate age from birthDate if available
    let age = ""
    if (userData.birthDate) {
      const birthDate = userData.birthDate.toDate ? userData.birthDate.toDate() : new Date(userData.birthDate)
      const today = new Date()
      const calculatedAge = today.getFullYear() - birthDate.getFullYear()
      const m = today.getMonth() - birthDate.getMonth()
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age = calculatedAge - 1
      } else {
        age = calculatedAge
      }
    } else if (userData.age) {
      age = userData.age
    }

    // Get photos or use placeholders
    const photos = userData.photos || []
    const mainPhoto = photos.length > 0 ? photos[0] : "images/default-avatar.png"

    // Create profile HTML with improved design
    profileContent.innerHTML = `
      <div class="profile-container">
        <div class="profile-header">
          <div class="profile-cover-photo"></div>
          <div class="profile-avatar" style="background-image: url('${mainPhoto}')"></div>
          <div class="profile-name-info">
            <h2>${userData.displayName || userData.name || "Anonymous"}${age ? ` <span class="profile-age">${age}</span>` : ""}</h2>
            ${
              userData.location
                ? `
              <div class="profile-location">
                <i class="fas fa-map-marker-alt"></i>
                <span>${userData.location}</span>
              </div>
            `
                : ""
            }
          </div>
        </div>
        
        <div class="profile-tabs">
          <button class="profile-tab active" data-tab="about">About</button>
          <button class="profile-tab" data-tab="photos">Photos</button>
          <button class="profile-tab" data-tab="interests">Interests</button>
        </div>
        
        <div class="profile-content-wrapper">
          <div class="profile-tab-content active" id="about-tab">
            <div class="profile-section">
              <h3><i class="fas fa-user"></i> About Me</h3>
              ${
                isCurrentUser && isEditing
                  ? `
                <textarea id="bio-input" class="form-textarea">${userData.bio || ""}</textarea>
              `
                  : `
                <p class="profile-bio">${userData.bio || "No bio available"}</p>
              `
              }
            </div>
          </div>
          
          <div class="profile-tab-content" id="photos-tab">
            <div class="profile-section">
              <h3><i class="fas fa-images"></i> Photos</h3>
              <div class="profile-photos-gallery ${isEditing ? "editing" : ""}">
                ${photos
                  .map(
                    (photo, index) => `
  <div class="profile-photo-card">
    <div class="profile-photo-item" style="background-image: url('${photo}')">
      ${
        isCurrentUser && isEditing
          ? `
        <div class="photo-actions">
          <button class="photo-edit-btn" data-index="${index}" aria-label="Edit photo">
            <i class="fas fa-edit"></i>
          </button>
          <button class="photo-delete-btn" data-index="${index}" aria-label="Remove photo">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      `
          : ""
      }
    </div>
  </div>
`,
                  )
                  .join("")}
                
                ${
                  isCurrentUser && isEditing
                    ? Array(Math.max(0, 3 - photos.length))
                        .fill()
                        .map(
                          () => `
                      <div class="profile-photo-card">
                        <div class="profile-photo-item empty">
                          <div class="photo-upload-overlay">
                            <label class="photo-upload-label">
                              <i class="fas fa-plus"></i>
                              <span>Add Photo</span>
                              <input type="file" class="photo-upload" accept="image/*">
                            </label>
                          </div>
                        </div>
                      </div>
                    `,
                        )
                        .join("")
                    : ""
                }
              </div>
            </div>
          </div>
          
          <div class="profile-tab-content" id="interests-tab">
            <div class="profile-section">
              <h3><i class="fas fa-heart"></i> Interests</h3>
              ${
                isCurrentUser && isEditing
                  ? `
                <div class="interests-editor">
                  <div class="interests-tags">
                    ${(userData.interests || [])
                      .map(
                        (interest, index) => `
                      <div class="interest-tag">
                        ${interest}
                        <button class="interest-remove-btn" data-index="${index}">
                          <i class="fas fa-times"></i>
                        </button>
                      </div>
                    `,
                      )
                      .join("")}
                  </div>
                  <div class="interests-input-container">
                    <input type="text" id="interest-input" class="form-input" placeholder="Add interest">
                    <button type="button" id="add-interest-btn" class="btn secondary-btn">Add</button>
                  </div>
                </div>
              `
                  : `
                <div class="interests-tags">
                  ${
                    (userData.interests || []).length > 0
                      ? (userData.interests || [])
                          .map(
                            (interest) => `
                    <span class="interest-tag">${interest}</span>
                  `,
                          )
                          .join("")
                      : "<p class='no-interests'>No interests specified</p>"
                  }
                </div>
              `
              }
            </div>
          </div>
        </div>
        
        <div class="profile-actions">
          ${
            isCurrentUser
              ? `
            ${
              isEditing
                ? `
              <button id="save-profile-btn" class="btn primary-btn">
                <i class="fas fa-save"></i> Save Profile
              </button>
              <button id="cancel-edit-btn" class="btn secondary-btn">
                <i class="fas fa-times"></i> Cancel
              </button>
            `
                : `
              <button id="edit-profile-btn" class="btn primary-btn">
                <i class="fas fa-edit"></i> Edit Profile
              </button>
            `
            }
          `
              : `
            <button id="message-user-btn" class="btn primary-btn">
              <i class="fas fa-comment"></i> Send Message
            </button>
            <button id="back-btn" class="btn secondary-btn">
              <i class="fas fa-arrow-left"></i> Back
            </button>
          `
          }
        </div>
      </div>
    `

    // Add event listeners
    bindProfileEvents(userData)
  }

  // Bind profile events
  const bindProfileEvents = (userData) => {
    if (!profileContent) return

    // Tab navigation
    const tabs = profileContent.querySelectorAll(".profile-tab")
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        // Remove active class from all tabs and content
        tabs.forEach((t) => t.classList.remove("active"))
        profileContent.querySelectorAll(".profile-tab-content").forEach((c) => c.classList.remove("active"))

        // Add active class to clicked tab and corresponding content
        tab.classList.add("active")
        const tabId = tab.getAttribute("data-tab")
        document.getElementById(`${tabId}-tab`).classList.add("active")
      })
    })

    if (isCurrentUser) {
      if (isEditing) {
        // Save profile button
        const saveProfileBtn = profileContent.querySelector("#save-profile-btn")
        if (saveProfileBtn) {
          saveProfileBtn.addEventListener("click", () => saveProfile(userData))
        }

        // Cancel edit button
        const cancelEditBtn = profileContent.querySelector("#cancel-edit-btn")
        if (cancelEditBtn) {
          cancelEditBtn.addEventListener("click", () => {
            isEditing = false
            renderProfile(userData)
          })
        }

        // Add interest button
        const addInterestBtn = profileContent.querySelector("#add-interest-btn")
        const interestInput = profileContent.querySelector("#interest-input")
        if (addInterestBtn && interestInput) {
          addInterestBtn.addEventListener("click", () => {
            const interest = interestInput.value.trim()
            if (interest) {
              const interests = userData.interests || []
              if (!interests.includes(interest)) {
                interests.push(interest)
                userData.interests = interests
                interestInput.value = ""
                renderProfile(userData)
              }
            }
          })

          interestInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              addInterestBtn.click()
            }
          })
        }

        // Remove interest buttons
        const removeInterestBtns = profileContent.querySelectorAll(".interest-remove-btn")
        removeInterestBtns.forEach((btn) => {
          btn.addEventListener("click", () => {
            const index = Number.parseInt(btn.getAttribute("data-index"))
            if (userData.interests && index >= 0 && index < userData.interests.length) {
              userData.interests.splice(index, 1)
              renderProfile(userData)
            }
          })
        })

        // Photo upload inputs
        const photoUploadInputs = profileContent.querySelectorAll(".photo-upload")
        photoUploadInputs.forEach((input) => {
          input.addEventListener("change", (e) => {
            if (e.target.files && e.target.files[0]) {
              uploadPhoto(e.target.files[0], userData)
            }
          })
        })

        // Photo delete buttons
        const photoDeleteBtns = profileContent.querySelectorAll(".photo-delete-btn")
        photoDeleteBtns.forEach((btn) => {
          btn.addEventListener("click", () => {
            const index = Number.parseInt(btn.getAttribute("data-index"))
            if (userData.photos && index >= 0 && index < userData.photos.length) {
              deletePhoto(index, userData)
            }
          })
        })

        // Photo edit buttons
        const photoEditBtns = profileContent.querySelectorAll(".photo-edit-btn")
        photoEditBtns.forEach((btn) => {
          btn.addEventListener("click", () => {
            const index = Number.parseInt(btn.getAttribute("data-index"))
            if (userData.photos && index >= 0 && index < userData.photos.length) {
              // Create a hidden file input for updating the photo
              const fileInput = document.createElement("input")
              fileInput.type = "file"
              fileInput.accept = "image/*"
              fileInput.style.display = "none"
              document.body.appendChild(fileInput)

              // Trigger click on the file input
              fileInput.click()

              // Handle file selection
              fileInput.addEventListener("change", (e) => {
                if (e.target.files && e.target.files[0]) {
                  updatePhoto(e.target.files[0], index, userData)
                }
                // Remove the temporary input
                document.body.removeChild(fileInput)
              })
            }
          })
        })
      } else {
        // Edit profile button
        const editProfileBtn = profileContent.querySelector("#edit-profile-btn")
        if (editProfileBtn) {
          editProfileBtn.addEventListener("click", () => {
            isEditing = true
            renderProfile(userData)
          })
        }
      }
    } else {
      // Message user button
      const messageUserBtn = profileContent.querySelector("#message-user-btn")
      if (messageUserBtn) {
        messageUserBtn.addEventListener("click", () => {
          if (window.dashboardModule && typeof window.dashboardModule.showSection === "function") {
            window.dashboardModule.showSection("chat")

            if (window.chatModule && typeof window.chatModule.openConversation === "function") {
              window.chatModule.openConversation(currentUserId)
            }
          }
        })
      }

      // Back button
      const backBtn = profileContent.querySelector("#back-btn")
      if (backBtn) {
        backBtn.addEventListener("click", () => {
          if (window.dashboardModule && typeof window.dashboardModule.showSection === "function") {
            window.dashboardModule.showSection("discover")
          }
        })
      }
    }
  }

  // Save profile
  const saveProfile = async (userData) => {
    console.log("Saving profile")

    try {
      const user = auth.currentUser
      if (!user) {
        console.error("No user logged in")
        return
      }

      // Get updated values
      const bioInput = document.getElementById("bio-input")
      const bio = bioInput ? bioInput.value.trim() : userData.bio

      // Update user data
      const updatedData = {
        ...userData,
        bio,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
      }

      // Clean up photos array (remove nulls)
      if (updatedData.photos) {
        updatedData.photos = updatedData.photos.filter((photo) => photo !== null)
      }

      // Save to Firestore
      await db.collection("users").doc(user.uid).update(updatedData)

      // Exit editing mode
      isEditing = false

      // Reload profile
      loadProfile()

      // Show success notification
      if (window.utils && window.utils.showNotification) {
        window.utils.showNotification("Profile updated successfully!", "success")
      }
    } catch (error) {
      console.error("Error saving profile:", error)
      if (window.utils && window.utils.showNotification) {
        window.utils.showNotification("Error saving profile. Please try again.", "error")
      }
    }
  }

  // Upload photo
  const uploadPhoto = async (file, userData) => {
    console.log("Uploading photo")

    try {
      const user = auth.currentUser
      if (!user) {
        console.error("No user logged in")
        return
      }

      // Show loading notification
      if (window.utils && window.utils.showNotification) {
        window.utils.showNotification("Uploading photo...", "info")
      }

      // Create storage reference
      const storageRef = storage.ref()
      const photoRef = storageRef.child(`users/${user.uid}/photos/${Date.now()}_${file.name}`)

      // Upload file
      const snapshot = await photoRef.put(file)

      // Get download URL
      const photoURL = await snapshot.ref.getDownloadURL()

      // Initialize photos array if it doesn't exist
      if (!userData.photos) {
        userData.photos = []
      }

      // Add photo to array (limit to 3 photos)
      if (userData.photos.length < 3) {
        userData.photos.push(photoURL)
      } else {
        // Replace the first null value or add to the end if no nulls
        const nullIndex = userData.photos.findIndex((photo) => photo === null)
        if (nullIndex !== -1) {
          userData.photos[nullIndex] = photoURL
        } else {
          userData.photos[2] = photoURL // Replace the last photo if we already have 3
        }
      }

      // Save to Firestore
      await db.collection("users").doc(user.uid).update({
        photos: userData.photos,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
      })

      // Reload profile
      renderProfile(userData)

      // Show success notification
      if (window.utils && window.utils.showNotification) {
        window.utils.showNotification("Photo uploaded successfully!", "success")
      }
    } catch (error) {
      console.error("Error uploading photo:", error)
      if (window.utils && window.utils.showNotification) {
        window.utils.showNotification("Error uploading photo. Please try again.", "error")
      }
    }
  }

  // Update photo
  const updatePhoto = async (file, index, userData) => {
    console.log(`Updating photo at index: ${index}`)

    try {
      const user = auth.currentUser
      if (!user) {
        console.error("No user logged in")
        return
      }

      // Show loading notification
      if (window.utils && window.utils.showNotification) {
        window.utils.showNotification("Updating photo...", "info")
      }

      // Create storage reference
      const storageRef = storage.ref()
      const photoRef = storageRef.child(`users/${user.uid}/photos/${Date.now()}_${file.name}`)

      // Upload file
      const snapshot = await photoRef.put(file)

      // Get download URL
      const photoURL = await snapshot.ref.getDownloadURL()

      // Update the photo at the specified index
      if (!userData.photos) {
        userData.photos = []
      }

      // Ensure the index exists in the array
      while (userData.photos.length <= index) {
        userData.photos.push(null)
      }

      // Update the photo at the specified index
      userData.photos[index] = photoURL

      // Save to Firestore
      await db.collection("users").doc(user.uid).update({
        photos: userData.photos,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
      })

      // Update user profile photo if it's the first photo
      if (index === 0) {
        await user.updateProfile({
          photoURL: photoURL,
        })
      }

      // Reload profile
      renderProfile(userData)

      // Show success notification
      if (window.utils && window.utils.showNotification) {
        window.utils.showNotification("Photo updated successfully!", "success")
      }
    } catch (error) {
      console.error("Error updating photo:", error)
      if (window.utils && window.utils.showNotification) {
        window.utils.showNotification("Error updating photo. Please try again.", "error")
      }
    }
  }

  // Delete photo
  const deletePhoto = async (index, userData) => {
    console.log("Deleting photo at index:", index)

    try {
      const user = auth.currentUser
      if (!user) {
        console.error("No user logged in")
        return
      }

      // Update user data
      const photos = userData.photos || []
      if (index >= 0 && index < photos.length) {
        // Mark the photo as null instead of removing it to maintain indexes
        photos[index] = null

        // Save to Firestore
        await db.collection("users").doc(user.uid).update({
          photos,
          lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
        })

        // Update local data
        userData.photos = photos

        // Reload profile
        renderProfile(userData)

        // Show success notification
        if (window.utils && window.utils.showNotification) {
          window.utils.showNotification("Photo deleted successfully!", "success")
        }
      }
    } catch (error) {
      console.error("Error deleting photo:", error)
      if (window.utils && window.utils.showNotification) {
        window.utils.showNotification("Error deleting photo. Please try again.", "error")
      }
    }
  }

  // View another user's profile
  const viewProfile = (userId) => {
    console.log("Viewing profile for user:", userId)
    loadProfile(userId)
  }

  // Expose module
  window.profileModule = {
    init,
    loadProfile,
    viewProfile,
    updatePhoto,
  }

  return {
    init,
    loadProfile,
    viewProfile,
    updatePhoto,
  }
})()

// Initialize on load if we're on the dashboard page
document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname
  if (path.includes("dashboard.html")) {
    console.log("Auto-initializing profile module")
    setTimeout(() => {
      if (window.profileModule) {
        profileModule.init()
      }
    }, 500)
  }
})
