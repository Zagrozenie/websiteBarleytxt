const originalTitle = document.title;

const translations = {
  pl: {
    text: "Odkryj ",
    word: "wysokiej",
    rest1: " jakości",
    rest2: " Paczki zasobów",
    downloadBtn: "Pobierz",
    noResults: "Nie znaleziono texturepacka którego szukasz",
    by: "by",
    unlock: {
      youtube: "Zasubskrybuj kanał",
      tiktok: "Zaobserwuj konto",
      discord: "Zweryfikuj się",
      other: "Odwiedź stronę",
    },
    converter: {
      error: "Błąd",
      selectVersion: "Wybierz wersję!",
      chooseFile: "Musisz wrzucić plik",
      tooManyFiles: "Możesz przesłać tylko jeden plik",
      fileTooBig: "Folder jest za duży (max 200MB)",
      wrongFormat: "Plik musi być .zip",
      noMcmeta: "Folder nie posiada pliku pack.mcmeta",
      corrupted: "Plik pack.mcmeta jest uszkodzony",
      cantConvertSame: "Nie można konwertować na taką samą wersję",
      loading: "Konwertowanie",
      loadingDesc: "To może chwilę potrwać",
      done: "Gotowe",
      doneDesc: "Twój texturepack został skonwertowany",
      cantReadFile: "Nie można odczytać pliku",
      serverError: "Błąd serwera",
      convertingError: "Wystąpił błąd podczas konwertowania",
      leaveTitle: "Już nas opuszczasz?",
    },
  },
  en: {
    text: "Discover ",
    word: "high-quality",
    rest1: " ",
    rest2: " resource packs",
    downloadBtn: "Download",
    noResults: "No texture pack found",
    by: "by",
    unlock: {
      youtube: "Subscribe to the channel",
      tiktok: "Follow the account",
      discord: "Verify yourself",
      other: "Visit the page",
    },
    converter: {
      error: "Error",
      selectVersion: "Select a version!",
      chooseFile: "You must upload a file",
      tooManyFiles: "You can upload only one file",
      fileTooBig: "File is too large (max 200MB)",
      wrongFormat: "File must be a .zip",
      noMcmeta: "Missing pack.mcmeta file",
      corrupted: "pack.mcmeta file is corrupted",
      cantConvertSame: "Cannot convert to the same version",
      loading: "Converting",
      loadingDesc: "This may take a moment",
      done: "Done",
      doneDesc: "Your texture pack has been converted",
      cantReadFile: "Unable to read file",
      serverError: "Server error",
      convertingError: "An error occurred during conversion",
      leaveTitle: "Are you leaving already?",
    },
  },
  de: {
    text: "Entdecke ",
    word: "hochwertige",
    rest1: " ",
    rest2: " Resource Packs",
    downloadBtn: "Download",
    noResults: "Kein Texturenpaket gefunden",
    by: "by",
    unlock: {
      youtube: "Abonniere den Kanal",
      tiktok: "Folge dem Konto",
      discord: "Verifiziere dich",
      other: "Besuche die Seite", 
    },
    converter: {
      error: "Fehler",
      selectVersion: "Version auswählen!",
      chooseFile: "Du musst eine Datei hochladen",
      tooManyFiles: "Du kannst nur eine Datei hochladen",
      fileTooBig: "Datei ist zu groß (max 200MB)",
      wrongFormat: "Datei muss eine .zip sein",
      noMcmeta: "pack.mcmeta Datei fehlt",
      corrupted: "pack.mcmeta Datei jest beschädigt",
      cantConvertSame: "Kann nicht in dieselbe Version konvertiert werden",
      loading: "Konvertieren",
      loadingDesc: "Dies kann einen Moment dauern",
      done: "Fertig",
      doneDesc: "Dein Texturenpaket wurde konvertiert",
      cantReadFile: "Datei konnte nicht gelesen werden",
      serverError: "Serverfehler",
      convertingError: "Ein Fehler ist während der Konvertierung aufgetreten",
      leaveTitle: "Gehst du schon?",
    },
  },
};

const pathname = window.location.pathname;
const isEnglish = pathname.startsWith("/en") || pathname.includes("/en/");
const isGerman = pathname.startsWith("/de") || pathname.includes("/de/");
const lang = isEnglish ? "en" : isGerman ? "de" : "pl";

const { text: heroText, word: heroWord, rest1: heroRest1, rest2: heroRest2 } = translations[lang];
const converterText = translations[lang].converter;

const hamburger = document.querySelector(".navbar-hamburger");
const menu = document.querySelector(".navbar-menu");

let globalWhitelisted = false;
let modalWhitelisted = false;
let whitelistRedirectStarted = false;

function redirectWhitelistedPack() {
  if (whitelistRedirectStarted || !globalWhitelisted || !currentPack?.download) {
    return false;
  }
  whitelistRedirectStarted = true;

  fetch(`https://api.barleytxt.pl/download/${currentPack.id}`, {
    method: "POST",
    keepalive: true,
  }).catch(() => {});

  window.location.replace(currentPack.download);
  return true;
}

(function prefetchWhitelistStatus() {
  try {
    fetch("https://api.barleytxt.pl/api/check-whitelist", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data && typeof data.whitelisted === "boolean") {
          globalWhitelisted = data.whitelisted;
        }
      })
      .catch(() => {});
  } catch (_) {}
})();

function buildUnlockUrlForCurrentPack() {
  if (!currentPack) return "";
  const base =
    lang === "en" ? "/en/unlock.html" : lang === "de" ? "/de/unlock.html" : "/unlock.html";
  const key = currentPack.slug ? "slug" : "id";
  const value = encodeURIComponent(currentPack.slug || currentPack.id || "");
  return `${base}?${key}=${value}`;
}

async function checkAndApplyWhitelistForModal() {
  if (globalWhitelisted) {
    modalWhitelisted = true;
    return true;
  }
  try {
    const response = await fetch("https://api.barleytxt.pl/api/check-whitelist", {
      cache: "no-store",
    });
    if (response.ok) {
      const data = await response.json();
      const whitelisted = !!data.whitelisted;
      globalWhitelisted = whitelisted;
      modalWhitelisted = whitelisted;
      return whitelisted;
    }
  } catch (_) {}
  return false;
}

