var allProducts = [];
var activeBrand = "all";

window.SneakersApp.initFirebase(window);

function getDb() {
  return window.SneakersApp.getDb(window) || firebase.firestore();
}

document.addEventListener("DOMContentLoaded", function () {
  muatSemuaProduk();

  aktifkanSinkronisasiTombolMasuk();

  inisialisasiSpandukOtomatis();
});

function inisialisasiSpandukOtomatis() {
  if (typeof Swiper !== "undefined") {
    new Swiper(".hero-swiper", {
      loop: true,
      speed: 800, 
      autoplay: {
        delay: 3000, 
        disableOnInteraction: false, 
      },
      pagination: {
        el: ".premium-pagination",
        clickable: false, 
      },
      effect: "slide",
    });
  } else {
    setTimeout(inisialisasiSpandukOtomatis, 150);
  }
}

function aktifkanSinkronisasiTombolMasuk() {
  var parentFb = window.parent && window.parent.firebase;
  var auth = parentFb ? parentFb.auth() : firebase.auth();

  auth.onAuthStateChanged(function (user) {
    var btnMasuk = document.getElementById("btn-masuk-header");
    if (btnMasuk) {
      if (user) {
        btnMasuk.style.display = "none";
      } else {
        btnMasuk.style.display = "flex";
      }
    }
  });
}

function muatSemuaProduk() {
  var db = getDb();
  if (!db) {
    setTimeout(muatSemuaProduk, 300);
    return;
  }

  db.collection("products").onSnapshot(
    function (snapshot) {
      allProducts = snapshot.docs.map(function (doc) {
        return Object.assign({ id: doc.id }, doc.data());
      });
      tampilkanProduk(activeBrand);
    },
    function (err) {
      console.error("Firestore loading error: ", err);
    },
  );
}

function tampilkanProduk(brand) {
  var grid = document.getElementById("product-grid-home");
  var label = document.getElementById("section-label-text");
  var countLabel = document.getElementById("product-count-label");

  var filtered;
  if (brand === "all") {
    filtered = acak(allProducts).slice(0, 16);
    label.innerText = "Rekomendasi";
  } else {
    filtered = allProducts.filter(function (p) {
      return (p.brand || "").toLowerCase() === brand.toLowerCase();
    });
    label.innerText = brand;
  }

  if (countLabel) {
    countLabel.innerText = "";
  }

  if (!grid) return;

  if (filtered.length === 0) {
    grid.innerHTML =
      '<div style="grid-column:1/-1;text-align:center;padding:50px 0;color:#aaa;font-size:14px;">Belum ada produk untuk brand ini.</div>';
    return;
  }

  grid.innerHTML = filtered
    .map(function (p) {
      return renderCard(p);
    })
    .join("");
}

function renderCard(p) {
  var harga = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(p.price || 0);

  var img = p.image
    ? `<img src="${p.image}" alt="${p.name || ""}" loading="lazy" />`
    : '<div style="color:#ccc;font-size:11px;">No image</div>';

  var sisaStok =
    p.stock !== undefined
      ? parseInt(p.stock, 10)
      : p.stok !== undefined
        ? parseInt(p.stok, 10)
        : 0;
  if (isNaN(sisaStok)) sisaStok = 0;

  var stokHTML = "";
  var buttonHTML = "";

  if (sisaStok > 0) {
    stokHTML = `<div style="font-size: 11px; color: #8c8c8c; margin-top: 4px; font-weight: 500;">Tersedia: ${sisaStok} pcs</div>`;
    buttonHTML = `<button class="btn-buy" onclick="event.stopPropagation();window.parent.detailProduk('${p.id}')">Beli</button>`;
  } else {
    stokHTML = `<div style="font-size: 11px; color: #ff3838; margin-top: 4px; font-weight: 700;">Habis</div>`;
    buttonHTML = `<button class="btn-buy" disabled style="background:#cccccc; color:#ffffff; cursor:not-allowed;" onclick="event.stopPropagation();">Beli</button>`;
  }

  return `
    <div class="product-card-home" onclick="window.parent.detailProduk('${p.id}')">
      <div class="product-card-img">${img}</div>
      <div class="product-card-body">
        <div class="product-card-brand">${p.brand || ""}</div>
        <div class="product-card-name">${p.name || ""}</div>
        ${stokHTML}
        <div class="product-card-footer" style="margin-top: 8px;">
          <div class="product-card-price">${harga}</div>
          ${buttonHTML}
        </div>
      </div>
    </div>
  `;
}

function filterBrand(brand, el) {
  activeBrand = brand;
  document.querySelectorAll(".brand-chip").forEach(function (c) {
    c.classList.remove("active");
  });
  if (el) el.classList.add("active");
  tampilkanProduk(brand);
}

function resetBrand() {
  filterBrand("all", document.getElementById("chip-all"));
}

function acak(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}
