var selectedSize = null;
var currentProduct = null;
var unsubscribeDetail = null;

window.SneakersApp.initFirebase(window);

function getDb() {
  return window.SneakersApp.getDb(window) || firebase.firestore();
}

document.addEventListener("DOMContentLoaded", function () {
  var productId = null;

  try {
    productId = localStorage.getItem("selectedProductId");
  } catch (e) {}

  if (!productId && window.parent) {
    try {
      productId = window.parent.localStorage.getItem("selectedProductId");
    } catch (e) {}
  }

  console.log("[detail] productId dari storage:", productId);

  if (!productId) {
    document.getElementById("detail-content").innerHTML =
      '<div class="detail-loading">ID produk tidak ditemukan.</div>';
    return;
  }

  muatDetailProduk(productId);
});

// ── MENGGUNAKAN ONSNAPSHOT UNTUK MENDENGARKAN PERUBAHAN STOK ──
function muatDetailProduk(id) {
  var db = getDb();
  if (!db) {
    setTimeout(function () {
      muatDetailProduk(id);
    }, 300);
    return;
  }

  if (unsubscribeDetail) unsubscribeDetail();

  unsubscribeDetail = db
    .collection("products")
    .doc(id)
    .onSnapshot(
      function (doc) {
        if (!doc.exists) {
          document.getElementById("detail-content").innerHTML =
            '<div class="detail-loading">Produk tidak ditemukan di database.</div>';
          return;
        }
        var data = doc.data();
        currentProduct = Object.assign({ id: doc.id }, data);
        console.log("[detail] Real-time update data produk:", currentProduct);
        renderDetail(currentProduct);
      },
      function (err) {
        console.error("[detail] error:", err);
        document.getElementById("detail-content").innerHTML =
          '<div class="detail-loading">Gagal memuat: ' + err.message + "</div>";
      },
    );
}

function renderDetail(data) {
  var name = data.name || data.nama || data.title || "Produk";
  var brand = data.brand || data.merek || "";
  var description =
    data.description ||
    data.deskripsi ||
    "Sneakers premium dengan kenyamanan dan gaya terbaik.";
  var image = data.image || data.gambar || data.img || "";

  var priceValue = Number(data.price || data.harga || 0);
  if (isNaN(priceValue)) priceValue = 0;

  var harga = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(priceValue);

  // 🔥 SINKRONISASI: Prioritaskan data field 'stock' sesuai struktur Firebase Anda
  var stockValue =
    data.stock !== undefined
      ? parseInt(data.stock, 10)
      : data.stok !== undefined
        ? parseInt(data.stok, 10)
        : 0;
  if (isNaN(stockValue)) stockValue = 0;

  // Penentuan kelas badge untuk pewarnaan yang dinamis
  var stockClass =
    stockValue > 5 ? "available" : stockValue > 0 ? "low" : "soldout";
  var stockLabel =
    stockValue > 0 ? "Tersedia: " + stockValue + " pcs" : "Stok habis";

  var sizes =
    data.sizes && data.sizes.length > 0
      ? data.sizes
      : [39, 40, 41, 42, 43, 44, 45];

  var sizeButtons = sizes
    .map(function (s) {
      var activeClass = selectedSize === s ? "size-btn selected" : "size-btn";
      return (
        '<button class="' +
        activeClass +
        '" onclick="pilihUkuran(this,' +
        s +
        ')">' +
        s +
        "</button>"
      );
    })
    .join("");

  var gambar = image
    ? '<img src="' + image + '" alt="' + name + '" class="detail-image" />'
    : '<div style="color:#aaa;font-size:13px;">Gambar tidak tersedia</div>';

  // Proteksi Tombol Tambah ke Keranjang jika stok habis
  var buttonText =
    stockValue > 0 ? "🛒 &nbsp;Tambah ke Keranjang" : "Stok Habis";
  var buttonDisabled = stockValue > 0 ? "" : "disabled";

  document.getElementById("detail-content").innerHTML =
    '<div class="detail-image-wrapper">' +
    gambar +
    "</div>" +
    '<div class="detail-brand">' +
    (brand || "") +
    "</div>" +
    '<div class="detail-name">' +
    (name || "") +
    "</div>" +
    '<div class="detail-price">' +
    harga +
    "</div>" +
    '<div class="detail-stock">' +
    '<span class="stock-badge ' +
    stockClass +
    '">' +
    stockLabel +
    "</span>" +
    "</div>" +
    '<hr class="detail-divider" />' +
    '<div class="detail-section-title">Deskripsi</div>' +
    '<div class="detail-description">' +
    description +
    "</div>" +
    '<hr class="detail-divider" />' +
    '<div class="detail-section-title">Pilih Ukuran (EU)</div>' +
    '<div class="size-grid">' +
    sizeButtons +
    "</div>" +
    '<button class="btn-add-cart" id="btn-cart" ' +
    buttonDisabled +
    ' onclick="tambahKeKeranjang()">' +
    buttonText +
    "</button>";
}