function attachDownloadHandler(btn) {
  if (!btn) return;
  if (btn.dataset.whitelistAttached === "1") return;
  btn.dataset.whitelistAttached = "1";
  btn.addEventListener("click", async (ev) => {
    const allDone =
      [...document.querySelectorAll(".download-step-button")].every((b) =>
        b.classList.contains("done"),
      ) || modalWhitelisted || globalWhitelisted;
    if (!allDone) return;
    ev.preventDefault();
    if (currentPack?.download) {
      try {
        await fetch(`https://api.barleytxt.pl/download/${currentPack.id}`, {
          method: "POST",
        });
      } catch (_) {}
      window.location.href = currentPack.download;
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const hamburgerEl = document.querySelector(".navbar-hamburger");
  const menuEl = document.querySelector(".navbar-menu");
  if (hamburgerEl && menuEl) {
    hamburgerEl.addEventListener("click", () => {
      menuEl.classList.toggle("active");
      hamburgerEl.classList.toggle("active");
    });
  }
});

(function applyPreferredLanguage() {
  const preferred = localStorage.getItem("preferredLang");
  const path = window.location.pathname;
  const onEn = path.startsWith("/en") || path.includes("/en/");
  const onDe = path.startsWith("/de") || path.includes("/de/");

  if (preferred === "en" && !onEn) {
    window.location.pathname = "/en" + (path.startsWith("/") ? path : "/" + path);
  } else if (preferred === "de" && !onDe) {
    window.location.pathname = "/de" + (path.startsWith("/") ? path : "/" + path);
  } else if (preferred === "pl" && (onEn || onDe)) {
    window.location.pathname = path.replace(/^\/en(\/|$)/, "/").replace(/^\/de(\/|$)/, "/");
  }
})();

window.addEventListener("blur", () => {
  document.title = translations[lang].converter.leaveTitle;
});
window.addEventListener("focus", () => {
  document.title = originalTitle;
});

const dropdowns = document.querySelectorAll(".navbar-dropdown");

function changeLanguage(newLang) {
  if (!newLang) return;
  localStorage.setItem("preferredLang", newLang);
  const path = window.location.pathname;
  const stripped = path.replace(/^\/(en|de)(\/|$)/, "/");
  if (newLang === "en") {
    window.location.pathname = "/en" + (stripped.startsWith("/") ? stripped : "/" + stripped);
  } else if (newLang === "de") {
    window.location.pathname = "/de" + (stripped.startsWith("/") ? stripped : "/" + stripped);
  } else if (newLang === "pl") {
    window.location.pathname = stripped;
  }
}

dropdowns.forEach((dropdown) => {
  const select = dropdown.querySelector(".dropdown-select");
  const arrow = dropdown.querySelector(".dropdown-arrow");
  const menuEl = dropdown.querySelector(".dropdown-menu");
  const options = dropdown.querySelectorAll(".dropdown-menu li");
  const selected = dropdown.querySelector(".dropdown-selected");
  const flag = dropdown.querySelector(".selected-flag");

  select.addEventListener("click", () => {
    select.classList.toggle("dropdown-select-clicked");
    arrow.classList.toggle("dropdown-arrow-rotate");
    menuEl.classList.toggle("dropdown-menu-open");
  });

  options.forEach((option) => {
    option.addEventListener("click", () => {
      selected.innerText = option.innerText;
      const optionFlag = option.querySelector("img");
      if (optionFlag) flag.src = optionFlag.src;
      select.classList.remove("dropdown-select-clicked");
      arrow.classList.remove("dropdown-arrow-rotate");
      menuEl.classList.remove("dropdown-menu-open");
      const langCode = option.getAttribute("data-lang");
      changeLanguage(langCode);
    });
  });

  document.addEventListener("click", (event) => {
    if (dropdown.contains(event.target)) return;
    select.classList.remove("dropdown-select-clicked");
    arrow.classList.remove("dropdown-arrow-rotate");
    menuEl.classList.remove("dropdown-menu-open");
  });
});

const mobileLangOptions = document.querySelectorAll(".mobile-lang-option");

mobileLangOptions.forEach((option) => {
  option.addEventListener("click", (event) => {
    event.preventDefault();
    changeLanguage(option.getAttribute("data-lang"));
  });

  const langCode = option.getAttribute("data-lang");
  const path = window.location.pathname;
  const onEn = path.startsWith("/en") || path.includes("/en/");
  const onDe = path.startsWith("/de") || path.includes("/de/");

  option.classList.remove("active");
  if (langCode === "en" && onEn) option.classList.add("active");
  else if (langCode === "de" && onDe) option.classList.add("active");
  else if (langCode === "pl" && !onEn && !onDe) option.classList.add("active");
});

document.querySelectorAll(".select-version").forEach((versionSelect) => {
  const button = versionSelect.querySelector(".select-version-button");
  const options = versionSelect.querySelectorAll(".select-options li");
  const selectedValue = versionSelect.querySelector(".selected-value");

  button.addEventListener("click", (event) => {
    event.stopPropagation();
    document.querySelectorAll(".select-version").forEach((other) => {
      if (other !== versionSelect) other.classList.remove("open");
    });
    versionSelect.classList.toggle("open");
  });

  options.forEach((option) => {
    option.addEventListener("click", () => {
      selectedValue.textContent = option.textContent;
      options.forEach((o) => o.classList.remove("active"));
      option.classList.add("active");
      selectedValue.classList.remove("placeholder");
      versionSelect.classList.remove("open");

      if (selectedFile && detectedSrcVersion) {
        const targetVersion = selectedValue.textContent.trim();
        if (detectedSrcVersion === targetVersion) {
          setStatus("error", converterText.cantConvertSame);
        } else if (
          messageSubtitle.innerText === converterText.cantConvertSame
        ) {
          setStatus(
            "success",
            `${(selectedFile.size / 1048576).toFixed(2)} MB | ${detectedSrcVersion}`,
          );
        }
      }
    });
  });
});

document.addEventListener("click", () => {
  document.querySelectorAll(".select-version").forEach((versionSelect) => {
    versionSelect.classList.remove("open");
  });
});

document.onselectstart = function (event) {
  return event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA";
};

const navDropdowns = document.querySelectorAll(".navbar-dropdown-link");

navDropdowns.forEach((dropdown) => {
  const select = dropdown.querySelector(".navbar-dropdown-select");
  const arrow = dropdown.querySelector(".navbar-dropdown-arrow");
  const menuEl = dropdown.querySelector(".navbar-dropdown-menu");
  const options = dropdown.querySelectorAll(".navbar-dropdown-menu li");

  select.addEventListener("click", () => {
    select.classList.toggle("navbar-dropdown-select-clicked");
    arrow.classList.toggle("navbar-dropdown-arrow-rotate");
    menuEl.classList.toggle("navbar-dropdown-menu-open");
  });

  options.forEach((option) => {
    option.addEventListener("click", () => {
      select.classList.remove("navbar-dropdown-select-clicked");
      arrow.classList.remove("navbar-dropdown-arrow-rotate");
      menuEl.classList.remove("navbar-dropdown-menu-open");
    });
  });

  document.addEventListener("click", (event) => {
    if (dropdown.contains(event.target)) return;
    select.classList.remove("navbar-dropdown-select-clicked");
    arrow.classList.remove("navbar-dropdown-arrow-rotate");
    menuEl.classList.remove("navbar-dropdown-menu-open");
  });
});

fetch("/texturepacks.json")
  .then((response) => response.json())
  .then((packs) => {
    const countEl = document.getElementById("texturepacks-count");
    if (countEl) countEl.textContent = packs.length;
  })
  .catch(() => {});

let allPacks = [];
let currentPack = null;

function formatNumber(num) {
  if (num >= 999500) return (num / 1e6).toFixed(1).replace(".0", "") + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(1).replace(".0", "") + "K";
  return num.toString();
}

async function loadTotalDownloads() {
  try {
    const response = await fetch("https://api.barleytxt.pl/total-downloads");
    const data = await response.json();
    const countEl = document.getElementById("total-download-count");
    if (countEl) countEl.textContent = formatNumber(data.totalDownloads);
  } catch (_) {}
}

function sendView(packId) {
  fetch(`https://api.barleytxt.pl/view/${packId}`, { method: "POST" }).catch(() => {});
}

function renderPacks(packs, query = "", showRank = false) {
  const scrollPos = window.scrollY;
  const container = document.getElementById("texturepacks-container");
  if (!container) return;

  container.innerHTML = "";
  if (packs.length === 0) {
    container.innerHTML = `<p class="no-results">${translations[lang].noResults}</p>`;
    document.body.style.overflow = "hidden";
    window.scrollTo(0, scrollPos);
    return;
  }

  document.body.style.overflow = "";
  packs.forEach((pack, index) => {
    const link = document.createElement("a");
    const path = window.location.pathname;
    const onEn = path.startsWith("/en") || path.includes("/en/");
    const onDe = path.startsWith("/de") || path.includes("/de/");

    link.href = `${onEn ? "/en/texturepacks/" : onDe ? "/de/texturepacks/" : "/texturepacks/"}${pack.id}`;
    link.className = "texturepacks-single";
    link.innerHTML = `
            <div class="texturepacks-image">
                <img src="${pack.image}" alt="Texturepack Preview">
                ${showRank ? `<span>#${index + 1}</span>` : ""}
            </div>

            <div class="texturepacks-content">
                <div class="author">
                    <img src="${pack.icon}" alt="Texturepack Icon">
                    <div class="author-description">
                        <h3>${pack.name}</h3>
                        <p>${translations[lang].by} <strong>${pack.author}</strong></p>
                    </div>
                </div>

                <div class="texturepacks-statistics">
                    <div class="texturepack-download">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
                            <path stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor"
                                d="M6 21H18M12 3V17M12 17L17 12M12 17L7 12">
                            </path>
                        </svg>
                        <span class="download-count">0</span>
                    </div>

                    <div class="texturepack-version">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 640 640">
                            <path d="M500.7 138.7L512 149.4L512 96C512 78.3 526.3 64 544 64C561.7 64 576 78.3 576 96L576 224C576 241.7 561.7 256 544 256L416 256C398.3 256 384 241.7 384 224C384 206.3 398.3 192 416 192L463.9 192L456.3 184.8C456.1 184.6 455.9 184.4 455.7 184.2C380.7 109.2 259.2 109.2 184.2 184.2C109.2 259.2 109.2 380.7 184.2 455.7C259.2 530.7 380.7 530.7 455.7 455.7C463.9 447.5 471.2 438.8 477.6 429.6C487.7 415.1 507.7 411.6 522.2 421.7C536.7 431.8 540.2 451.8 530.1 466.3C521.6 478.5 511.9 490.1 501 501C401 601 238.9 601 139 501C39.1 401 39 239 139 139C238.9 39.1 400.7 39 500.7 138.7z"/>
                        </svg>
                        <span>${pack.version}</span>
                    </div>
                </div>
            </div>
        `;
    container.appendChild(link);
    loadPackCardStats(pack.id, link);
  });

  const cards = document.querySelectorAll(".texturepacks-single");
  if (cards.length > 0) {
    let delayIndex = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.style.animationDelay = `${0.1 * delayIndex}s`;
          entry.target.classList.add("show");
          delayIndex++;
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.1 },
    );
    cards.forEach((card) => observer.observe(card));
  }
  window.scrollTo(0, scrollPos);
}

async function getTopPacks(packs, limit = 9) {
  const packsWithStats = await Promise.all(
    packs.map(async (pack) => {
      try {
        const response = await fetch(`https://api.barleytxt.pl/stats/${pack.id}`);
        const data = await response.json();
        return { ...pack, downloads: data.downloads || 0 };
      } catch {
        return { ...pack, downloads: 0 };
      }
    }),
  );
  packsWithStats.sort((a, b) => b.downloads - a.downloads);
  return packsWithStats.slice(0, limit);
}

