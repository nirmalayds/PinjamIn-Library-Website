import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, setPersistence, browserSessionPersistence } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyD6-XALxgW4MM9RE8okNsNwUEOipJJG00g",
    authDomain: "perpustakaan-web.firebaseapp.com",
    projectId: "perpustakaan-web",
    storageBucket: "perpustakaan-web.appspot.com", // Diperbaiki
    messagingSenderId: "39289548587",
    appId: "1:39289548587:web:6022c2cb01db20a7479f6e"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const submit = document.getElementById('submit');
submit.addEventListener("click", async function (event) {
    event.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    // Validasi input
    if (!email || !password) {
        alert("Harap isi email dan password");
        return;
    }

    try {
        // Tampilkan loading state
        submit.disabled = true;
        submit.textContent = "Memproses...";

        // Set persistence (opsional)
        await setPersistence(auth, browserSessionPersistence);

        // Proses login
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Redirect setelah login sukses
        window.location.href = "profile-user.html";
        
    } catch (error) {
        let errorMsg = "Login gagal. Silakan coba lagi.";
        switch(error.code) {
            case "auth/invalid-email":
                errorMsg = "Email tidak valid";
                break;
            case "auth/user-not-found":
                errorMsg = "Email tidak terdaftar";
                break;
            case "auth/wrong-password":
                errorMsg = "Password salah";
                break;
            case "auth/too-many-requests":
                errorMsg = "Terlalu banyak percobaan gagal. Coba lagi nanti";
                break;
        }
        alert(errorMsg);
    } finally {
        // Reset button state
        submit.disabled = false;
        submit.textContent = "Login";
    }
});