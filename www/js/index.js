// CONFIG UTAMA: Berbagi konfigurasi agar dapat dibaca otomatis oleh iframe auth
const firebaseConfig = {
  apiKey: "AIzaSyA4-M4EqDJFTsM_oIo0Xpl4HoVGk-D8SlY",
  authDomain: "sneakers-shop-97e69.firebaseapp.com",
  projectId: "sneakers-shop-97e69",
  storageBucket: "sneakers-shop-97e69.firebasestorage.app",
  messagingSenderId: "124292994294",
  appId: "1:124292994294:web:981e3cb2c7bc41c71788d7",
};
window.firebaseConfig = firebaseConfig; // Didaftarkan secara global untuk pages/auth.html

document.addEventListener("deviceready", onDeviceReady, false);
if (!window.cordova) {
  setTimeout(onDeviceReady, 500);
}

let db;
let auth;

function onDeviceReady() {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  db = firebase.firestore();
  auth = firebase.auth();

  console.log("Firebase Terkoneksi!");

  // Cek Status Login 
  auth.onAuthStateChanged((user) => {
    const bottomNav = document.getElementById("bottom-navigation-bar");
    const contentBox = document.getElementById("app-content-box");
    const btnLoginTop = document.getElementById("btn-login-top");
    const appFrame = document.getElementById("app-frame");

    if (user) {
      console.log("User terdeteksi aktif:", user.email);

      if (btnLoginTop) btnLoginTop.style.display = "none";
      if (bottomNav) bottomNav.style.display = "flex";
      if (contentBox) contentBox.classList.add("has-bottom-nav");

      updateNavbarRole(user);

      if (appFrame && appFrame.src.includes("auth.html")) {
        setTimeout(() => {
          appFrame.src = "pages/home.html";
        }, 400);
      }

      pantauBadgeKeranjang(user.uid);
    } else {
      console.log("Tidak ada user login.");

      if (btnLoginTop) btnLoginTop.style.display = "block";
      if (bottomNav) bottomNav.style.display = "none";
      if (contentBox) contentBox.classList.remove("has-bottom-nav");

      updateBadgeKeranjang(0);

      if (
        appFrame &&
        (appFrame.src === "" || appFrame.src.endsWith("index.html"))
      ) {
        appFrame.src = "pages/home.html";
      }
    }
  });
}

function updateNavbarRole(user) {
  const bottomNav = document.getElementById("bottom-navigation-bar");
  if (!bottomNav || !user) return;

  const emailClean = (user.email || "").toLowerCase();
  var isAdmin = emailClean.includes("admin") || emailClean === "admin@sneakers.com";

  if (db) {
    db.collection("users").doc(user.uid).get().then((doc) => {
      if (doc.exists && doc.data() && doc.data().role === "admin") {
        isAdmin = true;
      }
      renderNavItems(isAdmin);
    }).catch(() => {
      renderNavItems(isAdmin);
    });
  } else {
    renderNavItems(isAdmin);
  }
}

function renderNavItems(isAdmin) {
  const bottomNav = document.getElementById("bottom-navigation-bar");
  if (!bottomNav) return;

  if (isAdmin) {
    bottomNav.innerHTML = `
      <div class="nav-item active" onclick="switchPage('home', this)">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
        <span>Home</span>
      </div>
      <div class="nav-item" onclick="switchPage('profile', this)">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
        <span>Profil</span>
      </div>
      <div class="nav-item" onclick="switchPage('admin', this)">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
          <line x1="8" y1="21" x2="16" y2="21"></line>
          <line x1="12" y1="17" x2="12" y2="21"></line>
        </svg>
        <span>Panel Admin</span>
      </div>
    `;
  } else {
    bottomNav.innerHTML = `
      <div class="nav-item active" onclick="switchPage('home', this)">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
        <span>Home</span>
      </div>
      <div class="nav-item" onclick="switchPage('cart', this)">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <path d="M16 10a4 4 0 0 1-8 0"></path>
        </svg>
        <span>Keranjang</span>
      </div>
      <div class="nav-item" onclick="switchPage('orders', this)">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
        <span>Pesanan</span>
      </div>
      <div class="nav-item" onclick="switchPage('profile', this)">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
        <span>Profil</span>
      </div>
    `;
  }
}

function switchPage(pageName, element) {
  document.getElementById("app-frame").src = "pages/" + pageName + ".html";
  if (element) {
    const items = document.querySelectorAll(".nav-item");
    items.forEach((item) => item.classList.remove("active"));
    element.classList.add("active");
  }
  // Navbar SNEAKERS 
  const navbar = document.querySelector(".navbar-global");
  const contentBox = document.getElementById("app-content-box");
  if (pageName === "home") {
    if (navbar) navbar.style.display = "flex";
    if (contentBox) contentBox.classList.remove("no-navbar");
  } else {
    if (navbar) navbar.style.display = "none";
    if (contentBox) contentBox.classList.add("no-navbar");
  }
}