async function loadPackCardStats(packId, cardElement) {
  try {
    const response = await fetch(`https://api.barleytxt.pl/stats/${packId}`);
    const data = await response.json();
    const countEl = cardElement.querySelector(".download-count");
    if (countEl) countEl.textContent = formatNumber(data.downloads);
  } catch (_) {}
}

function filterPacks(query) {
  const term = query.toLowerCase().trim();
  if (!term) {
    renderPacks(allPacks, "");
    return;
  }
  const filtered = allPacks.filter(
    (pack) =>
      pack.name.toLowerCase().includes(term) ||
      pack.author.toLowerCase().includes(term) ||
      pack.version.toLowerCase().includes(term),
  );
  renderPacks(filtered, query);
}

document.addEventListener("DOMContentLoaded", () => {
  let userId = localStorage.getItem("userId");
  let websiteOnline = 0;
  let discordOnline = 0;

  function updateTotalOnline() {
    const total = websiteOnline + discordOnline;
    const onlineEl = document.getElementById("online-user");
    if (onlineEl) onlineEl.textContent = total;
  }

  async function updateDiscordOnline() {
    try {
      const response = await fetch(
        "https://discord.com/api/guilds/1193548424847568938/widget.json",
        { cache: "no-store" },
      );
      const data = await response.json();
      discordOnline = data.presence_count || 0;
      updateTotalOnline();
    } catch (_) {
      try {
        const response = await fetch("https://api.barleytxt.pl/online");
        const data = await response.json();
        discordOnline = data.online || 0;
        updateTotalOnline();
      } catch {
        discordOnline = 0;
      }
    }
  }

  if (!userId) {
    userId =
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (char) =>
            (char ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (char / 4)))).toString(16),
          );
    localStorage.setItem("userId", userId);
  }

  if (typeof io !== "undefined") {
    const socket = io("https://api.barleytxt.pl", { query: { userId } });
    socket.on("online-users", (count) => {
      websiteOnline = count || 0;
      updateTotalOnline();
    });
  }

  updateDiscordOnline();
  setInterval(updateDiscordOnline, 30000);
});

