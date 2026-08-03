function prosesPembayaran() {
  var user =
    window.SneakersApp.getCurrentUser(window) || firebase.auth().currentUser;
  var db = window.SneakersApp.getDb(window) || firebase.firestore();

  if (!user) {
    alert("Silakan login terlebih dahulu!");
    return;
  }

  var paymentInput = document.querySelector(
    'input[name="payment_method"]:checked',
  );
  if (!paymentInput) {
    alert("Silakan pilih metode pembayaran!");
    return;
  }

  // Kunci tombol agar tidak bisa double-click (menghindari duplikat order)
  var btnBayar =
    document.querySelector(".btn-checkout-black") ||
    document.querySelector("button[onclick='prosesPembayaran()']");
  if (btnBayar) {
    btnBayar.disabled = true;
    btnBayar.innerText = "Memproses Transaksi...";
  }

  var selectedMethod = paymentInput.value;
  var methodLabel = "COD";
  var dbStatus = "pending";
  var notifPesan =
    "✓ Pesanan Berhasil! Mohon siapkan uang Anda saat kurir datang.";

  if (selectedMethod === "Transfer Bank") {
    methodLabel = "Transfer Bank";
    dbStatus = "pending";
    notifPesan = "✓ Pesanan dibuat! Menunggu pembayaran transfer bank Anda.";
  } else if (selectedMethod === "E-Wallet") {
    methodLabel = "E-Wallet";
    dbStatus = "pending";
    notifPesan = "✓ Pesanan dibuat! Menunggu pembayaran e-wallet Anda.";
  }

  var storedPayload = localStorage.getItem("pending_checkout");
  if (!storedPayload) {
    alert("Data transaksi tidak ditemukan.");
    if (btnBayar) {
      btnBayar.disabled = false;
      btnBayar.innerText = "Bayar Sekarang";
    }
    return;
  }

  var checkoutData = JSON.parse(storedPayload);

  var totalItemsCount = 0;
  var subtotal = checkoutData.items.reduce(function (sum, item) {
    var itemQty = parseInt(item.qty || item.quantity || 1, 10);
    totalItemsCount += itemQty;
    return sum + item.price * itemQty;
  }, 0);
  var ongkir = 25000;

  var formattedItems = checkoutData.items.map(function (item) {
    return {
      docId: item.docId || "",
      productId: item.productId || "",
      name: item.name || "",
      brand: item.brand || "",
      image: item.image || "",
      price: item.price || 0,
      size: item.size || 0,
      qty: parseInt(item.qty || item.quantity || 1, 10),
    };
  });

  var orderDataFinal = {
    userId: user.uid,
    alamatPengiriman: checkoutData.alamat || {},
    items: formattedItems,
    subtotal: subtotal,
    ongkir: ongkir,
    total: subtotal + ongkir,
    totalItems: totalItemsCount,
    paymentMethod: methodLabel,
    orderStatusDisplay:
      selectedMethod === "COD"
        ? "Harap siapkan uang sebelum barang datang"
        : "Menunggu Pembayaran",
    status: dbStatus,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  };

  // 1. Simpan Transaksi Baru ke Root Collection "orders"
  db.collection("orders")
    .add(orderDataFinal)
    .then(function () {
      var batch = db.batch();

      // 2. Loop otomatis untuk SEMUA produk yang ada di dalam transaksi keranjang
      checkoutData.items.forEach(function (item) {
        var jumlahDibeli = parseInt(item.qty || item.quantity || 1, 10);

        if (item.productId) {
          var productRef = db.collection("products").doc(item.productId);

          // 🔥 SOLUSI UNIVERSAL: Update field 'stock' dengan aman menggunakan increment negatif
          batch.update(productRef, {
            stock: firebase.firestore.FieldValue.increment(-jumlahDibeli),
          });
        }

        // Hapus Item dari Keranjang Belanja User setelah dibeli
        var documentReferenceId = item.docId;
        if (documentReferenceId) {
          var cartRef = db
            .collection("users")
            .doc(user.uid)
            .collection("cart")
            .doc(documentReferenceId);
          batch.delete(cartRef);
        }
      });

      // Jalankan semua perintah batch (potong stok & hapus cart) secara bersamaan
      return batch.commit();
    })
    .then(function () {
      // 1. Bersihkan cache LocalStorage
      localStorage.removeItem("pending_checkout");

      // 🔥 MODIFIKASI: Panggil Toast interaktif monokrom mewah menggantikan alert bawaan browser
      tampilToastPembayaran(notifPesan);

      // 2. Reset Badge Navigasi Keranjang di parent jika fungsi tersedia
      try {
        if (window.parent && window.parent.renderBadgeKeranjang) {
          window.parent.renderBadgeKeranjang(0);
        }
      } catch (badgeErr) {
        console.log(badgeErr);
      }

      // 🔥 MODIFIKASI: Beri jeda 2 detik (2000ms) agar user bisa melihat animasi Toast, lalu pindah halaman
      setTimeout(function () {
        // Alihkan iframe ke halaman riwayat pesanan (orders.html) secara akurat
        if (
          window.parent &&
          window.parent.document.getElementById("app-frame")
        ) {
          window.parent.document.getElementById("app-frame").src =
            "pages/orders.html";

          var tabs = window.parent.document.querySelectorAll(".nav-item");
          if (tabs && tabs.length >= 3) {
            tabs.forEach(function (t) {
              t.classList.remove("active");
            });
            tabs[2].classList.add("active");
          }
          if (window.parent.switchPage) {
            window.parent.switchPage("orders", tabs[2]);
          }
        } else {
          window.location.href = "orders.html";
        }
      }, 2000);
    })
    .catch(function (err) {
      console.error("Proses transaksi gagal:", err);

      // 🔥 MODIFIKASI: Mengubah alert error menjadi Toast juga agar interaksinya seragam
      tampilToastPembayaran("❌ Gagal memproses pembayaran: " + err.message);

      if (btnBayar) {
        btnBayar.disabled = false;
        btnBayar.innerText = "Bayar Sekarang";
      }
    });
}

// 🔥 FUNGSI PEMBANTU: Tempelkan fungsi ini di paling bawah file payment-page.js Anda (di luar fungsi prosesPembayaran)
function tampilToastPembayaran(pesan) {
  var toast = document.getElementById("toast-notif");
  if (!toast) return;
  toast.innerText = pesan;
  toast.classList.add("show");

  setTimeout(function () {
    toast.classList.remove("show");
  }, 2300); // Toast menghilang otomatis sedikit setelah halaman mulai bersiap pindah
}