function ambilDataProduk(gridContainer) {
  if (!db) {
    setTimeout(() => ambilDataProduk(gridContainer), 500);
    return;
  }
  db.collection("products")
    .get()
    .then((querySnapshot) => {
      gridContainer.innerHTML = "";
      if (querySnapshot.empty) {
        gridContainer.innerHTML =
          '<div class="loading-state">Belum ada sneakers di etalase.</div>';
        return;
      }
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const hargaRupiah = new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
          minimumFractionDigits: 0,
        }).format(data.price);
        const cardHTML = `
          <div class="product-card" onclick="window.parent.detailProduk('${doc.id}')">
            <div class="product-image-wrapper">
              <img src="${data.image}" alt="${data.name}" class="product-image">
            </div>
            <div class="product-brand">${data.brand}</div>
            <div class="product-name">${data.name}</div>
            <div class="product-footer">
              <div class="product-price">${hargaRupiah}</div>
              <button class="btn-add" onclick="event.stopPropagation(); window.parent.detailProduk('${doc.id}')">Beli</button>
            </div>
          </div>`;
        gridContainer.innerHTML += cardHTML;
      });
    })
    .catch((error) => {
      console.error(error);
      gridContainer.innerHTML =
        '<div class="loading-state">Gagal memuat produk.</div>';
    });
}


function bukaHalamanLogin() {
  document.getElementById("app-frame").src = "pages/auth.html";
}

function bukaHalamanAdmin() {
  const navbar = document.querySelector(".navbar-global");
  const contentBox = document.getElementById("app-content-box");
  if (navbar) navbar.style.display = "none";
  if (contentBox) contentBox.classList.add("no-navbar");

  const items = document.querySelectorAll(".nav-item");
  items.forEach((item) => item.classList.remove("active"));

  document.getElementById("app-frame").src = "pages/admin.html";
}

// Fungsi Detail Produk 
function detailProduk(id) {
  if (id) {
    try {
      localStorage.setItem("selectedProductId", id);
      sessionStorage.setItem("selectedProductId", id);
    } catch (error) {
      console.warn("Gagal menyimpan selectedProductId:", error);
    }
  }

  const appFrame = document.getElementById("app-frame");
  appFrame.src = "pages/detail.html";

  const navbar = document.querySelector(".navbar-global");
  const contentBox = document.getElementById("app-content-box");
  if (navbar) navbar.style.display = "none";
  if (contentBox) contentBox.classList.add("no-navbar");

  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.remove("active");
  });
}

let unsubscribeCart = null;
function pantauBadgeKeranjang(uid) {
  if (unsubscribeCart) {
    unsubscribeCart();
  }

  unsubscribeCart = db
    .collection("users")
    .doc(uid)
    .collection("cart")
    .onSnapshot((snapshot) => {
      const totalQty = snapshot.docs.reduce(
        (sum, doc) => sum + (doc.data().qty || 1),
        0,
      );
      updateBadgeKeranjang(totalQty);
    });
}

function updateBadgeKeranjang(jumlah) {
  let badge = document.getElementById("cart-badge");
  const navCart = document.querySelector(".nav-item:nth-child(2)");
  if (!navCart) return;

  if (!badge) {
    badge = document.createElement("span");
    badge.id = "cart-badge";
    badge.style.cssText = `
      position: absolute;
      top: 2px;
      right: 4px;
      background: #ff3838;
      color: #fff;
      font-size: 9px;
      font-weight: 700;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
    `;
    navCart.style.position = "relative";
    navCart.appendChild(badge);
  }

  if (jumlah > 0) {
    badge.textContent = jumlah > 9 ? "9+" : jumlah;
    badge.style.display = "flex";
  } else {
    badge.style.display = "none";
  }
}

function aksiLogoutGlobal() {
  if (unsubscribeCart) {
    unsubscribeCart();
    unsubscribeCart = null;
  }

  firebase
    .auth()
    .signOut()
    .then(() => {
      var appFrame = document.getElementById("app-frame");
      if (appFrame) {
        appFrame.src = "pages/home.html";
      }

      var tabs = document.querySelectorAll(".nav-item");
      tabs.forEach((item) => item.classList.remove("active"));
      if (tabs && tabs.length > 0) {
        tabs[0].classList.add("active");
      }

      const navbar = document.querySelector(".navbar-global");
      const contentBox = document.getElementById("app-content-box");
      if (navbar) navbar.style.display = "flex";
      if (contentBox) contentBox.classList.remove("no-navbar");
    })
    .catch((error) => {
      console.error("Gagal logout:", error);
    });
}