loadTotalDownloads();

fetch("/texturepacks.json")
  .then((response) => response.json())
  .then((packs) => {
    allPacks = packs;
    const path = window.location.pathname;
    const lastSegment = path.split("/").pop();
    const isHome =
      lastSegment === "" ||
      lastSegment === "index" ||
      lastSegment === "index.html" ||
      lastSegment === "en" ||
      lastSegment === "de";

    if (isHome) {
      localStorage.setItem("activeCategory", "all");
      getTopPacks(allPacks, 9).then((topPacks) => {
        renderPacks(topPacks, "", true);
      });
    } else {
      const category = lastSegment.replace(".html", "");
      const inCategory = allPacks.filter((pack) => pack.category === category);
      if (category === "all" || inCategory.length > 0) {
        localStorage.setItem("activeCategory", category);
      }
      renderPacks(inCategory.length ? inCategory : allPacks, "");
    }

    const searchInput = document.querySelector(".search");
    const searchButton = document.querySelector(".button-search");
    if (searchInput && searchButton) {
      searchButton.addEventListener("click", () => {
        filterPacks(searchInput.value);
      });
      searchInput.addEventListener("keypress", (event) => {
        if (event.key === "Enter") filterPacks(searchInput.value);
      });
      searchInput.addEventListener("input", (event) => {
        if (event.target.value.trim() === "") filterPacks("");
      });
    }
  })
  .catch(() => {});

const params = new URLSearchParams(window.location.search);
let packId = params.get("pack");
if (!packId) {
  const segments = window.location.pathname.split("/");
  const lastSegment = segments.pop() || segments.pop();
  if (lastSegment && lastSegment !== "pack") packId = lastSegment;
}

let navigationState = null;

function attachNavigationButtons() {
  if (!navigationState) return;
  const nextBtn = document.querySelector(".next-button button");
  const prevBtn = document.querySelector(".previous-button button");
  if (!nextBtn || !prevBtn) return;
  if (nextBtn._navAttached && prevBtn._navAttached) return;
  nextBtn._navAttached = true;
  prevBtn._navAttached = true;

  function updateDisabled() {
    prevBtn.disabled = navigationState.idx <= 0;
    nextBtn.disabled = navigationState.idx >= navigationState.list.length - 1;
  }

  function goTo(newIdx) {
    const list = navigationState.list;
    const allPacksList = navigationState.allPacks;
    const activeCat = navigationState.activeCategory;
    if (newIdx < 0 || newIdx >= list.length) return;
    const pack = list[newIdx];
    if (!pack) return;
    navigationState.idx = newIdx;
    currentPack = pack;
    renderPack(pack);
    packId = pack.id;
    const path = window.location.pathname;
    const onEn = path.startsWith("/en") || path.includes("/en/");
    const onDe = path.startsWith("/de") || path.includes("/de/");
    history.replaceState(
      null,
      "",
      `${onEn ? "/en/texturepacks/" : onDe ? "/de/texturepacks/" : "/texturepacks/"}${pack.id}`,
    );
    loadStats(pack.id);
    sendView(pack.id);
    renderRecommendations(activeCat === "all" ? allPacksList : list);
    updateDisabled();
  }

  nextBtn.addEventListener("click", () => {
    if (!navigationState) return;
    if (navigationState.idx < navigationState.list.length - 1) {
      goTo(navigationState.idx + 1);
    }
  });
  prevBtn.addEventListener("click", () => {
    if (!navigationState) return;
    if (navigationState.idx > 0) {
      goTo(navigationState.idx - 1);
    }
  });
  updateDisabled();
}

