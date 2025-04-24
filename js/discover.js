// Discover Module
const discoverModule = (() => {
  // Firebase services
  let firebase, auth, db, storage

  // DOM elements
  let cardContainer
  let likeBtn
  let dislikeBtn
  let viewProfileBtn
  let roseBtn // New rose button
  let currentProfile = null
  let profiles = []
  let currentIndex = 0
  let isLoading = false

  // Developer profile IDs - these are special profiles to show when no other profiles are available
  const DEVELOPER_PROFILE_IDS = ["Dhx2L7VTO1ZeF4Ry2y2nX4cmLMo1", "U60X51daggVxsyFzJ01u2LBlLyK2"]

  // Initialize discover module
  const init = () => {
    console.log("Initializing discover module")

    // Get Firebase services
    if (window.firebase) {
      firebase = window.firebase
      auth = firebase.auth()
      db = firebase.firestore()
      storage = firebase.storage ? firebase.storage() : null
    } else {
      console.error("Firebase not initialized in discover module")
      return
    }

    // Get DOM elements
    cardContainer = document.getElementById("card-container")
    likeBtn = document.getElementById("like-btn")
    dislikeBtn = document.getElementById("dislike-btn")
    viewProfileBtn = document.getElementById("view-profile-btn")
    roseBtn = document.getElementById("rose-btn") // Get rose button

    if (!cardContainer) {
      console.error("Card container element not found")
      return
    }

    bindEvents()
    loadProfiles()
    checkDailyRose() // Check if user has a daily rose

    // Update the rose button to use the new rose icon
    if (roseBtn) {
      // Remove any existing content
      roseBtn.innerHTML = ""

      // Create image element for rose icon
      const roseImg = document.createElement("img")
      roseImg.src = "images/rose-icon.png"
      roseImg.alt = "Rose"
      roseImg.className = "rose-icon"

      // Create span for rose count
      const roseCount = document.createElement("span")
      roseCount.className = "rose-count"
      roseCount.textContent = "0"

      // Add elements to button
      roseBtn.appendChild(roseImg)
      roseBtn.appendChild(roseCount)

      // Style the rose button
      roseBtn.style.display = "flex"
      roseBtn.style.alignItems = "center"
      roseBtn.style.justifyContent = "center"
      roseBtn.style.gap = "5px"
      roseBtn.style.backgroundColor = "white"
      roseBtn.style.opacity = "0.5"
      roseBtn.style.borderRadius = "50%"
      roseBtn.style.width = "50px"
      roseBtn.style.height = "50px"
      roseBtn.style.padding = "0"
    }

    // Remove user profile icon if it exists
    if (viewProfileBtn) {
      // Hide viewProfileBtn if it exists
      viewProfileBtn.style.display = "none"
    }

    console.log("Discover module initialized")
  }

  // Check if user has a daily rose
  const checkDailyRose = async () => {
    try {
      const user = auth.currentUser
      if (!user) {
        console.error("No user logged in")
        return
      }

      // Get user document
      const userDoc = await db.collection("users").doc(user.uid).get()
      if (!userDoc.exists) {
        console.error("User document not found")
        return
      }

      const userData = userDoc.data()

      // Check if user has roses data
      if (!userData.roses) {
        // Initialize roses data
        await db
          .collection("users")
          .doc(user.uid)
          .update({
            roses: {
              count: 1,
              lastRefreshed: firebase.firestore.FieldValue.serverTimestamp(),
            },
          })

        if (roseBtn) {
          roseBtn.disabled = false
          roseBtn.querySelector(".rose-count").textContent = "1"
        }
        return
      }

      // Check if it's time to refresh the daily rose
      const lastRefreshed = userData.roses.lastRefreshed.toDate
        ? userData.roses.lastRefreshed.toDate()
        : new Date(userData.roses.lastRefreshed)
      const now = new Date()

      // Check if it's a new day (past midnight)
      if (
        lastRefreshed.getDate() !== now.getDate() ||
        lastRefreshed.getMonth() !== now.getMonth() ||
        lastRefreshed.getFullYear() !== now.getFullYear()
      ) {
        // Refresh rose count
        await db
          .collection("users")
          .doc(user.uid)
          .update({
            "roses.count": firebase.firestore.FieldValue.increment(1),
            "roses.lastRefreshed": firebase.firestore.FieldValue.serverTimestamp(),
          })

        if (roseBtn) {
          roseBtn.disabled = false
          roseBtn.querySelector(".rose-count").textContent = (userData.roses.count + 1).toString()
        }

        console.log("You received a new rose today!")
      } else {
        // Update button state based on existing rose count
        if (roseBtn) {
          if (userData.roses.count > 0) {
            roseBtn.disabled = false
            roseBtn.querySelector(".rose-count").textContent = userData.roses.count.toString()
          } else {
            roseBtn.disabled = true
            roseBtn.querySelector(".rose-count").textContent = "0"
          }
        }
      }
    } catch (error) {
      console.error("Error checking daily rose:", error)
    }
  }

  // Bind events
  const bindEvents = () => {
    console.log("Binding discover events")

    if (likeBtn) {
      likeBtn.addEventListener("click", likeProfile)
      console.log("Like button bound")
    } else {
      console.error("Like button not found")
    }

    if (dislikeBtn) {
      dislikeBtn.addEventListener("click", dislikeProfile)
      console.log("Dislike button bound")
    } else {
      console.error("Dislike button not found")
    }

    if (viewProfileBtn) {
      viewProfileBtn.addEventListener("click", viewProfile)
      console.log("View profile button bound")
    } else {
      console.error("View profile button not found")
    }

    // Bind rose button
    if (roseBtn) {
      roseBtn.addEventListener("click", sendRose)
      console.log("Rose button bound")
    } else {
      console.error("Rose button not found")
    }

    // Add swipe functionality for mobile
    if (cardContainer) {
      let touchStartX = 0
      let touchEndX = 0

      cardContainer.addEventListener(
        "touchstart",
        (e) => {
          touchStartX = e.changedTouches[0].screenX
        },
        false,
      )

      cardContainer.addEventListener(
        "touchend",
        (e) => {
          touchEndX = e.changedTouches[0].screenX
          handleSwipe()
        },
        false,
      )

      const handleSwipe = () => {
        const swipeThreshold = 100 // Minimum distance for a swipe

        if (touchEndX - touchStartX > swipeThreshold) {
          // Swiped right - like
          likeProfile()
        } else if (touchStartX - touchEndX > swipeThreshold) {
          // Swiped left - dislike
          dislikeProfile()
        }
      }
    }

    console.log("Discover events bound")
  }

  // Send a rose to current profile
  const sendRose = async () => {
    console.log("Sending rose")

    if (!currentProfile) {
      console.error("No current profile to send rose to")
      return
    }

    try {
      const user = auth.currentUser
      if (!user) {
        console.error("No user logged in")
        return
      }

      // Get user document to check rose count
      const userDoc = await db.collection("users").doc(user.uid).get()
      if (!userDoc.exists) {
        console.error("User document not found")
        return
      }

      const userData = userDoc.data()

      // Check if user has roses
      if (!userData.roses || userData.roses.count <= 0) {
        console.log("You don't have any roses left. Come back tomorrow!")
        return
      }

      // Show rose animation
      const card = cardContainer.querySelector(".profile-card")
      if (card) {
        // Create rose animation overlay
        const roseOverlay = document.createElement("div")
        roseOverlay.className = "rose-overlay"
        roseOverlay.innerHTML = `
          <div class="rose-animation">
            <img src="images/rose-icon.png" alt="Rose" class="rose-animation-icon">
          </div>
        `
        card.appendChild(roseOverlay)

        // Disable buttons during animation
        if (likeBtn) likeBtn.disabled = true
        if (dislikeBtn) dislikeBtn.disabled = true
        if (viewProfileBtn) viewProfileBtn.disabled = true
        if (roseBtn) roseBtn.disabled = true

        // Animate rose
        setTimeout(() => {
          roseOverlay.classList.add("active")
        }, 100)
      }

      // Decrement rose count
      await db
        .collection("users")
        .doc(user.uid)
        .update({
          "roses.count": firebase.firestore.FieldValue.increment(-1),
        })

      // Update rose button count
      if (roseBtn) {
        const newCount = userData.roses.count - 1
        roseBtn.querySelector(".rose-count").textContent = newCount.toString()
        if (newCount <= 0) {
          roseBtn.disabled = true
        }
      }

      // Add rose to Firestore
      const roseData = {
        senderId: user.uid,
        receiverId: currentProfile.id,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      }

      await db.collection("roses").add(roseData)
      console.log("Rose sent to:", currentProfile.id)

      // Check if there's a like from the current user to the profile
      const likeQuery = await db
        .collection("likes")
        .where("userId", "==", user.uid)
        .where("likedUserId", "==", currentProfile.id)
        .get()

      // If no like exists, create one
      if (likeQuery.empty) {
        const likeData = {
          userId: user.uid,
          likedUserId: currentProfile.id,
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        }
        await db.collection("likes").add(likeData)
        console.log("Profile liked with rose:", currentProfile.id)
      }

      // Check if there's a like from the profile to the current user
      const reverselikeQuery = await db
        .collection("likes")
        .where("userId", "==", currentProfile.id)
        .where("likedUserId", "==", user.uid)
        .get()

      // If there's a mutual like, it's a match!
      if (!reverselikeQuery.empty) {
        // Create a match document
        try {
          // Create a potential match ID (sorted user IDs to ensure consistency)
          const userIds = [user.uid, currentProfile.id].sort()
          const matchId = userIds.join("_")

          // Create or update the match document using set with merge
          await db
            .collection("matches")
            .doc(matchId)
            .set(
              {
                users: userIds,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                lastMessageTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
                unreadCount: {
                  [user.uid]: 0,
                  [currentProfile.id]: 0,
                },
                confirmed: true,
                rose: {
                  sent: true,
                  senderId: user.uid,
                  timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                },
              },
              { merge: true },
            ) // Use merge to update if exists or create if not

          console.log("Match created/updated with rose:", matchId)

          // It's a match! Show match popup
          setTimeout(() => {
            showMatchPopup(currentProfile, true) // true indicates a rose was sent
          }, 2000)
        } catch (matchError) {
          console.error("Error creating match:", matchError)
          // Continue with the flow even if match creation fails
          setTimeout(() => {
            showNextProfile()
          }, 2000)
        }
      } else {
        // No match yet, just show next profile
        setTimeout(() => {
          showNextProfile()
        }, 2000)
      }
    } catch (error) {
      console.error("Error sending rose:", error)

      // Re-enable buttons if there was an error
      if (likeBtn) likeBtn.disabled = false
      if (dislikeBtn) dislikeBtn.disabled = false
      if (viewProfileBtn) viewProfileBtn.disabled = false
      if (roseBtn) roseBtn.disabled = false
    }
  }

  // Load profiles from Firestore
  const loadProfiles = async () => {
    console.log("Loading profiles")

    if (isLoading) return
    isLoading = true

    try {
      showLoadingState()

      const user = auth.currentUser
      if (!user) {
        console.error("No user logged in")
        showEmptyState("Please log in to see profiles")
        isLoading = false
        return
      }

      // Get current user preferences
      const userDoc = await db.collection("users").doc(user.uid).get()
      if (!userDoc.exists) {
        console.error("User document not found")
        showEmptyState("Please complete your profile first")
        isLoading = false
        return
      }

      const userData = userDoc.data()
      const userGender = userData.gender || "unknown"

      // Get user's likes and dislikes to filter them out
      const likesSnapshot = await db.collection("likes").where("userId", "==", user.uid).get()
      const dislikesSnapshot = await db.collection("dislikes").where("userId", "==", user.uid).get()

      const likedUserIds = likesSnapshot.docs.map((doc) => doc.data().likedUserId)
      const dislikedUserIds = dislikesSnapshot.docs.map((doc) => doc.data().dislikedUserId)

      // Combine filtered IDs - don't exclude developer profiles for female users
      let filteredIds = [...likedUserIds, ...dislikedUserIds, user.uid]

      // Only exclude developer profiles for male users
      if (userGender !== "female") {
        filteredIds = [...filteredIds, ...DEVELOPER_PROFILE_IDS]
      }

      // Get all users - we'll filter client-side to avoid complex queries that might be rejected by security rules
      const snapshot = await db.collection("users").get()

      if (snapshot.empty) {
        console.log("No profiles found")
        showEmptyState("No profiles found. Try again later!", userGender)
        isLoading = false
        return
      }

      // Filter profiles based on preferences and already liked/disliked users
      profiles = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((profile) => {
          // Skip filtered IDs (already liked/disliked and current user)
          if (filteredIds.includes(profile.id)) return false

          // Apply gender filter if specified
          if (
            userData.preferences &&
            userData.preferences.interestedIn &&
            userData.preferences.interestedIn !== "all"
          ) {
            return profile.gender === userData.preferences.interestedIn
          }

          return true
        })

      console.log(`Loaded ${profiles.length} profiles`)

      if (profiles.length === 0) {
        // Get the gender the user is interested in
        const interestedIn = userData.preferences?.interestedIn || "all"

        // For female users, we'll show developer profiles if there are no regular profiles
        if (userGender === "female" && (interestedIn === "male" || interestedIn === "all")) {
          showEmptyStateWithDevelopers(userGender)
        } else {
          showEmptyState("No more profiles to show. Try again later!", userGender, interestedIn)
        }

        isLoading = false
        return
      }

      // Enable buttons
      if (likeBtn) likeBtn.disabled = false
      if (dislikeBtn) dislikeBtn.disabled = false
      if (viewProfileBtn) viewProfileBtn.disabled = false

      // Show first profile
      currentIndex = 0
      showProfile(profiles[currentIndex])
    } catch (error) {
      console.error("Error loading profiles:", error)
      showEmptyState("Error loading profiles. Please try again.")
    } finally {
      isLoading = false
    }
  }

  // Load developer profiles
  const loadDeveloperProfile = async (profileId) => {
    try {
      const profileDoc = await db.collection("users").doc(profileId).get()

      if (!profileDoc.exists) {
        console.error("Developer profile not found:", profileId)
        return null
      }

      return {
        id: profileDoc.id,
        ...profileDoc.data(),
      }
    } catch (error) {
      console.error("Error loading developer profile:", error)
      return null
    }
  }

  // Show loading state
  const showLoadingState = () => {
    if (!cardContainer) return

    cardContainer.innerHTML = `
      <div class="loading-state">
        <div class="loading-spinner">
          <i class="fas fa-spinner fa-spin"></i>
        </div>
        <p>Loading profiles...</p>
      </div>
    `

    // Disable buttons while loading
    if (likeBtn) likeBtn.disabled = true
    if (dislikeBtn) dislikeBtn.disabled = true
    if (roseBtn) roseBtn.disabled = true
    // We're not using viewProfileBtn anymore
  }

  // Add this function to toggle fullscreen mode
  const toggleFullscreen = (card) => {
    if (card) {
      card.classList.toggle("fullscreen")

      // Update action buttons position
      const actionButtons = document.querySelector(".action-buttons")
      if (actionButtons) {
        if (card.classList.contains("fullscreen")) {
          // Move action buttons inside the card when in fullscreen
          card.appendChild(actionButtons)
        } else {
          // Move action buttons back to original position
          const cardContainer = document.getElementById("card-container")
          if (cardContainer) {
            cardContainer.appendChild(actionButtons)
          }
        }
      }
    }
  }

  // Update the showProfile function to add fullscreen toggle functionality
  const showProfile = (profile) => {
    console.log("Showing profile:", profile.id)

    currentProfile = profile

    if (!cardContainer) {
      console.error("Card container not found")
      return
    }

    // Calculate age from birthDate if available
    let age = "?"
    if (profile.birthDate) {
      const birthDate = profile.birthDate.toDate ? profile.birthDate.toDate() : new Date(profile.birthDate)
      const today = new Date()
      age = today.getFullYear() - birthDate.getFullYear()
      const m = today.getMonth() - birthDate.getMonth()
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--
      }
    } else if (profile.age) {
      age = profile.age
    }

    // Create profile card
    const card = document.createElement("div")
    card.className = "profile-card"

    // Get main photo or use placeholder
    const mainPhoto = profile.photos && profile.photos.length > 0 ? profile.photos[0] : "images/default-avatar.png"

    // Check if profile is verified
    const isVerified = profile.verification && profile.verification.status === "verified"
    const verificationBadge = isVerified
      ? `<span class="verification-badge" title="Verified Profile"><i class="fas fa-check-circle"></i></span>`
      : ""

    // Create card content
    card.innerHTML = `
    <div class="profile-images">
      <div class="profile-image-main" style="background-image: url('${mainPhoto}')">
        ${
          profile.photos && profile.photos.length > 1
            ? `
            <div class="profile-image-thumbnails">
              ${profile.photos
                .slice(1, 4)
                .map(
                  (photo, index) => `
                <div class="profile-image-thumb" style="background-image: url('${photo}')" data-index="${index + 1}"></div>
              `,
                )
                .join("")}
            </div>
          `
            : ""
        }
        <div class="profile-details">
          <p class="profile-bio">${profile.bio || "No bio available"}</p>
          ${
            profile.interests && profile.interests.length > 0
              ? `
              <div class="profile-interests">
                ${profile.interests
                  .map(
                    (interest) => `
                  <span class="interest-tag">${interest}</span>
                `,
                  )
                  .join("")}
              </div>
            `
              : ""
          }
        </div>
        <div class="profile-info">
          <h2>${profile.displayName || profile.name || "Anonymous"}, ${age} ${verificationBadge}</h2>
          <p>${profile.location || "Nearby"}</p>
        </div>
      </div>
    </div>
  `

    // Clear container and add new card
    cardContainer.innerHTML = ""
    cardContainer.appendChild(card)

    // Add event listeners to thumbnails
    const thumbnails = card.querySelectorAll(".profile-image-thumb")
    thumbnails.forEach((thumb) => {
      thumb.addEventListener("click", (e) => {
        e.stopPropagation() // Prevent other click events
        const index = Number.parseInt(thumb.getAttribute("data-index"))
        if (profile.photos && profile.photos[index]) {
          const mainImage = card.querySelector(".profile-image-main")
          mainImage.style.backgroundImage = `url('${profile.photos[index]}')`
        }
      })
    })

    // Enable buttons
    if (likeBtn) {
      likeBtn.disabled = false
      likeBtn.style.display = "flex"
    }
    if (dislikeBtn) {
      dislikeBtn.disabled = false
      dislikeBtn.style.display = "flex"
    }
    if (viewProfileBtn && viewProfileBtn.style.display !== "none") {
      viewProfileBtn.disabled = false
      viewProfileBtn.style.display = "flex"
    }
    if (roseBtn) {
      roseBtn.style.display = "flex"
      // Rose button enabled/disabled state is handled by checkDailyRose()
    }

    // Check if user has roses and enable/disable rose button
    checkDailyRose()

    // Inside the createProfileCard function, before returning the card element
    if (window.verificationModule) {
      // Check if user is verified and add badge
      window.verificationModule
        .isUserVerified(profile.id)
        .then((isVerified) => {
          if (isVerified) {
            const nameElement = card.querySelector(".profile-info h2")
            if (nameElement) {
              window.verificationModule.addVerificationBadge(nameElement, true)
            }

            // Also add badge to card
            window.verificationModule.addVerificationBadge(card, true)
          }
        })
        .catch((error) => {
          console.error("Error checking verification status:", error)
        })
    }
  }

  // Show empty state with developer profiles for female users
  const showEmptyStateWithDevelopers = async (userGender) => {
    console.log("Showing empty state with developers for female users")

    if (!cardContainer) {
      console.error("Card container not found")
      return
    }

    // Load developer profiles
    const developerProfiles = []
    for (const profileId of DEVELOPER_PROFILE_IDS) {
      const profile = await loadDeveloperProfile(profileId)
      if (profile) {
        developerProfiles.push(profile)
      }
    }

    // Create developer profile cards
    const developerCards = developerProfiles
      .map((profile, index) => {
        const mainPhoto = profile.photos && profile.photos.length > 0 ? profile.photos[0] : "images/default-avatar.png"

        // Calculate age
        let age = "?"
        if (profile.birthDate) {
          const birthDate = profile.birthDate.toDate ? profile.birthDate.toDate() : new Date(profile.birthDate)
          const today = new Date()
          age = today.getFullYear() - birthDate.getFullYear()
          const m = today.getMonth() - birthDate.getMonth()
          if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--
          }
        } else if (profile.age) {
          age = profile.age
        }

        return `
        <div class="developer-card" data-profile-id="${profile.id}">
          <div class="developer-image" style="background-image: url('${mainPhoto}')"></div>
          <div class="developer-info">
            <h3>${profile.displayName || profile.name || "Developer"}, ${age}</h3>
            <p>${profile.bio ? profile.bio.substring(0, 60) + (profile.bio.length > 60 ? "..." : "") : "HeartMatch Developer"}</p>
          </div>
        </div>
      `
      })
      .join("")

    cardContainer.innerHTML = `
      <div class="empty-state">
        <img src="images/no-profiles.svg" alt="No profiles" class="empty-state-image" />
        <h3>No more matches at the moment</h3>
        <p>You've seen all available profiles for now.</p>
        <p class="developer-intro">Fun fact: Our developers are also single! Why not check them out?</p>
        
        <div class="developer-profiles">
          ${developerCards}
        </div>
        
        <button id="refresh-profiles-btn" class="btn primary-btn">
          <i class="fas fa-sync-alt"></i> Try Again
        </button>
      </div>
    `

    // Add event listener to refresh button
    const refreshBtn = cardContainer.querySelector("#refresh-profiles-btn")
    if (refreshBtn) {
      refreshBtn.addEventListener("click", loadProfiles)
    }

    // Add event listeners to developer cards
    const devCards = cardContainer.querySelectorAll(".developer-card")
    devCards.forEach((card) => {
      card.addEventListener("click", async () => {
        const profileId = card.getAttribute("data-profile-id")
        const profile = await loadDeveloperProfile(profileId)

        if (profile) {
          // Set as current profile and show it
          currentProfile = profile
          showProfile(profile)

          // Enable and show buttons
          if (likeBtn) {
            likeBtn.disabled = false
            likeBtn.style.display = "flex"
          }
          if (dislikeBtn) {
            dislikeBtn.disabled = false
            dislikeBtn.style.display = "flex"
          }
          if (viewProfileBtn && viewProfileBtn.style.display !== "none") {
            viewProfileBtn.disabled = false
            viewProfileBtn.style.display = "flex"
          }
          if (roseBtn) {
            roseBtn.style.display = "flex"
            // Rose button enabled/disabled state is handled by checkDailyRose()
          }

          // Check if user has roses and enable/disable rose button
          checkDailyRose()
        }
      })
    })

    // Disable action buttons
    if (likeBtn) {
      likeBtn.disabled = true
      likeBtn.style.display = "none"
    }
    if (dislikeBtn) {
      dislikeBtn.disabled = true
      dislikeBtn.style.display = "none"
    }
    if (viewProfileBtn) {
      viewProfileBtn.disabled = true
      viewProfileBtn.style.display = "none"
    }
    if (roseBtn) {
      roseBtn.disabled = true
      roseBtn.style.display = "none"
    }
  }

  // Show empty state when no profiles are available
  const showEmptyState = (message, userGender = "unknown", interestedIn = "all") => {
    console.log("Showing empty state:", message, "User gender:", userGender, "Interested in:", interestedIn)

    if (!cardContainer) {
      console.error("Card container not found")
      return
    }

    let emptyStateContent = ""

    // Customize empty state based on user gender and who they're interested in
    if (userGender === "male" && (interestedIn === "female" || interestedIn === "all")) {
      // Male user looking for females
      emptyStateContent = `
        <img src="images/astronaut.png" alt="Lonely astronaut" class="empty-state-image" />
        <h3>Houston, we have a problem!</h3>
        <p>Looks like you've explored all available profiles in your area.</p>
        <p>Even in the vastness of space, finding the right match takes time.</p>
      `
    } else if (userGender === "female" && (interestedIn === "male" || interestedIn === "all")) {
      // This case is now handled by showEmptyStateWithDevelopers
      // But we'll keep a fallback just in case
      emptyStateContent = `
        <img src="images/no-profiles.svg" alt="No profiles" class="empty-state-image" />
        <h3>No matches at the moment</h3>
        <p>You've seen all available profiles for now.</p>
        <p>Fun fact: Our developers are also single! Maybe we should add them to the app? 😉</p>
      `
    } else {
      // Default empty state for other combinations
      emptyStateContent = `
        <img src="images/no-profiles.svg" alt="No profiles" class="empty-state-image" />
        <h3>No profiles available</h3>
        <p>${message}</p>
      `
    }

    cardContainer.innerHTML = `
      <div class="empty-state">
        ${emptyStateContent}
        <button id="refresh-profiles-btn" class="btn primary-btn">
          <i class="fas fa-sync-alt"></i> Try Again
        </button>
      </div>
    `

    // Add event listener to refresh button
    const refreshBtn = cardContainer.querySelector("#refresh-profiles-btn")
    if (refreshBtn) {
      refreshBtn.addEventListener("click", loadProfiles)
    }

    // Disable action buttons
    if (likeBtn) {
      likeBtn.disabled = true
      likeBtn.style.display = "none"
    }
    if (dislikeBtn) {
      dislikeBtn.disabled = true
      dislikeBtn.style.display = "none"
    }
    if (viewProfileBtn) {
      viewProfileBtn.disabled = true
      viewProfileBtn.style.display = "none"
    }
    if (roseBtn) {
      roseBtn.disabled = true
      roseBtn.style.display = "none"
    }
  }

  // Like current profile
  const likeProfile = async () => {
    console.log("Liking profile")

    if (!currentProfile) {
      console.error("No current profile to like")
      return
    }

    try {
      const user = auth.currentUser
      if (!user) {
        console.error("No user logged in")
        return
      }

      // Show like indicator
      const card = cardContainer.querySelector(".profile-card")
      if (card) {
        card.classList.add("like-indicator")

        // Animate card swiping right
        card.style.transition = "transform 0.5s ease"
        card.style.transform = "translateX(150%) rotate(20deg)"

        // Disable buttons during animation
        if (likeBtn) likeBtn.disabled = true
        if (dislikeBtn) dislikeBtn.disabled = true
        if (viewProfileBtn) viewProfileBtn.disabled = true
        if (roseBtn) roseBtn.disabled = true
      }

      // Add like to Firestore
      const likeData = {
        userId: user.uid,
        likedUserId: currentProfile.id,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      }

      await db.collection("likes").add(likeData)
      console.log("Profile liked:", currentProfile.id)

      // Check if there's a like from the profile to the current user
      const reverselikeQuery = await db
        .collection("likes")
        .where("userId", "==", currentProfile.id)
        .where("likedUserId", "==", user.uid)
        .get()

      // If there's a mutual like, it's a match!
      if (!reverselikeQuery.empty) {
        try {
          // Create a potential match ID (sorted user IDs to ensure consistency)
          const userIds = [user.uid, currentProfile.id].sort()
          const matchId = userIds.join("_")

          // Create or update match document using set with merge
          await db
            .collection("matches")
            .doc(matchId)
            .set(
              {
                users: userIds,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                lastMessageTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
                unreadCount: {
                  [user.uid]: 0,
                  [currentProfile.id]: 0,
                },
                confirmed: true,
              },
              { merge: true },
            ) // Use merge to update if exists or create if not

          console.log("Match created/updated:", matchId)

          // It's a match! Show match popup
          setTimeout(() => {
            showMatchPopup(currentProfile)
          }, 500)
        } catch (matchError) {
          console.error("Error creating match:", matchError)
          // Continue with the flow even if match creation fails
          setTimeout(() => {
            showNextProfile()
          }, 500)
        }
      } else {
        // No match yet, just show next profile
        setTimeout(() => {
          showNextProfile()
        }, 500)
      }
    } catch (error) {
      console.error("Error liking profile:", error)

      // Re-enable buttons if there was an error
      if (likeBtn) likeBtn.disabled = false
      if (dislikeBtn) dislikeBtn.disabled = false
      if (viewProfileBtn) viewProfileBtn.disabled = false
      if (roseBtn) roseBtn.disabled = false
    }
  }

  // Dislike current profile
  const dislikeProfile = async () => {
    console.log("Disliking profile")

    if (!currentProfile) {
      console.error("No current profile to dislike")
      return
    }

    try {
      const user = auth.currentUser
      if (!user) {
        console.error("No user logged in")
        return
      }

      // Show dislike indicator
      const card = cardContainer.querySelector(".profile-card")
      if (card) {
        card.classList.add("dislike-indicator")

        // Animate card swiping left
        card.style.transition = "transform 0.5s ease"
        card.style.transform = "translateX(-150%) rotate(-20deg)"

        // Disable buttons during animation
        if (likeBtn) likeBtn.disabled = true
        if (dislikeBtn) dislikeBtn.disabled = true
        if (viewProfileBtn) viewProfileBtn.disabled = true
        if (roseBtn) roseBtn.disabled = true
      }

      // Add dislike to Firestore
      await db.collection("dislikes").add({
        userId: user.uid,
        dislikedUserId: currentProfile.id,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      })

      // Wait for animation to complete before showing next profile
      setTimeout(() => {
        showNextProfile()
      }, 500)
    } catch (error) {
      console.error("Error disliking profile:", error)

      // Re-enable buttons if there was an error
      if (likeBtn) likeBtn.disabled = false
      if (dislikeBtn) dislikeBtn.disabled = false
      if (viewProfileBtn) viewProfileBtn.disabled = false
      if (roseBtn) roseBtn.disabled = false
    }
  }

  // View full profile
  const viewProfile = () => {
    console.log("Viewing profile")

    if (!currentProfile) {
      console.error("No current profile to view")
      return
    }

    // Pass the profile ID to the profile module
    if (window.profileModule && typeof window.profileModule.viewProfile === "function") {
      window.profileModule.viewProfile(currentProfile.id)

      // Switch to profile section
      if (window.dashboardModule && typeof window.dashboardModule.showSection === "function") {
        window.dashboardModule.showSection("profile")
      }
    } else {
      console.error("Profile module not available")
    }
  }

  // Show next profile
  const showNextProfile = () => {
    currentIndex++

    if (currentIndex >= profiles.length) {
      console.log("No more profiles to show")
      // Get current user to determine gender for empty state
      const user = auth.currentUser
      if (user) {
        db.collection("users")
          .doc(user.uid)
          .get()
          .then((doc) => {
            if (doc.exists) {
              const userData = doc.data()
              const userGender = userData.gender || "unknown"
              const interestedIn = userData.preferences?.interestedIn || "all"

              // For female users, show developer profiles
              if (userGender === "female" && (interestedIn === "male" || interestedIn === "all")) {
                showEmptyStateWithDevelopers(userGender)
              } else {
                showEmptyState("No more profiles to show. Try again later!", userGender, interestedIn)
              }
            } else {
              showEmptyState("No more profiles to show. Try again later!")
            }
          })
          .catch((error) => {
            console.error("Error getting user data:", error)
            showEmptyState("No more profiles to show. Try again later!")
          })
      } else {
        showEmptyState("No more profiles to show. Try again later!")
      }
      return
    }

    // Re-enable buttons
    if (likeBtn) {
      likeBtn.disabled = false
      likeBtn.style.display = "flex"
    }
    if (dislikeBtn) {
      dislikeBtn.disabled = false
      dislikeBtn.style.display = "flex"
    }
    if (viewProfileBtn) {
      viewProfileBtn.disabled = false
      viewProfileBtn.style.display = "flex"
    }

    // Check if user has roses and enable/disable rose button
    checkDailyRose()

    showProfile(profiles[currentIndex])
  }

  // Show match popup
  const showMatchPopup = (matchedProfile, withRose = false) => {
    console.log("Showing match popup")

    // Create popup element
    const popup = document.createElement("div")
    popup.className = "match-popup"

    // Get user photo
    const userPhoto = auth.currentUser.photoURL || "images/default-avatar.png"

    // Get matched user photo
    const matchedPhoto =
      matchedProfile.photos && matchedProfile.photos.length > 0 ? matchedProfile.photos[0] : "images/default-avatar.png"

    popup.innerHTML = `
      <div class="match-popup-content">
        <div class="match-header">
          <h2>It's a Match!</h2>
          <p>You and ${matchedProfile.displayName || matchedProfile.name || "Anonymous"} liked each other</p>
          ${withRose ? '<p class="rose-sent"><img src="images/rose-icon.png" alt="Rose" class="rose-icon-small"> You sent a rose!</p>' : ""}
        </div>
        <div class="match-images">
          <div class="match-image" style="background-image: url('${userPhoto}')"></div>
          <div class="match-heart">${withRose ? '<img src="images/rose-icon.png" alt="Rose" class="rose-icon-medium">' : '<i class="fas fa-heart"></i>'}</div>
          <div class="match-image" style="background-image: url('${matchedPhoto}')"></div>
        </div>
        <div class="match-actions">
          <button class="btn primary-btn" id="start-chat-btn">Send a Message</button>
          <button class="btn secondary-btn" id="keep-swiping-btn">Keep Swiping</button>
        </div>
      </div>
    `

    // Add to body
    document.body.appendChild(popup)

    // Add confetti effect
    createConfetti()

    // Add event listeners
    const startChatBtn = popup.querySelector("#start-chat-btn")
    const keepSwipingBtn = popup.querySelector("#keep-swiping-btn")

    if (startChatBtn) {
      startChatBtn.addEventListener("click", () => {
        // Close popup
        document.body.removeChild(popup)

        // Go to chat section and open chat with matched user
        if (window.dashboardModule && typeof window.dashboardModule.showSection === "function") {
          window.dashboardModule.showSection("chat")

          // Open chat with matched user
          if (window.chatModule && typeof window.chatModule.openConversation === "function") {
            window.chatModule.openConversation(matchedProfile.id)
          }
        }
      })
    }

    if (keepSwipingBtn) {
      keepSwipingBtn.addEventListener("click", () => {
        // Close popup
        document.body.removeChild(popup)

        // Show next profile
        showNextProfile()
      })
    }
  }

  // Create confetti effect
  const createConfetti = () => {
    const colors = ["#ff6b6b", "#f06595", "#cc5de8", "#5c7cfa", "#339af0"]
    const confettiCount = 100

    for (let i = 0; i < confettiCount; i++) {
      const confetti = document.createElement("div")
      confetti.className = "confetti"

      // Random position
      const left = Math.random() * 100

      // Random color
      const color = colors[Math.floor(Math.random() * colors.length)]

      // Random size
      const size = Math.random() * 10 + 5

      // Random animation duration
      const duration = Math.random() * 3 + 2

      // Set styles
      confetti.style.left = `${left}vw`
      confetti.style.backgroundColor = color
      confetti.style.width = `${size}px`
      confetti.style.height = `${size}px`
      confetti.style.animationDuration = `${duration}s`

      // Add to body
      confetti.style.zIndex = "10000" // Ensure confetti appears above other elements
      document.body.appendChild(confetti)

      // Remove after animation
      setTimeout(() => {
        if (document.body.contains(confetti)) {
          document.body.removeChild(confetti)
        }
      }, duration * 1000)
    }
  }

  // Expose module
  window.discoverModule = {
    init,
    loadProfiles,
    likeProfile,
    dislikeProfile,
    viewProfile,
    sendRose,
    checkDailyRose,
  }

  return {
    init,
    loadProfiles,
    likeProfile,
    dislikeProfile,
    viewProfile,
    sendRose,
    checkDailyRose,
  }
})()

// Initialize on load if we're on the dashboard page
document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname
  if (path.includes("dashboard.html")) {
    console.log("Auto-initializing discover module")
    setTimeout(() => {
      if (window.discoverModule) {
        discoverModule.init()
      }
    }, 500)
  }
})
