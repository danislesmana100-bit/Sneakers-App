var allAdminProducts = [];
var allAdminOrders = [];
var activeAdminTab = "produk";

function getDb() {
  return (
    (window.SneakersApp && window.SneakersApp.getDb(window)) ||
    firebase.firestore()
  );
}

function getAuth() {
  return (
    (window.SneakersApp && window.SneakersApp.getAuth(window)) ||
    firebase.auth()
  );
}

document.addEventListener("DOMContentLoaded", function () {
  cekRoleAdmin();
  muatProdukAdmin();
  muatPesananAdmin();
});

function cekRoleAdmin() {
  var auth = getAuth();
  if (!auth) return;

  auth.onAuthStateChanged(function (user) {
    if (!user) {
      tampilkanToastAdmin("⚠️ Akses ditolak. Silakan login sebagai Admin.");
      setTimeout(function () {
        if (window.parent && typeof window.parent.bukaHalamanLogin === "function") {
          window.parent.bukaHalamanLogin();
        }
      }, 1200);
      return;
    }

    var db = getDb();
    if (db) {
      db.collection("users")
        .doc(user.uid)
        .get()
        .then(function (doc) {
          var isAdmin = user.email && (user.email.toLowerCase().includes("admin") || user.email === "admin@sneakers.com");
          if (doc.exists && doc.data() && doc.data().role === "admin") {
            isAdmin = true;
          }

          if (!isAdmin) {
            tampilkanToastAdmin("⚠️ Akun Anda bukan Administrator.");
            setTimeout(function () {
              kembaliKeToko();
            }, 1500);
          }
        });
    }
  });
}

function pindahTabAdmin(tabName) {
  activeAdminTab = tabName;
  var tabProduk = document.getElementById("tab-admin-produk");
  var tabPesanan = document.getElementById("tab-admin-pesanan");
  var btnProduk = document.getElementById("tab-produk-btn");
  var btnPesanan = document.getElementById("tab-pesanan-btn");

  if (tabName === "produk") {
    if (tabProduk) tabProduk.style.display = "block";
    if (tabPesanan) tabPesanan.style.display = "none";
    if (btnProduk) btnProduk.classList.add("active");
    if (btnPesanan) btnPesanan.classList.remove("active");
  } else {
    if (tabProduk) tabProduk.style.display = "none";
    if (tabPesanan) tabPesanan.style.display = "block";
    if (btnProduk) btnProduk.classList.remove("active");
    if (btnPesanan) btnPesanan.classList.add("active");
  }
}

function kembaliKeToko() {
  if (window.parent && typeof window.parent.switchPage === "function") {
    var homeItem = window.parent.document.querySelectorAll(".nav-item")[0];
    window.parent.switchPage("home", homeItem);
  } else if (window.parent && window.parent.document.getElementById("app-frame")) {
    window.parent.document.getElementById("app-frame").src = "pages/home.html";
  }
}

// ── 1. MANAJEMEN PRODUK ──

function muatProdukAdmin() {
  var db = getDb();
  if (!db) {
    setTimeout(muatProdukAdmin, 400);
    return;
  }

  db.collection("products").onSnapshot(
    function (snapshot) {
      allAdminProducts = snapshot.docs.map(function (doc) {
        return Object.assign({ id: doc.id }, doc.data());
      });

      renderDaftarProdukAdmin(allAdminProducts);
      updateStatsAdmin();
    },
    function (err) {
      console.error("[Admin] Gagal memuat produk:", err);
      tampilkanToastAdmin("❌ Gagal memuat produk: " + err.message);
    }
  );
}