fetch("/texturepacks.json")
  .then((response) => response.json())
  .then((packs) => {
    const pack = packs.find((p) => p.id === packId);
    currentPack = pack || null;

    if (pack) {
      const allCategories = new Set(packs.map((p) => p.category));
      const storedCategory = localStorage.getItem("activeCategory");
      const activeCategory =
        storedCategory === "all" || allCategories.has(storedCategory)
          ? storedCategory
          : pack.category;

      let list;
      if (activeCategory === "all") {
        list = packs;
      } else if (allCategories.has(activeCategory)) {
        list = packs.filter((p) => p.category === activeCategory);
      } else {
        list = packs.filter((p) => p.category === pack.category);
      }

      let idx = list.findIndex((p) => p.id === packId);
      if (idx === -1) {
        list = packs;
        idx = list.findIndex((p) => p.id === packId);
      }

      navigationState = {
        list,
        allPacks: packs,
        activeCategory,
        idx,
      };
      renderPack(pack);
      renderRecommendations(activeCategory === "all" ? packs : list);
      loadStats(pack.id);
      sendView(pack.id);
    }

    attachNavigationButtons();
  })
  .catch(() => {});

document.addEventListener("DOMContentLoaded", () => {
  attachNavigationButtons();
});

const shareBtn = document.querySelector(".share-button button");
if (shareBtn) {
  shareBtn.addEventListener("click", async () => {
    if (!currentPack) return;
    const shareData = { title: currentPack.name, url: window.location.href };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
      }
    } catch (_) {}
  });
}

const target = document.getElementById("type-text");

function render(wordPart = "", rest1Part = "", rest2Part = "") {
  if (!target) return;
  target.innerHTML =
    heroText +
    "<span class='underline'>" +
    wordPart +
    "</span>" +
    rest1Part +
    (rest2Part ? "<br>" + rest2Part : "");
}

function typeWriter() {
  return new Promise((resolve) => {
    if (!target) {
      resolve();
      return;
    }
    let charIndex = 0;
    const total = heroText.length + heroWord.length + heroRest1.length + heroRest2.length + 1;

    (function tick() {
      if (charIndex < heroText.length) {
        render("", "", "");
        target.innerHTML = heroText.slice(0, charIndex + 1);
      } else if (charIndex < heroText.length + heroWord.length) {
        render(heroWord.slice(0, charIndex - heroText.length + 1));
      } else if (charIndex < heroText.length + heroWord.length + heroRest1.length) {
        render(heroWord, heroRest1.slice(0, charIndex - heroText.length - heroWord.length + 1));
      } else if (charIndex === heroText.length + heroWord.length + heroRest1.length) {
        render(heroWord, heroRest1, "");
      } else if (charIndex < total) {
        render(
          heroWord,
          heroRest1,
          heroRest2.slice(0, charIndex - heroText.length - heroWord.length - heroRest1.length),
        );
      }
      if (++charIndex < total) {
        setTimeout(tick, 53);
      } else {
        resolve();
      }
    })();
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function startAnimations() {
  const badge = document.querySelector(".badge");
  if (badge) badge.classList.add("show");
  await wait(400);
  await typeWriter();
  const heroDesc = document.querySelector(".hero-description");
  if (heroDesc) heroDesc.classList.add("show");
  await wait(400);
  const heroButtons = document.querySelectorAll(".hero-button");
  heroButtons.forEach((btn, index) => {
    setTimeout(() => {
      btn.classList.add("show");
    }, 120 * index);
  });
  await wait(850);
  const discordAd = document.querySelector(".discord-advertising");
  if (discordAd) discordAd.classList.add("show");
  const communityImages = document.querySelectorAll(".community img");
  const communityInfo = document.querySelector(".community-info");
  communityImages.forEach((img, index) => {
    setTimeout(() => {
      img.classList.add("show");
    }, 100 * index);
  });
  if (communityInfo) communityInfo.classList.add("show");
  await wait(600);
  const scrollText = document.querySelector(".scroll-text");
  if (scrollText) scrollText.classList.add("show");
}

function toggleFAQItem(faqId) {
  const content = document.getElementById(`faq-content-${faqId}`);
  const arrow = document.getElementById(`arrow-${faqId}`);
  document.querySelectorAll(".faq-answer").forEach((answer) => {
    if (answer !== content) answer.style.maxHeight = null;
  });
  document.querySelectorAll(".arrow").forEach((arrowEl) => {
    if (arrowEl !== arrow) arrowEl.style.transform = "rotate(90deg)";
  });
  if (content.style.maxHeight) {
    content.style.maxHeight = null;
    arrow.style.transform = "rotate(90deg)";
  } else {
    content.style.maxHeight = content.scrollHeight + "px";
    arrow.style.transform = "rotate(-90deg)";
  }
}

function getRandomPacks(packs, count) {
  const shuffled = [...packs].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function renderRecommendations(packs) {
  const container = document.querySelector(".recommendations-texturepack");
  if (!container) return;
  const activeCategory = localStorage.getItem("activeCategory") || "all";
  const candidates =
    activeCategory === "all"
      ? packs.filter((pack) => pack.id !== currentPack.id)
      : packs.filter(
          (pack) => pack.id !== currentPack.id && pack.category === currentPack.category,
        );
  const randomPacks = getRandomPacks(candidates, 3);

  container.innerHTML = "";
  randomPacks.forEach((pack) => {
    const item = document.createElement("div");
    item.classList.add("recommendation-item");
    item.innerHTML = `
            <img src="${pack.image}" alt="Texturepack Preview">
            <p>${pack.name}</p>
        `;
    item.addEventListener("click", () => {
      const path = window.location.pathname;
      const onEn = path.startsWith("/en") || path.includes("/en/");
      const onDe = path.startsWith("/de") || path.includes("/de/");
      window.location.href = `${onEn ? "/en/texturepacks/" : onDe ? "/de/texturepacks/" : "/texturepacks/"}${pack.id}`;
    });
    container.appendChild(item);
  });
}

function renderPack(pack) {
  if (!pack) return;

  let pageTitle;
  if (lang === "pl") {
    pageTitle = `Texturepack ${pack.name} - BarleyTxT.pl`;
  } else if (lang === "de") {
    pageTitle = `${pack.name} Texturenpaket - BarleyTxT.pl`;
  } else {
    pageTitle = `${pack.name} Texturepack - BarleyTxT.pl`;
  }
  document.title = pageTitle;
  originalTitle = pageTitle;

  const imageEl = document.getElementById("pack-image");
  if (imageEl) imageEl.src = pack.image;
  const iconEl = document.getElementById("pack-icon");
  if (iconEl) iconEl.src = pack.icon;
  const downloadBtn = document.getElementById("download-button");
  if (downloadBtn) downloadBtn.textContent = `${translations[lang].downloadBtn} ${pack.name}`;
  const authorEl = document.getElementById("pack-author");
  if (authorEl) authorEl.textContent = pack.author;
  const nameEl = document.getElementById("pack-name");
  if (nameEl) nameEl.textContent = pack.name;
  const versionEl = document.getElementById("pack-version");
  if (versionEl) versionEl.textContent = pack.version;

  const canonicalUrl = window.location.href.split("?")[0].split("#")[0];
  const canonicalLink = document.querySelector('link[rel="canonical"]');
  if (canonicalLink) canonicalLink.setAttribute("href", canonicalUrl);
  const ogUrl = document.querySelector('meta[property="og:url"]');
  if (ogUrl) ogUrl.setAttribute("content", canonicalUrl);
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute("content", pageTitle);
  const ogImage = document.querySelector('meta[property="og:image"]');
  if (ogImage) ogImage.setAttribute("content", window.location.origin + pack.image);
  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) {
    let description;
    if (lang === "pl") {
      description = `Pobierz texturepack ${pack.name} autorstwa ${pack.author} na naszej witrynie BarleyTxT.pl najlepsze paczki tekstur które odmienią twoją grę!`;
    } else if (lang === "de") {
      description = `Lade das ${pack.name} Texturenpaket von ${pack.author} auf unserer Website BarleyTxT.pl herunter – die besten Texturenpakete, um dein Spiel zu verändern!`;
    } else {
      description = `Download ${pack.name} texturepack by ${pack.author} on our website BarleyTxT.pl the best texture packs to transform your game!`;
    }
    ogDesc.setAttribute("content", description);
  }

  currentPack = pack;
  updateDownloadModal(pack);
}

startAnimations();

document.addEventListener("DOMContentLoaded", function () {
  if (typeof AOS !== "undefined") {
    AOS.init({ duration: 600, easing: "ease", once: true, mirror: false });
  }
  const cards = document.querySelectorAll(".texturepacks-card .texturepacks-single");
  if (cards.length > 0) {
    let delayIndex = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.style.animationDelay = `${0.1 * delayIndex}s`;
          entry.target.classList.add("show");
          delayIndex++;
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.1 },
    );
    cards.forEach((card) => observer.observe(card));
  }
});

const modal = document.querySelector(".download-container");
const openBtn = document.querySelector(".download-button");
const closeBtn = document.querySelector(".download-close");

if (openBtn && modal && closeBtn) {
  openBtn.addEventListener("click", async (event) => {
    event.preventDefault();
    const isWhitelisted = globalWhitelisted || (await checkAndApplyWhitelistForModal());
    if (isWhitelisted && currentPack && currentPack.download) {
      redirectWhitelistedPack();
      return;
    }
    modal.classList.add("active");
    document.body.classList.add("download-open-card");
  });

  closeBtn.addEventListener("click", () => {
    modal.classList.remove("active");
    document.body.classList.remove("download-open-card");
  });

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      modal.classList.remove("active");
      document.body.classList.remove("download-open-card");
    }
  });
}

