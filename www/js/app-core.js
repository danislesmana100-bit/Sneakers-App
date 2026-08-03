(function (root) {
  const app = root.SneakersApp || (root.SneakersApp = {});

  function resolveConfig(sourceWindow) {
    const target = sourceWindow || root;
    const parentWindow =
      target.parent && target.parent !== target ? target.parent : null;

    if (target.firebaseConfig) return target.firebaseConfig;
    if (parentWindow && parentWindow.firebaseConfig)
      return parentWindow.firebaseConfig;
    return app.firebaseConfig || null;
  }

  function initFirebase(sourceWindow) {
    const target = sourceWindow || root;
    const config = resolveConfig(target);
    const firebaseApi = root.firebase;

    if (!config || !firebaseApi) return null;

    if (!firebaseApi.apps || firebaseApi.apps.length === 0) {
      try {
        firebaseApi.initializeApp(config);
      } catch (error) {
        console.warn("Firebase init gagal:", error);
      }
    }

    app.firebaseConfig = config;
    return firebaseApi;
  }

  function getDb(sourceWindow) {
    const target = sourceWindow || root;
    const parentWindow =
      target.parent && target.parent !== target ? target.parent : null;

    if (parentWindow && parentWindow.db) return parentWindow.db;

    const firebaseApi = initFirebase(target);
    return firebaseApi && firebaseApi.firestore
      ? firebaseApi.firestore()
      : null;
  }

  function getAuth(sourceWindow) {
    const target = sourceWindow || root;
    const parentWindow =
      target.parent && target.parent !== target ? target.parent : null;

    if (parentWindow && parentWindow.firebase && parentWindow.firebase.auth) {
      return parentWindow.firebase.auth();
    }

    const firebaseApi = initFirebase(target);
    return firebaseApi && firebaseApi.auth ? firebaseApi.auth() : null;
  }

  function getCurrentUser(sourceWindow) {
    const auth = getAuth(sourceWindow || root);
    return auth ? auth.currentUser : null;
  }

  function formatRupiah(angka) {
    const value = Number(angka || 0);
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  }

  Object.assign(app, {
    initFirebase,
    getDb,
    getAuth,
    getCurrentUser,
    formatRupiah,
  });
})(window);
