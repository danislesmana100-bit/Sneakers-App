function notify(pesan) {
  if (typeof window.tampilkanToastAuth === "function") {
    window.tampilkanToastAuth(pesan);
  } else if (typeof tampilkanToastAuth === "function") {
    tampilkanToastAuth(pesan);
  } else {
    console.log(pesan);
  }
}

// 1. LOGIKA LOGIN USER & ADMIN TERPADU
function authLogin(email, password) {
  if (!email || !password) {
    notify("⚠️ Harap isi seluruh kolom!");
    return;
  }

  const emailClean = email.trim().toLowerCase();

  firebase
    .auth()
    .signInWithEmailAndPassword(emailClean, password)
    .then((userCredential) => {
      const user = userCredential.user;
      const isAdmin = emailClean.includes("admin") || emailClean === "admin@sneakers.com";

      if (isAdmin) {
        notify("⚡ Selamat datang kembali Admin!");
        firebase.firestore().collection("users").doc(user.uid).set({
          role: "admin",
          email: user.email,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      } else {
        notify("👋 Selamat datang kembali!");
      }

      setTimeout(() => {
        if (window.parent && window.parent.document.getElementById("app-frame")) {
          window.parent.document.getElementById("app-frame").src = "pages/home.html";
        }
      }, 400);
    })
    .catch((error) => {
      // Jika mencoba masuk dengan admin@sneakers.com tetapi akun belum pernah terdaftar di auth
      if ((error.code === "auth/user-not-found" || error.code === "auth/invalid-credential") && emailClean === "admin@sneakers.com") {
        notify("🔑 Inisialisasi akun Admin default...");
        firebase.auth().createUserWithEmailAndPassword(emailClean, password)
          .then((userCredential) => {
            const user = userCredential.user;
            return firebase.firestore().collection("users").doc(user.uid).set({
              role: "admin",
              name: "Administrator",
              email: emailClean,
              createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
          })
          .then(() => {
            notify("✅ Akun Admin berhasil dikonfigurasi!");
            setTimeout(() => {
              if (window.parent && window.parent.document.getElementById("app-frame")) {
                window.parent.document.getElementById("app-frame").src = "pages/home.html";
              }
            }, 400);
          })
          .catch((regErr) => {
            notify("❌ Gagal membuat akun Admin: " + regErr.message);
          });
      } else {
        notify("❌ Gagal masuk: " + error.message);
      }
    });
}

// LOGIKA DAFTAR AKUN BARU
function authRegister(nama, email, password, konfirmasiPassword) {
  const passwordInput = document.getElementById("reg-password");
  const errorContainer = document.getElementById("error-password-msg");

  if (passwordInput) passwordInput.classList.remove("input-error");
  if (errorContainer) {
    errorContainer.innerHTML = "";
    errorContainer.style.display = "none";
  }

  if (!nama || !email || !password || !konfirmasiPassword) {
    notify("⚠️ Harap isi seluruh kolom!");
    return;
  }

  // Validasi Kekuatan Password
  const cekKarakter = password.length >= 8;
  const cekHurufBesar = /[A-Z]/.test(password);
  const cekHurufKecil = /[a-z]/.test(password);
  const cekAngka = /[0-9]/.test(password);

  if (!cekKarakter || !cekHurufBesar || !cekHurufKecil || !cekAngka) {
    if (passwordInput && errorContainer) {
      passwordInput.classList.add("input-error");
      errorContainer.innerHTML =
        "Password terlalu lemah. Harus min. 8 karakter berupa kombinasi huruf besar, kecil, dan angka.";
      errorContainer.style.display = "block";
    }
    return;
  }

  if (password !== konfirmasiPassword) {
    if (passwordInput && errorContainer) {
      passwordInput.classList.add("input-error");
      errorContainer.innerHTML = "Konfirmasi password tidak cocok!";
      errorContainer.style.display = "block";
    }
    return;
  }

  firebase
    .auth()
    .createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      return firebase
        .firestore()
        .collection("users")
        .doc(user.uid)
        .set({
          name: nama,
          email: email,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
    })
    .then(() => {
      return firebase.auth().signOut();
    })
    .then(() => {
      document.getElementById("reg-nama").value = "";
      document.getElementById("reg-email").value = "";
      document.getElementById("reg-password").value = "";
      document.getElementById("reg-password-confirm").value = "";

      if (typeof pindahForm === "function") {
        pindahForm("box-login");
      }

      notify("✅ Akun berhasil didaftarkan! Silakan masuk.");
    })
    .catch((error) => {
      notify("❌ Gagal mendaftar: " + error.message);
    });
}

function authForgotPassword(email) {
  if (!email) {
    notify("⚠️ Harap isi email Anda!");
    return;
  }

  firebase
    .auth()
    .sendPasswordResetEmail(email)
    .then(() => {
      notify("📧 Tautan reset sandi telah dikirim ke email!");
      if (typeof pindahForm === "function") {
        pindahForm("box-login");
      }
    })
    .catch((error) => {
      notify("❌ Gagal mengirim email reset: " + error.message);
    });
}