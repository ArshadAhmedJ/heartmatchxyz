// Immediately expose the authModule to the global scope
window.authModule = (() => {
  // Import Firebase and Utils (replace with your actual import method)
  // For example, if you're using modules:
  // import * as firebase from 'firebase/app';
  // import 'firebase/auth';
  // import 'firebase/firestore';
  // import * as utils from './utils.js';

  // If you're using script tags, ensure Firebase and Utils are loaded before this script.
  // You might need to declare them if they are not globally available.
  if (typeof firebase === "undefined") {
    console.error("Firebase is not defined. Ensure Firebase SDK is included in your HTML.")
    // You might want to initialize a mock firebase object for development purposes:
    // firebase = { auth: () => ({ signInWithEmailAndPassword: () => Promise.reject('Firebase not initialized') }) };
  }

  if (typeof utils === "undefined") {
    console.error("Utils is not defined. Ensure utils.js is included in your HTML.")
    // You might want to initialize a mock utils object for development purposes:
    // utils = { showNotification: (message, type) => console.log(`${type}: ${message}`), isValidEmail: () => true, isStrongPassword: () => true };
  }

  // DOM elements
  let authPage,
    loginForm,
    signupForm,
    forgotPasswordForm,
    loginTab,
    signupTab,
    forgotPasswordLink,
    backToLoginLink,
    googleAuthBtn

  // Initialize auth module
  const init = () => {
    console.log("Auth module init called")

    // Get DOM elements after the page has loaded
    authPage = document.getElementById("auth-page")
    loginForm = document.getElementById("login-form")
    signupForm = document.getElementById("signup-form")
    forgotPasswordForm = document.getElementById("forgot-password-form")
    loginTab = document.getElementById("login-tab")
    signupTab = document.getElementById("signup-tab")
    forgotPasswordLink = document.getElementById("forgot-password-link")
    backToLoginLink = document.getElementById("back-to-login-link")
    googleAuthBtn = document.getElementById("google-auth-btn")

    // Log the Google auth button to check if it's found
    console.log("Google auth button:", googleAuthBtn)

    bindEvents()

    // Check URL parameters to show the correct form
    const urlParams = new URLSearchParams(window.location.search)
    const formType = urlParams.get("form")
    if (formType === "signup") {
      showSignupForm()
    } else {
      showLoginForm()
    }

    // Add a fallback for event listeners in case they weren't attached properly
    setTimeout(bindEventsFallback, 500)
  }

  // Show login form
  const showLoginForm = () => {
    console.log("Showing login form")

    if (loginTab) {
      loginTab.classList.add("active")
    }

    if (signupTab) {
      signupTab.classList.remove("active")
    }

    if (loginForm) {
      loginForm.classList.remove("hidden")
    }

    if (signupForm) {
      signupForm.classList.add("hidden")
    }

    if (forgotPasswordForm) {
      forgotPasswordForm.classList.add("hidden")
    }
  }

  // Show signup form
  const showSignupForm = () => {
    console.log("Showing signup form")

    if (signupTab) {
      signupTab.classList.add("active")
    }

    if (loginTab) {
      loginTab.classList.remove("active")
    }

    if (signupForm) {
      signupForm.classList.remove("hidden")
    }

    if (loginForm) {
      loginForm.classList.add("hidden")
    }

    if (forgotPasswordForm) {
      forgotPasswordForm.classList.add("hidden")
    }
  }

  // Show forgot password form
  const showForgotPasswordForm = () => {
    console.log("Showing forgot password form")

    if (forgotPasswordForm) {
      forgotPasswordForm.classList.remove("hidden")
    }

    if (loginForm) {
      loginForm.classList.add("hidden")
    }

    if (signupForm) {
      signupForm.classList.add("hidden")
    }
  }

  // Login with email and password
  const login = async (email, password) => {
    console.log("Login attempt with email:", email)

    try {
      await firebase.auth().signInWithEmailAndPassword(email, password)
      utils.showNotification("Login successful!", "success")

      // Check if user has a profile after successful login
      const user = firebase.auth().currentUser
      const userDoc = await firebase.firestore().collection("users").doc(user.uid).get()

      if (userDoc.exists) {
        console.log("User profile exists, redirecting to dashboard")
        window.location.href = "dashboard.html"
      } else {
        console.log("User profile doesn't exist, redirecting to onboarding")
        window.location.href = "onboarding.html"
      }
    } catch (error) {
      console.error("Login error:", error)
      let errorMessage = "Login failed. Please try again."

      switch (error.code) {
        case "auth/user-not-found":
          errorMessage = "No account found with this email."
          break
        case "auth/wrong-password":
          errorMessage = "Incorrect password. Please try again."
          break
        case "auth/invalid-email":
          errorMessage = "Invalid email address."
          break
        case "auth/user-disabled":
          errorMessage = "This account has been disabled."
          break
      }

      utils.showNotification(errorMessage, "error")
    }
  }

  // Sign up with email and password
  const signup = async (email, password) => {
    console.log("Signup attempt with email:", email)

    try {
      // Create the user account
      const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password)
      const user = userCredential.user

      utils.showNotification("Account created successfully!", "success")

      // Check if user already has a profile
      const userDoc = await firebase.firestore().collection("users").doc(user.uid).get()

      if (userDoc.exists) {
        console.log("User profile already exists, redirecting to dashboard")
        window.location.href = "dashboard.html"
      } else {
        console.log("User profile doesn't exist, redirecting to onboarding")
        window.location.href = "onboarding.html"
      }
    } catch (error) {
      console.error("Signup error:", error)
      let errorMessage = "Signup failed. Please try again."

      switch (error.code) {
        case "auth/email-already-in-use":
          errorMessage = "This email is already in use."
          break
        case "auth/invalid-email":
          errorMessage = "Invalid email address."
          break
        case "auth/weak-password":
          errorMessage = "Password is too weak. Please use a stronger password."
          break
      }

      utils.showNotification(errorMessage, "error")
    }
  }

  // Reset password
  const resetPassword = async (email) => {
    console.log("Password reset attempt for email:", email)

    try {
      await firebase.auth().sendPasswordResetEmail(email)
      utils.showNotification("Password reset email sent. Please check your inbox.", "success")
      showLoginForm()
    } catch (error) {
      console.error("Reset password error:", error)
      let errorMessage = "Password reset failed. Please try again."

      switch (error.code) {
        case "auth/user-not-found":
          errorMessage = "No account found with this email."
          break
        case "auth/invalid-email":
          errorMessage = "Invalid email address."
          break
      }

      utils.showNotification(errorMessage, "error")
    }
  }

  // Sign in with Google
  const signInWithGoogle = async () => {
    console.log("Google sign-in attempt")

    try {
      // Make sure Firebase Auth is available
      if (!firebase.auth) {
        console.error("Firebase Auth is not available")
        utils.showNotification("Authentication service is not available. Please try again later.", "error")
        return
      }

      // Create a Google Auth Provider with custom parameters
      const provider = new firebase.auth.GoogleAuthProvider()

      // Add scopes if needed
      provider.addScope("email")
      provider.addScope("profile")

      // Set custom parameters
      provider.setCustomParameters({
        prompt: "select_account",
      })

      console.log("Google provider created:", provider)

      // Sign in with popup
      const userCredential = await firebase.auth().signInWithPopup(provider)
      const user = userCredential.user

      console.log("Google sign-in successful:", user)
      utils.showNotification("Google sign-in successful!", "success")

      // Check if user already has a profile
      const userDoc = await firebase.firestore().collection("users").doc(user.uid).get()

      if (userDoc.exists) {
        console.log("User profile already exists, redirecting to dashboard")
        window.location.href = "dashboard.html"
      } else {
        console.log("User profile doesn't exist, redirecting to onboarding")
        window.location.href = "onboarding.html"
      }
    } catch (error) {
      console.error("Google sign-in error:", error)
      let errorMessage = "Google sign-in failed. Please try again."

      // Handle specific error codes
      if (error.code === "auth/popup-blocked") {
        errorMessage = "Pop-up was blocked by your browser. Please allow pop-ups for this site."
      } else if (error.code === "auth/popup-closed-by-user") {
        errorMessage = "Sign-in was cancelled. Please try again."
      } else if (error.code === "auth/cancelled-popup-request") {
        errorMessage = "Multiple pop-up requests were detected. Please try again."
      } else if (error.code === "auth/network-request-failed") {
        errorMessage = "Network error. Please check your internet connection and try again."
      }

      utils.showNotification(errorMessage, "error")
    }
  }

  // Logout
  const logout = async () => {
    console.log("Logout attempt")

    try {
      await firebase.auth().signOut()
      utils.showNotification("Logout successful!", "success")
      window.location.href = "index.html"
    } catch (error) {
      console.error("Logout error:", error)
      utils.showNotification("Logout failed. Please try again.", "error")
    }
  }

  // Bind events
  const bindEvents = () => {
    console.log("Binding auth page events")

    // Login form
    if (loginForm) {
      loginForm.onsubmit = (e) => {
        e.preventDefault()
        const email = loginForm.querySelector("#login-email").value.trim()
        const password = loginForm.querySelector("#login-password").value

        if (!email || !password) {
          utils.showNotification("Please enter both email and password.", "error")
          return
        }

        if (!utils.isValidEmail(email)) {
          utils.showNotification("Please enter a valid email address.", "error")
          return
        }

        login(email, password)
      }
    }

    // Signup form
    if (signupForm) {
      signupForm.onsubmit = (e) => {
        e.preventDefault()
        const email = signupForm.querySelector("#signup-email").value.trim()
        const password = signupForm.querySelector("#signup-password").value
        const confirmPassword = signupForm.querySelector("#signup-confirm-password").value

        if (!email || !password || !confirmPassword) {
          utils.showNotification("Please fill in all fields.", "error")
          return
        }

        if (!utils.isValidEmail(email)) {
          utils.showNotification("Please enter a valid email address.", "error")
          return
        }

        if (!utils.isStrongPassword(password)) {
          utils.showNotification(
            "Password must be at least 8 characters long and include uppercase, lowercase, and numbers.",
            "error",
          )
          return
        }

        if (password !== confirmPassword) {
          utils.showNotification("Passwords do not match.", "error")
          return
        }

        signup(email, password)
      }
    }

    // Forgot password form
    if (forgotPasswordForm) {
      forgotPasswordForm.onsubmit = (e) => {
        e.preventDefault()
        const email = forgotPasswordForm.querySelector("#forgot-email").value.trim()

        if (!email) {
          utils.showNotification("Please enter your email address.", "error")
          return
        }

        if (!utils.isValidEmail(email)) {
          utils.showNotification("Please enter a valid email address.", "error")
          return
        }

        resetPassword(email)
      }
    }

    // Login tab
    if (loginTab) {
      loginTab.onclick = (e) => {
        e.preventDefault()
        showLoginForm()
      }
    }

    // Signup tab
    if (signupTab) {
      signupTab.onclick = (e) => {
        e.preventDefault()
        showSignupForm()
      }
    }

    // Forgot password link
    if (forgotPasswordLink) {
      forgotPasswordLink.onclick = (e) => {
        e.preventDefault()
        showForgotPasswordForm()
      }
    }

    // Back to login link
    if (backToLoginLink) {
      backToLoginLink.onclick = (e) => {
        e.preventDefault()
        showLoginForm()
      }
    }

    // Google auth button
    if (googleAuthBtn) {
      console.log("Adding click event to Google auth button")
      googleAuthBtn.addEventListener("click", (e) => {
        e.preventDefault()
        console.log("Google auth button clicked")
        signInWithGoogle()
      })
    } else {
      console.error("Google auth button not found")
    }
  }

  // Fallback method to ensure event listeners are attached
  const bindEventsFallback = () => {
    console.log("Running auth event listener fallback")

    // Direct DOM access for forms
    const forms = {
      "login-form": (e) => {
        e.preventDefault()
        const email = document.getElementById("login-email").value.trim()
        const password = document.getElementById("login-password").value
        login(email, password)
      },
      "signup-form": (e) => {
        e.preventDefault()
        const email = document.getElementById("signup-email").value.trim()
        const password = document.getElementById("signup-password").value
        const confirmPassword = document.getElementById("signup-confirm-password").value

        if (password !== confirmPassword) {
          utils.showNotification("Passwords do not match.", "error")
          return
        }

        signup(email, password)
      },
      "forgot-password-form": (e) => {
        e.preventDefault()
        const email = document.getElementById("forgot-email").value.trim()
        resetPassword(email)
      },
    }

    // Attach form handlers
    Object.keys(forms).forEach((id) => {
      const form = document.getElementById(id)
      if (form) {
        console.log(`Adding fallback submit handler to ${id}`)
        form.onsubmit = forms[id]
      }
    })

    // Direct handlers for tabs and links
    document.getElementById("login-tab")?.addEventListener("click", showLoginForm)
    document.getElementById("signup-tab")?.addEventListener("click", showSignupForm)
    document.getElementById("forgot-password-link")?.addEventListener("click", (e) => {
      e.preventDefault()
      showForgotPasswordForm()
    })
    document.getElementById("back-to-login-link")?.addEventListener("click", (e) => {
      e.preventDefault()
      showLoginForm()
    })

    // Try to find the Google auth button again and attach the event listener
    const googleBtn = document.getElementById("google-auth-btn")
    if (googleBtn) {
      console.log("Adding fallback click event to Google auth button")
      googleBtn.addEventListener("click", (e) => {
        e.preventDefault()
        console.log("Google auth button clicked (fallback)")
        signInWithGoogle()
      })
    } else {
      console.error("Google auth button not found in fallback")
    }
  }

  // Public API
  return {
    init,
    showLoginForm,
    showSignupForm,
    showForgotPasswordForm,
    login,
    signup,
    resetPassword,
    signInWithGoogle,
    logout,
  }
})()

// Add a direct initialization when the script loads
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded in auth.js")
  if (window.location.pathname.includes("auth.html")) {
    console.log("On auth page, initializing auth module")
    window.authModule.init()

    // Add a direct event listener to the Google button as a last resort
    setTimeout(() => {
      const googleBtn = document.getElementById("google-auth-btn")
      if (googleBtn) {
        console.log("Adding direct click event to Google auth button")
        googleBtn.onclick = (e) => {
          e.preventDefault()
          console.log("Google auth button clicked (direct)")
          window.authModule.signInWithGoogle()
        }
      }
    }, 1000)
  }
})
