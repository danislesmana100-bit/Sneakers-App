var cartItems = [];
var unsubscribeCart = null;

// Menginisialisasi Firebase menggunakan helper SneakersApp bawaan Anda
window.SneakersApp.initFirebase(window);

function getDb() {
  return window.SneakersApp.getDb(window) || firebase.firestore();
}

// Menunggu Auth State berubah sebelum memuat data keranjang
document.addEventListener("DOMContentLoaded", function () {
  firebase.auth().onAuthStateChanged(function (user) {
    if (user) {
      muatKeranjang(user.uid);
    } else {
      tampilBelumLogin();
    }
  });
});

function tampilBelumLogin() {
  document.getElementById("cart-content").innerHTML =
    '<div class="empty-state-box">' +
    '<div class="empty-state-icon">🔒</div>' +
    '<div class="empty-state-text">Silakan masuk untuk melihat keranjang Anda.</div>' +
    '<button onclick="window.parent.bukaHalamanLogin()" ' +
    'style="margin-top:16px;background:#1a1a1a;color:#fff;border:none;padding:12px 24px;' +
    'border-radius:10px;font-weight:600;font-size:14px;cursor:pointer;">' +
    "Masuk Sekarang</button>" +
    "</div>";
}

function muatKeranjang(uid) {
  var db = getDb();

  if (unsubscribeCart) unsubscribeCart();

  unsubscribeCart = db
    .collection("users")
    .doc(uid)
    .collection("cart")
    .orderBy("addedAt", "desc")
    .onSnapshot(
      function (snapshot) {
        cartItems = snapshot.docs.map(function (doc) {
          return Object.assign({ docId: doc.id }, doc.data());
        });
        renderKeranjang(uid);
      },
      function (err) {
        console.error("[cart] error:", err);
        // Fallback jika Index query gabungan belum dibuat oleh Firebase console Anda
        db.collection("users")
          .doc(uid)
          .collection("cart")
          .get()
          .then(function (snapshot) {
            cartItems = snapshot.docs.map(function (doc) {
              return Object.assign({ docId: doc.id }, doc.data());
            });
            renderKeranjang(uid);
          });
      },
    );
}

function renderKeranjang(uid) {
  var container = document.getElementById("cart-content");

  if (cartItems.length === 0) {
    container.innerHTML =
      '<div class="empty-state-box">' +
      '<div class="empty-state-icon">🛒</div>' +
      '<div class="empty-state-text">Keranjang belanja Anda masih kosong.</div>' +
      "</div>";
    return;
  }

  var itemsHTML = cartItems
    .map(function (item) {
      var imgHTML = item.image
        ? '<img src="' + item.image + '" alt="' + (item.name || "") + '" />'
        : '<div style="color:#ccc;font-size:11px;text-align:center;">No img</div>';

      var hargaItem = formatRupiah((item.price || 0) * (item.qty || 1));

      return (
        '<div class="cart-item">' +
        '<div class="cart-item-img">' +
        imgHTML +
        "</div>" +
        '<div class="cart-item-info">' +
        '<div class="cart-item-brand">' +
        (item.brand || "") +
        "</div>" +
        '<div class="cart-item-name">' +
        (item.name || "") +
        "</div>" +
        '<div class="cart-item-meta">Ukuran ' +
        (item.size || "-") +
        "</div>" +
        '<div class="cart-item-bottom">' +
        '<div class="cart-item-price">' +
        hargaItem +
        "</div>" +
        '<div class="qty-control">' +
        '<button class="qty-btn" onclick="ubahQty(\'' +
        item.docId +
        "'," +
        (item.qty || 1) +
        ',-1)">−</button>' +
        '<span class="qty-value">' +
        (item.qty || 1) +
        "</span>" +
        '<button class="qty-btn" onclick="ubahQty(\'' +
        item.docId +
        "'," +
        (item.qty || 1) +
        ',1)">+</button>' +
        "</div>" +
        "</div>" +
        "</div>" +
        '<button class="btn-remove" onclick="hapusItem(\'' +
        item.docId +
        '\')" title="Hapus">' +
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
        '<polyline points="3 6 5 6 21 6"></polyline>' +
        '<path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>' +
        '<path d="M10 11v6M14 11v6"></path>' +
        '<path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>' +
        "</svg>" +
        "</button>" +
        "</div>"
      );
    })
    .join("");

  var subtotal = cartItems.reduce(function (sum, item) {
    return sum + (item.price || 0) * (item.qty || 1);
  }, 0);
  var ongkir = 25000;
  var total = subtotal + ongkir;
  var totalItem = cartItems.reduce(function (sum, item) {
    return sum + (item.qty || 1);
  }, 0);

  var summaryHTML =
    '<div class="cart-summary">' +
    '<div class="summary-row">' +
    "<span>Subtotal (" +
    totalItem +
    " pcs)</span>" +
    "<span>" +
    formatRupiah(subtotal) +
    "</span>" +
    "</div>" +
    '<div class="summary-row">' +
    "<span>Ongkos Kirim</span>" +
    "<span>" +
    formatRupiah(ongkir) +
    "</span>" +
    "</div>" +
    '<div class="summary-row total">' +
    "<span>Total</span>" +
    "<span>" +
    formatRupiah(total) +
    "</span>" +
    "</div>" +
    // CARI BARIS KODE INI DI DALAM VARIABEL summaryHTML:
    '<button class="btn-checkout" onclick="navigasiKePayment()">Checkout Sekarang →</button>' +
    "</div>";

  container.innerHTML = itemsHTML + summaryHTML;
}