function pilihUkuran(el, size) {
  document.querySelectorAll(".size-btn").forEach(function (btn) {
    btn.classList.remove("selected");
  });
  el.classList.add("selected");
  selectedSize = size;
}

function tambahKeKeranjang() {
  var parentFb = window.parent && window.parent.firebase;
  var user = parentFb ? parentFb.auth().currentUser : null;

  if (!user) {
    tampilToast("Silakan masuk terlebih dahulu.");
    setTimeout(function () {
      window.parent.bukaHalamanLogin();
    }, 1200);
    return;
  }

  if (!selectedSize) {
    tampilToast("Pilih ukuran terlebih dahulu!");
    return;
  }

  // 🔥 SINKRONISASI: Pastikan validasi tombol 'Tambah' juga menggunakan field 'stock' numerik
  var currentStock =
    currentProduct.stock !== undefined
      ? parseInt(currentProduct.stock, 10)
      : currentProduct.stok !== undefined
        ? parseInt(currentProduct.stok, 10)
        : 0;
  if (isNaN(currentStock)) currentStock = 0;

  if (currentProduct && currentStock <= 0) {
    tampilToast("Stok produk ini sedang habis.");
    return;
  }

  var db = getDb();
  var btn = document.getElementById("btn-cart");
  btn.disabled = true;
  btn.innerHTML = "Menambahkan...";

  var cartRef = db.collection("users").doc(user.uid).collection("cart");

  cartRef
    .where("productId", "==", currentProduct.id)
    .where("size", "==", selectedSize)
    .get()
    .then(function (snapshot) {
      if (!snapshot.empty) {
        var ref = snapshot.docs[0].ref;
        var qty = snapshot.docs[0].data().qty || 1;
        return ref.update({ qty: qty + 1 });
      } else {
        return cartRef.add({
          productId: currentProduct.id,
          name: currentProduct.name,
          brand: currentProduct.brand || "",
          image: currentProduct.image || "",
          price: currentProduct.price,
          size: selectedSize,
          qty: 1,
          addedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      }
    })
    .then(function () {
      tampilToast("✓ Berhasil ditambahkan ke keranjang!");
      btn.disabled = false;
      btn.innerHTML = "🛒 &nbsp;Tambah ke Keranjang";
    })
    .catch(function (err) {
      console.error(err);
      tampilToast("Gagal: " + err.message);
      btn.disabled = false;
      btn.innerHTML = "🛒 &nbsp;Tambah ke Keranjang";
    });
}

function kembaliKeHome() {
  var homeNav = window.parent.document.querySelector(".nav-item:nth-child(1)");
  window.parent.switchPage("home", homeNav);
}

function tampilToast(pesan) {
  var toast = document.getElementById("toast-notif");
  toast.innerText = pesan;
  toast.classList.add("show");
  setTimeout(function () {
    toast.classList.remove("show");
  }, 2500);
}