function renderDaftarProdukAdmin(list) {
  var container = document.getElementById("admin-product-list-container");
  if (!container) return;

  if (list.length === 0) {
    container.innerHTML =
      '<div style="text-align: center; color: #888; padding: 30px 0;">Belum ada produk di etalase.</div>';
    return;
  }

  var html = list
    .map(function (p) {
      var priceFormatted = formatRupiah(p.price || p.harga || 0);
      var stok = p.stock !== undefined ? parseInt(p.stock, 10) : p.stok !== undefined ? parseInt(p.stok, 10) : 0;
      var stokBadge = stok <= 5 ? '<span style="color: #ff3838; font-weight: 700;">(Stok Menipis: ' + stok + ')</span>' : '(Stok: ' + stok + ')';

      var thumb = p.image ? p.image : 'https://via.placeholder.com/60?text=Sneakers';

      return `
      <div class="admin-product-item">
        <img src="${thumb}" class="admin-product-thumb" alt="${p.name || ''}" onerror="this.src='https://via.placeholder.com/60?text=No+Img'" />
        <div class="admin-product-info">
          <div class="admin-product-name">${p.name || 'Produk Tanpa Nama'}</div>
          <div class="admin-product-meta">
            <strong>${p.brand || 'No Brand'}</strong> &middot; ${priceFormatted} ${stokBadge}
          </div>
        </div>
        <div class="admin-product-actions">
          <button class="btn-action-edit" onclick="bukaModalEdit('${p.id}')">✏️ Edit</button>
          <button class="btn-action-delete" onclick="hapusProdukAdmin('${p.id}', '${p.name || 'produk ini'}')">🗑️ Hapus</button>
        </div>
      </div>
    `;
    })
    .join("");

  container.innerHTML = html;
}

function filterProdukAdmin(query) {
  var q = (query || "").toLowerCase();
  var filtered = allAdminProducts.filter(function (p) {
    var nameMatch = (p.name || "").toLowerCase().includes(q);
    var brandMatch = (p.brand || "").toLowerCase().includes(q);
    return nameMatch || brandMatch;
  });
  renderDaftarProdukAdmin(filtered);
}