const buttons = document.querySelectorAll(".download-step-button");
const downloadBtnElement = document.getElementById("download-pack-button");

function updateDownloadModal(pack) {
  if (!pack) return;
  const iconEl = document.getElementById("download-pack-icon");
  if (iconEl) iconEl.src = pack.icon;
  const titleEl = document.getElementById("download-pack-title");
  if (titleEl) titleEl.textContent = pack.name;
  const authorEl = document.getElementById("download-pack-author");
  if (authorEl) {
    authorEl.innerHTML = `${translations[lang].by} <span class="purple-text">${pack.author}</span>`;
  }
  const steps = document.querySelector(".download-steps");
  if (steps) steps.classList.add("visible");

  const stepButtons = document.querySelectorAll(".download-step-button");
  const isWhitelisted = globalWhitelisted || modalWhitelisted;
  stepButtons.forEach((btn, idx) => {
    if (isWhitelisted) {
      btn.classList.add("done");
      btn.classList.remove("disabled");
    } else {
      if (idx === 0) btn.classList.remove("disabled");
      else btn.classList.add("disabled");
    }
  });

  if (isWhitelisted && downloadBtnElement) {
    downloadBtnElement.removeAttribute("disabled");
    downloadBtnElement.classList.add("unlocked");
    attachDownloadHandler(downloadBtnElement);
  }
}

async function loadStats(packId) {
  const response = await fetch(`https://api.barleytxt.pl/stats/${packId}`);
  const data = await response.json();
  document.querySelector(".downloads .stats-count").textContent = formatNumber(data.downloads);
  document.querySelector(".views .stats-count").textContent = formatNumber(data.views);
}

buttons.forEach((button, index) => {
  if (index !== 0) button.classList.add("disabled");
  button.addEventListener("click", (event) => {
    if (globalWhitelisted || modalWhitelisted) {
      event.preventDefault();
      return;
    }
    if (button.classList.contains("disabled")) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    if (button.classList.contains("done")) return;
    window.open(button.href, "_blank");
    button.classList.add("loading");
    setTimeout(() => {
      button.classList.remove("loading");
      button.classList.add("done");
      const nextButton = buttons[index + 1];
      if (nextButton) nextButton.classList.remove("disabled");
      const allDone = [...buttons].every((b) => b.classList.contains("done"));
      if (allDone && downloadBtnElement) {
        downloadBtnElement.removeAttribute("disabled");
        downloadBtnElement.classList.add("unlocked");
        attachDownloadHandler(downloadBtnElement);
      }
    }, 7000);
  });
});

if (downloadBtnElement) {
  attachDownloadHandler(downloadBtnElement);
}

