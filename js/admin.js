import { Chart } from "@/components/ui/chart"
// Admin Dashboard Module
const adminModule = (() => {
  // Firebase services
  let firebase, auth, db, storage, functions

  // State
  let currentUser = null
  let currentSection = "dashboard"
  let verificationRequests = []
  let selectedVerification = null
  let usersList = []
  let currentPage = 1
  const usersPerPage = 10
  let performanceData = {
    responseTime: [],
    apiCalls: [],
    errorRate: [],
  }

  // Initialize admin module
  const init = () => {
    console.log("Initializing admin module")

    // Show loading overlay
    showLoadingOverlay()

    // Initialize Firebase if not already initialized
    if (!window.firebase) {
      initializeFirebase()
    }

    // Get Firebase services
    if (window.firebase) {
      firebase = window.firebase
      auth = firebase.auth()
      db = firebase.firestore()
      storage = firebase.storage ? firebase.storage() : null
      functions = firebase.functions ? firebase.functions() : null

      // Set up auth state listener
      auth.onAuthStateChanged(handleAuthStateChanged)
    } else {
      console.error("Firebase not initialized in admin module")
      showError("Firebase initialization failed. Please try again later.")
      return
    }

    // Bind back to app button
    const backToAppBtn = document.getElementById("back-to-app-btn")
    if (backToAppBtn) {
      backToAppBtn.addEventListener("click", () => {
        window.location.href = "dashboard.html"
      })
    }

    // Bind login button
    const adminLoginBtn = document.getElementById("admin-login-btn")
    if (adminLoginBtn) {
      adminLoginBtn.addEventListener("click", handleAdminLogin)
    }

    console.log("Admin module initialized")
  }

  // Initialize Firebase
  const initializeFirebase = () => {
    // Your Firebase config
    const firebaseConfig = {
      // This should be replaced with your actual Firebase config
      apiKey: "YOUR_API_KEY",
      authDomain: "YOUR_AUTH_DOMAIN",
      projectId: "YOUR_PROJECT_ID",
      storageBucket: "YOUR_STORAGE_BUCKET",
      messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
      appId: "YOUR_APP_ID",
    }

    // Initialize Firebase
    if (!window.firebase.apps.length) {
      window.firebase.initializeApp(firebaseConfig)
    }
  }

  // Handle auth state changes
  const handleAuthStateChanged = (user) => {
    console.log("Auth state changed:", user ? "User logged in" : "User logged out")

    if (user) {
      // User is signed in
      currentUser = user
      checkAdminAccess()
    } else {
      // User is signed out
      currentUser = null
      showLoginScreen()
    }
  }

  // Handle admin login
  const handleAdminLogin = () => {
    // Show loading overlay
    showLoadingOverlay()

    // Sign in with redirect
    const provider = new firebase.auth.GoogleAuthProvider()
    auth
      .signInWithPopup(provider)
      .then((result) => {
        // This gives you a Google Access Token
        const credential = result.credential
        // The signed-in user info
        const user = result.user
        console.log("User signed in:", user.displayName)
      })
      .catch((error) => {
        console.error("Error during sign in:", error)
        showError("Login failed: " + error.message)
        hideLoadingOverlay()
        showLoginScreen()
      })
  }

  // Check if user has admin access
  const checkAdminAccess = async () => {
    try {
      // List of admin UIDs - only these users can access the admin panel
      const adminUIDs = ["Dhx2L7VTO1ZeF4Ry2y2nX4cmLMo1", "U60X51daggVxsyFzJ01u2LBlLyK2"]

      // Check if current user is in the admin list
      if (!adminUIDs.includes(currentUser.uid)) {
        console.log("Access denied for user:", currentUser.uid)
        showAccessDenied()
        return
      }

      console.log("Admin access granted for user:", currentUser.uid)

      // Get user data to display admin name and photo
      const userDoc = await db.collection("users").doc(currentUser.uid).get()

      // Set admin name and photo
      const adminName = document.getElementById("admin-name")
      const adminPhoto = document.getElementById("admin-photo")

      if (adminName) {
        adminName.textContent = userDoc.exists && userDoc.data().name ? userDoc.data().name : currentUser.email
      }

      if (adminPhoto) {
        if (userDoc.exists && userDoc.data().photoURL) {
          adminPhoto.style.backgroundImage = `url(${userDoc.data().photoURL})`
          adminPhoto.textContent = ""
        } else if (currentUser.photoURL) {
          adminPhoto.style.backgroundImage = `url(${currentUser.photoURL})`
          adminPhoto.textContent = ""
        } else {
          // Set initials
          const name = userDoc.exists && userDoc.data().name ? userDoc.data().name : currentUser.email
          adminPhoto.textContent = name.charAt(0).toUpperCase()
        }
      }

      // Show admin panel
      showAdminPanel()

      // Bind events
      bindEvents()

      // Load dashboard data
      loadDashboardData()
    } catch (error) {
      console.error("Error checking admin access:", error)
      showError("Error checking admin access: " + error.message)
      showLoginScreen()
    }
  }

  // Show loading overlay
  const showLoadingOverlay = () => {
    const loadingOverlay = document.getElementById("loading-overlay")
    if (loadingOverlay) {
      loadingOverlay.classList.remove("hidden")
    }
  }

  // Hide loading overlay
  const hideLoadingOverlay = () => {
    const loadingOverlay = document.getElementById("loading-overlay")
    if (loadingOverlay) {
      loadingOverlay.classList.add("hidden")
    }
  }

  // Show login screen
  const showLoginScreen = () => {
    hideLoadingOverlay()

    // Hide admin panel and access denied
    document.getElementById("admin-page").classList.add("hidden")
    document.getElementById("access-denied-container").classList.add("hidden")

    // Show login container
    document.getElementById("admin-login-container").classList.remove("hidden")
  }

  // Show access denied
  const showAccessDenied = () => {
    hideLoadingOverlay()

    // Hide admin panel and login
    document.getElementById("admin-page").classList.add("hidden")
    document.getElementById("admin-login-container").classList.add("hidden")

    // Show access denied container
    document.getElementById("access-denied-container").classList.remove("hidden")
  }

  // Show admin panel
  const showAdminPanel = () => {
    hideLoadingOverlay()

    // Hide login and access denied
    document.getElementById("admin-login-container").classList.add("hidden")
    document.getElementById("access-denied-container").classList.add("hidden")

    // Show admin panel
    document.getElementById("admin-page").classList.remove("hidden")
  }

  // Show error notification
  const showError = (message) => {
    if (window.utils && window.utils.showNotification) {
      window.utils.showNotification(message, "error")
    } else {
      alert(message)
    }
  }

  // Bind events
  const bindEvents = () => {
    // Navigation
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.addEventListener("click", () => {
        const section = item.getAttribute("data-section")
        showSection(section)
      })
    })

    // Logout button
    const logoutBtn = document.getElementById("admin-logout-btn")
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        auth
          .signOut()
          .then(() => {
            window.location.href = "index.html"
          })
          .catch((error) => {
            console.error("Error signing out:", error)
            showError("Logout failed: " + error.message)
          })
      })
    }

    // Dashboard refresh button
    const refreshDashboard = document.getElementById("refresh-dashboard")
    if (refreshDashboard) {
      refreshDashboard.addEventListener("click", loadDashboardData)
    }

    // Verification filter
    const verificationFilter = document.getElementById("verification-filter")
    if (verificationFilter) {
      verificationFilter.addEventListener("change", () => {
        loadVerificationRequests(verificationFilter.value)
      })
    }

    // Verification refresh button
    const refreshVerification = document.getElementById("refresh-verification")
    if (refreshVerification) {
      refreshVerification.addEventListener("click", () => {
        const filter = document.getElementById("verification-filter").value
        loadVerificationRequests(filter)
      })
    }

    // User search
    const searchBtn = document.getElementById("search-btn")
    if (searchBtn) {
      searchBtn.addEventListener("click", searchUsers)
    }

    // User search input (enter key)
    const userSearch = document.getElementById("user-search")
    if (userSearch) {
      userSearch.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          searchUsers()
        }
      })
    }

    // Pagination
    const prevPage = document.getElementById("prev-page")
    const nextPage = document.getElementById("next-page")

    if (prevPage) {
      prevPage.addEventListener("click", () => {
        if (currentPage > 1) {
          currentPage--
          renderUsersList()
        }
      })
    }

    if (nextPage) {
      nextPage.addEventListener("click", () => {
        const totalPages = Math.ceil(usersList.length / usersPerPage)
        if (currentPage < totalPages) {
          currentPage++
          renderUsersList()
        }
      })
    }

    // Time range for analytics
    const timeRange = document.getElementById("time-range")
    if (timeRange) {
      timeRange.addEventListener("change", () => {
        loadAnalyticsData(timeRange.value)
      })
    }

    // Save verification settings
    const saveVerificationSettingsBtn = document.getElementById("save-verification-settings")
    if (saveVerificationSettingsBtn) {
      saveVerificationSettingsBtn.addEventListener("click", saveVerificationSettings)
    }

    // Save system settings
    const saveSystemSettingsBtn = document.getElementById("save-system-settings")
    if (saveSystemSettingsBtn) {
      saveSystemSettingsBtn.addEventListener("click", saveSystemSettings)
    }

    // Add admin
    const addAdminBtn = document.getElementById("add-admin")
    if (addAdminBtn) {
      addAdminBtn.addEventListener("click", addAdmin)
    }
  }

  // Show section
  const showSection = (section) => {
    // Update current section
    currentSection = section

    // Show loading overlay
    showLoadingOverlay()

    // Update active nav item
    document.querySelectorAll(".nav-item").forEach((item) => {
      if (item.getAttribute("data-section") === section) {
        item.classList.add("active")
      } else {
        item.classList.remove("active")
      }
    })

    // Show/hide sections
    document.querySelectorAll(".content-section").forEach((sectionEl) => {
      if (sectionEl.id === `${section}-section`) {
        sectionEl.classList.remove("hidden")
      } else {
        sectionEl.classList.add("hidden")
      }
    })

    // Load section data
    switch (section) {
      case "dashboard":
        loadDashboardData()
        break
      case "verification":
        loadVerificationRequests("pending")
        break
      case "users":
        loadUsers()
        break
      case "analytics":
        loadAnalyticsData("day")
        break
      case "settings":
        loadSettings()
        break
    }
  }

  // Load dashboard data
  const loadDashboardData = async () => {
    try {
      showLoadingOverlay()

      // Show loading state
      document.getElementById("total-users").textContent = "Loading..."
      document.getElementById("active-users").textContent = "Loading..."
      document.getElementById("total-matches").textContent = "Loading..."
      document.getElementById("pending-verification").textContent = "Loading..."

      // Get counts from Firestore
      const usersSnapshot = await db.collection("users").get()
      const totalUsers = usersSnapshot.size

      // Get active users (active in last 7 days)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      let activeUsers = 0
      usersSnapshot.forEach((doc) => {
        const userData = doc.data()
        if (userData.lastActive && userData.lastActive.toDate() > sevenDaysAgo) {
          activeUsers++
        }
      })

      // Get matches count
      const matchesSnapshot = await db.collection("matches").get()
      const totalMatches = matchesSnapshot.size

      // Get pending verification count
      const verificationSnapshot = await db.collection("users").where("verification.status", "==", "pending").get()
      const pendingVerification = verificationSnapshot.size

      // Update stats
      document.getElementById("total-users").textContent = totalUsers
      document.getElementById("active-users").textContent = activeUsers
      document.getElementById("total-matches").textContent = totalMatches
      document.getElementById("pending-verification").textContent = pendingVerification
      document.getElementById("verification-badge").textContent = pendingVerification

      // Update last updated time
      const lastUpdated = document.getElementById("last-updated")
      if (lastUpdated) {
        const now = new Date()
        lastUpdated.textContent = `Last updated: ${now.toLocaleTimeString()}`
      }

      hideLoadingOverlay()

      // Load charts
      loadUserGrowthChart()
      loadResponseTimeChart()
      loadSystemHealthData()
    } catch (error) {
      console.error("Error loading dashboard data:", error)
      hideLoadingOverlay()

      if (window.utils && window.utils.showNotification) {
        window.utils.showNotification("Error loading dashboard data: " + error.message, "error")
      }
    }
  }

  // Load user growth chart
  const loadUserGrowthChart = async () => {
    try {
      // Get user creation dates
      const usersSnapshot = await db.collection("users").get()

      // Group by month
      const usersByMonth = {}

      usersSnapshot.forEach((doc) => {
        const userData = doc.data()
        if (userData.createdAt) {
          const date = userData.createdAt.toDate()
          const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`

          if (!usersByMonth[monthYear]) {
            usersByMonth[monthYear] = 0
          }

          usersByMonth[monthYear]++
        }
      })

      // Convert to arrays for Chart.js
      const months = Object.keys(usersByMonth).sort((a, b) => {
        const [aMonth, aYear] = a.split("/")
        const [bMonth, bYear] = b.split("/")

        if (aYear !== bYear) {
          return aYear - bYear
        }

        return aMonth - bMonth
      })

      const counts = months.map((month) => usersByMonth[month])

      // Calculate cumulative counts
      const cumulativeCounts = []
      let total = 0

      for (const count of counts) {
        total += count
        cumulativeCounts.push(total)
      }

      // Create chart
      const ctx = document.getElementById("user-growth-chart").getContext("2d")

      if (window.userGrowthChart) {
        window.userGrowthChart.destroy()
      }

      window.userGrowthChart = new Chart(ctx, {
        type: "line",
        data: {
          labels: months,
          datasets: [
            {
              label: "New Users",
              data: counts,
              backgroundColor: "rgba(33, 150, 243, 0.2)",
              borderColor: "rgba(33, 150, 243, 1)",
              borderWidth: 2,
              tension: 0.4,
            },
            {
              label: "Total Users",
              data: cumulativeCounts,
              backgroundColor: "rgba(255, 75, 125, 0.2)",
              borderColor: "rgba(255, 75, 125, 1)",
              borderWidth: 2,
              tension: 0.4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
            },
          },
        },
      })
    } catch (error) {
      console.error("Error loading user growth chart:", error)
    }
  }

  // Load response time chart
  const loadResponseTimeChart = () => {
    try {
      // Generate sample data for now
      // In a real app, this would come from monitoring tools
      const labels = []
      const data = []

      for (let i = 0; i < 24; i++) {
        labels.push(`${i}:00`)
        // Random response time between 50-200ms
        data.push(Math.floor(Math.random() * 150) + 50)
      }

      // Create chart
      const ctx = document.getElementById("response-time-chart").getContext("2d")

      if (window.responseTimeChart) {
        window.responseTimeChart.destroy()
      }

      window.responseTimeChart = new Chart(ctx, {
        type: "line",
        data: {
          labels: labels,
          datasets: [
            {
              label: "Response Time (ms)",
              data: data,
              backgroundColor: "rgba(126, 87, 194, 0.2)",
              borderColor: "rgba(126, 87, 194, 1)",
              borderWidth: 2,
              tension: 0.4,
              fill: true,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
            },
          },
        },
      })
    } catch (error) {
      console.error("Error loading response time chart:", error)
    }
  }

  // Load system health data
  const loadSystemHealthData = () => {
    try {
      // Generate sample data for now
      // In a real app, this would come from monitoring tools
      const apiResponseTime = Math.floor(Math.random() * 100) + 50
      const dbLatency = Math.floor(Math.random() * 50) + 20
      const storagePerformance = Math.floor(Math.random() * 200) + 100
      const authDelay = Math.floor(Math.random() * 80) + 40

      // Update UI
      document.getElementById("api-response-time").textContent = `${apiResponseTime} ms`
      document.getElementById("db-latency").textContent = `${dbLatency} ms`
      document.getElementById("storage-performance").textContent = `${storagePerformance} ms`
      document.getElementById("auth-delay").textContent = `${authDelay} ms`

      // Update status indicators
      updateStatusIndicator("api-status", apiResponseTime, 100, 200)
      updateStatusIndicator("db-status", dbLatency, 50, 100)
      updateStatusIndicator("storage-status", storagePerformance, 200, 300)
      updateStatusIndicator("auth-status", authDelay, 80, 150)
    } catch (error) {
      console.error("Error loading system health data:", error)
    }
  }

  // Update status indicator
  const updateStatusIndicator = (elementId, value, warningThreshold, criticalThreshold) => {
    const element = document.getElementById(elementId)
    if (!element) return

    const indicator = element.querySelector(".status-indicator")
    if (!indicator) return

    let status = "good"
    let text = "Good"

    if (value >= criticalThreshold) {
      status = "critical"
      text = "Critical"
    } else if (value >= warningThreshold) {
      status = "warning"
      text = "Warning"
    }

    indicator.className = `status-indicator ${status}`
    element.innerHTML = `<span class="status-indicator ${status}"></span> ${text}`
  }

  // Load verification requests
  const loadVerificationRequests = async (status = "pending") => {
    try {
      showLoadingOverlay()

      // Show loading state
      const verificationList = document.getElementById("verification-list")
      if (verificationList) {
        verificationList.innerHTML = `
          <div class="empty-state">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Loading verification requests...</p>
          </div>
        `
      }

      // Clear selected verification
      selectedVerification = null

      // Reset verification detail
      const verificationDetail = document.getElementById("verification-detail")
      if (verificationDetail) {
        verificationDetail.innerHTML = `
          <div class="empty-state">
            <i class="fas fa-user-check"></i>
            <p>Select a verification request to view details</p>
          </div>
        `
      }

      // Query Firestore
      let query = db.collection("users")

      if (status !== "all") {
        query = query.where("verification.status", "==", status)
      }

      const snapshot = await query.get()

      // Process results
      verificationRequests = []

      snapshot.forEach((doc) => {
        const userData = doc.data()

        if (userData.verification) {
          verificationRequests.push({
            id: doc.id,
            name: userData.name || "Unknown User",
            email: userData.email || "",
            photoURL: userData.photoURL || "",
            verification: userData.verification,
          })
        }
      })

      // Sort by timestamp (newest first)
      verificationRequests.sort((a, b) => {
        const aTime = a.verification.timestamp ? a.verification.timestamp.toDate() : new Date(0)
        const bTime = b.verification.timestamp ? b.verification.timestamp.toDate() : new Date(0)

        return bTime - aTime
      })

      hideLoadingOverlay()

      // Render list
      renderVerificationList()
    } catch (error) {
      console.error("Error loading verification requests:", error)
      hideLoadingOverlay()

      if (window.utils && window.utils.showNotification) {
        window.utils.showNotification("Error loading verification requests: " + error.message, "error")
      }

      // Show error state
      const verificationList = document.getElementById("verification-list")
      if (verificationList) {
        verificationList.innerHTML = `
          <div class="empty-state">
            <i class="fas fa-exclamation-circle"></i>
            <p>Error loading verification requests. Please try again.</p>
          </div>
        `
      }
    }
  }

  // Render verification list
  const renderVerificationList = () => {
    const verificationList = document.getElementById("verification-list")
    if (!verificationList) return

    if (verificationRequests.length === 0) {
      verificationList.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-user-check"></i>
          <p>No verification requests found</p>
        </div>
      `
      return
    }

    let html = ""

    verificationRequests.forEach((request) => {
      const timestamp = request.verification.timestamp
        ? request.verification.timestamp.toDate().toLocaleDateString()
        : "Unknown"

      html += `
        <div class="verification-item" data-id="${request.id}">
          <div class="verification-item-header">
            <span class="verification-item-name">${request.name}</span>
            <span class="verification-item-date">${timestamp}</span>
          </div>
          <div class="verification-item-status ${request.verification.status}">
            ${request.verification.status}
          </div>
        </div>
      `
    })

    verificationList.innerHTML = html

    // Add click event to items
    document.querySelectorAll(".verification-item").forEach((item) => {
      item.addEventListener("click", () => {
        const id = item.getAttribute("data-id")
        selectVerification(id)

        // Update active class
        document.querySelectorAll(".verification-item").forEach((i) => {
          i.classList.remove("active")
        })
        item.classList.add("active")
      })
    })
  }

  // Select verification
  const selectVerification = (id) => {
    // Find verification request
    const request = verificationRequests.find((r) => r.id === id)
    if (!request) return

    // Set selected verification
    selectedVerification = request

    // Render detail view
    const verificationDetail = document.getElementById("verification-detail")
    if (!verificationDetail) return

    const timestamp = request.verification.timestamp
      ? request.verification.timestamp.toDate().toLocaleString()
      : "Unknown"

    verificationDetail.innerHTML = `
      <div class="verification-detail-header">
        <div class="verification-detail-user">
          <img src="${request.photoURL || "images/default-avatar.png"}" alt="${request.name}" class="verification-detail-photo">
          <div class="verification-detail-info">
            <h3>${request.name}</h3>
            <p>${request.email}</p>
          </div>
        </div>
        <div class="verification-detail-status ${request.verification.status}">
          ${request.verification.status}
        </div>
      </div>
      
      <div class="verification-detail-content">
        <p><strong>Submitted:</strong> ${timestamp}</p>
        
        <div class="verification-photos">
          <div class="verification-photo">
            <img src="${request.verification.photoURL}" alt="Verification photo">
            <p class="verification-photo-label">Verification Photo</p>
          </div>
          <div class="verification-photo">
            <img src="${request.photoURL}" alt="Profile photo">
            <p class="verification-photo-label">Profile Photo</p>
          </div>
        </div>
      </div>
      
      <div class="verification-actions">
        <button class="approve-btn" id="approve-verification">Approve</button>
        <button class="reject-btn" id="reject-verification">Reject</button>
      </div>
    `

    // Add event listeners
    const approveBtn = document.getElementById("approve-verification")
    const rejectBtn = document.getElementById("reject-verification")

    if (approveBtn) {
      approveBtn.addEventListener("click", () => updateVerificationStatus("verified"))
    }

    if (rejectBtn) {
      rejectBtn.addEventListener("click", () => updateVerificationStatus("rejected"))
    }
  }

  // Update verification status
  const updateVerificationStatus = async (status) => {
    try {
      if (!selectedVerification) return

      // Update Firestore
      await db.collection("users").doc(selectedVerification.id).update({
        "verification.status": status,
        "verification.reviewedAt": firebase.firestore.FieldValue.serverTimestamp(),
        "verification.reviewedBy": currentUser.uid,
      })

      // Show notification
      if (window.utils && window.utils.showNotification) {
        window.utils.showNotification(
          `Verification ${status === "verified" ? "approved" : "rejected"} successfully`,
          "success",
        )
      }

      // Update local data
      selectedVerification.verification.status = status

      // Update UI
      const statusElement = document.querySelector(".verification-detail-status")
      if (statusElement) {
        statusElement.className = `verification-detail-status ${status}`
        statusElement.textContent = status
      }

      // Update list item
      const listItem = document.querySelector(`.verification-item[data-id="${selectedVerification.id}"]`)
      if (listItem) {
        const statusElement = listItem.querySelector(".verification-item-status")
        if (statusElement) {
          statusElement.className = `verification-item-status ${status}`
          statusElement.textContent = status
        }
      }

      // Reload verification count
      loadDashboardData()
    } catch (error) {
      console.error("Error updating verification status:", error)

      if (window.utils && window.utils.showNotification) {
        window.utils.showNotification("Error updating verification status", "error")
      }
    }
  }

  // Load users
  const loadUsers = async () => {
    try {
      showLoadingOverlay()

      // Show loading state
      const usersTableBody = document.getElementById("users-table-body")
      if (usersTableBody) {
        usersTableBody.innerHTML = `
          <tr>
            <td colspan="7" class="text-center">Loading users...</td>
          </tr>
        `
      }

      // Query Firestore
      const snapshot = await db.collection("users").get()

      // Process results
      usersList = []

      snapshot.forEach((doc) => {
        const userData = doc.data()

        usersList.push({
          id: doc.id,
          name: userData.name || "Unknown User",
          email: userData.email || "",
          photoURL: userData.photoURL || "",
          createdAt: userData.createdAt,
          lastActive: userData.lastActive,
          status: userData.status || "active",
          verified: userData.verification && userData.verification.status === "verified",
        })
      })

      // Sort by creation date (newest first)
      usersList.sort((a, b) => {
        const aTime = a.createdAt ? a.createdAt.toDate() : new Date(0)
        const bTime = b.createdAt ? b.createdAt.toDate() : new Date(0)

        return bTime - aTime
      })

      hideLoadingOverlay()

      // Render users
      renderUsersList()
    } catch (error) {
      console.error("Error loading users:", error)
      hideLoadingOverlay()

      if (window.utils && window.utils.showNotification) {
        window.utils.showNotification("Error loading users: " + error.message, "error")
      }

      // Show error state
      const usersTableBody = document.getElementById("users-table-body")
      if (usersTableBody) {
        usersTableBody.innerHTML = `
          <tr>
            <td colspan="7" class="text-center">Error loading users. Please try again.</td>
          </tr>
        `
      }
    }
  }

  // Render users list
  const renderUsersList = () => {
    const usersTableBody = document.getElementById("users-table-body")
    if (!usersTableBody) return

    if (usersList.length === 0) {
      usersTableBody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center">No users found</td>
        </tr>
      `
      return
    }

    // Calculate pagination
    const totalPages = Math.ceil(usersList.length / usersPerPage)
    const startIndex = (currentPage - 1) * usersPerPage
    const endIndex = Math.min(startIndex + usersPerPage, usersList.length)
    const currentUsers = usersList.slice(startIndex, endIndex)

    // Update pagination controls
    const prevPageBtn = document.getElementById("prev-page")
    const nextPageBtn = document.getElementById("next-page")
    const pageInfo = document.getElementById("page-info")

    if (prevPageBtn) {
      prevPageBtn.disabled = currentPage === 1
    }

    if (nextPageBtn) {
      nextPageBtn.disabled = currentPage === totalPages
    }

    if (pageInfo) {
      pageInfo.textContent = `Page ${currentPage} of ${totalPages}`
    }

    // Render users
    let html = ""

    currentUsers.forEach((user) => {
      const createdAt = user.createdAt ? user.createdAt.toDate().toLocaleDateString() : "Unknown"

      html += `
        <tr>
          <td>${user.id}</td>
          <td>
            <div style="display: flex; align-items: center;">
              <img src="${user.photoURL || "images/default-avatar.png"}" alt="${user.name}" style="width: 30px; height: 30px; border-radius: 50%; margin-right: 10px;">
              ${user.name}
            </div>
          </td>
          <td>${user.email}</td>
          <td>${createdAt}</td>
          <td><span class="user-status ${user.status}">${user.status}</span></td>
          <td class="user-verified">${user.verified ? '<i class="fas fa-check-circle"></i>' : ""}</td>
          <td class="user-actions">
            <button class="user-action-btn" data-action="view" data-id="${user.id}">
              <i class="fas fa-eye"></i>
            </button>
            <button class="user-action-btn" data-action="edit" data-id="${user.id}">
              <i class="fas fa-edit"></i>
            </button>
            <button class="user-action-btn" data-action="delete" data-id="${user.id}">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        </tr>
      `
    })

    usersTableBody.innerHTML = html

    // Add click events to action buttons
    document.querySelectorAll(".user-action-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = btn.getAttribute("data-action")
        const id = btn.getAttribute("data-id")

        handleUserAction(action, id)
      })
    })
  }

  // Handle user action
  const handleUserAction = (action, id) => {
    // Find user
    const user = usersList.find((u) => u.id === id)
    if (!user) return

    switch (action) {
      case "view":
        // In a real app, this would open a modal or navigate to user detail page
        alert(`View user: ${user.name}`)
        break
      case "edit":
        // In a real app, this would open a modal or navigate to user edit page
        alert(`Edit user: ${user.name}`)
        break
      case "delete":
        // Confirm deletion
        if (confirm(`Are you sure you want to delete user ${user.name}?`)) {
          deleteUser(id)
        }
        break
    }
  }

  // Delete user
  const deleteUser = async (id) => {
    try {
      // Delete user document
      await db.collection("users").doc(id).delete()

      // Show notification
      if (window.utils && window.utils.showNotification) {
        window.utils.showNotification("User deleted successfully", "success")
      }

      // Remove from list
      usersList = usersList.filter((u) => u.id !== id)

      // Re-render list
      renderUsersList()

      // Reload dashboard data
      loadDashboardData()
    } catch (error) {
      console.error("Error deleting user:", error)

      if (window.utils && window.utils.showNotification) {
        window.utils.showNotification("Error deleting user", "error")
      }
    }
  }

  // Search users
  const searchUsers = () => {
    const searchInput = document.getElementById("user-search")
    if (!searchInput) return

    const query = searchInput.value.toLowerCase().trim()

    if (query === "") {
      // Reset to original list
      loadUsers()
      return
    }

    // Filter users
    const filteredUsers = usersList.filter((user) => {
      return (
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.id.toLowerCase().includes(query)
      )
    })

    // Update list
    usersList = filteredUsers

    // Reset pagination
    currentPage = 1

    // Render filtered list
    renderUsersList()
  }

  // Load analytics data
  const loadAnalyticsData = (timeRange) => {
    try {
      // In a real app, this would fetch data from a monitoring service
      // For this demo, we'll generate random data

      // Generate sample data
      generatePerformanceData(timeRange)

      // Update metrics
      updatePerformanceMetrics()

      // Render charts
      renderResponseTrendChart(timeRange)
      renderEndpointPerformanceChart()
      renderErrorDistributionChart()
      renderUserActivityChart(timeRange)
    } catch (error) {
      console.error("Error loading analytics data:", error)

      if (window.utils && window.utils.showNotification) {
        window.utils.showNotification("Error loading analytics data", "error")
      }
    }
  }

  // Generate performance data
  const generatePerformanceData = (timeRange) => {
    // Clear existing data
    performanceData = {
      responseTime: [],
      apiCalls: [],
      errorRate: [],
    }

    // Generate data based on time range
    let dataPoints = 24
    let labelFormat = "HH:mm"

    if (timeRange === "week") {
      dataPoints = 7
      labelFormat = "ddd"
    } else if (timeRange === "month") {
      dataPoints = 30
      labelFormat = "MMM D"
    }

    // Generate labels
    const labels = []
    const now = new Date()

    for (let i = 0; i < dataPoints; i++) {
      const date = new Date()

      if (timeRange === "day") {
        date.setHours(now.getHours() - (dataPoints - 1) + i)
        labels.push(`${date.getHours()}:00`)
      } else if (timeRange === "week") {
        date.setDate(now.getDate() - (dataPoints - 1) + i)
        labels.push(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()])
      } else if (timeRange === "month") {
        date.setDate(now.getDate() - (dataPoints - 1) + i)
        labels.push(`${date.getMonth() + 1}/${date.getDate()}`)
      }
    }

    // Generate data
    for (let i = 0; i < dataPoints; i++) {
      // Response time: 50-200ms with some spikes
      let responseTime = Math.floor(Math.random() * 100) + 50

      // Add occasional spikes
      if (Math.random() < 0.1) {
        responseTime += Math.floor(Math.random() * 300)
      }

      // API calls: 100-500 per hour/day
      const apiCalls = Math.floor(Math.random() * 400) + 100

      // Error rate: 0-5%
      const errorRate = Math.random() * 5

      performanceData.responseTime.push(responseTime)
      performanceData.apiCalls.push(apiCalls)
      performanceData.errorRate.push(errorRate)
    }

    // Add labels
    performanceData.labels = labels
  }

  // Update performance metrics
  const updatePerformanceMetrics = () => {
    // Calculate averages
    const avgResponseTime =
      performanceData.responseTime.reduce((sum, val) => sum + val, 0) / performanceData.responseTime.length
    const peakResponseTime = Math.max(...performanceData.responseTime)
    const avgApiCalls = performanceData.apiCalls.reduce((sum, val) => sum + val, 0) / performanceData.apiCalls.length
    const avgErrorRate = performanceData.errorRate.reduce((sum, val) => sum + val, 0) / performanceData.errorRate.length

    // Update UI
    document.getElementById("avg-response-time").textContent = `${Math.round(avgResponseTime)} ms`
    document.getElementById("peak-response-time").textContent = `${peakResponseTime} ms`
    document.getElementById("api-calls").textContent = Math.round(avgApiCalls)
    document.getElementById("error-rate").textContent = `${avgErrorRate.toFixed(2)}%`
  }

  // Render response trend chart
  const renderResponseTrendChart = (timeRange) => {
    const ctx = document.getElementById("response-trend-chart").getContext("2d")

    if (window.responseTrendChart) {
      window.responseTrendChart.destroy()
    }

    window.responseTrendChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: performanceData.labels,
        datasets: [
          {
            label: "Response Time (ms)",
            data: performanceData.responseTime,
            backgroundColor: "rgba(255, 75, 125, 0.2)",
            borderColor: "rgba(255, 75, 125, 1)",
            borderWidth: 2,
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Response Time (ms)",
            },
          },
          x: {
            title: {
              display: true,
              text: timeRange === "day" ? "Hour" : timeRange === "week" ? "Day" : "Date",
            },
          },
        },
      },
    })
  }

  // Render endpoint performance chart
  const renderEndpointPerformanceChart = () => {
    const ctx = document.getElementById("endpoint-performance-chart").getContext("2d")

    if (window.endpointPerformanceChart) {
      window.endpointPerformanceChart.destroy()
    }

    // Sample data for endpoints
    const endpoints = ["User Profile", "Authentication", "Matches", "Messages", "Discover"]

    const responseTimes = endpoints.map(() => Math.floor(Math.random() * 150) + 50)

    window.endpointPerformanceChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: endpoints,
        datasets: [
          {
            label: "Avg. Response Time (ms)",
            data: responseTimes,
            backgroundColor: [
              "rgba(255, 75, 125, 0.7)",
              "rgba(126, 87, 194, 0.7)",
              "rgba(33, 150, 243, 0.7)",
              "rgba(76, 175, 80, 0.7)",
              "rgba(255, 152, 0, 0.7)",
            ],
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Response Time (ms)",
            },
          },
        },
      },
    })
  }

  // Render error distribution chart
  const renderErrorDistributionChart = () => {
    const ctx = document.getElementById("error-distribution-chart").getContext("2d")

    if (window.errorDistributionChart) {
      window.errorDistributionChart.destroy()
    }

    // Sample data for error types
    const errorTypes = ["Authentication", "Database", "Storage", "Network", "Client"]

    const errorCounts = errorTypes.map(() => Math.floor(Math.random() * 50))

    window.errorDistributionChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: errorTypes,
        datasets: [
          {
            data: errorCounts,
            backgroundColor: [
              "rgba(244, 67, 54, 0.7)",
              "rgba(255, 152, 0, 0.7)",
              "rgba(255, 235, 59, 0.7)",
              "rgba(33, 150, 243, 0.7)",
              "rgba(158, 158, 158, 0.7)",
            ],
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "right",
          },
        },
      },
    })
  }

  // Render user activity chart
  const renderUserActivityChart = (timeRange) => {
    const ctx = document.getElementById("user-activity-chart").getContext("2d")

    if (window.userActivityChart) {
      window.userActivityChart.destroy()
    }

    // Generate sample data
    const activeUsers = performanceData.labels.map(() => Math.floor(Math.random() * 100) + 50)
    const newMatches = performanceData.labels.map(() => Math.floor(Math.random() * 30) + 5)
    const messages = performanceData.labels.map(() => Math.floor(Math.random() * 200) + 100)

    window.userActivityChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: performanceData.labels,
        datasets: [
          {
            label: "Active Users",
            data: activeUsers,
            backgroundColor: "rgba(33, 150, 243, 0.2)",
            borderColor: "rgba(33, 150, 243, 1)",
            borderWidth: 2,
            tension: 0.4,
            yAxisID: "y",
          },
          {
            label: "New Matches",
            data: newMatches,
            backgroundColor: "rgba(255, 75, 125, 0.2)",
            borderColor: "rgba(255, 75, 125, 1)",
            borderWidth: 2,
            tension: 0.4,
            yAxisID: "y1",
          },
          {
            label: "Messages Sent",
            data: messages,
            backgroundColor: "rgba(76, 175, 80, 0.2)",
            borderColor: "rgba(76, 175, 80, 1)",
            borderWidth: 2,
            tension: 0.4,
            yAxisID: "y2",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            position: "left",
            title: {
              display: true,
              text: "Active Users",
            },
          },
          y1: {
            beginAtZero: true,
            position: "right",
            grid: {
              drawOnChartArea: false,
            },
            title: {
              display: true,
              text: "New Matches",
            },
          },
          y2: {
            beginAtZero: true,
            position: "right",
            grid: {
              drawOnChartArea: false,
            },
            title: {
              display: true,
              text: "Messages",
            },
            display: false,
          },
          x: {
            title: {
              display: true,
              text: timeRange === "day" ? "Hour" : timeRange === "week" ? "Day" : "Date",
            },
          },
        },
      },
    })
  }

  // Load settings
  const loadSettings = async () => {
    try {
      showLoadingOverlay()

      // Load verification settings
      const verificationSettings = await db.collection("settings").doc("verification").get()

      if (verificationSettings.exists) {
        const data = verificationSettings.data()
        document.getElementById("auto-approve").checked = data.autoApprove || false
        document.getElementById("verification-expiry").value = data.expiryDays || 90
      } else {
        // Default values
        document.getElementById("auto-approve").checked = false
        document.getElementById("verification-expiry").value = 90
      }

      // Load system settings
      const systemSettings = await db.collection("settings").doc("system").get()

      if (systemSettings.exists) {
        const data = systemSettings.data()
        document.getElementById("maintenance-mode").checked = data.maintenanceMode || false
        document.getElementById("analytics-retention").value = data.analyticsRetentionDays || 30
      } else {
        // Default values
        document.getElementById("maintenance-mode").checked = false
        document.getElementById("analytics-retention").value = 30
      }

      // Load admin users
      await loadAdminUsers()

      hideLoadingOverlay()
    } catch (error) {
      console.error("Error loading settings:", error)
      hideLoadingOverlay()

      if (window.utils && window.utils.showNotification) {
        window.utils.showNotification("Error loading settings: " + error.message, "error")
      }
    }
  }

  // Load admin users
  const loadAdminUsers = async () => {
    try {
      // Hardcoded admin UIDs
      const adminUIDs = ["Dhx2L7VTO1ZeF4Ry2y2nX4cmLMo1", "U60X51daggVxsyFzJ01u2LBlLyK2"]

      const adminList = document.getElementById("admin-list")
      if (!adminList) return

      // Get user data for each admin
      const adminUsers = []
      for (const adminId of adminUIDs) {
        const userDoc = await db.collection("users").doc(adminId).get()
        if (userDoc.exists) {
          adminUsers.push({
            id: adminId,
            email: userDoc.data().email || "Unknown",
            name: userDoc.data().name || "Unknown User",
          })
        }
      }

      if (adminUsers.length === 0) {
        adminList.innerHTML = "<li>No admin users found</li>"
        return
      }

      let html = ""

      adminUsers.forEach((admin) => {
        html += `
          <li>
            <span>${admin.email || admin.name || admin.id}</span>
            <button class="remove-admin" data-id="${admin.id}" disabled title="Admin removal is disabled">
              <i class="fas fa-lock"></i>
            </button>
          </li>
        `
      })

      adminList.innerHTML = html
    } catch (error) {
      console.error("Error loading admin users:", error)

      if (window.utils && window.utils.showNotification) {
        window.utils.showNotification("Error loading admin users: " + error.message, "error")
      }
    }
  }

  // Add admin
  const addAdmin = async () => {
    try {
      const emailInput = document.getElementById("admin-email")
      if (!emailInput) return

      const email = emailInput.value.trim()

      if (!email) {
        if (window.utils && window.utils.showNotification) {
          window.utils.showNotification("Please enter an email address", "error")
        }
        return
      }

      // Find user by email
      const snapshot = await db.collection("users").where("email", "==", email).get()

      if (snapshot.empty) {
        if (window.utils && window.utils.showNotification) {
          window.utils.showNotification("User not found with that email", "error")
        }
        return
      }

      // Get first matching user
      const userDoc = snapshot.docs[0]
      const userId = userDoc.id

      // List of admin UIDs - only these users can be admins
      const adminUIDs = ["Dhx2L7VTO1ZeF4Ry2y2nX4cmLMo1", "U60X51daggVxsyFzJ01u2LBlLyK2"]

      // Check if user is already in the admin list
      if (adminUIDs.includes(userId)) {
        if (window.utils && window.utils.showNotification) {
          window.utils.showNotification("User is already an admin", "info")
        }
        return
      }

      if (window.utils && window.utils.showNotification) {
        window.utils.showNotification("Cannot add new admins. Admin list is restricted.", "error")
      }

      // Clear input
      emailInput.value = ""
    } catch (error) {
      console.error("Error adding admin:", error)

      if (window.utils && window.utils.showNotification) {
        window.utils.showNotification("Error adding admin: " + error.message, "error")
      }
    }
  }

  // Remove admin
  const removeAdmin = async (id) => {
    try {
      // Hardcoded admin UIDs that cannot be removed
      const adminUIDs = ["Dhx2L7VTO1ZeF4Ry2y2nX4cmLMo1", "U60X51daggVxsyFzJ01u2LBlLyK2"]

      // Check if trying to remove a hardcoded admin
      if (adminUIDs.includes(id)) {
        if (window.utils && window.utils.showNotification) {
          window.utils.showNotification("Cannot remove hardcoded admin users", "error")
        }
        return
      }

      // This code should never execute since we've disabled the remove buttons
      // But keeping it as a fallback security measure
      if (window.utils && window.utils.showNotification) {
        window.utils.showNotification("Admin removal is disabled", "error")
      }
    } catch (error) {
      console.error("Error removing admin:", error)

      if (window.utils && window.utils.showNotification) {
        window.utils.showNotification("Error removing admin", "error")
      }
    }
  }

  // Save verification settings
  const saveVerificationSettings = async () => {
    try {
      showLoadingOverlay()

      const autoApprove = document.getElementById("auto-approve").checked
      const verificationExpiry = Number.parseInt(document.getElementById("verification-expiry").value)

      // Validate input
      if (isNaN(verificationExpiry) || verificationExpiry < 0 || verificationExpiry > 365) {
        showError("Please enter a valid expiration period (0-365 days)")
        hideLoadingOverlay()
        return
      }

      // Save settings to Firestore
      await db.collection("settings").doc("verification").set({
        autoApprove: autoApprove,
        expiryDays: verificationExpiry,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: currentUser.uid,
      })

      hideLoadingOverlay()

      // Show success notification
      if (window.utils && window.utils.showNotification) {
        window.utils.showNotification("Verification settings saved successfully", "success")
      }
    } catch (error) {
      console.error("Error saving verification settings:", error)
      hideLoadingOverlay()

      if (window.utils && window.utils.showNotification) {
        window.utils.showNotification("Error saving verification settings: " + error.message, "error")
      }
    }
  }

  // Save system settings
  const saveSystemSettings = async () => {
    try {
      showLoadingOverlay()

      const maintenanceMode = document.getElementById("maintenance-mode").checked
      const analyticsRetention = Number.parseInt(document.getElementById("analytics-retention").value)

      // Validate input
      if (isNaN(analyticsRetention) || analyticsRetention < 1 || analyticsRetention > 365) {
        showError("Please enter a valid retention period (1-365 days)")
        hideLoadingOverlay()
        return
      }

      // Save settings to Firestore
      await db.collection("settings").doc("system").set({
        maintenanceMode: maintenanceMode,
        analyticsRetentionDays: analyticsRetention,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: currentUser.uid,
      })

      hideLoadingOverlay()

      // Show success notification
      if (window.utils && window.utils.showNotification) {
        window.utils.showNotification("System settings saved successfully", "success")
      }
    } catch (error) {
      console.error("Error saving system settings:", error)
      hideLoadingOverlay()

      if (window.utils && window.utils.showNotification) {
        window.utils.showNotification("Error saving system settings: " + error.message, "error")
      }
    }
  }

  // Expose module
  window.adminModule = {
    init,
    loadDashboardData,
    loadVerificationRequests,
    loadUsers,
    loadAnalyticsData,
    loadSettings,
  }

  return {
    init,
    loadDashboardData,
    loadVerificationRequests,
    loadUsers,
    loadAnalyticsData,
    loadSettings,
  }
})()

// Initialize on load
document.addEventListener("DOMContentLoaded", () => {
  console.log("Initializing admin module")
  if (window.adminModule) {
    adminModule.init()
  }
})
