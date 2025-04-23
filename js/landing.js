// Immediately expose the landingModule to the global scope
window.landingModule = (() => {
  // DOM elements
  let getStartedBtn, loginBtn, heroCTABtn, ctaButton, testimonialContainer, mobileMenuBtn

  // Testimonial data
  const testimonials = [
    {
      id: 1,
      name: "Sarah & Michael",
      image: "/images/testimonial-1.jpg",
      text: "We matched on HeartMatch 2 years ago and just got married last month! This platform changed our lives forever.",
    },
    {
      id: 2,
      name: "David & Emma",
      image: "/images/testimonial-2.jpg",
      text: "I was skeptical about dating apps until I tried HeartMatch. The interface is so intuitive, and I found my perfect match within weeks!",
    },
    {
      id: 3,
      name: "Jessica & Tom",
      image: "/images/testimonial-3.jpg",
      text: "HeartMatch's matching algorithm is incredible. It connected us based on our shared interests, and we've been together for a year now!",
    },
  ]

  // Initialize landing page
  const init = () => {
    console.log("Landing module init called")

    // Get DOM elements after the page has loaded
    getStartedBtn = document.getElementById("get-started-btn")
    loginBtn = document.getElementById("login-btn")
    heroCTABtn = document.getElementById("hero-cta-btn")
    ctaButton = document.getElementById("cta-button")
    testimonialContainer = document.getElementById("testimonial-container")
    mobileMenuBtn = document.getElementById("mobile-menu-btn")

    renderTestimonials()
    bindEvents()

    // Add a fallback for event listeners in case they weren't attached properly
    setTimeout(bindEventsFallback, 500)
  }

  // Render testimonials
  const renderTestimonials = () => {
    if (!testimonialContainer) {
      console.log("Testimonial container not found")
      return
    }

    testimonialContainer.innerHTML = testimonials
      .map(
        (testimonial) => `
      <div class="testimonial">
        <div class="testimonial-image">
          <img src="${testimonial.image || "/images/placeholder-couple.jpg"}" alt="${testimonial.name}">
        </div>
        <div class="testimonial-content">
          <h3>${testimonial.name}</h3>
          <p>${testimonial.text}</p>
        </div>
      </div>
    `,
      )
      .join("")
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
