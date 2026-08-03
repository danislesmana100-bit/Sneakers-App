var counterPengecekan = 0;

function getDb() {
  return (
    (window.SneakersApp && window.SneakersApp.getDb(window)) ||
    firebase.firestore()
  );
}

document.addEventListener("DOMContentLoaded", () => {
  cekStatusLoginIframe();
});

function cekStatusLoginIframe() {
  var parentFb = window.parent && window.parent.firebase;
  var auth = parentFb ? parentFb.auth() : firebase.auth();

  auth.onAuthStateChanged(function (user) {
    const belumLogin = document.getElementById("box-belum-login");
    const sudahLogin = document.getElementById("box-sudah-login");
    const elNama = document.getElementById("user-display-name");
    const elEmail = document.getElementById("user-display-email");

    if (user) {
      if (belumLogin) belumLogin.style.display = "none";
      if (sudahLogin) sudahLogin.style.display = "block";

      if (elEmail) elEmail.innerText = user.email;
      if (elNama) elNama.innerText = "Memuat...";

      // Muat data detail kustom (Nama, Telepon, Alamat) dari Firestore
      muatDataProfilFirestore(user);
    } else {
      if (belumLogin) belumLogin.style.display = "block";
      if (sudahLogin) sudahLogin.style.display = "none";
    }
  });
}

function muatDataProfilFirestore(user) {
  var db = getDb();
  if (!db) return;

  db.collection("users")
    .doc(user.uid)
    .get()
    .then(function (doc) {
      const elNama = document.getElementById("user-display-name");
      const menuAdmin = document.getElementById("menu-admin-panel");
      var defaultName = user.email ? user.email.split("@")[0] : "User Premium";

      var isAdmin = (user.email && (user.email.toLowerCase().includes("admin") || user.email === "admin@sneakers.com"));

      if (doc.exists && doc.data()) {
        var userData = doc.data();
        if (userData.role === "admin") {
          isAdmin = true;
        }

        if (elNama)
          elNama.innerText = userData.nama || userData.name || defaultName;

        // Isi form modal pengaturan secara otomatis jika datanya sudah tersimpan di Firebase
        if (document.getElementById("set-nama"))
          document.getElementById("set-nama").value =
            userData.nama || userData.name || "";
        if (document.getElementById("set-telepon"))
          document.getElementById("set-telepon").value = userData.telepon || "";
        if (document.getElementById("set-jalan"))
          document.getElementById("set-jalan").value = userData.alamat || "";
      } else {
        if (elNama) elNama.innerText = defaultName;
      }

      if (menuAdmin) {
        menuAdmin.style.display = isAdmin ? "flex" : "none";
      }
    })
    .catch(function (err) {
      console.error("Gagal menarik data profil:", err);
      const elNama = document.getElementById("user-display-name");
      const menuAdmin = document.getElementById("menu-admin-panel");
      if (elNama)
        elNama.innerText = user.email
          ? user.email.split("@")[0]
          : "User Premium";

      if (user.email && (user.email.toLowerCase().includes("admin") || user.email === "admin@sneakers.com")) {
        if (menuAdmin) menuAdmin.style.display = "flex";
      }
    });
}

function bukaSheetPengaturan() {
  var modal = document.getElementById("settings-modal");
  if (modal) modal.style.display = "flex";
}

function tutupSheetPengaturan(event) {
  var modal = document.getElementById("settings-modal");
  if (!modal) return;
  if (event === null || event.target === modal) {
    modal.style.display = "none";
  }
}

// ── SIMPAN DATA PENGATURAN ALAMAT & PROFIL KE FIRESTORE ──
function simpanPengaturanProfil() {
  var parentFb = window.parent && window.parent.firebase;
  var user = parentFb
    ? parentFb.auth().currentUser
    : firebase.auth().currentUser;

  if (!user) {
    tampilToastProfil("⚠️ Sesi berakhir. Gagal menyimpan.");
    return;
  }

  var namaVal = document.getElementById("set-nama").value.trim();
  var telpVal = document.getElementById("set-telepon").value.trim();
  var jalanVal = document.getElementById("set-jalan").value.trim();

  if (!namaVal || !telpVal || !jalanVal) {
    tampilToastProfil("⚠️ Harap lengkapi semua baris input!");
    return;
  }

  var db = getDb();
  if (!db) return;

  // Set/Merge data ke dokumen users/{uid} agar tersinkronisasi otomatis dengan checkout.html
  db.collection("users")
    .doc(user.uid)
    .set(
      {
        nama: namaVal,
        name: namaVal, // Mendukung kompatibilitas key name lawas jika ada
        telepon: telpVal,
        alamat: jalanVal,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
    .then(function () {
      tampilToastProfil("✓ Profil & Alamat sukses disimpan!");

      const elNama = document.getElementById("user-display-name");
      if (elNama) elNama.innerText = namaVal;

      setTimeout(function () {
        var modal = document.getElementById("settings-modal");
        if (modal) modal.style.display = "none";
      }, 1200);
    })
    .catch(function (err) {
      tampilToastProfil("❌ Gagal menyimpan: " + err.message);
    });
}

function tampilToastProfil(pesan) {
  var toast = document.getElementById("toast-profile");
  if (!toast) return;
  toast.innerText = pesan;
  toast.classList.add("show");
  setTimeout(function () {
    toast.classList.remove("show");
  }, 2500);
}