function ambilDataProfil(uid, callback) {
  if (!db) {
    setTimeout(() => ambilDataProfil(uid, callback), 300);
    return;
  }
  db.collection("users")
    .doc(uid)
    .get()
    .then((doc) => {
      if (doc.exists) {
        callback(doc.data());
      } else {
        callback(null);
      }
    })
    .catch(() => callback(null));
}


var _searchTimer = null;
var _allProductsCache = [];

function bukaSearchOverlay() {
  var overlay = document.getElementById("search-overlay");
  if (!overlay) return;
  overlay.classList.add("open");

  setTimeout(function () {
    var inp = document.getElementById("search-overlay-input");
    if (inp) {
      inp.focus();
      inp.value = "";
    }
    document.getElementById("search-clear-btn").style.display = "none";
    document.getElementById("search-subtitle").innerText =
      "Ketik untuk mulai mencari...";
    document.getElementById("search-overlay-results").innerHTML = "";
  }, 50);

  if (_allProductsCache.length === 0 && db) {
    db.collection("products")
      .get()
      .then(function (snap) {
        _allProductsCache = snap.docs.map(function (d) {
          return Object.assign({ id: d.id }, d.data());
        });
      });
  }
}

function tutupSearchOverlay() {
  var overlay = document.getElementById("search-overlay");
  if (overlay) overlay.classList.remove("open");
  var inp = document.getElementById("search-overlay-input");
  if (inp) inp.blur();
}

function clearSearch() {
  var inp = document.getElementById("search-overlay-input");
  if (inp) {
    inp.value = "";
    inp.focus();
  }
  document.getElementById("search-clear-btn").style.display = "none";
  document.getElementById("search-subtitle").innerText =
    "Ketik untuk mulai mencari...";
  document.getElementById("search-overlay-results").innerHTML = "";
}

function onSearchOverlayInput(val) {
  var clearBtn = document.getElementById("search-clear-btn");
  if (clearBtn) clearBtn.style.display = val.length > 0 ? "flex" : "none";

  clearTimeout(_searchTimer);
  var q = val.trim().toLowerCase();

  if (!q) {
    document.getElementById("search-subtitle").innerText =
      "Ketik untuk mulai mencari...";
    document.getElementById("search-overlay-results").innerHTML = "";
    return;
  }

  _searchTimer = setTimeout(function () {
    eksekusiSearch(q, val.trim());
  }, 180);
}

function eksekusiSearch(q, originalVal) {
  var doSearch = function (products) {
    var results = products.filter(function (p) {
      return (
        (p.name || "").toLowerCase().includes(q) ||
        (p.brand || "").toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q)
      );
    });

    var subtitle = document.getElementById("search-subtitle");
    var container = document.getElementById("search-overlay-results");

    subtitle.innerText =
      results.length > 0
        ? results.length + ' hasil untuk "' + originalVal + '"'
        : 'Tidak ada hasil untuk "' + originalVal + '"';

    if (results.length === 0) {
      container.innerHTML =
        '<div class="search-empty-state">' +
        '<div class="search-empty-icon">🔍</div>' +
        "<p>Produk tidak ditemukan.<br>Coba kata kunci lain.</p>" +
        "</div>";
      return;
    }

    container.innerHTML = results
      .map(function (p) {
        var harga = new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
          minimumFractionDigits: 0,
        }).format(p.price || 0);

        var namaHighlight = (p.name || "").replace(
          new RegExp(
            "(" + originalVal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")",
            "gi",
          ),
          '<span class="search-highlight">$1</span>',
        );

        var imgHTML = p.image
          ? '<img src="' + p.image + '" alt="' + (p.name || "") + '" />'
          : '<div style="color:#ccc;font-size:10px;text-align:center;">No img</div>';

        return (
          '<div class="search-result-item" onclick="pilihProdukDariSearch(\'' +
          p.id +
          "')\">" +
          '<div class="search-result-img">' +
          imgHTML +
          "</div>" +
          '<div class="search-result-info">' +
          '<div class="search-result-brand">' +
          (p.brand || "") +
          "</div>" +
          '<div class="search-result-name">' +
          namaHighlight +
          "</div>" +
          '<div class="search-result-price">' +
          harga +
          "</div>" +
          "</div>" +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>' +
          "</div>"
        );
      })
      .join("");
  };

  if (_allProductsCache.length > 0) {
    doSearch(_allProductsCache);
  } else if (db) {
    db.collection("products")
      .get()
      .then(function (snap) {
        _allProductsCache = snap.docs.map(function (d) {
          return Object.assign({ id: d.id }, d.data());
        });
        doSearch(_allProductsCache);
      });
  }
}

function pilihProdukDariSearch(id) {
  tutupSearchOverlay();
  detailProduk(id);
}