function simpanProdukBaru(e) {
  e.preventDefault();

  var nameVal = document.getElementById("add-name").value.trim();
  var brandVal = document.getElementById("add-brand").value;
  var priceVal = parseFloat(document.getElementById("add-price").value) || 0;
  var stockVal = parseInt(document.getElementById("add-stock").value, 10) || 0;
  var imageVal = document.getElementById("add-image").value.trim();
  var sizesVal = document.getElementById("add-sizes").value.trim();
  var categoryVal = document.getElementById("add-category").value;
  var descriptionVal = document.getElementById("add-description").value.trim();

  if (!nameVal || !brandVal || !imageVal) {
    tampilkanToastAdmin("⚠️ Harap isi nama, brand, dan URL gambar!");
    return;
  }

  var db = getDb();
  if (!db) return;

  var newProduct = {
    name: nameVal,
    brand: brandVal,
    price: priceVal,
    stock: stockVal,
    image: imageVal,
    sizes: sizesVal ? sizesVal.split(",").map(function (s) { return s.trim(); }) : ["39", "40", "41", "42", "43"],
    category: categoryVal,
    description: descriptionVal,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  db.collection("products")
    .add(newProduct)
    .then(function () {
      tampilkanToastAdmin("✅ Sneakers berhasil ditambahkan ke etalase!");
      document.getElementById("form-tambah-produk").reset();
    })
    .catch(function (err) {
      tampilkanToastAdmin("❌ Gagal menambah produk: " + err.message);
    });
}

function bukaModalEdit(id) {
  var product = allAdminProducts.find(function (p) { return p.id === id; });
  if (!product) return;

  document.getElementById("edit-id").value = product.id;
  document.getElementById("edit-name").value = product.name || "";
  document.getElementById("edit-brand").value = product.brand || "Nike";
  document.getElementById("edit-price").value = product.price || 0;
  document.getElementById("edit-stock").value = product.stock !== undefined ? product.stock : product.stok || 0;
  document.getElementById("edit-image").value = product.image || "";
  document.getElementById("edit-description").value = product.description || "";
  document.getElementById("edit-sizes").value = Array.isArray(product.sizes) ? product.sizes.join(", ") : (product.sizes || "");

  var modal = document.getElementById("modal-edit-product");
  if (modal) modal.style.display = "flex";
}

function tutupModalEdit() {
  var modal = document.getElementById("modal-edit-product");
  if (modal) modal.style.display = "none";
}

function updateProdukAdmin(e) {
  e.preventDefault();

  var id = document.getElementById("edit-id").value;
  if (!id) return;

  var nameVal = document.getElementById("edit-name").value.trim();
  var brandVal = document.getElementById("edit-brand").value;
  var priceVal = parseFloat(document.getElementById("edit-price").value) || 0;
  var stockVal = parseInt(document.getElementById("edit-stock").value, 10) || 0;
  var imageVal = document.getElementById("edit-image").value.trim();
  var sizesVal = document.getElementById("edit-sizes").value.trim();
  var descriptionVal = document.getElementById("edit-description").value.trim();

  var db = getDb();
  if (!db) return;

  db.collection("products")
    .doc(id)
    .update({
      name: nameVal,
      brand: brandVal,
      price: priceVal,
      stock: stockVal,
      image: imageVal,
      sizes: sizesVal ? sizesVal.split(",").map(function (s) { return s.trim(); }) : [],
      description: descriptionVal,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(function () {
      tampilkanToastAdmin("✓ Detail produk sukses diperbarui!");
      tutupModalEdit();
    })
    .catch(function (err) {
      tampilkanToastAdmin("❌ Gagal meng-update produk: " + err.message);
    });
}

function hapusProdukAdmin(id, namaProduk) {
  if (!confirm("Apakah Anda yakin ingin menghapus produk '" + namaProduk + "' dari etalase?")) {
    return;
  }

  var db = getDb();
  if (!db) return;

  db.collection("products")
    .doc(id)
    .delete()
    .then(function () {
      tampilkanToastAdmin("🗑️ Produk berhasil dihapus!");
    })
    .catch(function (err) {
      tampilkanToastAdmin("❌ Gagal menghapus produk: " + err.message);
    });
}

// ── 2. MANAJEMEN PESANAN ──

function muatPesananAdmin() {
  var db = getDb();
  if (!db) {
    setTimeout(muatPesananAdmin, 500);
    return;
  }

  db.collection("orders")
    .onSnapshot(
      function (snapshot) {
        allAdminOrders = snapshot.docs.map(function (doc) {
          return Object.assign({ id: doc.id }, doc.data());
        });

        // Urutkan pesanan terbaru di atas
        allAdminOrders.sort(function(a, b) {
          var tA = a.createdAt && a.createdAt.seconds ? a.createdAt.seconds : 0;
          var tB = b.createdAt && b.createdAt.seconds ? b.createdAt.seconds : 0;
          return tB - tA;
        });

        renderDaftarPesananAdmin(allAdminOrders);
        updateStatsAdmin();
      },
      function (err) {
        console.error("[Admin] Gagal memuat pesanan:", err);
      }
    );
}

function renderDaftarPesananAdmin(list) {
  var container = document.getElementById("admin-orders-list-container");
  if (!container) return;

  if (list.length === 0) {
    container.innerHTML =
      '<div style="text-align: center; color: #888; padding: 30px 0;">Belum ada pesanan masuk.</div>';
    return;
  }

  var html = list
    .map(function (o) {
      var tgl = o.createdAt && o.createdAt.seconds
        ? new Date(o.createdAt.seconds * 1000).toLocaleString("id-ID")
        : "-";

      var status = o.status || "pending";

      var items = o.items || [];
      var itemsHTML = items
        .map(function (it) {
          return `<div style="font-size:12px; margin-top:2px;">• <strong>${it.name || 'Produk'}</strong> (Ukuran: ${it.size || '-'}, Qty: ${it.qty || 1}) - ${formatRupiah(it.price || 0)}</div>`;
        })
        .join("");

      var shippingInfo = o.shippingAddress
        ? `<div>👤 <strong>${o.shippingAddress.name || o.customerName || 'Pembeli'}</strong> (${o.shippingAddress.phone || '-'})</div><div style="font-size:11px; color:#666; margin-top:2px;">📍 ${o.shippingAddress.address || '-'}</div>`
        : `<div>👤 Pembeli UID: ${o.userId || '-'}</div>`;

      return `
      <div class="admin-order-card">
        <div class="admin-order-header">
          <div>
            <div class="admin-order-id">ID Pesanan: #${o.id.substring(0, 8)}</div>
            <div class="admin-order-date">${tgl}</div>
          </div>
          <div>
            <label style="font-size: 11px; font-weight: 700; color: #555; margin-right: 6px;">Status:</label>
            <select class="admin-order-status-select" onchange="updateStatusPesananAdmin('${o.id}', this.value)">
              <option value="pending" ${status === 'pending' ? 'selected' : ''}>⏳ Menunggu Konfirmasi</option>
              <option value="processing" ${status === 'processing' ? 'selected' : ''}>⚙️ Diproses</option>
              <option value="shipped" ${status === 'shipped' ? 'selected' : ''}>🚚 Dikirim</option>
              <option value="completed" ${status === 'completed' ? 'selected' : ''}>✅ Selesai</option>
            </select>
          </div>
        </div>

        <div class="admin-order-user">
          ${shippingInfo}
        </div>

        <div style="margin-bottom: 10px;">
          <div style="font-size: 11px; font-weight: 700; color: #888; text-transform: uppercase;">Daftar Barang:</div>
          ${itemsHTML}
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed #eee; padding-top: 10px; font-size: 13px;">
          <div>Metode: <strong>${o.paymentMethod || 'COD'}</strong></div>
          <div style="font-size: 15px; font-weight: 800; color: #1a1a1a;">Total: ${formatRupiah(o.total || 0)}</div>
        </div>
      </div>
    `;
    })
    .join("");

  container.innerHTML = html;
}

function filterPesananAdmin(statusVal) {
  if (statusVal === "all") {
    renderDaftarPesananAdmin(allAdminOrders);
  } else {
    var filtered = allAdminOrders.filter(function (o) {
      return (o.status || "pending") === statusVal;
    });
    renderDaftarPesananAdmin(filtered);
  }
}

function updateStatusPesananAdmin(orderId, statusBaru) {
  var db = getDb();
  if (!db) return;

  var displayMsgMap = {
    pending: "Pesanan Anda sedang menunggu konfirmasi admin.",
    processing: "Pesanan Anda sedang diproses dan dikemas oleh toko.",
    shipped: "Pesanan Anda dalam pengiriman oleh kurir.",
    completed: "Pesanan telah selesai diterima pembeli. Terima kasih!"
  };

  db.collection("orders")
    .doc(orderId)
    .update({
      status: statusBaru,
      orderStatusDisplay: displayMsgMap[statusBaru] || "",
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(function () {
      tampilkanToastAdmin("⚡ Status pesanan berhasil diperbarui!");
    })
    .catch(function (err) {
      tampilkanToastAdmin("❌ Gagal mengubah status: " + err.message);
    });
}

// ── 3. RINGKASAN STATISTIK ──

function updateStatsAdmin() {
  var elTotalProduk = document.getElementById("stat-total-produk");
  var elTotalPesanan = document.getElementById("stat-total-pesanan");
  var elTotalOmset = document.getElementById("stat-total-omset");
  var elStokMenipis = document.getElementById("stat-stok-menipis");

  if (elTotalProduk) elTotalProduk.innerText = allAdminProducts.length;
  if (elTotalPesanan) elTotalPesanan.innerText = allAdminOrders.length;

  var totalOmset = allAdminOrders.reduce(function (sum, o) {
    return sum + (o.total || 0);
  }, 0);
  if (elTotalOmset) elTotalOmset.innerText = formatRupiah(totalOmset);

  var stokMenipis = allAdminProducts.filter(function (p) {
    var s = p.stock !== undefined ? parseInt(p.stock, 10) : p.stok !== undefined ? parseInt(p.stok, 10) : 0;
    return s <= 5;
  }).length;

  if (elStokMenipis) elStokMenipis.innerText = stokMenipis;
}

// ── UTILS ──

function formatRupiah(angka) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(angka || 0);
}

var _adminToastTimer = null;
function tampilkanToastAdmin(pesan) {
  var toast = document.getElementById("toast-admin");
  if (!toast) return;

  toast.innerText = pesan;
  toast.classList.add("show");

  clearTimeout(_adminToastTimer);
  _adminToastTimer = setTimeout(function () {
    toast.classList.remove("show");
  }, 3000);
}
