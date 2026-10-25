(() => {
  "use strict";

  const THEME_KEY = "site-theme";
  const MOBILE_QUERY = window.matchMedia("(max-width: 760px)");
  const root = document.documentElement;

  const readStorage = (key) => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  };

  const writeStorage = (key, value) => {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      return;
    }
  };

  const initTheme = () => {
    const toggle = document.getElementById("theme-toggle");
    if (!toggle) return;

    const apply = (theme) => {
      root.dataset.theme = theme;
      const isDark = theme === "dark";
      toggle.setAttribute("aria-pressed", String(isDark));
      toggle.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
    };

    apply(root.dataset.theme === "dark" ? "dark" : "light");

    toggle.addEventListener("click", () => {
      const next = root.dataset.theme === "dark" ? "light" : "dark";
      apply(next);
      writeStorage(THEME_KEY, next);
    });

    window.addEventListener("storage", (event) => {
      if (event.key === THEME_KEY && (event.newValue === "dark" || event.newValue === "light")) {
        apply(event.newValue);
      }
    });
  };

  const initMenu = () => {
    const button = document.getElementById("menu-toggle");
    const menu = document.getElementById("primary-nav");
    if (!button || !menu) return;

    const setOpen = (open) => {
      button.setAttribute("aria-expanded", String(open));
      button.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      menu.classList.toggle("is-open", open);
    };

    const isOpen = () => button.getAttribute("aria-expanded") === "true";

    button.addEventListener("click", () => setOpen(!isOpen()));

    menu.addEventListener("click", (event) => {
      if (event.target.closest("a")) setOpen(false);
    });

    document.addEventListener("click", (event) => {
      if (isOpen() && !menu.contains(event.target) && !button.contains(event.target)) {
        setOpen(false);
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && isOpen()) {
        setOpen(false);
        button.focus();
      }
    });

    MOBILE_QUERY.addEventListener("change", (event) => {
      if (!event.matches) setOpen(false);
    });
  };

  const initFooterYear = () => {
    const year = document.getElementById("year");
    if (year) year.textContent = String(new Date().getFullYear());
  };

  const initImageFallback = () => {
    const swap = (img) => {
      const fallback = img.dataset.fallback;
      if (!fallback) return;
      delete img.dataset.fallback;
      img.src = fallback;
    };

    document.querySelectorAll("img[data-fallback]").forEach((img) => {
      img.addEventListener("error", () => swap(img));
      if (img.complete && img.naturalWidth === 0) swap(img);
    });
  };

  const initReveal = () => {
    const items = document.querySelectorAll(".reveal");
    if (!items.length) return;

    if (!("IntersectionObserver" in window)) {
      items.forEach((item) => item.classList.add("is-shown"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-shown");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    items.forEach((item) => observer.observe(item));
  };

  const initContactForm = () => {
    const form = document.getElementById("contact-form");
    if (!form) return;

    const rules = {
      name: {
        min: 3,
        validate(value) {
          if (!value) return "Please enter your name.";
          if (value.length < this.min) return `Name must be at least ${this.min} characters.`;
          if (!/[\p{L}]/u.test(value)) return "Name must contain letters.";
          return "";
        },
      },
      email: {
        validate(value) {
          if (!value) return "Please enter your email address.";
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
            return "Enter a valid email, like name@example.com.";
          }
          return "";
        },
      },
      message: {
        min: 10,
        validate(value) {
          if (!value) return "Please write a message.";
          if (value.length < this.min) {
            return `Message must be at least ${this.min} characters (${value.length}/${this.min}).`;
          }
          return "";
        },
      },
    };

    const fields = Object.keys(rules).map((name) => {
      const input = form.elements[name];
      const wrapper = input.closest(".field");
      const error = wrapper.querySelector(".error-text");
      return { name, input, wrapper, error };
    });

    const submitButton = form.querySelector("button[type='submit']");
    const success = document.getElementById("form-success");
    const successText = document.getElementById("form-success-text");
    const counter = document.getElementById("message-counter");
    const maxLength = Number(form.elements.message.maxLength) || 500;

    const check = (field, { showValid = true } = {}) => {
      const message = rules[field.name].validate(field.input.value.trim());
      const invalid = message !== "";

      field.wrapper.classList.toggle("is-invalid", invalid);
      field.wrapper.classList.toggle("is-valid", !invalid && showValid);
      field.input.setAttribute("aria-invalid", String(invalid));
      field.error.textContent = message;

      return !invalid;
    };

    const updateCounter = () => {
      counter.textContent = `${form.elements.message.value.length}/${maxLength}`;
    };

    const hideSuccess = () => {
      success.classList.remove("is-visible");
    };

    fields.forEach((field) => {
      let touched = false;

      field.input.addEventListener("blur", () => {
        touched = true;
        check(field);
      });

      field.input.addEventListener("input", () => {
        hideSuccess();
        if (field.name === "message") updateCounter();
        if (touched || field.wrapper.classList.contains("is-invalid")) check(field);
      });
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      hideSuccess();

      const results = fields.map((field) => ({ field, valid: check(field) }));
      const firstInvalid = results.find((result) => !result.valid);

      if (firstInvalid) {
        firstInvalid.field.input.focus();
        return;
      }

      const firstName = form.elements.name.value.trim().split(/\s+/)[0];
      submitButton.disabled = true;
      submitButton.textContent = "Sending...";

      window.setTimeout(() => {
        form.reset();
        fields.forEach((field) => {
          field.wrapper.classList.remove("is-invalid", "is-valid");
          field.input.removeAttribute("aria-invalid");
          field.error.textContent = "";
        });
        updateCounter();

        successText.textContent = `Thanks, ${firstName}! Your message has been sent. We will reply within one working day.`;
        success.classList.add("is-visible");
        success.scrollIntoView({ behavior: "smooth", block: "nearest" });

        submitButton.disabled = false;
        submitButton.textContent = "Send message";
      }, 700);
    });

    form.addEventListener("reset", () => {
      window.setTimeout(updateCounter, 0);
    });

    updateCounter();
  };

  initTheme();
  initMenu();
  initFooterYear();
  initImageFallback();
  initReveal();
  initContactForm();
})();