function ubahQty(docId, currentQty, delta) {
  var user = firebase.auth().currentUser;
  if (!user) return;
  var db = getDb();
  var newQty = currentQty + delta;
  var ref = db.collection("users").doc(user.uid).collection("cart").doc(docId);
  if (newQty <= 0) {
    hapusItem(docId);
  } else {
    ref.update({ qty: newQty }).catch(function (e) {
      console.error(e);
    });
  }
}

function hapusItem(docId) {
  var user = firebase.auth().currentUser;
  if (!user) return;
  var db = getDb();
  db.collection("users")
    .doc(user.uid)
    .collection("cart")
    .doc(docId)
    .delete()
    .then(function () {
      tampilToast("Item dihapus.");
    })
    .catch(function (e) {
      console.error(e);
    });
}

// FUNGSI CHECKOUT HANYA MENGOPER DATA KE LOCALSTORAGE & PINDAH SCREEN
function navigasiKePayment() {
  // atau nama fungsi: aksiCheckout()
  var user = firebase.auth().currentUser;
  if (!user) {
    tampilToast("Silakan masuk terlebih dahulu.");
    return;
  }
  if (cartItems.length === 0) {
    tampilToast("Keranjang belanja Anda kosong.");
    return;
  }

  // 1. Bungkus item keranjang belanja menjadi payload terstruktur
  var checkoutPayload = {
    userId: user.uid,
    items: cartItems.map(function (i) {
      return {
        docId: i.docId || "", // 👈 MODIFIKASI: ID Dokumen asli wajib diikutkan agar bisa dihapus nanti
        productId: i.productId || "",
        name: i.name || "",
        brand: i.brand || "",
        image: i.image || "",
        price: i.price || 0,
        size: i.size || 0,
        qty: i.qty || 1,
      };
    }),
  };

  // 2. Simpan sementara di LocalStorage browser
  localStorage.setItem("pending_checkout", JSON.stringify(checkoutPayload));

  // 3. REVISI UTAMA: Alihkan Iframe ke halaman ringkasan (checkout.html), BUKAN langsung ke payment!
  if (window.parent && window.parent.document.getElementById("app-frame")) {
    window.parent.document.getElementById("app-frame").src =
      "pages/checkout.html";
  } else {
    window.location.href = "checkout.html";
  }
}

function formatRupiah(angka) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(angka);
}

function tampilToast(pesan) {
  var toast = document.getElementById("cart-toast");
  toast.innerText = pesan;
  toast.classList.add("show");
  setTimeout(function () {
    toast.classList.remove("show");
  }, 2500);
}
