document.addEventListener("DOMContentLoaded", () => {
  muatPesanan();
});

function muatPesanan() {
  // Mengambil user & db melalui window.SneakersApp agar konsisten dengan arsitektur app-core.js Anda
  const user = window.SneakersApp.getCurrentUser(window);

  if (!user) {
    document.getElementById("orders-content").innerHTML = `
      <div class="empty-state-box" style="text-align:center; padding:60px 0;">
        <div class="empty-state-icon" style="font-size:30px; margin-bottom:10px;">🔒</div>
        <div class="empty-state-text" style="color:#8c8c8c; font-size:14px;">Silakan masuk untuk melihat pesanan Anda.</div>
        <button onclick="window.parent.bukaHalamanLogin()"
          style="margin-top:16px; background:#1a1a1a; color:#fff; border:none; padding:12px 24px; border-radius:10px; font-weight:600; font-size:14px; cursor:pointer;">
          Masuk Sekarang
        </button>
      </div>`;
    return;
  }

  const db = window.SneakersApp.getDb(window);

  // 1. Kueri Utama menggunakan orderBy
  db.collection("orders")
    .where("userId", "==", user.uid)
    .orderBy("createdAt", "desc")
    .onSnapshot(
      (snapshot) => {
        tampilkanDataPesanan(snapshot);
      },
      (err) => {
        console.warn(
          "Kueri orderBy gagal (Index belum siap). Menjalankan kueri fallback...",
          err,
        );

        // 💡 TIPS TEKNIS: Buka F12 -> tab Console di browser. Klik link otomatis dari Firebase untuk membuat Index jika ada.

        // 2. FALLBACK UTAMA: Jika kueri di atas gagal karena masalah index, ambil data secara aman tanpa urutan waktu
        db.collection("orders")
          .where("userId", "==", user.uid)
          .onSnapshot(
            (snapshot) => {
              tampilkanDataPesanan(snapshot);
            },
            (fallbackErr) => {
              console.error("Kueri fallback juga gagal:", fallbackErr);
              document.getElementById("orders-content").innerHTML =
                '<div style="text-align:center; padding:60px 0; color:#8c8c8c; font-size:14px;">Gagal memuat pesanan.</div>';
            },
          );
      },
    );
}

// Fungsi bantu untuk merender snapshot dokumen ke elemen HTML
function tampilkanDataPesanan(snapshot) {
  if (snapshot.empty) {
    document.getElementById("orders-content").innerHTML = `
      <div class="empty-state-box" style="text-align:center; padding:60px 0;">
        <div class="empty-state-icon" style="font-size:30px; margin-bottom:10px;">📦</div>
        <div class="empty-state-text" style="color:#8c8c8c; font-size:14px;">Belum ada pesanan yang tercatat.</div>
      </div>`;
    return;
  }

  const html = snapshot.docs
    .map((doc) => renderOrderCard(doc.id, doc.data()))
    .join("");
  document.getElementById("orders-content").innerHTML = html;
}

function renderOrderCard(orderId, data) {
  // Pemetaan Status Menggunakan Class CSS Premium Monokrom Baru
  const statusMap = {
    pending: { label: "Menunggu Konfirmasi", cls: "status-premium-pending" },
    processing: { label: "Diproses", cls: "status-premium-processing" },
    shipped: { label: "Dikirim", cls: "status-premium-shipped" },
    completed: { label: "Selesai", cls: "status-premium-completed" },
  };
  const status = statusMap[data.status] || statusMap["pending"];

  const tanggal = data.createdAt
    ? new Date(data.createdAt.seconds * 1000).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "-";

  const items = data.items || [];
  var totalPcs =
    data.totalItems || items.reduce((sum, item) => sum + (item.qty || 1), 0);

  // Render List Item Sepatu dengan Detail Gambar, Ukuran, dan Jumlah Pcs
  const itemsHTML = items
    .map((item) => {
      var imgHTML = item.image
        ? `<img src="${item.image}" alt="${item.name}" />`
        : `<div style="color:#ccc; font-size:10px;">No Image</div>`;

      return `
      <div class="premium-order-item-row">
        <div class="premium-order-item-thumb">
          ${imgHTML}
        </div>
        <div class="premium-order-item-info">
          <div class="premium-order-item-name">${item.name}</div>
          <div class="premium-order-item-meta">Ukuran: ${item.size || "-"} &middot; ${item.qty || 1} pcs</div>
          <div class="premium-order-item-price">${formatRupiah(item.price)}</div>
        </div>
      </div>
    `;
    })
    .join("");

  // Render Baris Notifikasi Dinamis Sesuai Metode Pembayaran (COD / Bank Transfer)
  const statusTambahanText = data.orderStatusDisplay
    ? `<div class="premium-order-reminder">💡 ${data.orderStatusDisplay}</div>`
    : "";

  return `
    <div class="premium-order-card">
      <div class="premium-order-header">
        <div class="premium-order-title-wrapper">
          <div class="premium-order-label">Pesanan</div>
          <div class="premium-order-date">${tanggal}</div>
        </div>
        <div class="premium-status-badge ${status.cls}">${status.label}</div>
      </div>
      
      ${statusTambahanText}
      
      <div class="premium-order-body">
        ${itemsHTML}
      </div>
      
      <div class="premium-order-footer">
        <div class="premium-order-footer-row">
          <span class="premium-footer-label">Total Pembayaran (${totalPcs} item)</span>
          <span class="premium-footer-value-total">${formatRupiah(data.total)}</span>
        </div>
        <div class="premium-order-footer-row" style="margin-top: 2px;">
          <span class="premium-footer-label">Metode Pembayaran</span>
          <span class="premium-footer-value-method">${data.paymentMethod || "COD"}</span>
        </div>
      </div>
    </div>`;
}

function formatRupiah(angka) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(angka);
}