const converterBackground = document.querySelector(".converter-background");
const fileInput = document.getElementById("file");
const convertButton = document.querySelector("#convert-button");
const convertWrapper = document.querySelector(".convert-button");
const converterInfo = document.querySelector(".converter-info");
const messageSubtitle = document.querySelector(".message-subtitle");
const closeIcon = document.querySelector(".cross-icon");

let selectedFile = null;
let detectedSrcVersion = null;

const packFormatToVersion = {
  1: "1.7.2",
  1: "1.7.3",
  1: "1.7.4",
  1: "1.7.5",
  1: "1.7.6",
  1: "1.7.7",
  1: "1.7.8",
  1: "1.7.9",
  1: "1.7.10",
  1: "1.8",
  1: "1.8.0",
  1: "1.8.1",
  1: "1.8.2",
  1: "1.8.3",
  1: "1.8.4",
  1: "1.8.5",
  1: "1.8.6",
  1: "1.8.7",
  1: "1.8.8",
  1: "1.8.9",
  2: "1.9",
  2: "1.9.0",
  2: "1.9.1",
  2: "1.9.2",
  2: "1.9.3",
  2: "1.9.4",
  2: "1.10",
  2: "1.10.0",
  2: "1.10.1",
  2: "1.10.2",
  3: "1.11",
  3: "1.11.0",
  3: "1.11.1",
  3: "1.11.2",
  3: "1.12",
  3: "1.12.0",
  3: "1.12.1",
  3: "1.12.2",
  4: "1.13",
  4: "1.13.0",
  4: "1.13.1",
  4: "1.13.2",
  4: "1.14",
  4: "1.14.0",
  4: "1.14.1",
  4: "1.14.2",
  4: "1.14.3",
  4: "1.14.4",
  5: "1.15",
  5: "1.15.0",
  5: "1.15.1",
  5: "1.15.2",
  5: "1.16",
  5: "1.16.0",
  5: "1.16.1",
  6: "1.16.2",
  6: "1.16.3",
  6: "1.16.4",
  6: "1.16.5",
  7: "1.17",
  7: "1.17.0",
  7: "1.17.1",
  8: "1.18",
  8: "1.18.0",
  8: "1.18.1",
  8: "1.18.2",
  9: "1.19",
  9: "1.19.0",
  9: "1.19.1",
  9: "1.19.2",
  12: "1.19.3",
  13: "1.19.4",
  15: "1.20",
  15: "1.20.0",
  15: "1.20.1",
  18: "1.20.2",
  22: "1.20.3",
  22: "1.20.4",
  32: "1.20.5",
  32: "1.20.6",
  34: "1.21",
  34: "1.21.1",
  42: "1.21.2",
  42: "1.21.3",
  46: "1.21.4",
  55: "1.21.5",
  63: "1.21.6",
  64: "1.21.7",
  64: "1.21.8",
  69: "1.21.9",
  69: "1.21.10",
  75: "1.21.11",
  84: "26.1",
  84: "26.1.2",
  88: "26.2",
};

function setButtonState(enabled) {
  if (!convertButton) return;
  convertButton.disabled = !enabled;
  if (convertWrapper) convertWrapper.classList.toggle("disabled", !enabled);
}

function setStatus(type, message) {
  if (!converterInfo) return;
  converterInfo.classList.remove("error", "success", "active");
  converterInfo.classList.add("active");
  if (messageSubtitle) messageSubtitle.innerText = message;
  const titleEl = document.querySelector(".message-title");

  if (type === "error") {
    if (converterBackground) converterBackground.classList.remove("success");
    if (titleEl) titleEl.innerText = converterText.error;
    converterInfo.classList.add("error");
    setButtonState(false);
  } else if (type === "success") {
    converterInfo.classList.add("success");
    setButtonState(true);
  }
}

setButtonState(false);
if (converterInfo) converterInfo.classList.remove("active");

if (closeIcon) {
  closeIcon.addEventListener("click", () => {
    if (converterInfo) converterInfo.classList.remove("active", "error", "success");
    if (converterBackground) converterBackground.classList.remove("success");
    if (fileInput) fileInput.value = "";
    selectedFile = null;
    detectedSrcVersion = null;
  });
}

const fileUploadLabel = document.querySelector(".file-upload");

if (fileUploadLabel) {
  fileUploadLabel.addEventListener("dragover", (event) => {
    event.preventDefault();
    fileUploadLabel.classList.add("dragover");
  });
  fileUploadLabel.addEventListener("dragleave", (event) => {
    event.preventDefault();
    fileUploadLabel.classList.remove("dragover");
  });
  fileUploadLabel.addEventListener("drop", async (event) => {
    event.preventDefault();
    fileUploadLabel.classList.remove("dragover");
    const files = event.dataTransfer.files;
    if (files.length > 1) {
      setStatus("error", converterText.tooManyFiles);
      return;
    }
    const file = files[0];
    if (!file) return;
    if (file.size > 209715200) {
      setStatus("error", converterText.fileTooBig);
      return;
    }
    if (!file.name.toLowerCase().endsWith(".zip")) {
      setStatus("error", converterText.wrongFormat);
      return;
    }
    try {
      const zip = await JSZip.loadAsync(file);
      const mcmetaPath = Object.keys(zip.files).find((name) =>
        name.toLowerCase().endsWith("pack.mcmeta"),
      );
      if (!mcmetaPath) {
        setStatus("error", converterText.noMcmeta);
        return;
      }
      const mcmetaFile = zip.file(mcmetaPath);
      try {
        const mcmetaContent = await mcmetaFile.async("string");
        const mcmeta = JSON.parse(mcmetaContent.trim().replace(/^\uFEFF/, ""));
        const packFormat = mcmeta.pack?.pack_format;
        detectedSrcVersion = packFormatToVersion[packFormat] || "1.8.8";
      } catch {
        setStatus("error", converterText.corrupted);
        return;
      }
      selectedFile = file;
      const sizeMb = (file.size / 1048576).toFixed(2);
      document.querySelector(".message-title").innerText = file.name;
      const infoText = `${sizeMb} MB | ${detectedSrcVersion}`;
      document.querySelector(".message-subtitle").innerText = infoText;
      converterInfo.classList.remove("error");
      converterInfo.classList.add("active", "success");
      converterBackground.classList.add("success");
      setButtonState(true);
    } catch (_) {
      setStatus("error", converterText.cantReadFile);
    }
  });
}

