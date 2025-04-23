// Immediately expose the landingModule to the global scope
window.landingModule = (() => {
  // DOM elements
  let getStartedBtn, loginBtn, heroCTABtn, ctaButton, mobileMenuBtn

  // Initialize landing page
  const init = () => {
    console.log("Landing module init called")

    // Get DOM elements after the page has loaded
    getStartedBtn = document.getElementById("get-started-btn")
    loginBtn = document.getElementById("login-btn")
    heroCTABtn = document.getElementById("hero-cta-btn")
    ctaButton = document.getElementById("cta-button")
    mobileMenuBtn = document.getElementById("mobile-menu-btn")

    bindEvents()

    // Add a fallback for event listeners in case they weren't attached properly
    setTimeout(bindEventsFallback, 500)
  }

  // Direct navigation function
  const goToAuth = (formType) => {
    console.log(`Navigating to auth page with form: ${formType}`)
    window.location.href = `auth.html?form=${formType}`
  }

  // Bind events
  const bindEvents = () => {
    console.log("Binding landing page events")

    // Get Started button
    if (getStartedBtn) {
      console.log("Found Get Started button")
      getStartedBtn.onclick = () => {
        console.log("Get Started button clicked")
        goToAuth("signup")
      }
    } else {
      console.log("Get Started button not found")
    }

    // Login button
    if (loginBtn) {
      console.log("Found Login button")
      loginBtn.onclick = () => {
        console.log("Login button clicked")
        goToAuth("login")
      }
    } else {
      console.log("Login button not found")
    }

    // Hero CTA button
    if (heroCTABtn) {
      console.log("Found Hero CTA button")
      heroCTABtn.onclick = () => {
        console.log("Hero CTA button clicked")
        goToAuth("signup")
      }
    } else {
      console.log("Hero CTA button not found")
    }

    // CTA button
    if (ctaButton) {
      console.log("Found CTA button")
      ctaButton.onclick = () => {
        console.log("CTA button clicked")
        goToAuth("signup")
      }
    } else {
      console.log("CTA button not found")
    }

    // Mobile menu button
    if (mobileMenuBtn) {
      console.log("Found Mobile Menu button")
      mobileMenuBtn.onclick = () => {
        console.log("Mobile Menu button clicked")
        const nav = document.querySelector(".landing-nav")
        if (nav) {
          nav.classList.toggle("show-mobile-nav")
        }
      }
    } else {
      console.log("Mobile Menu button not found")
    }
  }

  // Fallback method to ensure event listeners are attached
  const bindEventsFallback = () => {
    console.log("Running event listener fallback")

    // Direct DOM access for buttons
    document.querySelectorAll("#get-started-btn, #login-btn, #hero-cta-btn, #cta-button").forEach((button) => {
      if (button) {
        const id = button.id
        console.log(`Adding fallback click handler to ${id}`)

        button.onclick = () => {
          console.log(`Button ${id} clicked (fallback)`)
          if (id === "login-btn") {
            window.location.href = "auth.html?form=login"
          } else {
            window.location.href = "auth.html?form=signup"
          }
        }
      }
    })

    // Mobile menu fallback
    const mobileBtn = document.getElementById("mobile-menu-btn")
    if (mobileBtn) {
      mobileBtn.onclick = () => {
        console.log("Mobile menu button clicked (fallback)")
        const nav = document.querySelector(".landing-nav")
        if (nav) {
          nav.classList.toggle("show-mobile-nav")
        }
      }
    }
  }

  // Public API
  return {
    init,
    goToAuth,
  }
})()

// Add a direct initialization when the script loads
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded in landing.js")
  if (
    window.location.pathname.includes("index.html") ||
    window.location.pathname === "/" ||
    window.location.pathname.endsWith("/")
  ) {
    console.log("On landing page, initializing landing module")
    window.landingModule.init()
  }
})