if (fileInput) {
  fileInput.addEventListener("change", async () => {
    const files = fileInput.files;
    if (files.length > 1) {
      setStatus("error", converterText.tooManyFiles);
      fileInput.value = "";
      return;
    }
    const file = files[0];
    if (!file) return;
    if (file.size > 209715200) {
      setStatus("error", converterText.fileTooBig);
      fileInput.value = "";
      return;
    }
    if (!file.name.toLowerCase().endsWith(".zip")) {
      setStatus("error", converterText.wrongFormat);
      fileInput.value = "";
      return;
    }
    try {
      const zip = await JSZip.loadAsync(file);
      const mcmetaPath = Object.keys(zip.files).find((name) =>
        name.toLowerCase().endsWith("pack.mcmeta"),
      );
      if (!mcmetaPath) {
        setStatus("error", converterText.noMcmeta);
        fileInput.value = "";
        return;
      }
      const mcmetaFile = zip.file(mcmetaPath);
      try {
        const mcmetaContent = await mcmetaFile.async("string");
        const mcmeta = JSON.parse(mcmetaContent.trim().replace(/^\uFEFF/, ""));
        const packFormat = mcmeta.pack?.pack_format;
        detectedSrcVersion = packFormatToVersion[packFormat] || "1.8.8";
      } catch {
        setStatus("error", converterText.corrupted);
        fileInput.value = "";
        return;
      }
      selectedFile = file;
      const sizeMb = (file.size / 1048576).toFixed(2);
      document.querySelector(".message-title").innerText = file.name;
      const infoText = `${sizeMb} MB | ${detectedSrcVersion}`;
      document.querySelector(".message-subtitle").innerText = infoText;
      converterInfo.classList.remove("error");
      converterInfo.classList.add("active", "success");
      converterBackground.classList.add("success");
      setButtonState(true);
    } catch (_) {
      setStatus("error", converterText.cantReadFile);
      fileInput.value = "";
    }
  });
}

if (convertWrapper) {
  convertWrapper.addEventListener("click", () => {
    if (convertButton && !convertButton.disabled) convertButton.click();
  });
}

if (convertButton) {
  convertButton.addEventListener("click", async () => {
    if (!selectedFile || !detectedSrcVersion) {
      setStatus("error", converterText.chooseFile);
      return;
    }
    const targetVersion = document.querySelector(".selected-value").textContent.trim();
    if (targetVersion === converterText.selectVersion) {
      setStatus("error", converterText.selectVersion);
      return;
    }
    if (detectedSrcVersion === targetVersion) {
      setStatus("error", converterText.cantConvertSame);
      return;
    }
    setButtonState(false);
    document.querySelector(".message-title").innerText = converterText.loading;
    document.querySelector(".message-subtitle").innerText = converterText.loadingDesc;

    const loaderIcon = document.querySelector(".icon-loader");
    const successIcon = document.querySelector(".icon-success");
    const errorIcon = document.querySelector(".icon-error");
    successIcon.style.display = "none";
    errorIcon.style.display = "none";
    loaderIcon.style.display = "block";
    loaderIcon.classList.add("loader");

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("srcVer", detectedSrcVersion);
    formData.append("destVer", targetVersion);

    try {
      const response = await fetch("https://api.barleytxt.pl/convert", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw Error(errorData.error || converterText.serverError);
      }
      const fileBlob = await response.blob();
      const objectUrl = window.URL.createObjectURL(fileBlob);
      const downloadLink = document.createElement("a");
      const baseFileName = selectedFile.name.replace(/\.[^/.]+$/, "");
      downloadLink.href = objectUrl;
      downloadLink.download = `${baseFileName}_to_${targetVersion}.zip`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      window.URL.revokeObjectURL(objectUrl);
      document.body.removeChild(downloadLink);
      loaderIcon.classList.remove("loader");
      loaderIcon.style.display = "none";
      successIcon.style.display = "block";
      document.querySelector(".message-title").innerText = converterText.done;
      document.querySelector(".message-subtitle").innerText = converterText.doneDesc;
      setButtonState(true);
    } catch (_) {
      setStatus("error", converterText.convertingError);
    }
  });
}

const viewers = new Map();

function createViewer(canvas) {
  if (viewers.has(canvas)) return viewers.get(canvas);
  const skinName = canvas.dataset.name;
  if (!skinName) return null;
  const skinSlug = skinName.toLowerCase();
  const viewer = new skinview3d.SkinViewer({
    canvas,
    width: 180,
    height: 220,
    skin: `/assets/img/creators/${skinSlug}.png`,
  });
  viewer.zoom = 0.95;
  viewer.controls.enableRotate = false;
  viewer.controls.enableZoom = false;
  viewer.controls.enablePan = false;
  viewers.set(canvas, viewer);
  return viewer;
}

const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const canvas = entry.target;
      createViewer(canvas);
      observer.unobserve(canvas);
    }
  },
  { threshold: 0.1, rootMargin: "200px" },
);

document.querySelectorAll(".partners-skin").forEach((canvas) => {
  canvas.width = 180;
  canvas.height = 220;
  observer.observe(canvas);
});

window.addEventListener("beforeunload", () => {
  viewers.forEach((viewer) => viewer.dispose());
  viewers.clear();
});

window.translations = translations;

(function sendPageVisit() {
  try {
    if (!sessionStorage.getItem("site_visit_sent")) {
      sessionStorage.setItem("site_visit_sent", "1");
      fetch("https://api.barleytxt.pl/page-visit", { method: "POST" }).catch(() => {});
    }
  } catch (_) {
    fetch("https://api.barleytxt.pl/page-visit", { method: "POST" }).catch(() => {});
  }
})();